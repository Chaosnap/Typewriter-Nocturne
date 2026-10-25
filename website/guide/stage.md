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

## Scrolling: the paper clip and the rollers

The scrollbar is a paper clip hooked over the right edge of the sheet, its front loop on the paper and its
back loop showing beyond the edge. It glides to the scroll position and leans a little as it moves; drag it to
scroll. The wheel, the keyboard and the trackpad scroll as always.

**Double-click** the left roller of the paper bail to roll the paper to the top, the right one to roll it to
the bottom; the platen turns as it does.

![The paper clip on the edge of the sheet](/images/clip.jpg)

Under *Scrollbar* in the Studio you can choose:

| Style | |
| --- | --- |
| Paper clip (default) | Silver, brass, gold or black wire |
| Bar | A translucent white bar; its opacity and width are adjustable |
| System | The terminal's own scrollbar |

## Focus Mode and quiet

*Focus Mode* leaves only the sheet: the machine, the cord and every ornament go. In the Quiet section of the
Studio you choose what stays:

| Control | What it does |
| --- | --- |
| Focus background | Paper (the chosen paper), Dark (the night paper) or Custom (any colour; the ink turns pale or dark to suit it) |
| Paper in focus mode | Keeps the paper's texture, the type impressions and the ink selection |
| Light in focus mode | Keeps the lamp's light on the sheet |

![Focus Mode on the dark background](/images/focus-dark.jpg)

*All visual effects* in the Studio switches off light, glow, impressions and motion while keeping the layout.
To use the terminal exactly as Hyper draws it, set `"theme": "classic"` in `nocturne.json`.
