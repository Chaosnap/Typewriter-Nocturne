# The Press and the Archive

The Press prints a piece of code or terminal output as a **folio**: set like a page of verse on laid paper,
numbered in the margin every fourth line as editions of sonnets are, titled, dated, signed and sealed in
red wax.

![A code snippet printed as a folio and sealed in wax](/images/press.jpg)

## Printing

1. Open the Press with the quill at the top right, from the View menu, or with <kbd>⌘</kbd> <kbd>⇧</kbd>
   <kbd>P</kbd> (macOS) / <kbd>Ctrl</kbd> <kbd>⇧</kbd> <kbd>P</kbd> (Windows and Linux).
2. Choose what to print:
   - **Selection**: the text selected in the terminal (chosen automatically when there is one),
   - **Screen**: the rows of the terminal as they are on screen now,
   - **Snippet**: anything you paste or type into the box.
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

## The Archive

With **Keep in the Archive** on (the default), every folio you print is kept and numbered: Sonnet I, II,
III… The **Archive** tab of the Press (<kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>O</kbd> / <kbd>Ctrl</kbd> <kbd>⇧</kbd>
<kbd>O</kbd>) lists them, newest first. For each one you can:

- open it to see the page again,
- **Save as image…**: write the page as a PNG wherever you choose,
- **Copy text**: put the original text on the clipboard,
- delete it (choose × and confirm).

**Open the archive folder** shows where the folios are kept: a folder named `archive` in the configuration
directory, one small JSON file per folio, on this computer only. Nothing is uploaded. If you print things you
would rather not keep, switch *Keep in the Archive* off in the Press or under *Press & Archive* in the Studio;
printed pages are then only shown, and can still be saved as an image.
