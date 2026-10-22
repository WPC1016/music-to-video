# music-to-video

把一首歌做成 MV。输入 `mp3 + lrc`，输出横屏或竖屏 MP4。画面全部由代码生成，不用素材站素材。

**这个文件是项目的单一真源。** Codex / Cursor / ZCode / Gemini CLI 直接读它；Claude Code 通过 `CLAUDE.md` 的 `@AGENTS.md` 导入；WorkBuddy 读同一份。配套说明见 `docs/multi-tool.md`。

---

## 当前阶段

**Phase 1 / 2 均已跑通**，示例《人生态度-王七七》已出片并通过质检；新歌仍按 Phase 1 → Phase 2 顺序推进。

| Phase | 范围 | 状态 |
|---|---|---|
| 1 | 目录、素材、音频分析、歌词解读、概念、风格、分镜、参考图 | 已跑通（示例） |
| 2 | 写渲染代码、出片、质检 | 已跑通（canvas 引擎） |

渲染代码是**每首歌自己的**：`songs/<歌>/project/src/`，不要为了省事去改别的歌的调度表。

---

## 1. 铁律

1. **一首歌一个目录**，`songs/<歌名>-<艺人>/`。建好之后不改名（会断掉 `song.json` 里的相对路径）。
2. **原始素材只进 `source/`，永不删改**。mp3 / lrc / 封面是唯一源。
3. **每首歌风格必须重写**。`00-风格定义.md` 不许抄上一首。这是这个项目最容易被做废的地方。
4. **分镜必须挂在音频锚点上**。时间只能来自 `analysis/audiomap.json` 或歌词时间，不许凭感觉。
5. **不手工改 `analysis/*.json`**。那是算出来的，改了就不对拍。要调就重跑 `mv:analyze`。
6. **歌词版权归原作者**。仅个人练习，不商用、不二次分发音频。每首歌带 `credits.md`。
7. **风格和形式由人拍板**。AI 只给选项，不许替人选。`prompts/02`（概念）和 `prompts/05`（风格）都是**先出 3 个方案，等人选完才写正文**。选了才写，写了还要在 `approvals` 里记一笔。

---

## 2. 目录契约

```
music-to-video/
├─ AGENTS.md                 ← 单一真源
├─ CLAUDE.md                 ← 薄壳，@AGENTS.md
├─ package.json              ← 统一命令入口
├─ prompts/                  ← 提示词库（跨歌曲复用，5 段 + README）
├─ docs/
│  ├─ workflow.md            ← 八步流程 + 每步判据
│  ├─ toolchain.md           ← 工具与外部 skill 清单
│  ├─ multi-tool.md          ← 多 AI 工具共享机制
│  └─ decisions.md           ← 选型记录
├─ tools/                    ← 公共脚本（自检 / 建目录 / 分析 / 质检 / 建链接）
├─ engines/                  ← Phase 2 用，现在不改
├─ .agents/skills/music-video/  ← skill 真身
└─ songs/
   ├─ _template/             ← 每首歌的骨架，mv:new 复制它
   │  ├─ song.json           ← 配置模板（__TITLE__ / __ARTIST__ 占位）
   │  ├─ worklog.md          ← 进度页模板
   │  └─ concept/            ← 四份文档骨架 + storyboard.example.json + asset-manifest.json
   └─ 人生态度-王七七/
      ├─ song.json           ← 元信息 + 风格 + stage + approvals
      ├─ worklog.md          ← 进度、已知问题、决策记录（接手先读这个）
      ├─ credits.md          ← 素材与授权
      ├─ source/             ← mp3 / lrc（只读）
      ├─ assets/             ← 你自带的素材：character / background / reference / clip
      ├─ analysis/           ← audiomap.json / lyrics.json / structure.md（机器产物）
      ├─ concept/            ← 00-风格定义 / 01-歌词解读 / 02-MV概念 / 03-分镜表
      │  ├─ storyboard.json  ← 机器读的分镜
      │  ├─ asset-manifest.json ← 素材清单与审核状态
      │  └─ prompts/         ← 图像提示词，和 refs/ 同名同序号
      ├─ refs/               ← 参考图（AI 生成，不进成片）
      ├─ project/src/        ← Phase 2 渲染工程
      ├─ logs/               ← 渲染日志、质检记录
      ├─ frames/ snap/ out/  ← 运行产物，git 忽略
```

