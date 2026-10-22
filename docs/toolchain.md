# 工具链与 Skill 清单

按"这条流水线上它解决哪一段"分类。**必装**是不装流程就跑不通的，**选装**是按需。

---

## 一、基础环境（必装）

| 工具 | 本机状态（2026-10-21） | 用途 | 备注 |
|---|---|---|---|
| Node.js ≥ 22 | `22.22.2` | 跑所有 `.mjs` 脚本、HyperFrames / Remotion | 22 起自带全局 `WebSocket`，CDP 渲染才不需要 ws 包 |
| FFmpeg / ffprobe | `8.x` full build | 转码、拼接、响度归一、时长校验 | 必须含 `loudnorm` 滤镜；`ffmpeg -version` 能跑通即可 |
| Chrome / Edge | `C:\Program Files\Google\Chrome\Application\chrome.exe` | 逐帧渲染的宿主 | 版本会被 HyperFrames 固定校验，不要随手升级 |
| Python 3.11+ | `3.13.12` | 只给 `librosa` 做节拍分析 | 不需要 Python 渲染时可以不装依赖 |

自检：`npm run doctor`。

---

## 二、音频分析层

| 工具 | 语言 | 产出 | 评价 |
|---|---|---|---|
| `tools/analyze.mjs`（本项目自带，内置 LRC 解析） | Node | `audiomap.json` + `lyrics.json` + `structure.md` | 零依赖，直接读 PCM。**够用就用它**，别为了"更专业"引一堆库 |
| `librosa` | Python | onset、beat grid、tempo、chroma、HPSS 分轨 | 节拍检测比 Node 版准，代价是装 numba 慢、Windows 上偶尔编译。HyperFrames 的 `analyze-beatgrid.py` 依赖它 |
| `analyze-beatgrid.py`（HyperFrames skill 自带） | Python | `audiomap.json`：onsets / phrases / key_moments(SURGE/DROP) / hard_stops / tempo grid | **最完整的节拍结构分析**，字段设计直接可抄。但它只认"有节奏"的音乐，安静段给的 BPM 是强加的 |
| `demucs` | Python | 人声/鼓/贝斯/其他 四轨分离 | 只在"要跟着人声做口型/波形"时才需要。3 分钟歌 CPU 约 3–5 分钟，很重 |

**结论**：先跑 Node 版拿能量包络，只有需要精确拍点切镜时才上 librosa。两个都失败再考虑 demucs。

---

## 三、歌词与对齐

| 工具 | 用途 | 说明 |
|---|---|---|
| `tools/analyze.mjs` 内置的 LRC 解析 | LRC → `lyrics.json`，制作名单标记为 `meta` | LRC 本来就有行级时间戳，**行级同步足够做歌词 MV** |
| `aeneas` | 强制对齐（文本 → 音频逐字时间） | 已多年不更新，Python 3.13 装不上，要用 3.10 虚拟环境 |
| `whisperX` | 转写 + 词级时间戳 | 准，但要 torch + CUDA，2GB 起步。只有"没有 LRC、要自动出词"时才用 |
| 均分 + onset 微调（脚本内做） | 逐字卡拉 OK 效果 | CJK 每字等宽，按行时长均分再吸到最近 onset，视觉上已经足够 |

**结论**：有 LRC 就用 LRC。没有 LRC 先找，找不到才转写。不要一上来就 WhisperX。

---

## 四、视觉素材层

| 工具 | 用途 | 备注 |
|---|---|---|
| ChatGPT Image / ImageGen | 出参考图、色彩板、构图示意 | 本项目**只把生成图当参考**（`refs/`），不直接进成片——AI 图在 1080×1920 下放大必糊，且风格会跳 |
| `ui-ux-pro-max` skill | 排版、配色、字体层级 | 做标题卡和歌词版式时用它定规范 |
| 系统字体 | 楷体 / 宋体 / 思源 | `simsun.ttc` 正文可用；`simsunb.ttf` 是 ExtB，只有生僻字，**不能用** |

---

## 五、渲染层（一首歌只选一个）

