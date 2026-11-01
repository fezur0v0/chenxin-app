# 邀请函组件

聊天中的邀请是封好的雾蓝信封。点击整封信，打开奶白信纸与信封弹窗；两个纸质选项独立放在信封下方，文字固定为 `wait` 与 `Readily`。不显示「轻触拆信」，没有右上角 ×。弹窗可通过顶部横条点击／下拖、Escape 或遮罩收起。

实际预览：启动项目，打开 `http://127.0.0.1:5173/?preview=invitation`。使用独立内存状态，与正式入口共用组件和样式，不写正式聊天、音频或快照。示例文字与角色只属于该预览。

[聊天内信封](preview-invitation-chat.webp) · [完整邀请函](preview-invitation-letter.webp) · [深色](preview-invitation-letter-dark.webp)

## 文件与职责

- `src/components/invitation/view.js`：纯 HTML 模板，导出 `invitationEnvelope(data)`、`invitationLetter(data)`。
- `src/components/invitation/controller.js`：导出 `createInvitation({root,getInvitation,onWait,onAccept,onRead,notify})`，管理 native dialog、键盘／拖拽、焦点及选择回调。返回 `open(id,sourceId)`、`reset()`。`getInvitation` 每次从宿主重新获取当前资料，决策回调同步返回 `false` 表示未保存并保持弹窗。
- `src/components/invitation/style.css`：默认纸质皮肤，独立加载，不改变聊天页的头像、输入框或普通气泡。
- `src/apps/moom/invitation.js`：将既有场景与原始邀请消息适配为展示数据。组件本身不访问 moom、localStorage 或模型服务。
- `assets/textures/paper-grain.svg`：项目自制的细纸纹矢量纹理，无外部请求，不使用整张效果图充当界面。

数据形状：

```js
{
  id, sourceId,
  sender: {name, avatar},
  recipient: {name, avatar},
  title, message, when, place,
  stage // invited / deferred / active / paused / ended
}
```

`sender`／`recipient` 根据原始邀请消息的 role 确定；用户自己创建的邀请不会冒充 AI 发来。头像使用已有资料，缺失时显示首字。`when` 取场景中填写的邀约时间，不拿消息发送时间替代；未填写显示「时间待定」。主题、邀约短句、人物和时间都在信纸内，封面只展示固定标题与收发件人。

## 状态与存储

- 未接受的 `wait`：保存 deferred，并收起信纸；信封上显示「稍后赴约」，以后可再次打开。
- 未接受的 `Readily`：沿用 acceptScene，暂存另一进行中场景，然后进入现有场景过渡页。
- 已接受的 `Readily`：回到原场景，不重复接受、不创建新场景。
- 已结束的 `Readily`：只重读已结束的一幕，不重新激活，不添加重复小记。
- 已接受／结束后的 `wait` 只关闭弹窗，不更改生命周期。
- 存储失败继续保留弹窗，显示错误；原状态回滚，聊天草稿保留。

没有新增持久化字段，沿用原有场景 ID、storyLink、JSON／ZIP 格式。模型主动邀请和剧情生成仍未接入。

## CSS 区域约定

根节点为 `[data-invitation-skin="stationery"]`，通过 `data-invitation-view="closed"`／`"open"` 区分封面与信纸。行为使用 `data-invitation-action`，不依赖视觉 class 或按钮文字。

| `data-invitation-part` | 内容 |
| --- | --- |
| dialog | 弹窗容器 |
| envelope | 封面／打开后的信封 |
| flap / fold / pocket | 信封折页、折面、前袋 |
| seal | 月亮封蜡 |
| stamp / portrait | 邮票／头像 |
| caption | 固定英文标题 Invitation |
| recipient / signature / brand | 收件人／From 署名／moom 标识 |
| letter | 信纸 |
| title / message | 主题／邀约短句 |
| people / time / place | 人物／邀约时间／地点 |
| actions / wait / accept | 信封下方选项行／两项选择 |
| stage / error | 生命周期提示／未保存提示 |

默认变量：`--invite-envelope`、`--invite-fold`、`--invite-flap`、`--invite-paper`、`--invite-ink`、`--invite-muted`、`--invite-rim`、`--invite-seal`、`--invite-shadow`、`--invite-button`、`--invite-button-accept`、`--invite-grain`、`--invite-script`、`--invite-serif`。

默认主题变量使用低优先级选择器；未来主题样式加载在组件 CSS 之后即可覆盖明暗模式的皮肤，例如：

```css
/* 淡紫纸品主题，结构与交互不变 */
[data-invitation-skin="stationery"] {
  --invite-envelope: #d4ccdf;
  --invite-fold: #c6bdd3;
  --invite-flap: #e0d8e8;
  --invite-paper: #f7f1ee;
}
[data-invitation-view="closed"][data-invitation-part="envelope"] {
  border-radius: 2px;
}
```

以上是 CSS 扩展接口，尚未提供外观设置中的 CSS 编辑器／主题导入功能。皮肤替换应保留真实按钮、可见焦点、纸下操作区及足够对比度。

## 验证

已运行模块语法与项目测试；Chromium 核对邀请生命周期、原发件人、保存／刷新、配额失败回滚、原聊天草稿、结束场景重读、转义、预览隔离、遮罩／Escape／横条拖拽、焦点恢复、长正文与多尺寸明暗。正式与隔离预览的信封、信纸、按钮几何及材质一致；以自定义 CSS 覆盖颜色后保留交互。未声称实体手机验收。
