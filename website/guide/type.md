# Type and Nerd Fonts

## Typefaces

| Choice | Notes |
| --- | --- |
| Courier Prime (default) | Bundled; a typewriter face drawn for the screen |
| IBM Plex Mono | Bundled |
| JetBrainsMono, FiraCode, Hack, MesloLGS, CaskaydiaCove Nerd Font | Used when installed on your computer |
| JetBrains Mono, Monaspace Neon, Commit Mono, Recursive Mono, system monospace | Used when installed |
| Custom font… | Any installed family you name |

Choose *Custom font…* and type a family name; suggestions appear as you type. *Find installed fonts* asks the
system for the families installed on your computer and adds them to the suggestions. A family name is
checked before use (letters, digits, spaces, quotes, commas, dots and dashes only). Type a single name to keep
the default fallbacks, or a whole stack such as `Iosevka, monospace` to set them yourself.

## Nerd Font icons with every face

The *Symbols Nerd Font* (MIT) is bundled and used right after whichever face you choose, only for the code
points of icons. Powerline separators, Devicons, Font Awesome and the other Nerd Font icons used by Starship,
Oh My Posh, lsd, eza or a Neovim status line therefore render with Courier Prime or IBM Plex Mono too, without
installing a patched font.

## The quill cursor

The cursor is a quill pen standing at the insertion point, its nib on the line: a raven quill on light paper,
a swan quill on dark paper, with a gilt nib in the theme's metal. It breathes softly, a light runs up its vane
and its nib glints while the terminal waits for you; it rests, dimmed, when the terminal is not focused, and
disappears when a program hides the cursor or you scroll back. Underneath, xterm.js keeps its own cursor (an
invisible bar), so input methods, selection and screen readers work as before. *Cursor* in the Type section
of the Studio also offers Block, Bar and Line.

## Size and spacing

*Type size* (11 to 22 px) and *Line spacing* (1.2 to 1.9) are in the same section. The terminal's cell grid
stays strictly monospace; CJK double-width characters keep their two cells.
