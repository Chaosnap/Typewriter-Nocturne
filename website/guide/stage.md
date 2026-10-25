# The stage and quality

Your shell is typed onto a sheet that stands in a typewriter. The text always ends above the paper bail, so
the machine never covers a character, and the window can be resized freely; the terminal refits to the
sheet exactly as it would to a plain window.

## The typewriter

The model is drawn with physically based materials, soft shadows and a dark study for its reflections:
a rubber platen with chrome end caps and bakelite knobs, the carriage-return lever, a paper bail with knurled
rollers, a clear-coated enamel body, ribbon spools on the deck, a satin-nickel scale engraved with one tick
per terminal column, and the name in gold leaf.

The type head rides a polished rail. A rack below it has one tooth per column, so the escapement moves the
head exactly one tooth per keystroke. It accelerates, is stopped by the next tooth with a small rebound, and
because it hangs from the rail it sways a little when it stops or hits the margin. Each key throws the head
at the platen and lifts the ribbon. The head follows the cursor of the active terminal; in full-screen
programs such as Vim or htop it follows wherever the program puts the cursor.

## Quality

| Quality | What is drawn |
| --- | --- |
| **Auto** (default) | The full stage on a real GPU. Without one (virtual machines, remote desktops, some servers) only the plain sheet, the impressions and the sounds, so the terminal stays fast. |
| **High** | The full stage with soft shadows at full resolution, on any GPU. |
| **Medium** | Sharper shadows at up to 1.5× resolution. |
| **Low** | No shadows, 1× resolution. |

Shaders compile in the background, so the window never waits for them; the machine appears once it is ready.
If animation ever runs slowly, the stage switches itself to simple drawing without motion. The Studio shows
what is being drawn at the end of its last section.

## Focus Mode and quiet

*Focus Mode* hides the machine, the light and every ornament, leaving the sheet. *All visual effects* in the
Studio switches off light, glow, impressions and motion while keeping the layout. To use the terminal exactly
as Hyper draws it, set `"theme": "classic"` in `nocturne.json`.
