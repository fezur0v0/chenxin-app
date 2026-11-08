# 尘 app UI 提示词库

给 AI 修改界面时使用。先按名称找到对应条目，再查看链接中的现有实现。以后确认的界面样式可以按同样格式追加。

## 随手波纹按钮

**给 AI 的提示词**

> 把指定按钮做成「随手波纹按钮」。鼠标或手指按下时，以真实按下的位置为圆心，在按钮边界内扩散一圈圆形波纹。键盘激活时以按钮中心为圆心。遵循系统的「减少动态效果」设置。保留按钮已有的颜色、语义、焦点和提交行为。

**实现入口**

- 在原有 `button` 上追加 `touch-ripple-button`，由容器调用 `bindTouchRipple(root)` 接入。
- 会立即切换界面的按钮可以用 `touchRippleFinished(button)` 等波纹播完再切换。先执行原有表单校验，保存成功后再切换。
- 当前用于日记和自定义心情的「取消」「保存」。

[波纹 CSS](../src/components/touch-ripple.css) · [按压坐标与动画](../src/components/touch-ripple.js) · [日记按钮用法](../src/apps/diary/view.js)
