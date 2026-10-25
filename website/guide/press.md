# The Press and the Archive

The Press prints a piece of code or terminal output as a **folio**: set like a page of verse, numbered in
the margin every fourth line as editions of sonnets are, titled, dated, signed and sealed in wax. The paper,
the seal, the face of the text and the signature are yours to choose.

![A code snippet printed as a folio and sealed in wax](/images/press.jpg)

## Printing

1. Open the Press with the quill at the top right, from the View menu, or with <kbd>⌘</kbd> <kbd>⇧</kbd>
   <kbd>P</kbd> (macOS) / <kbd>Ctrl</kbd> <kbd>⇧</kbd> <kbd>P</kbd> (Windows and Linux).
2. Choose what to print:
   - **Selection**: the text selected in the terminal (chosen automatically when there is one),
   - **Screen**: the rows of the terminal as they are on screen now,
   - **Command**: the last command you ran, with everything it printed,
   - **Snippet**: anything you paste or type into the box.

   Only *Snippet* has a text box. The other three show how many lines they will print and the first few of
   them, and read the terminal again at the moment you print.
3. Give it a title and choose **Print and seal**. The folio is typed line by line with the sound of the
   machine, then the seal comes down.

<div class="folio">
<p class="caps">Sonnet XVIII</p>

```js
// Shall I compare thee to a summer's day?
function leaves(tree, depth = 0) {
  if (!tree.children.length) {
    return [tree.name];                                   // 4
  }
  return tree.children.flatMap((child) => leaves(child, depth + 1));
}
```

</div>

Text is kept as plain text: control characters and colours are dropped, tabs become spaces, long lines wrap
with a hanging indent, and blank lines become breaks between stanzas.

## Paper, seal and type

Under **Paper, seal and type** in the Press:

| Option | Choices |
| --- | --- |
| Paper | Laid (laid and chain lines), Cotton (fibres in a white rag sheet), Vellum (smooth, warm), Parchment (stained, darker at the edges), Night (a dark sheet with pale ink and gilt rubrics) |
| Wax | Crimson, Oxblood, Black, Gold, Emerald, Sapphire; each with its own silk |
| Monogram | One or two letters pressed into the seal |
| Emblem | A crescent with stars, a heraldic rose, a quill, or none |
| Silk ribbon | The two silk tails under the seal, or the seal alone |
| Text face | Typewriter (Courier Prime), Sonnet (EB Garamond, an upright book face), Display (Cormorant Garamond), IBM Plex Mono, the terminal's font, or any installed family |
| Signed | The name in “— set at the typewriter, by …”; empty, it reads *by lamplight* |

The seal beside the options shows what will be pressed. The seal itself is drawn with a raised, glossy lip
of wax, a few drops that ran off the pool, a beaded border, the emblem and monogram embossed in the field, and
the grain and highlights of real wax. A folio keeps the style it was printed with, so it looks the same when
you open it again from the Archive.

![The last command printed on night paper under a gold seal](/images/press-night.jpg)

## The Archive

With **Keep in the Archive** on (the default), every folio you print is kept and numbered: Sonnet I, II,
III… The **Archive** tab of the Press (<kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>O</kbd> / <kbd>Ctrl</kbd> <kbd>⇧</kbd>
<kbd>O</kbd>) lists them, newest first. For each one you can:

- open it to see the page again,
- **rename** it with ✎ (<kbd>Enter</kbd> keeps the new title, <kbd>Esc</kbd> cancels),
- **Save as image…**: write the page as a PNG wherever you choose,
- **Copy text**: put the original text on the clipboard,
- delete it (choose × and confirm).

To delete several at once, choose **Select**, tick them (or **Select all**), then **Delete** and confirm.

![Choosing folios in the Archive to delete them together](/images/archive-select.jpg)

**Open the archive folder** shows where the folios are kept: a folder named `archive` in the configuration
directory, one small JSON file per folio, on this computer only. Nothing is uploaded. If you print things you
would rather not keep, switch *Keep in the Archive* off in the Press or under *Press & Archive* in the Studio;
printed pages are then only shown, and can still be saved as an image.