**判断文件放哪**：能被另一首歌复用的 → 根目录 `prompts/` / `tools/` / `docs/`；只属于这一首的 → `songs/<歌>/`。

---

## 3. 数据契约

### `song.json`

```json
{
  "title": "人生态度",
  "artist": "王七七",
  "slug": "人生态度-王七七",
  "source": { "audio": "source/人生态度.mp3", "lrc": "source/人生态度-王七七.lrc" },
  "format": {
    "primary": "portrait",
    "portrait": { "width": 1080, "height": 1920, "fps": 30 },
    "landscape": { "width": 1920, "height": 1080, "fps": 30 }
  },
  "engine": "canvas",
  "style": { "palette": ["#0B0B0C", "#C8A24A", "#8C2F27"], "font": "楷体", "texture": "宣纸纤维", "lighting": "顶光偏冷" },
  "stage": "concept",
  "approvals": { "concept": null, "style": null, "storyboard": null, "assets": null, "preview": null },
  "notes": ""
}
```

- `stage`：`source` → `analyzed` → `concept` → `style` → `storyboard` → `refs` → `building` → `rendered`。由 `npm run stage` 检查和推进，不要手写跳到下一阶段。
- `approvals`：每个值要么 `null`（未批准），要么 `{"by":"人","at":"2026-10-21"}`。**没有批准就不许进下一阶段**。
- `format`：横竖屏共用一首歌的分析和分镜，只是构图参数不同。`primary` 决定默认导出哪个。

### `worklog.md`

每首歌必须有。三个区块：进度表、已知问题、决策记录。
**任何 AI 工具接手，先读 worklog，再读本文件。** 它比重读所有文件快。

`worklog.md` 是人读的叙事，`song.json.stage` 是机器读的状态。两者要对得上，`npm run stage` 会检查产物是否真的齐了。

### `analysis/audiomap.json`

```json
{
  "fps": 30, "duration": 155.99, "bpm": 109.5, "frames": 4680,
  "full": [...], "bass": [...], "mid": [...], "treb": [...],
  "perSec": [...],
  "onsets": [1.2, 1.467, ...],
  "sections": [{ "t": 0, "name": "intro", "energy": 0.118, "delta": 0 }]
}
```

`full/bass/mid/treb` 是**逐帧**归一化能量（0–1，长度 = frames），按帧索引直接取，不插值。

### `analysis/lyrics.json`

```json
{ "fps": 30, "duration": 155.99, "lines": [{ "t": 12.34, "text": "……", "kind": "lyric" }] }
```

`kind` 二值：`lyric` 正文 / `meta` 制作信息（前 15 秒的词曲编曲名单，不上屏）。

### `concept/storyboard.json`

```json
{
  "fps": 30,
  "shots": [
    {
      "id": "s01", "start": 0.0, "end": 12.0, "section": "intro",
      "pacing": "phrase_flow", "mood": "空旷、起笔",
      "lyrics": [],
      "visual": "一句话，40 字内，必须是能画出来的具体内容",
      "camera": "缓推",
      "motion": "笔触生长",
      "transition": "fade-in",
      "refs": ["01-墨山"]
    }
  ]
}
```

- `pacing` 二选一：`beat_cut`（音乐真有节奏，按拍切）/ `phrase_flow`（安静段，按乐句走，禁止硬套网格）。
- `camera` 是镜头运动，`motion` 是画面元素自己的运动。两个字段不要写同一件事。
- 格式示例见 `songs/_template/concept/storyboard.example.json`。
- **写完必须跑 `npm run mv:validate`**。它查时间轴连续性、越界、缺字段、歌词覆盖、段落边界，有 ERROR 不许往下走。

### `concept/asset-manifest.json`

素材清单。记录每个参考图的 id / 类型 / 路径 / 提示词 / 来源 / 审核状态 / 被哪些镜头引用。