| 引擎 | 技术 | 优势 | 代价 | 本机状态 |
|---|---|---|---|---|
| **canvas**（自建） | Canvas 2D + headless Chrome CDP + FFmpeg | 零 npm 依赖；1080p/205s 六进程约 3 分钟；画面完全可控 | 所有绘制元件要自己写；没有模板生态 | ✅ 已在《天地龙鳞》验证 |
| **HyperFrames** | HTML + `data-start` + GSAP/Lottie/Three | agent 原生，LLM 写 HTML 最稳；官方 skill 带完整 6 步工作流 | 首次 `npx` 拉包慢；复杂逐帧绘制不如 Canvas 自由 | ⚠️ 旧项目锁 0.8.169，本项目需重新验证 |
| **Remotion** | React + TS | 组件化、参数化、模板多；官方 12 个 skill 已装 | 需要 React 工程；音频分析要自己做 | ✅ skills 已装 `~/.codex/skills/remotion-*` |
| **Pillow + pycairo** | Python 逐帧 → ffmpeg 管道 | 无浏览器；像素级控制；适合像素风/图表 | 复杂动效和 3D 很难；超采样 2× 才不糊 | ✅ 见 `../gongshang-video` |

**选型口诀**：画面元素全是自己画的几何/墨迹 → canvas；排版和信息图为主 → HyperFrames；要出 10 首以上同风格 → Remotion；纯 Python 环境/像素风 → Pillow。

---

## 六、后期与质检

| 命令 | 用途 |
|---|---|
| `loudnorm=I=-14:TP=-1.5:LRA=11` | 抖音/视频号通用响度。**必须做**，否则成片忽大忽小 |
| `apad=whole_dur=<duration>` | 补静音到精确时长，避免末帧被截 |
| `-movflags +faststart` | 网页/手机播放秒开 |
| `tools/qa.mjs` | 每帧缩到 32×18 灰度，和邻域中位数比亮度，抓异常帧 |
| `npm run mv:check` | 帧序号连续性 + ffprobe 校验（时长/尺寸/fps/音轨） |

---

## 七、Skills

### 7.1 HyperFrames 官方 skills（25 个，最对口）

```bash
# Windows 必须加 --copy，否则 junction 在部分工具下不生效
npx skills add heygen-com/hyperframes -a codex -a claude-code -a cursor --copy
```

关键几个：

| Skill | 作用 |
|---|---|
| `music-to-video` | **主技能**。音频 → 节拍网格 → 分镜 → 逐帧 HTML → 渲染。6 步流程，两个人工 Gate（计划批准 / 渲染批准） |
| `hyperframes-audio` | 音频总线、`data-fx-chain`、推子、自动化、限幅 |
| `hyperframes-keyframes` | 时序注册、异步 timeline |
| `hyperframes-cli` | check / preview / render，含云端渲染 |
| `motion-graphics` | 纯文字/图形动效，无素材 |
| `media-use` | 素材暂存、音效（Openverse）、转录 |
| `hyperframes-creative` | 品牌预设（字体 + ≤6 色板） |

> `music-to-video` 的价值不只是"能渲染"，而是它把**分镜契约**定死了：`audiomap.json`（节拍真相）+ `STORYBOARD.md`（每帧 span/pacing/mood/feel）+ 一帧一文件。我们直接沿用这套数据结构，换引擎也不用改上层。

### 7.2 Remotion 官方 skills（12 个，已装）

位置 `~/.codex/skills/remotion-*`，来源 `github.com/remotion-dev/skills`。
入口 `remotion-best-practices`，另含 `remotion-create` / `render` / `captions` / `markup` / `multimedia` 等。

### 7.3 本项目自建 skill

`.agents/skills/music-video/SKILL.md` —— 把本项目的八步流程、目录契约、质检清单固化成 skill，任何支持 Agent Skills 标准的工具都能自动触发。**这是保证多个 AI 工具行为一致的真正手段。**

它通过 `npm run skills:link` 生成的 junction，同时被 `.claude/` `.workbuddy/` `.cursor/` `.zcode/` 四个目录读到。机制见 `docs/multi-tool.md`。

### 7.4 已有但需适配

`~/.codex/skills/knowledge-video/SKILL.md` —— 原为 HyperFrames 设计，流程可参考，步骤不能照搬。

---

## 八、明确不装 / 不用的

| 东西 | 为什么不用 |
|---|---|
| 剪映 / Premiere 自动化 | 本项目要的是"代码即画面"，GUI 自动化反而是负资产 |
| 素材站视频拼接 | 版权风险 + 风格不统一 + 与歌词无关 |
| AI 视频生成（Sora/可灵）做整片 | 单镜头几秒、不可控、无法精确对拍。**只在个别空镜需要实拍感时才考虑** |
| 在线渲染 SaaS | 单曲成本高；本地 3 分钟能出片 |
