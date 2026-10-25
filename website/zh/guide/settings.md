# 设置文件

| 系统 | 配置目录 |
| --- | --- |
| macOS、Linux | `~/.config/TypewriterNocturne/` |
| Windows | `%APPDATA%\Typewriter Nocturne\` |

目录中包含：

- `hyper.json`：终端设置（Shell、环境变量、快捷键、插件），与 Hyper 相同；
- `nocturne.json`：Studio 里的所有设置；
- `archive/`：保存的诗笺，每张一个 JSON 文件。

不会读取或修改已有的 Hyper 安装，也不会动你 Shell 的启动文件。

## nocturne.json

这个文件由 Studio 写入，也可以手动编辑。读取时每个值都会校验，未知或超出范围的值会回退为默认值。

```json
{
  "theme": "paper-and-ink",
  "focusMode": false,
  "effects": true,
  "paper": { "style": "cotton", "texture": 1, "width": 0 },
  "lighting": {
    "enabled": true,
    "preset": "balanced",
    "intensity": 1,
    "spread": 74,
    "beam": "pointed",
    "aim": 0,
    "reach": 1,
    "window": { "columns": 3, "rows": 2, "slant": 0, "x": 0.34, "y": 0.25 },
    "softness": 0.65,
    "particles": 0.45,
    "grain": 0.1,
    "quality": "auto"
  },
  "typography": {
    "font": "courier-prime",
    "customFamily": "",
    "fontSize": 15,
    "lineHeight": 1.4,
    "cursorStyle": "quill",
    "selectionStyle": "ink"
  },
  "typewriter": {
    "sound": true,
    "volume": 0.45,
    "voice": "standard",
    "marginBell": true,
    "carriage": true,
    "impression": 0.8
  },
  "print": {
    "keepInArchive": true,
    "style": {
      "paper": "laid",
      "sealColor": "crimson",
      "monogram": "N",
      "emblem": "moon",
      "seal": true,
      "ribbon": true,
      "ribbonStyle": "tails",
      "font": "typewriter",
      "customFont": "",
      "signature": ""
    }
  },
  "chrome": { "pullCord": true },
  "focus": { "background": "paper", "color": "#1c1916", "paper": true, "lighting": false },
  "scrollbar": { "style": "clip", "finish": "silver", "barOpacity": 0.45, "barWidth": 6 }
}
```

| 键 | 取值 |
| --- | --- |
| `theme` | `paper-and-ink`、`midnight-study`、`moonlit-poetry`，或 `classic`（Hyper 原本的外观） |
| `paper.style` | `cotton`、`laid`、`linen`、`onionskin`、`parchment`、`night` |
| `lighting.quality` | `auto`、`high`、`medium`、`low` |
| `lighting.spread` / `aim` | 光束角度 20–160°，朝向 −45° 到 45° |
| `typography.font` | `courier-prime`、`ibm-plex-mono`、`jetbrains-mono-nf`、`fira-code-nf`、`hack-nf`、`meslo-nf`、`caskaydia-nf`、`custom` 等 |
| `typewriter.voice` | `standard`、`portable`、`electric`、`whisper` |
| `typography.selectionStyle` | `ink`（墨水消散）、`classic`（xterm 方框） |
| `print.style.paper` | `laid`、`cotton`、`vellum`、`parchment`、`night` |
| `print.style.sealColor` | `crimson`、`oxblood`、`black`、`gold`、`emerald`、`sapphire` |
| `print.style.emblem` | `moon`、`rose`、`quill`、`none` |
| `print.style.font` | `typewriter`、`sonnet`、`display`、`plex`、`terminal`、`custom`（使用 `customFont`） |
| `print.style.signature` | “set at the typewriter, by” 后面的名字，最多 40 个字符 |
| `focus.background` | `paper`、`dark`、`custom`（使用 `focus.color`） |
| `scrollbar.style` / `finish` | `clip`、`bar`、`native` / `silver`、`brass`、`gold`、`black` |
| `scrollbar.barOpacity` / `barWidth` | 0.1–0.9 / 3–12 像素 |
| `typography.cursorStyle` | `quill`（默认）、`block`、`bar`、`underline` |
| `lighting.beam` | `pointed`（默认）、`soft` |
| `print.style.seal` | `true` 盖火漆，`false` 不盖火漆 |
| `print.style.ribbonStyle` | `tails`（默认）、`loop`、`band`、`cross`、`banner`、`pendant` |
| `paper.width` | 0（最窄，默认）到 1（铺满整根滚筒） |
| `lighting.source` | `theme`（默认）、`carriage`、`desk-lamp`、`moonlight` |
| `lighting.window` | 月光的窗户：`columns` 和 `rows` 1–6，`slant` −35° 到 35°（0 为端正），`x` 和 `y` 0–1 |
