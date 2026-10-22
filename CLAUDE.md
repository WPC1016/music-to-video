@AGENTS.md

本文件只是给 Claude Code 的入口。**所有项目约定、目录结构、数据契约、命令、已知坑都写在 `AGENTS.md`**，不要在这里重复。

补充三条 Claude Code 专属说明：

1. 项目级 skill 的真身在 `.agents/skills/music-video/`，`.claude/skills/music-video` 是指向它的 junction。要改 skill 改真身。
2. 写渲染代码前先读 `docs/workflow.md` 的第 5 步（构建），再读 `songs/<歌名>/concept/storyboard.json`。分镜是唯一时间轴来源。
3. 渲染完必须跑 `npm run mv:check`，缺帧不要靠肉眼判断。
