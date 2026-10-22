# 让多个 AI 工具都懂这个项目

目标：Codex、Claude Code、WorkBuddy、ZCode、Cursor 打开同一个目录，**行为一致**。不靠"每次都跟它解释一遍"。

原理只有一条：**真身只有一份，其余都是指针。**

---

## 一、三层共享

| 层 | 真身位置 | 作用 | 谁读 |
|---|---|---|---|
| 规则 | `AGENTS.md` | 目录契约、数据格式、命令、禁忌 | 几乎所有工具 |
| 技能 | `.agents/skills/music-video/SKILL.md` | 八步流程、常见错误、判断标准 | 支持 Agent Skills 的工具 |
| 命令 | `package.json` | 实际执行入口 | 全部（都走 shell） |

配套的薄壳：

- `CLAUDE.md` → 内容只有 `@AGENTS.md` + 三条 Claude 专属说明
- `.claude/skills/` `.workbuddy/skills/` `.cursor/skills/` `.zcode/skills/` → 指向 `.agents/skills/` 的 junction

**永远不要在这些薄壳里写实质内容。** 写了就会有两个真相，迟早不一致。

---

## 二、各工具认哪些文件

| 工具 | 自动读的项目规则 | skill 查找目录 |
|---|---|---|
| Codex CLI | `AGENTS.md` | `.agents/skills/`、`~/.codex/skills/` |
| Claude Code | `CLAUDE.md`（本项目里 @ 了 AGENTS.md） | `.claude/skills/` |
| Cursor | `AGENTS.md`、`.cursor/rules` | `.agents/skills/`、`.cursor/skills/` |
| WorkBuddy | `AGENTS.md`（项目上下文） | `.workbuddy/skills/` |
| ZCode | `AGENTS.md` | `.zcode/skills/` |
| Gemini CLI / Copilot CLI | `AGENTS.md` | 多数兼容 `.agents/skills/` |

不确定的工具：先放 `AGENTS.md`，它有极大概率会被读；skill 用 junction 兜底，不生效也能靠 AGENTS.md 里的流程说明跑。

---

## 三、新建环境后做这三步

```bash
# 1. 环境自检（缺什么一目了然）
npm run doctor

# 2. 建 skill 链接（幂等，重复跑没事）
npm run skills:link

# 3. 验证：随便挑一个工具，打开项目问它
#    "这个项目的第二步该做什么？产物放哪？"
#    答对了说明 AGENTS.md 被读到了
```

---

## 四、junction 是什么，为什么不用软链接

Windows 上 `mklink /D`（符号链接）需要管理员权限，`mklink /J`（junction）不需要。

`tools/link-skills.mjs` 在 Windows 用 `/J`，在 macOS/Linux 用 `fs.symlinkSync`。

验证链接是否真的指向真身：

```bash
# 改一下链接里的文件，看真身有没有变
echo "" >> .workbuddy/skills/music-video/SKILL.md
ls -la .agents/skills/music-video/SKILL.md   # 修改时间应该是刚刚
```

**坑**：
- 目标已存在时 `mklink` 会失败 —— 脚本会先删后建，但如果你手动在链接目录里新建过文件，可能删掉你的东西。用 `--force` 前先确认。
- Git 不跟踪 junction。clone 到新机器后要重跑 `npm run skills:link`。
- 某些工具有缓存，链完要重启工具才认。

---

## 五、外部 skill 怎么装

本项目**不自带** HyperFrames / Remotion 的 skill，按需装，不要一次装 25 个（会白占上下文）。

```bash
# HyperFrames 官方 25 个（含 music-to-video）
npx skills add heygen-com/hyperframes -a codex -a claude-code -a cursor --copy

# 只装一个也行
npx skills add heygen-com/hyperframes -a codex --skill music-to-video --copy
```

装完会在 `.agents/skills/` 落地，其他工具通过 junction 也能读到。

Remotion 官方 12 个已在 `~/.codex/skills/remotion-*`，本项目要用的时候再链过来。

---

## 六、给"下一个工具"的交接话术

换个工具接手时，开场直接说：

```
读 AGENTS.md 和 songs/<歌名>/worklog.md，然后告诉我现在该做哪一步。
不要重做已完成的步骤，不要改 analysis/ 里的文件。
```

`worklog.md` 是关键 —— 它记录了做到哪、有什么已知问题、做过什么决定。比读一堆文件快。

---

## 七、容易出问题的三件事

| 现象 | 原因 | 处理 |
|---|---|---|
| 某个工具完全不知道项目约定 | 它不读 AGENTS.md | 在对话里明确说"读 AGENTS.md"，或给它 CLAUDE.md 这类它认的入口 |
| 两个工具改了同一个文件，互相覆盖 | 没有单一真源，各写一份 | 只改真身，薄壳永远只放指针 |
| skill 改了但工具没反应 | 工具有缓存 | 重启工具；确认链接没断 |
