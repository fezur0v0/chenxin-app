# 独立 App 界面

每个 App 都有独立文件夹，可在 GitHub 中分别修改页面和样式：

| App | 文件夹 | 页面与样式 |
| --- | --- | --- |
| 日记 | `diary/` | `view.js`、`style.css`、`model.js`、`controller.js` |
| 音乐 | `music/` | `view.js`、`style.css`、`controller.js`、`model.js`、`files.js`、`icons.js` |
| 图库 | `gallery/` | `view.js`、`style.css` |
| 预设 | `presets/` | `view.js`、`style.css` |
| 世界书 | `worldbook/` | `view.js`、`style.css` |
| 档案 | `archives/` | `view.js`、`style.css` |
| 外观 | `appearance/` | `view.js`、`style.css` |

`view.js` 返回页面内容，`style.css` 保存这个 App 的外观。
`index.js` 负责公共页头和返回主页；`catalog.js` 管理名称、图标和稳定的入口 ID。
共享样式位于本目录的 `style.css`，图标来自 React Icons 的 Lucide 系列，SVG 数据在 `icons.js`。

各界面沿用已有主题、壁纸和本机数据，不为每个 App 建立重复的数据副本。
外观已经完整迁移原设置；图库展示已保存图片，预设/档案沿用现有配置。
日记已支持月历与心情时间线、本机新建/编辑/删除；model.js 管理日期与记录数据，controller.js 处理交互。日记保存在根状态 diaryEntries 中，随现有备份恢复；旧数据默认空数组。其他尚未接入的功能将逐个实现。启用新的操作按钮时，需要同时接入实际行为。

新增持久数据时，在 `../store.js` 补充默认值、旧备份兼容与验证；用户文字通过 `../ui.js` 的 `escape` 转义。
入口从主页移除只修改 `home.hiddenApps`，保留内容及设置。不要改已发布的 `app-*` ID 或存储键。

修改后运行 `npm run check`、`npm test`，再检查手机大小、昼夜模式、返回导航与备份恢复。

音乐 view.js 管理首页/歌单/黑胶页/编辑抽屉，controller.js 共享一个 Audio 实例，时间更新只改变进度，不重写页面。model.js 管理曲库、真实集合和队列；files.js 保存 IndexedDB 音频。音乐 JSON 只备份元数据、封面与歌单，不含音频；缺失文件可绑定回原歌曲 ID。删除歌单保留歌曲，删除歌曲则移除各歌单和队列的引用。

音乐队列、歌曲编辑和歌单编辑与聊天抽屉共用 `../drawer.js` 和 `../drawer.css`。新增同类抽屉时，容器使用 `bottom-sheet`，内部标题由 `drawerHeader()` 生成；列表卡片可使用 `drawer-card`。统一样式控制玻璃材质、圆角、横条和间距，仍跟随全局主题、透明度和模糊。标题区不放 ×，顶部横条本身可以点击或键盘操作收起；`bindDrawerDismiss()` 处理横条下滑、短拖回弹、原生 dialog 遮罩点击，`animateDrawerClose()` 处理收起动画。容器自己的控制器保留内容保存、Escape、焦点恢复和生命周期管理；聊天为页面内对话框，音乐为原生 dialog，不重复保存业务数据。