```json
{
  "version": 2,
  "items": [
    {
      "id": "character-01", "type": "character", "origin": "user",
      "path": "assets/character/character-01-女主侧脸.png",
      "prompt": null, "source": "自己画的", "status": "approved",
      "usedIn": ["s03", "s11"], "notes": "必须保留左眼下的泪痣"
    }
  ]
}
```

`type`：`style-board` / `character` / `background` / `keyframe` / `clip`。
`status`：`draft` / `approved` / `rejected`。
`origin` 决定能不能进成片：

| origin | 含义 | 能不能进成片 |
|---|---|---|
| `user` | 你自己拍的、画的、提供的 | ✅ 可以 |
| `ai` | AI 生成的参考图 | ⚠️ 默认只做参考（1080p 放大会糊） |
| `found` | 网上找的 | ❌ 只能当参考，不能进成片 |

两个素材目录的分工：

- `assets/` —— 你带进来的原始素材，按 `character` / `background` / `reference` / `clip` 分目录
- `refs/` —— AI 生成的参考图

分镜的 `refs` 字段引用 manifest 里的 `id`，不写路径。换版本不用改分镜。

---

## 4. 八步流程

详细判据见 `docs/workflow.md`，提示词见 `prompts/`。

| 步 | 做什么 | 产物 | 谁做 |
|---|---|---|---|
| 0 | 建目录、素材归位 | `song.json` `source/` | `npm run mv:new` + 手工放文件 |
| 1 | 音频分析 | `analysis/*` | `npm run mv:analyze` |
| 2 | 歌词解读 | `concept/01-歌词解读.md` | `prompts/01` + ChatGPT/DeepSeek |
| 3 | MV 概念（两轮：选型 → 方案） | `concept/02-MV概念.md` | `prompts/02` |
| 4 | 风格定义（两轮：选样式 → 写规范） | `concept/00-风格定义.md` | `prompts/05` |
| 5 | 分镜 | `concept/storyboard.json` `03-分镜表.md` | `prompts/03` + **人审** |
| 6 | 参考图 | `refs/` `concept/prompts/` | `prompts/04` + ChatGPT Image |
| 7 | 渲染 | `out/` | Phase 2 |

### 4.1 新歌怎么起

**不要手工建目录。** 目录里有 10 个模板文件、`song.json` 的路径字段、`worklog.md` 的占位，手工建必漏。

| 入口 | 怎么做 | 适合 |
|---|---|---|
| **一句话（推荐）** | 打开项目，说「做《人生态度》王七七，文件在 `D:\Downloads\`」 | 日常 |
| 自己放文件 | `npm run mv:new -- "歌名-艺人"` 建目录，再往 `source/` 拖文件 | 想自己控制文件名 |
| 全手工 | 两条命令自己跑 | 调试脚本时 |

一句话给 AI 时，它应该做五件事并且**不停下来问**：

1. `npm run mv:new -- "歌名-艺人" --audio "…" --lrc "…"`（建档 + 导入 + 分析一条命令）
2. 报结果：时长 / BPM / 正文歌词行数 / 段落切点
3. 提醒 BPM 要人工核对
4. **跑 `prompts/00-素材盘点.md`，问清楚手上有没有人物 / 风格参考 / 背景 / 视频片段**，有就放进 `assets/` 对应子目录
5. 进 Step 2 跑 `prompts/01-歌词解读.md`

第 4 步不要省。**有没有素材决定整个方案往哪个方向长**：有人物设定就往角色走，有实拍就往拼贴走，什么都没有就走纯代码生成。做到一半才发现有素材能用 = 返工。

第 4 步的结论只有一句话：**画面里有多少是现成的，有多少是画出来的。**

命名规范：`<歌名>-<艺人>`，中间**一个**短横线。不加日期、不加序号、不加来源后缀。
`人生态度-王七七` ✅　`人生态度(1)-王七七-抖音版` ❌（改名会断 `song.json` 里的相对路径）

具体在哪些点停下来，见下面 4.2。

### 4.2 五个必须由人拍板的点

| 拍板点 | 在哪一步 | AI 给什么 | 人给什么 |
|---|---|---|---|
| **方向选型** | Step 3 第一轮 | 3 个差异明显的方向 + 六项决策建议 | 选哪个、要不要微调 |
| **概念确认** | Step 3 第二轮 | 完整方案 | 过 / 改 |
| **样式选型** | Step 4 第一轮 | 3 套样式（配色+字体+质感+风险） | 选哪套、要不要混搭 |
| **分镜** | Step 5 | storyboard.json + 校验结果 | 过 / 改 |
| **参考图** | Step 6 | 6–10 张 | 哪张换、哪张定 |

规矩只有一条：**AI 给选项，人做决定。** 不许出现"我建议用 A 方案"然后直接按 A 写下去 —— 建议可以给，但必须等人回话。

六项决策（在 Step 3 第一轮一起定）：

```
表现形式：纯图形 / 单主角 / 文字驱动 / 固定场景
视觉风格：水墨 / 像素 / 极简几何 / 拼贴 / 3D
是否出现人物：有 / 无 / 只剪影
色彩倾向：冷 / 暖 / 单色 / 高对比
节奏：快切 / 长镜 / 混合
画幅：竖屏 / 横屏 / 双版本
```

这六项没定，不许往下走。定了记在 `concept/02-MV概念.md` 的「最终选择」表里。

每完成一步，改 `worklog.md` 的状态和「当前阶段」，不要攒着。

---

## 5. 命令

```bash
npm run doctor                        # 环境自检，接手第一件事
npm run skills:link                   # 把 skill 链到各工具目录（幂等）
npm run stage -- 人生态度-王七七        # 看当前做到哪、缺什么（--next 推进）

