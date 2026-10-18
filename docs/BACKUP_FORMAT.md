# 尘的可迁移备份格式

系统设置 → 数据与备份提供完整 ZIP、轻量 JSON 与本机快照。文件格式与浏览器存储实现分离，便于未来跨设备迁移；目前没有云端备份接口。

## ZIP v1

```text
manifest.json
data.json
media/music/0.bin
media/voice/1.bin
```

`manifest.json` 包含：

| 字段 | 内容 |
| --- | --- |
| `format` | 固定 `chenxin-backup` |
| `version` | 当前为 `1`，与记录 schema 的版本分开 |
| `kind` | 固定 `full` |
| `createdAt` | ISO 8601 时间 |
| `state` | `{path:"data.json",size,sha256}` |
| `media` | 可用音频清单，见下文 |
| `missing` | 原文件缺失的 `{kind,id,name,type}` 引用 |

`data.json` 使用经 `normalizeState()` 校验的 v2 状态：聊天与引用、moom 场景及邀请关联、相册及图片、日记、记忆、世界书、预设、表情、外观、模型／插件配置、音乐元数据、歌单及备份偏好。图片继续以受限 data URL 内嵌其中。不会复制浏览器的登录状态或任意数据库目录。

音频清单每项包含 `kind`（`music` 或 `voice`）、`id`、`path`、`size`、`sha256`、`name`、`type`、`lastModified`。原文件按字节打包，不转码；路径用序号生成，不使用用户文件名或 ID 拼接路径。语音以 `voice.fileId` 去重，音乐以 `track.id` 查找原文件。

缺失清单是显式状态：仍保留对应歌曲／语音记录，导出预览改为「下载可用内容」。恢复后仍需要用户补回这些原文件。导入时以已规范化记录中的引用重新生成缺失显示文本，不直接信任清单里重复的名称。

## 校验与限制

- ZIP 文件及解压后总量不超过 256MiB；数据 JSON 不超过 16MiB；清单不超过 1MiB；条目总数不超过 4096。
- 音乐单文件不超过 80MiB，语音不超过 10MiB，与现有上传限制一致。
- 只接受 `manifest.json`、`data.json` 及 `media/(music|voice)/数字.bin`；不接受目录、额外路径、重复文件、重复引用、缺失索引或未声明的媒体。
- ZIP 仅支持 Stored／Deflate，解压前检查声明大小；Stored 必须满足压缩大小等于原大小。
- 验证数据 JSON 和每个原文件的 SHA-256、实际大小、格式版本及记录 schema 后才显示恢复确认。
- SHA-256 用于检验文件完整性，不代表签名认证；目前备份包不加密。

ZIP 由内置 `fflate 0.8.2` 读写，代码和 MIT 许可位于 `src/vendor/`，无需联网加载依赖。校验使用 Web Crypto，需要 HTTPS 或 localhost。

## 恢复提交

1. 在内存读取、校验备份，展示当前与备份中的内容数量。
2. 用户确认覆盖；默认先保存当前状态的完整本机快照，可取消这一选项。
3. 将导入音频写入独立的新 ID，不覆盖同名旧文件。为 ZIP 中缺失的音频也分配新 ID，防止误用目标设备已有的同 ID 文件。
4. 重映射歌曲 ID、歌单、队列、当前歌曲及所有共享语音文件引用。
5. 全部文件写入成功后，以一次 `localStorage.setItem()` 提交记录，再切换界面状态；不自动播放。

提交前失败或取消，会删除本次暂存文件并保留原记录及原文件。清理失败留下的暂存文件不被任何记录引用。提交成功后暂不清理旧音频，重复恢复可能占用额外空间；这是当前避免误删原文件的保留策略。

## 旧 JSON

支持旧 v1/v2 JSON，包含可选 UTF-8 BOM，缺少的新字段补默认值。它不携带独立音频原文件，因此沿用已有文件 ID，保留同浏览器的补文件兼容性。恢复流程同样提供预览与可选的恢复前快照。

## 本机快照

`chenxin.backups.v1` IndexedDB 当前 schema version 2：

- `snapshots`：`{id,createdAt,day,reason,bytes,summary,missing,archive}`，`archive` 是完整 ZIP Blob；`reason` 为 `auto`、`manual` 或 `before-restore`。
- `metadata`：设备侧 `lastAutoDay`。它和自动快照在同一事务中检查并写入，同一天的并发保存仅提交一份，不因清理或删除旧快照而消失。v1 数据库升级会保留既有快照。

偏好 `backupSettings:{dailyEnabled,keep}` 随记录备份，默认每日启用、保留 5 份，可选 3／5／10 份。每日任务仅在打开或回到前台时检查，有内容才创建；网页关闭后的后台执行不作保证。创建、保留清理在同一事务中提交；减少保留数量时会整理最旧的快照。

本机快照会随站点数据一同清除；要跨设备保存，应下载 ZIP。聊天样式和 moom 场景预览使用内存快照与内存媒体存储，并禁用自动快照，避免污染正式数据。
