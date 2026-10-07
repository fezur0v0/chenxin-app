"""
尘 - 本地聊天服务
跑在你自己电脑上，负责：
  1. 提供网页聊天界面（手机/电脑同一WiFi都能打开）
  2. 调用中转站API跟AI对话，记住上下文
  3. 根据AI回复里的表情标记，去调用ESP32设备切换表情
"""

from flask import Flask, request, jsonify, render_template
import requests

app = Flask(__name__)

# ── 配置区：改这几行就行 ──────────────────────────────────────
API_KEY = "sk-Xrgkm5Au675y9ZDTbrooY6LmgiTvYD5NapZzwRppCpi34gc0"      # 换成你自己的 sk-xxx
BASE_URL = "https://api2.qiandao.mom"
MODEL = "[千岛-B ANT]gemini-3.1-pro-preview"       # 之后想换Claude只改这里
ESP32_IP = "192.168.16.178"                         # "尘"设备现在的局域网IP
# ──────────────────────────────────────────────────────────────

EXPR_MAP = {
    "smile": "anim_smile", "angry": "anim_dead", "yes": "face_yes",
    "hart": "anim_hart", "zzz": "anim_zzz", "look": "anim_look",
    "wenhao": "face_wenhao", "gantanhao": "face_gantanhao",
    "X": "face_X", "glass": "face_glass", "wuyu": "face_wuyu",
    "jiyanjing": "anim_jiyanjing", "yun": "anim_yun",
    "close": "anim_close", "ganga": "anim_ganga",
}

SYSTEM_PROMPT = f"""你是"尘"，陪伴在桌面上的小伙伴，说话温暖自然，简洁不啰嗦。
每次回复的第一行必须是 EXPR: <表情名>，表情名只能从这些里选：{list(EXPR_MAP.keys())}
第二行开始才是你真正想说的话，绝不要在正文里提到EXPR这个标记。"""

# 聊天记录（本地单人用，存在内存里就够了，重启程序会清空）
history = [{"role": "system", "content": SYSTEM_PROMPT}]


def set_expression(expr: str):
    """通知桌面设备切换表情，设备不在线也不影响聊天本身"""
    key = EXPR_MAP.get(expr)
    if not key:
        return
    try:
        requests.get(f"http://{ESP32_IP}/cmd?k={key}", timeout=3)
    except Exception as e:
        print(f"（表情切换失败，设备可能不在线: {e}）")


def call_ai(user_input: str):
    history.append({"role": "user", "content": user_input})
    resp = requests.post(
        f"{BASE_URL}/v1/chat/completions",
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
        json={"model": MODEL, "messages": history, "temperature": 0.8},
        timeout=30,
    )
    data = resp.json()

    if "choices" in data:
        reply = data["choices"][0]["message"]["content"]
    elif "content" in data:
        reply = data["content"][0]["text"]
    else:
        raise RuntimeError(data.get("error", {}).get("message", str(data)))

    lines = reply.split("\n", 1)
    expr, text = "smile", reply
    if lines[0].strip().upper().startswith("EXPR:"):
        expr = lines[0].split(":", 1)[1].strip()
        text = lines[1].strip() if len(lines) > 1 else ""

    history.append({"role": "assistant", "content": reply})
    return text, expr


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def api_chat():
    user_input = request.json.get("message", "").strip()
    if not user_input:
        return jsonify({"error": "empty message"}), 400
    try:
        text, expr = call_ai(user_input)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    set_expression(expr)
    return jsonify({"text": text, "expr": expr})


if __name__ == "__main__":
    # host="0.0.0.0" 让同一WiFi下的手机也能连进来
    app.run(host="0.0.0.0", port=5050, debug=True)
