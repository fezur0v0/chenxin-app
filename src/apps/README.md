# 独立 App 界面

每个 App 都有独立文件夹，可在 GitHub 中分别修改页面和样式：

| App | 文件夹 | 页面与样式 |
| --- | --- | --- |
| 日记 | `diary/` | `view.js`、`style.css`、`model.js`、`controller.js` |
| 音乐 | `music/` | `view.js`、`style.css`、`controller.js`、`model.js`、`files.js`、`icons.js` |
| 图库 | `gallery/` | `view.js`、`style.css`、`model.js`、`controller.js` |
| 预设 | `presets/` | `view.js`、`style.css`、`model.js` |
| 世界书 | `worldbook/` | `view.js`、`style.css`、`model.js` |
| 档案 | `archives/` | `view.js`、`style.css` |
| 外观 | `appearance/` | `view.js`、`style.css` |

`view.js` 返回页面内容，`style.css` 保存这个 App 的外观。
`index.js` 负责公共页头和返回主页；标准页头复用 `../ui.js` 的 `appPageHeader()`，记忆和系统设置全屏页也使用同一模板。`catalog.js` 管理名称、图标和稳定的入口 ID。外观标记 desktop:false，仅从底部第三个快捷入口打开，不在桌面或添加列表重复展示；旧布局中的 ID 仍兼容保留，外观数据和路由不变。
页头返回按钮统一调用 `../ui.js` 的 `backButton(action, label, options)`，样式与箭头动效由 `../navigation.css` 管理。默认使用全局 `data-action`；音乐内部导航传入 `{music:true}`，收起播放页再加 `{collapsed:true}`，箭头会平滑转为向下。组件统一 44×44px 点击区域、20px SVG、无背景／无边框、昼夜颜色及键盘焦点，不要在各 App 中重新添加圆形玻璃底。所有标准页头、音乐页头和配置库页头都使用 app-topbar：同一最大宽度、16px 手机侧边留白、64px 高度加顶部安全区，sticky 固定在滚动容器顶部；箭头的 44px 点击区域统一位于顶部安全区下 10px。页头背景完全透明，无填充、边框、阴影、模糊或实色降级遮罩，且不随外观滑块改变。内容区可继续保留各自留白，不要重新单独定位页头。各控制器继续处理原来的返回动作；音乐刷新继续保留按钮与 SVG 节点，让快速反向切换保持连续。
App 页面共享样式位于本目录的 `style.css`，内部线条图标来自 React Icons 的 Lucide 系列，SVG 数据在 `icons.js`。桌面七个 App 与底部四个入口使用 `../launcher-icons.js` 的 Nucleo Glass SVG，外框与底部布局共用 `../launcher.css`。入口外框使用固定乳白／深灰磨砂材质、柔亮边缘和 14px 模糊，不引用外观的 --glass-* 变量；不支持背景模糊时也使用独立的实色降级。保持入口与内部操作图标的用途区分；Nucleo 许可与来源见根目录 THIRD_PARTY_NOTICES.md 和 assets/licenses/nucleo-glass.txt。拖拽副本需重新生成 SVG ID，并沿用原图标宽度，避免渐变／遮罩冲突和尺寸跳变。

各界面沿用已有主题、壁纸和本机数据，不为每个 App 建立重复的数据副本。
外观已经完整迁移原设置；图库展示已保存图片，档案沿用现有配置；世界书与预设支持本机配置管理。
日记已支持月历与心情时间线、本机新建/编辑/删除；model.js 管理日期与记录数据，controller.js 处理交互。日记保存在根状态 diaryEntries 中，随现有备份恢复；旧数据默认空数组。其他尚未接入的功能将逐个实现。启用新的操作按钮时，需要同时接入实际行为。

新增持久数据时，在 `../store.js` 补充默认值、旧备份兼容与验证；用户文字通过 `../ui.js` 的 `escape` 转义。
入口从主页移除只修改 `home.hiddenApps`，保留内容及设置。不要改已发布的 `app-*` ID 或存储键。

修改后运行 `npm run check`、`npm test`，再检查手机大小、昼夜模式、返回导航与备份恢复。

音乐 view.js 管理首页/歌单/黑胶页/编辑抽屉，controller.js 共享一个 Audio 实例，时间更新只改变进度，不重写页面。model.js 管理曲库、真实集合和队列；files.js 保存 IndexedDB 音频。音乐 JSON 只备份元数据、封面与歌单，不含音频；缺失文件可绑定回原歌曲 ID。删除歌单保留歌曲，删除歌曲则移除各歌单和队列的引用。

主页小组件编辑／添加、日记编辑、音乐队列、歌曲编辑和歌单编辑与聊天抽屉共用 `../drawer.js` 和 `../drawer.css`。新增同类抽屉时，容器使用 `bottom-sheet`，内部标题由 `drawerHeader()` 生成；列表卡片可使用 `drawer-card`。统一样式控制玻璃材质、圆角、横条和间距，仍跟随全局主题、透明度和模糊。标题区不放 ×，顶部横条本身可以点击或键盘操作收起；`bindDrawerDismiss()` 处理横条下滑、短拖回弹、原生 dialog 遮罩点击，`animateDrawerClose()` 处理收起动画。容器自己的控制器保留内容保存、Escape、焦点恢复和生命周期管理；聊天为页面内对话框，音乐为原生 dialog，不重复保存业务数据。


世界书与预设沿用酒馆概念，界面与各自数据规则在各自文件夹中。prompt-library/ 共享库页控件、玻璃布局、配置校验、导入与编辑控制器。根状态 worldbooks / promptPresets / activePromptPreset 随已有备份保存；不要迁移或覆盖 persona.prompt。默认空库，填充预览仅为演示。

导入兼容 entries 世界书与 prompts/prompt_order 聊天补全核心结构；预设保留白名单中的生成／格式参数，连接地址与凭据不导入。编辑只更新已支持的字段，保留世界书其他高级数据与提示词条目元数据、非当前编排组。内置上下文标记不提供正文覆盖；新内容要通过真实保存行为落盘，失败保留表单。当前不执行触发、宏、正则、向量、脚本或模型请求编排。

backButton() 与 drawerHeader() 可通过内部 actionAttribute 选择组件事件命名空间。本地配置编辑抽屉使用 app-sheet bottom-sheet，仍由 drawer.css 控制公共材质；不要增加右上角 × 或复制一套抽屉样式。


图库使用独立 gallery:{albums,photos} 状态，不再扫描壁纸／头像／所有聊天附件。图库入口显示分类，内部返回使用 backButton 的 data-gallery-action；相册与照片编辑共用 drawerHeader／app-sheet bottom-sheet。每行照片固定四张正方形，不要改成自适应列数。model.js 的 saveChatPhoto 校验用户照片来源和重复收藏，controller.js 提供保存、失败回滚与局部刷新；src/app.js 导出 saveConversationPhoto 供未来模型工具调用，目前尚无真实模型触发。

moom 的独立全屏入口、场景控制器与本机数据在 `moom/`，详见 [moom 初版](../../docs/MOOM.md)。记忆的桌面入口 `app-memory` 跳转已有 memory 路由；moom 与外观都为 Dock-only，分别位于第二、第三个快捷位。
