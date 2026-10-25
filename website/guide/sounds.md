# Sounds and input methods

Every sound is synthesised when the app starts, so a keystroke only starts a short buffer and is never
delayed. Sounds are placed in stereo where the type head stands and given a little of the room.

| You press | You hear |
| --- | --- |
| A letter, digit or symbol | A type bar striking the platen |
| <kbd>Space</kbd> | The space bar and the escapement |
| <kbd>Enter</kbd> | The line-space ratchet, the carriage sliding back and the margin stop |
| <kbd>↑</kbd> <kbd>↓</kbd> (shell history) | The platen knob turned one notch; the platen turns on screen |
| <kbd>←</kbd> <kbd>→</kbd> | One tooth of the escapement |
| <kbd>Tab</kbd> | The tabulator running to its stop |
| <kbd>Backspace</kbd>, <kbd>Delete</kbd> | A softer back-space |
| Near the right margin | The margin bell |
| Pulling the lamp cord | The chain and the click of the switch |
| Printing a folio | The paper rolled through, the lines typed, the wax seal pressed |

Shortcuts such as <kbd>Ctrl</kbd> <kbd>C</kbd> or <kbd>⌘</kbd> <kbd>V</kbd> strike no type.

## Input methods

Pinyin, kana, hangul and other input methods work exactly as in any terminal: the candidate window, the
composed text and what the shell receives are untouched. They get typewriter feedback too:

- each change of the composition (`n` → `ni` → `nih` …) strikes a key and moves the head,
- choosing or paging through candidates is a soft tap,
- committing the text lands as a firm double strike, and the committed characters receive type impressions
  once the shell shows them.

## Settings

Four voices (*Standard*, *Portable*, *Electric*, *Whisper*), *Volume*, the *Margin bell* and the sound as a
whole are in the Studio; the sound can also be switched from the View menu or with a shortcut.
