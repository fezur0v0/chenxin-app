"""
独立窗口启动器 —— 跑这个文件，而不是 app.py
会在后台启动Flask服务，同时弹出一个没有浏览器地址栏的独立小窗口
"""

import threading
import webview
from app import app

def run_flask():
    app.run(host="127.0.0.1", port=5050, debug=False, use_reloader=False)

if __name__ == "__main__":
    threading.Thread(target=run_flask, daemon=True).start()

    webview.create_window(
        "尘",
        "http://127.0.0.1:5050",
        width=390,
        height=800,
        resizable=True,
        min_size=(340, 600),
    )
    webview.start()
