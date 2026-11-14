# 录音与识别

麦克风入口现在调用 `getUserMedia` + `MediaRecorder`，录下真实音频并保存到现有语音文件库；结束后加入待发送附件，由用户点击发送。后台切换、取消、切换会话时终止录音并释放麦克风。单次录音上限十分钟、10MB。

采集时优先启用浏览器的环境降噪、回声消除和单声道，关闭自动增益偏好，减少安静时底噪被抬高的情况；编码请求 128kbps。采集参数使用 `ideal`，不把设备不支持的处理能力设为硬性要求。浏览器与麦克风可能忽略部分偏好，编码器也可能调整码率；是否生效需通过音轨 `getSettings()` 及实际试听判断。此调整不保证消除硬件电流声、麦克风过载或所有环境噪音。

可用时同时使用 `SpeechRecognition` / `webkitSpeechRecognition`（中文）识别，将文字存入语音附件原有的 `transcript` 字段，长按语音条选择「转文字」展开。识别失败或不受支持时保留真实录音并提示，绝不填入虚构的转写。

这条浏览器路径不需要项目自建后端，但浏览器识别服务可能联网处理音频，也受系统、浏览器版本、语言、权限及网络影响。提供者说明：https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

## Android APK 限制

当前仓库仍以网页前端为主，安卓打包工程在用户本机维护。本次没有替换本机 Android 工程。Capacitor 8.6.0 的 `BridgeWebChromeClient` 在 WebView 申请音频采集时同时请求 `RECORD_AUDIO` 和 `MODIFY_AUDIO_SETTINGS`，任一返回失败就拒绝 WebView 的访问。**两项都必须在 Manifest 中声明**；只补录音权限，仍可能在系统已允许麦克风时返回 `NotAllowedError`。已在连接手机的日志中确认过 `Requires MODIFY_AUDIO_SETTINGS and RECORD_AUDIO` 的失败路径。

在本机项目目录执行：

```powershell
node scripts/prepare-android-voice.mjs
Copy-Item -Path index.html,icon.svg,src,assets -Destination dist -Recurse -Force
npx.cmd cap sync android
```

然后通过 Android Studio 重新运行安装 APK，首次使用允许麦克风。准备脚本补齐缺失的两项音频权限，重复运行不会重复添加，也能修复只运行过旧版准备脚本的工程。`MODIFY_AUDIO_SETTINGS` 是安装时授予的普通权限，不是系统设置里需要手动打开的另一个麦克风开关。必须重装新 APK，单独复制网页或 `cap sync` 不会更改已安装包的权限声明。WebView 是否提供有效识别服务仍需要真机验证；修复录音权限不能等同于 STT 已接通。

框架实现：https://github.com/ionic-team/capacitor/blob/8.6.0/android/capacitor/src/main/java/com/getcapacitor/BridgeWebChromeClient.java

若 APK 的 WebView 不提供所需能力，下一步应在原生工程接入录音权限及系统识别桥，或接入明确配置的音频转写服务。前者不要求我们自建后端，但依赖手机系统的识别服务；后者可以处理已经录下来的音频。不能仅依靠语音识别插件代替真实录音文件，也不能假设两个麦克风消费者可在所有 Android 设备上同时运行。

转账卡片为对话中的本机交互记录，不连接支付或银行服务。
