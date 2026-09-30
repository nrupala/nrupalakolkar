# Demonstrator clip mapping

Human demonstrator clips for the three movement routines. Each step plays its
mapped clip on loop (muted, `playsinline`, autoplay). Woman is the default
character; Man is selectable and persisted globally via `localStorage`
(`scd-char`). Switching character mid-routine re-renders the figure only —
timers and the current step are untouched.

Clip files: `{movement}-her.mp4` / `{movement}-him.mp4` (480×960, 24fps,
~10s loops, fast-start, no audio). 33 of 38 planned clips are present.

## Step → movement map

### Lymphatic Drainage Workout (`/selfcare/lymphatic-drainage-workout/`)

| # | Step | Movement key | Clip |
|---|------|--------------|------|
| 1 | Neck Rolls | `neck-roll` | neck-roll-her.mp4 / neck-roll-him.mp4 |
| 2 | Shoulder Blade Series | `shoulder-roll` | shoulder-roll-her.mp4 / shoulder-roll-him.mp4 |
| 3 | Standing Chest Openers | `chest-open` | chest-open-her.mp4 / chest-open-him.mp4 |
| 4 | Ballerina Stretch | `side-stretch` | side-stretch-her.mp4 / side-stretch-him.mp4 |
| 5 | Forward Body Rolls | `forward-roll` | forward-roll-her.mp4 / forward-roll-him.mp4 |
| 6 | Trunk Rotation | `trunk-twist` | trunk-twist-her.mp4 / trunk-twist-him.mp4 |
| 7 | Bridges | `bridge` | bridge-him.mp4 · **bridge-her.mp4 missing** → her lying still |
| 8 | Alternating Knee to Chest | `knee-chest` | knee-chest-her.mp4 / knee-chest-him.mp4 |
| 9 | Hamstring Floss | `leg-floss` | leg-floss-her.mp4 · **leg-floss-him.mp4 missing** → him lying still |
| 10 | Belly Breathing | `belly-breathe` | belly-breathe-him.mp4 · **belly-breathe-her.mp4 missing** → her seated still |

### Sinus Relief (`/selfcare/sinus-relief/`)

| # | Step | Movement key | Clip |
|---|------|--------------|------|
| 1 | The Collarbone Pump | `collarbone` | collarbone-her.mp4 / collarbone-him.mp4 |
| 2 | Diaphragmatic 360 Breathing | `belly-breathe` | belly-breathe-him.mp4 · **belly-breathe-her.mp4 missing** → her seated still |
| 3 | Cactus Arm Chest Opener | `cactus` | cactus-her.mp4 / cactus-him.mp4 |
| 4 | Seated Cat-Cow with Neck Release | `cat-cow` | cat-cow-her.mp4 / cat-cow-him.mp4 |
| 5 | SCM Neck Stretch & Drainage | `neck-tilt` | neck-tilt-her.mp4 · **neck-tilt-him.mp4 missing** → him standing still |

### Full-Body Lymphatic (`/selfcare/full-body-lymphatic/`)

| # | Step | Movement key | Clip |
|---|------|--------------|------|
| 1 | Deep 360 Breathing with Arm Sweeps | `arm-sweep` | arm-sweep-her.mp4 / arm-sweep-him.mp4 |
| 2 | Neck Rolls & Shoulder Shrugs | `neck-roll` | neck-roll-her.mp4 / neck-roll-him.mp4 |
| 3 | The Washing Machine | `trunk-twist` | trunk-twist-her.mp4 / trunk-twist-him.mp4 |
| 4 | Calf Raises with Overhead Reach | `calf-raise` | calf-raise-her.mp4 · **calf-raise-him.mp4 missing** → him standing still |
| 5 | Good Mornings & Thoracic Rotation | `good-morning` | good-morning-her.mp4 / good-morning-him.mp4 |
| 6 | Knee Lifts with Opposite Arm Pull-Down | `knee-arm` | knee-arm-her.mp4 / knee-arm-him.mp4 |
| 7 | Full-Body Bounce | `bounce` | bounce-her.mp4 / bounce-him.mp4 |

Note: step 2 of Full-Body Lymphatic is a combined "Neck Rolls & Shoulder
Shrugs" with one clip slot; it maps to `neck-roll` (both clips exist and
either could be used — `shoulder-roll` is the alternate).

## Missing clips (retry later — still placeholders)

| Clip | Placeholder still | Used by |
|------|-----------------|---------|
| `belly-breathe-her.mp4` | `stills/her-seated.webp` | Lymphatic #10, Sinus #2 |
| `bridge-her.mp4` | `stills/her-lying.webp` | Lymphatic #7 |
| `neck-tilt-him.mp4` | `stills/him-neutral.webp` | Sinus #5 |
| `calf-raise-him.mp4` | `stills/him-neutral.webp` | Full-Body #4 |
| `leg-floss-him.mp4` | `stills/him-lying.webp` | Lymphatic #9 |

Placeholders render with a "Preview still — full motion clip coming soon"
badge and are marked with `TODO(clip-retry)` in `shared/demos.js`.
When the clips are generated: drop the mp4s in this directory and remove
the corresponding `MISSING` entries in `demos.js`.

## Still poses (reduced-motion + placeholders)

`stills/her-neutral.webp`, `stills/him-neutral.webp` (standing),
`stills/her-seated.webp`, `stills/him-seated.webp`,
`stills/her-lying.webp`, `stills/him-lying.webp`.
With `prefers-reduced-motion`, every step renders its pose-matched still
instead of video; overlay markers still render.

## Overlay layers

`shared/demos.js` renders the overlay as a layer system
(`SCDemos.layers`, `SCDemos.activeLayers`). The `lymphatic` layer shows
approximate node/vessel zones per movement framing (stand, waist-up crop,
seated, side-lying). Positions are orientation aids, not clinical precision.
Future layers (muscles, skeleton, nervous system) register in `LAYERS` with
the same `{ id, label, render(move) }` shape.

## Home lists

Exercise home lists keep the lightweight `shared/moves.js` SVG pictograms
(one video per row would be too heavy on mobile); the video demonstrator
renders in the player screen.
