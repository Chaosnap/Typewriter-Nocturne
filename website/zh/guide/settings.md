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
  "paper": { "style": "cotton", "texture": 1 },
  "lighting": {
    "enabled": true,
    "preset": "balanced",
    "intensity": 1,
    "spread": 74,
    "aim": 0,
    "reach": 1,
    "softness": 0.65,
    "particles": 0.45,
    "grain": 0.1,
    "quality": "auto"
  },
  "typography": {
    "font": "courier-prime",
    "customFamily": "",
    "fontSize": 15,
    "lineHeight": 1.4
  },
  "typewriter": {
    "sound": true,
    "volume": 0.45,
    "voice": "standard",
    "marginBell": true,
    "carriage": true,
    "impression": 0.8
  },
  "print": { "keepInArchive": true }
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
