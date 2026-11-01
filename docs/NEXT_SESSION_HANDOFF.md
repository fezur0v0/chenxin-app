# 尘 / chenxin-app：下一工作窗口交接

更新：2026-11-01（Asia/Singapore）。先读本文件；它对最新讨论的说明优先于旧交接里的「保留两个入口」方向。

## 最重要的当前状态

用户觉得「对话」和「moom」两个入口仍然奇怪，提出重新设计并合并。当前只在讨论，尚未确认具体新版布局，也未授权开始合并代码。本轮交接只更新文档，不改 UI。

用户原话：

> 就是两个入口还是奇怪，要不我就重新设计一下吧，给它们合并怎么样呢？

助手提出的方向（是讨论方案，不能当作用户已经确认全部细节）：

- 一个聊天 App 入口，内部兼顾日常聊天与沉浸式剧情。
- 日常用气泡，剧情保留整段阅读样式；角色头像、名字、导航和历史管理可以统一。
- 邀请函从日常聊天进入剧情，结束后在聊天里留小记并可重读。
- 希望共享角色、时间与记忆，但自动记忆、世界时钟等尚未实现，不能把设计目标写成已有能力。

**下一步先与用户讨论合并后的结构／线框；在得到开始写代码的明确指示前，不删 moom 入口、不改快捷栏、不迁移记录、不替换侧栏。**

仍待讨论：统一后的侧栏和历史如何呈现、手动发起剧情的位置、剧情如何回到日常、是否保留 moom 名称、原快捷栏位置如何安排。没有必要一次把所有问题丢给用户，可以先给一套具体而轻量的方案。

## 仓库与执行

- 仓库：https://github.com/fezur0v0/chenxin-app
- 当前工作目录：`/workspace/chenxin-app`（新窗口以实际环境为准）。
- 最后一个功能提交：`96f0099` — Build reusable paper invitation envelopes and letter dialogs。
- 本交接提交会在它之后；接手时以远端最新 main 为准。
- 本地分支 `work`，此前经用户授权将工作提交推送到 `origin HEAD:main`。
- 原生 HTML / CSS / ES modules；没有 React、Vite、后端或必须安装的 npm 依赖。
- `npm start`：Python 静态服务 `http://127.0.0.1:5173`。
- 先查看工作区状态，保护其他窗口或用户未提交的修改。
- `.agents/` 与 `skills-lock.json` 是用户安装技能留下的未跟踪内容，保留，不提交、不删除，不执行清理式重置。

## 最近完成：邀请函组件

用户先看了概念图，最后明确授权按图写代码。现在已实装并推送：

1. 聊天中显示**封好的雾蓝纸信封**，含 `Invitation`、收件人、From 署名、头像邮票及月亮封蜡。
2. 不显示「轻触拆信」，也不在聊天信封里堆主题正文或接受按钮。
3. 点整封信，打开居中的信纸弹窗。信纸显示固定英文标题、主题、邀约短句、人物、邀约时间和地点。
4. 两个选项必须是 **`wait` / `Readily`**，保持大小写，做纸质小卡，放在整个信封下方。
5. 弹窗无右上角 X，沿用横条点击／下拖、Escape 和遮罩收起；支持焦点返回。
6. 发件人由原邀请消息的 role 决定，用户发起的邀请不能伪装为 AI 主动发送。头像来自已有资料，缺失显示首字。
7. wait 保存 deferred，之后可重新打开；Readily 接受原场景。已接受／结束的邀请只进入或重读原场景，不重复接受、建场景或生成小记。
8. 存储失败回滚，弹窗保留并显示错误；聊天草稿继续保留。

组件文件：

- `src/components/invitation/view.js`：纯模板 `invitationEnvelope(data)` / `invitationLetter(data)`。
- `src/components/invitation/controller.js`：native dialog、关闭、焦点与宿主回调。
- `src/components/invitation/style.css`：独立纸质皮肤，可用 CSS 替换。
- `src/apps/moom/invitation.js`：现有场景／消息到组件的适配。
- `assets/textures/paper-grain.svg`：项目自制纹理；没有将整张概念图硬编码成界面。
- `docs/invitation-component.md`：数据契约、生命周期、CSS 变量和钩子说明。

区域使用 `data-invitation-part`，包括 envelope、letter、stamp、caption、title、message、people、time、place、actions 等；`data-invitation-view` 区分 closed/open；行为单独使用 `data-invitation-action`。未来换主题保留这些契约。

实际预览（与正式入口共用组件／控制器／CSS）：

- `/?preview=invitation`：聊天中的待接受邀请。
- `/?preview=moom`：剧情阅读与状态栏。
- `/?preview=chat`：思考摘要、语音、引用的聊天样式演示。

以上预览使用内存状态，不修改真实聊天与媒体／快照；不要另外做一套更好看的演示冒充实际 UI。

实装截图：

- `docs/preview-invitation-chat.webp`
- `docs/preview-invitation-letter.webp`
- `docs/preview-invitation-letter-dark.webp`

## 当前 moom 与重要既有决定

