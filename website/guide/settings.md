# Settings files

| System | Configuration directory |
| --- | --- |
| macOS, Linux | `~/.config/TypewriterNocturne/` |
| Windows | `%APPDATA%\Typewriter Nocturne\` |

It holds:

- `hyper.json`: the terminal (shell, environment, keymaps, plugins), as in Hyper,
- `nocturne.json`: everything the Studio sets,
- `archive/`: kept folios, one JSON file each.

An existing Hyper installation is never read or changed, and your shell's start-up files are never touched.

## nocturne.json

The Studio writes this file; you can also edit it by hand. Every value is checked when it is read, and
anything unknown or out of range falls back to its default.

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

| Key | Values |
| --- | --- |
| `theme` | `paper-and-ink`, `midnight-study`, `moonlit-poetry`, or `classic` for Hyper's own look |
| `paper.style` | `cotton`, `laid`, `linen`, `onionskin`, `parchment`, `night` |
| `lighting.quality` | `auto`, `high`, `medium`, `low` |
| `lighting.spread` / `aim` | beam angle 20–160°, swivel −45° to 45° |
| `typography.font` | `courier-prime`, `ibm-plex-mono`, `jetbrains-mono-nf`, `fira-code-nf`, `hack-nf`, `meslo-nf`, `caskaydia-nf`, `custom`, … |
| `typewriter.voice` | `standard`, `portable`, `electric`, `whisper` |
