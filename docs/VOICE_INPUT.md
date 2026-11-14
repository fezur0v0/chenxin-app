# 录音与识别

麦克风入口现在调用 `getUserMedia` + `MediaRecorder`，录下真实音频并保存到现有语音文件库；结束后加入待发送附件，由用户点击发送。后台切换、取消、切换会话时终止录音并释放麦克风。单次录音上限十分钟、10MB。

可用时同时使用 `SpeechRecognition` / `webkitSpeechRecognition`（中文）识别，将文字存入语音附件原有的 `transcript` 字段，长按语音条选择「转文字」展开。识别失败或不受支持时保留真实录音并提示，绝不填入虚构的转写。

这条浏览器路径不需要项目自建后端，但浏览器识别服务可能联网处理音频，也受系统、浏览器版本、语言、权限及网络影响。提供者说明：https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

## Android APK 限制

当前仓库仍以网页前端为主，安卓打包工程在用户本机维护。本次没有替换本机 Android 工程。已核对当前工程缺少 `RECORD_AUDIO` 声明；本机 Capacitor 8 的 `BridgeWebChromeClient` 会在网页申请音频采集时处理运行时权限，但仍须先声明权限并重装 APK。

在本机项目目录执行：

```powershell
node scripts/prepare-android-voice.mjs
Copy-Item -Path index.html,icon.svg,src,assets -Destination dist -Recurse -Force
npx.cmd cap sync android
```

然后通过 Android Studio 重新运行安装 APK，首次使用允许麦克风。准备脚本只补充缺失的录音权限，重复运行不会重复添加。WebView 是否提供有效识别服务仍需要真机验证；浏览器流程通过不能等同于 APK 的识别已经接通。

若 APK 的 WebView 不提供所需能力，下一步应在原生工程接入录音权限及系统识别桥，或接入明确配置的音频转写服务。前者不要求我们自建后端，但依赖手机系统的识别服务；后者可以处理已经录下来的音频。不能仅依靠语音识别插件代替真实录音文件，也不能假设两个麦克风消费者可在所有 Android 设备上同时运行。

转账卡片为对话中的本机交互记录，不连接支付或银行服务。
