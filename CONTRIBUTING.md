# 贡献指南

## 不要提交的内容

仓库只放**代码、流程、文档**。以下内容一律不入库（已写进 `.gitignore`）：

- 音频（mp3 / flac / wav）与 LRC
- 歌词全文（`analysis/lyrics.json`）
- 成片（`out/*.mp4`）、渲染帧（`frames/`）、抽帧（`snap*/`）
- AI 参考图（`refs/`）与导出素材

## 加一首歌

**不要手工建目录**。用模板复制，路径字段、占位、worklog 都会自动生成：

```bash
npm run mv:new -- "歌名-艺人" --audio "/path/song.mp3" --lrc "/path/song.lrc"
npm run stage -- 歌名-艺人
```

然后按 `prompts/` 走八步。三件事必须守住：

1. 分镜时间只能来自 `analysis/audiomap.json` 或歌词时间；
2. 风格、形式由人拍板，批准记录写进 `song.json.approvals`；
3. 每首歌的 `00-风格定义.md` 必须重写，不许抄上一首。

## 提交前

```bash
npm run mv:validate -- <歌>     # 0 错误才继续
npm run mv:check    -- <歌>     # 成片质检 6 项
npm run sb:md       -- <歌>     # 改了分镜就同步人读版
```

## 代码风格

- 纯 ESM，无构建步骤，Node 直接跑。
- 渲染代码分四层（素材 / 调度 / 动效 / 时间轴），一层只干一件事。
- 注释写「为什么」，不写「做了什么」。
- 新增镜头优先写数据（`director.js` 的调度表），不要给每个镜头加一个函数。

## 提 PR

- 一个 PR 只做一件事：修 bug、加能力、改文档分开提。
- 描述里写清楚：改了什么、怎么验证的（贴 `mv:check` 输出或抽帧截图）。
- 大改（换渲染引擎、改数据契约）请先开 issue 讨论。
