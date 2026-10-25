# 字体与 Nerd Font

## 字体选择

| 选项 | 说明 |
| --- | --- |
| Courier Prime（默认） | 内置；为屏幕绘制的打字机字体 |
| IBM Plex Mono | 内置 |
| JetBrainsMono、FiraCode、Hack、MesloLGS、CaskaydiaCove Nerd Font | 电脑上安装后即可使用 |
| JetBrains Mono、Monaspace Neon、Commit Mono、Recursive Mono、系统等宽字体 | 安装后即可使用 |
| Custom font…（自定义字体） | 输入任意已安装字体的名称 |

选择「Custom font…」后输入字体名称，输入时会出现候选。「Find installed fonts」会向系统查询电脑上安装的字体并加入候选列表。字体名称在使用前会校验（只允许字母、数字、空格、引号、逗号、点和连字符）。只填一个字体名会保留默认的回退字体；也可以填完整的字体栈，例如 `Iosevka, monospace`，自己指定回退。

## 每种字体都能显示 Nerd Font 图标

应用内置了 *Symbols Nerd Font*（MIT 许可），它紧跟在你选的字体之后，只用于图标所在的码位。因此 Starship、Oh My Posh、lsd、eza 或 Neovim 状态栏用到的 Powerline 分隔符、Devicons、Font Awesome 等 Nerd Font 图标，用 Courier Prime 或 IBM Plex Mono 也能正常显示，无需安装打过补丁的字体。

## 光标

光标是一滴墨：方块的边缘因墨水渗进纸里而柔和、略不规则，边沿因墨水积聚而稍深，方块下的字以纸张颜色显示（夜间纸上是浅色的墨）。它就落在纸上，台灯照字时也照着它。等待输入时，墨水会渗进纸里再慢慢涌回来，淡去时周围晕开一圈淡淡的墨晕，就像墨滴落在微湿的纸上；每按一个键，格子里都会压上新墨，停一会儿才再次淡去。失去焦点时只留下格子淡淡的轮廓。

Studio 的 Type 一栏里的「Cursor」还可以选 **Quill（羽毛笔）**：一支和方块一样大的羽毛笔，立在输入位置，笔尖落在行上（浅色纸上是乌鸦羽毛笔，深色纸上是天鹅羽毛笔，配鎏金笔尖），等待输入时轻轻呼吸。也可以选 Bar（竖线）和 Line（下划线）。无论选哪种，底层 xterm.js 都保留自己的光标，所以输入法、选择和读屏软件都和以前一样。

## 字号与行距

「Type size」（11 到 22 像素）和「Line spacing」（1.2 到 1.9）在同一栏。终端的字符网格始终严格等宽，中日韩双宽字符保持占两格。