npm run mv:new    -- "歌名-艺人"                              # 只建骨架
npm run mv:new    -- "歌名-艺人" --audio "x.mp3" --lrc "x.lrc"  # 建骨架 + 导入素材 + 自动分析

npm run mv:analyze -- 人生态度-王七七   # 单独重跑分析
npm run mv:validate -- 人生态度-王七七  # 分镜校验（时间轴/素材/歌词覆盖）
npm run mv:snap   -- 人生态度-王七七 --times 12,45,120   # Phase 2 抽帧
npm run mv:check  -- 人生态度-王七七    # Phase 2 成片质检
```

**接手项目第一件事永远是 `npm run stage -- <slug>`**，它比读五个文件快。想知道能不能往下走，也跑它。

不要各自发明命令。加新能力就加到 `package.json`，并在本文件登记。

---

## 6. 视觉原则

每首歌风格不同，但有四条通用底线：

1. **先定风格再切分镜**。`00-风格定义.md` 没写完，不要开分镜。否则 20 个镜头出 20 种风格。
2. **约束优先于形容词**。"墨黑 #0B0B0C 占 60%，朱红只出现在 3 处"是可执行的；"高级感"不是。
3. **参考图先出片头那张**。片头定调，不满意就改风格卡，不要往下出 10 张再回头。
4. **禁止清单必须具体**。写"不要星星、不要城市天际线、不要雨滴"，不要写"不要俗套"。

---

## 7. 已知坑

- **BPM 会算错**。低频被噪声带偏时会给出 2 倍/0.5 倍速。人工跟着节奏数一遍再信。
- **段落切分偏粗**。`analyze` 用的是能量跃升检测，安静段落之间可能漏切。分镜时以歌词行为准补切。
- **LRC 前几行是制作名单**。已标记为 `kind: "meta"`，做歌词画面时要过滤。
- **AI 生成图不能进成片**。1080p 下放大会糊，且风格会跳。只用来定色彩和构图。
- **参考图风格一跑偏，后面全偏**。出完一批要放在一起看缩略图，不一致的重出。

---

## 8. 多工具协作

- 改 `AGENTS.md` 等于改所有工具的行为。改完在 `docs/decisions.md` 记一行为什么。
- skill 真身只在 `.agents/skills/music-video/`。`.claude/skills/`、`.workbuddy/skills/`、`.cursor/skills/`、`.zcode/skills/` 都是 junction，**不要在里面直接编辑**。
- 外部 skill（HyperFrames / Remotion）按需装，不要一次装 25 个。
- 细节见 `docs/multi-tool.md`。

## 9. 端口

纯离线产物，不启常驻服务，不占根 `AGENTS.md` 的端口段。