- 仍有独立的 app-moom 路由和桌面底栏入口；**合并尚未实施**。
- 底栏当前是对话、moom、外观、设置；记忆在桌面 App 页。今后如何调整尚待讨论。
- 剧情的消息状态栏是双列：左边头像、下方名字；右边楼层、可编辑文字、真实发送时间。
- 自定义文字 `scene.statusText:{assistant,user}`：每项 500 字，同一场景／同一角色共用。点击文字通过抽屉编辑，随备份保存；仅界面展示，不写入正文／提示词，不改消息时间。
- 收藏按钮、菜单及筛选已移除，线上消息和表情面板的相关入口同步关闭。旧 favorite/bookmarked 字段仅兼容保留，已有记忆未删除。不要重新加收藏图标。
- moom 消息之间的分割线和结尾短装饰线已删除，靠留白区分。
- 旧的顶部「场景设定」大卡和重复开场备注不再插入正文；资料仍可从菜单编辑。
- 思考入口无右侧箭头，只在服务实际提供对应内容时显示；用户输入的 `<think>` 不当成 AI 思考。不伪造内部思考、耗时或 Token。
- 默认阅读皮肤在 `src/apps/moom/default.css`，解析在 `message.js`；保留 `data-moom-part` 稳定名称，增加主题应沿用结构。
- 两边侧栏当前均用用户昵称、无内部分割线；场景行只标题和日期，无彩色点／右箭头。长按／右键／Shift+F10 可置顶、重命名、删除。
- 用户已取消过「4:3」要求；不要重新给 App 加固定宽高比。

## 用户的审美与协作偏好

- 透明玻璃质感、韩系 ins、简约、有留白；moom 参考 Mufy 的可定制性和 Rubii 的简洁感。
- 先做清爽默认皮肤，再开放美化能力。经常复用的界面做组件，区域命名保持稳定。
- 讨厌过多胶囊、选中小圆点、多余箭头、顶部背景遮罩、无用途分割线。
- 编辑抽屉不要右上角 X；用顶部横条、下拖、遮罩、Escape 收起。
- 返回按钮位置统一，顶部透明。全屏 App 内不显示桌面底栏。
- 图标参考 Nucleo Glass，桌面图标的乳白背景独立于全局透明度；内部功能控制继续用一致的线条 SVG。
- 用户强调预览与真实 App 一致。概念图要明确标作概念图，实际截图必须来自真实页面。
- 已安装 UI Pro Max：`.agents/skills/ui-ux-pro-max/SKILL.md`。涉及 UI 工作时按实际可用情况读取；新环境缺失时先查找，不假称用过。
- 用户担心不断增长的测试数字和 Token。用简短语言说明检查了什么，**不要反复强调“XX 项测试通过”**；不为每个小样式补一堆镜像测试，不无故重跑全部检查。
- 讨论阶段不抢先编码；一旦明确授权实现则做完、验证并给可查看结果，避免反复问确认。

## 存储与边界

- `src/store.js`：localStorage 键 `chenxin.frontend.v1`，schema version 2。
- `state.moom={active,scenes}`，场景通过 sessionId 与聊天关联；聊天卡通过 storyLink 关联同一个 scene ID。
- `src/apps/moom/model.js`：创建、接受、暂缓、记录、结束等生命周期。一条共享时间线只允许一幕 active，接受另一幕会暂停前一幕。
- 现有 ZIP 备份包含可用音乐／语音原文件，兼容 JSON；有校验、恢复预览和本机快照。见 `docs/BACKUP_FORMAT.md`，模块在 `src/backup/`。
- 合并入口时必须保留原场景、聊天关联、结束小记、自定义文字、草稿、图库、音乐和备份；不要为了导航改版直接清空／改写旧数据。
- 目前是本机前端：尚无真实模型调用、AI 主动邀请／续写、自动记忆、共享世界时钟、语音生成／转写、手机控制、MCP 执行、账号或云同步。配置页面不等于运行能力。
- 曾讨论 Google VPS、Operit 等，并未部署后端，不要假定有服务器访问权或已运行服务。

## 验证与接手顺序

邀请函功能提交前已运行 `npm run check`、`npm test`。Chromium 核对过窄屏、横屏、平板、日夜、键盘／焦点、真实指针拖拽、wait/Readily、存储失败、刷新、长文本、结束场景、草稿和预览隔离；同数据下正式／预览信封、信纸、按钮的几何材质一致。未进行实体手机验收。

本次交接只更新文档，没有重新运行代码测试，也没有更改 UI。

建议接手：

1. 拉取最新 main，并读本文件、`docs/invitation-component.md`、`docs/moom-styling.md`；旧历史详见 `docs/CODEX_HANDOFF.md`。
2. 如需查看现状，启动静态服务并打开隔离预览。
3. 先与用户确认合并体验的线框；不要将助手上轮提出的每个建议当成用户定稿。
4. 用户授权实现后，沿用原组件和数据，做必要检查并更新实装截图／交接。

## 可以复制到新窗口的开场

> 继续尘 / chenxin-app 项目。请先拉取仓库最新 main，阅读 docs/NEXT_SESSION_HANDOFF.md。邀请函组件已完成；我现在想讨论将日常聊天与 moom 合并为一个入口。先讨论新版结构，不要直接改代码。保留纸质邀请函、原记录和备份，遵循文档里的 UI 偏好。
