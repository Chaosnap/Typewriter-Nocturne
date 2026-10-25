# Questions

## I see the sheet, but no typewriter and no light.

Your computer has no GPU the app can use, which is common in virtual machines and over remote desktop, so the
*Auto* quality keeps the terminal fast and draws only the sheet. Set *Quality* to *High* or *Low* in the Studio
(under *Quiet*) to draw the full stage anyway. The last line of the Studio says what is being drawn.

## Does it work with Chinese, Japanese or Korean input?

Yes. Input methods work as in any terminal and get typewriter feedback while you compose and when you commit;
see [Sounds and input methods](./sounds#input-methods).

## My Nerd Font icons show as boxes.

The Symbols Nerd Font is bundled and used after every face, so icons should render with any font. If you typed
a whole font stack as a custom font, type a single family name instead to keep the default fallbacks.

## Will it slow my terminal down?

Effects are never on the input path. The heavy layers (the model and the light) are redrawn only when
something visible changes, nothing is drawn while nothing moves, shaders compile in the background, and the
stage simplifies itself if frames become slow.

## Where are my printed folios?

In the `archive` folder of the [configuration directory](./settings). Use *Open the archive folder* in the
Press, or switch *Keep in the Archive* off if you would rather not keep them.

## Can I have the plain Hyper look?

Set `"theme": "classic"` in `nocturne.json`. Focus Mode is a quicker way to hide everything but the sheet.
