# The lamp and its cord

## Pull the cord

A long, slender cord comes down from the top edge of the room, like the cord of a theatre curtain: crimson
silk twisted with gold, ending in a tassel as passementerie makers build them: a gilt bead, a pear-shaped mould
wound in crimson silk and laced with gold cords, a twisted gold band at its foot, and under it a skirt of fine
silk threads that draws in at the middle and flares at the ends. Pull it down
to switch the lamp on or off. It stretches as you pull, the switch clicks at the bottom of its travel, and the
cord springs back and swings; every thread of the tassel swings on its own, a little behind the cord. A click
on the cord, or <kbd>Enter</kbd> when it has keyboard focus, pulls it once. The View menu and a shortcut switch
the lamp too; the cord stirs when they do.

*Pull cord* in the Lamp section of the Studio hides or shows it. It never appears in Focus Mode.

## The light

Each theme has its own light:

| Theme | Light |
| --- | --- |
| Paper & Ink | A small lamp on the carriage, shining up the page from the type head |
| Midnight Study | A desk lamp above the right of the sheet |
| Moonlit Poetry | Moonlight falling through a window frame |

The light follows physics: irradiance falls with the square of the distance, follows Lambert's cosine law
and has a soft-edged cone; moonlight arrives in parallel rays and casts the shadow of the window bars. The
paper is lit as albedo × irradiance, so ink and paper darken and brighten together. The room may dim the page
away from the lamp, but never so far that ink drops below a contrast of 4.5:1. The lamp lights the sheet as if
it were flat, so its pool is smooth (shaded by a low lamp, every fibre would cast a speck of shadow), and the
paper you chose keeps its own texture in the light, a little quieter under the bulb, so text right under the
lamp reads as clearly as anywhere else.

On Paper & Ink the beam is a clean triangle: it comes to a point at the type head and opens up the page,
fading as it goes. The *Balanced* preset brings it back after any changes.

On a dark sheet the lamp also adds its own light: the sheet itself lit, warm and dim, with a soft bloom round
it, computed from the same model at a resolution fine enough that the beam never steps where it narrows to the
bulb, and kept faint enough that ink still reads at 4.5:1 in the brightest spot. A desk lamp spills a little
warmth into the corner nearest to it. Moonlight falls through an upright window of square panes, three across
and two down unless you choose otherwise, its bars softly edged, set in blue night shadow.

## Settings in the Studio

| Control | What it does |
| --- | --- |
| Lamp | On or off (the same as the cord) |
| Pull cord | Shows or hides the cord |
| Preset | Off, Balanced or Cinematic |
| Light | Theme (each theme's own light), Carriage, Desk lamp or Window (moonlight), whatever the theme |
| Brightness | How much light reaches the page |
| Beam angle | How wide the cone of light opens, 20° to 160° |
| Beam | Pointed (default): the cone narrows to the bulb. Soft: it opens gently round the bulb, as a large bulb's does |
| Aim | Swivels the lamp left or right, up to 45° |
| Panes across, Panes down | The window's panes, 1 to 6 each way (moonlight only) |
| Slant | 0° casts the window upright; up to 35° either way leans it as low, side light does (moonlight only) |
| Across the page, Down the page | Where the window's light falls on the sheet (moonlight only) |
| Reach | How far up the page the lamp throws its light; for moonlight, how large the window's panes are |
| Softness | How gradually the edge of the beam, or of the window and its bars, falls off |
| Dust in the beam | Motes drifting through the light |
| Film grain | Fine grain over the page; above 20% it flickers like film |
