# HALLOW NIGHT

An atmospheric Halloween 2D platformer for the browser — 35 hand-authored levels across 7 worlds, a public level editor, and a separate (unlinked) built-in level creator. Everything is data-driven: **every level is a JSON file** interpreted by one game engine.

Built with **TypeScript + Vite + Phaser 3**. No backend, no database, no accounts, no external services. All art is original vector (SVG) generated in code; all sound is synthesised with the Web Audio API.

---

## Hosting on GitHub Pages

The repository **is** the website: the built game sits at the repository root (`index.html`, `assets/`, `editor/`, `secret-creations/`) and the levels are plain JSON files in `levels/`. Nothing needs to be installed or run locally.

**Setup:** **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch **main**, folder **/ (root)**.

| Page | Address |
| --- | --- |
| Game | https://coding-joule.github.io/Hallow-Night/ |
| Public level editor | https://coding-joule.github.io/Hallow-Night/editor/ |
| Built-in level creator | https://coding-joule.github.io/Hallow-Night/secret-creations/ |

* **Levels are loaded at runtime**, so adding or editing a level file on GitHub goes live as soon as Pages redeploys the branch (about a minute) — no rebuild.
* The workflow `.github/workflows/site.yml` runs on every push: it validates all levels and runs the tests, and rebuilds and commits the site files if game/editor code under `src/` or `web/` changed. A red ❌ in the **Actions** tab means something is wrong — open it to see which level or test failed.
* Don't edit the root `index.html`, `assets/`, `editor/index.html` or `secret-creations/index.html` by hand — they are generated. The page sources are in `web/`.

### Developer URL flags

| Flag | Effect |
| --- | --- |
| `?unlock` (or `?dev=1`) | All levels unlocked in Level Select |
| `?level=12` or `?level=clocktower-27` | Jump straight into a level |
| `?lowres` | Render at 1× instead of 2× (same as turning off *Sharp rendering*) |

---

## Controls

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move | ← → / A D | Stick / D-pad |
| Jump (hold for higher) | Space, Z, W, ↑, K | A |
| Dash | Shift, X, J | X / B / RB |
| Crouch · drop through thin ledges | ↓ / S · ↓ + Jump | Down |
| Pause · Restart | Esc / P · R | Start · Select |

Abilities unlock as you progress: **wall slide & wall jump** (World 3), **dash** (World 5), **double jump** (World 6).
Movement uses coyote time, jump buffering, variable jump height, corner correction and a fixed 120 Hz simulation.

---

## Project structure

```
levels/                     the 35 built-in levels (<world>/<NN-name>.json) + manifest.json
index.html, assets/,        the BUILT site served by GitHub Pages (generated — don't edit)
editor/, secret-creations/
web/                        page sources (index.html, editor/, secret-creations/)
src/
  main.ts / editor-main.ts / creator-main.ts   page entry points
  game/
    config/        physics.ts (movement tuning), game.ts, storageKeys.ts
    levels/        schema.ts, objectTypes.ts, validate.ts, serialize.ts,
                   registry.ts (loads levels/), worlds.ts
    sim/           pure-TypeScript simulation (no Phaser): World, Player,
                   entities/ (terrain, platforms, hazards, interactive, enemies)
    render/        Phaser views, parallax backgrounds, effects, SVG art (art/)
    scenes/        BootScene, MenuScene, GameScene (+ GameHost interface)
    systems/       SaveSystem, Settings, AudioSystem, InputSystem, Storage
    GameApp.ts     main page flow (title, level select, HUD, pause, results)
  editor/          shared editor engine: EditorState, History, EditorShell,
                   canvas/, panels/ (palette, inspector), Playtest, storage/
                   PublicEditorApp.ts
  creator/         SecretCreatorApp.ts
  ui/              DOM helpers, HUD, menu screens
  styles/          CSS
tests/             Vitest suites (run by the workflow)
scripts/           build publishing + level reachability checker
```

**Key architecture decisions**

* **One loader, one engine.** Built-in levels, user levels, imported files and editor playtests all go through `parseLevel()` (validation + defaults) and then the same `World` simulation and `GameScene`. The editors' Playtest button runs the real game in an overlay — there is no separate preview engine.
* **Simulation is separate from rendering.** `src/game/sim` is plain TypeScript: it can be unit-tested and run headless (the tests and the reachability checker do exactly that). `src/game/render` only reads simulation state.
* **The object registry (`objectTypes.ts`) is the single source of truth** for every object type: its category, default size, resizable axes and properties. The editor inspector, the validator and the defaults are all generated from it — add a property there and it is editable and validated everywhere.
* **Levels are data files fetched at runtime.** `registry.ts` loads `levels/manifest.json` and every file it lists, validating each; a broken file is skipped (and logged) without breaking the rest of the game. That is what lets you edit levels on GitHub without rebuilding anything.

---

## Level JSON format

An abbreviated example:

```json
{
  "version": 1,
  "id": "haunted-manor-18",
  "name": "Servants' Passage",
  "world": "haunted-manor",
  "order": 3,
  "number": 18,
  "width": 6720,
  "height": 1280,
  "spawn": { "x": 80, "y": 384 },
  "goal": { "x": 6544, "y": 480 },
  "background": "haunted-manor",
  "music": "haunted-manor",
  "abilities": { "wallJump": true, "dash": false, "doubleJump": false },
  "objects": [
    { "id": "ground-1", "type": "ground", "x": 0, "y": 384, "width": 1088, "height": 64, "properties": { "style": "wood" } },
    { "id": "timed-switch-1", "type": "timedSwitch", "x": 388, "y": 352, "width": 24, "height": 32,
      "properties": { "targets": ["gate-1"], "duration": 3 } },
    { "id": "gate-1", "type": "gate", "x": 768, "y": 192, "width": 32, "height": 192,
      "properties": { "initiallyOpen": false, "openDirection": "up", "speed": 400 } }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `version` | Schema version — always `1` |
| `id` | Unique id: lowercase letters, digits and dashes (built-ins use `<world>-<NN>`) |
| `name` | Display name |
| `world` | `old-town`, `graveyard`, `dead-woods`, `haunted-manor`, `catacombs`, `clocktower`, `black-castle` |
| `order` | Position inside its world (1–5) |
| `number` | Global level number (1–35); optional for user levels |
| `width`, `height` | Level size in pixels (one tile = 32 px; the screen shows 960 × 540) |
| `spawn`, `goal` | **Bottom-centre** points (player's feet / exit door threshold) |
| `background`, `music` | Which world's backdrop and music to use (defaults to `world`) |
| `abilities` | Extra abilities available in this level |
| `objects` | Everything else |

**Coordinates:** pixels, origin at the top-left, +y goes down. Every object's `x`,`y` is its **top-left** corner. Falling below `height` kills the player.

**Objects** always have `id`, `type`, `x`, `y`, `width`, `height` and `properties`. Missing properties are filled with defaults when loading (the built-in creator's validator requires them all).

| Type | Category | Description | Properties (default) |
| --- | --- | --- | --- |
| `ground` | terrain | Solid terrain. Use for floors, walls and ceilings. | `style`="auto" (auto / earth / stone / brick / wood / bone / iron) |
| `platform` | terrain | A solid block or ledge. | `style`="auto" (auto / earth / stone / brick / wood / bone / iron) |
| `oneWay` | terrain | Can be jumped through from below. Hold DOWN + JUMP to drop through. | `style`="wood" (wood / stone / iron) |
| `slope` | terrain | A walkable ramp. Place it on top of ground. | `rise`="right" (right / left), `style`="auto" (auto / earth / stone / brick / wood / bone / iron) |
| `conveyor` | terrain | Solid surface that carries whatever stands on it. | `speed`=90 |
| `movingPlatform` | platforms | Moves back and forth along one axis. | `axis`="horizontal" (horizontal / vertical), `distance`=192, `speed`=80, `wait`=0.4, `startOffset`=0, `triggered`=false |
| `pathPlatform` | platforms | Follows a list of points (relative to its start). | `points`=points, `speed`=80, `wait`=0.25, `loop`="pingpong" (pingpong / loop), `triggered`=false |
| `fallingPlatform` | platforms | Shakes, then drops when stood on. Returns later. | `delay`=0.45, `respawn`=2.5 |
| `crumblingPlatform` | platforms | Old masonry. Crumbles shortly after being touched. | `delay`=0.35, `respawn`=2.5 |
| `timedPlatform` | platforms | Fades in and out on a fixed rhythm. | `onTime`=2, `offTime`=1.5, `offset`=0, `signalMode`="none" (none / showWhenActive / hideWhenActive) |
| `elevator` | platforms | Rides while stood on (or while signalled), returns when left. | `direction`="up" (up / down), `distance`=256, `speed`=110, `mode`="ride" (ride / signal), `returnDelay`=1 |
| `spikes` | hazards | Deadly iron spikes. Point them up, down, left or right. | `direction`="up" (up / down / left / right) |
| `pendulum` | hazards | Swinging blade on a chain. (x,y) is the pivot box. | `length`=160, `angle`=55, `period`=2.4, `phase`=0 |
| `fallingHazard` | hazards | Hangs from the ceiling and drops when the player passes below. | `triggerWidth`=72, `fallDelay`=0.25, `respawn`=2.5 |
| `movingHazard` | hazards | A deadly spiked ball that travels along an axis. | `axis`="horizontal" (horizontal / vertical), `distance`=160, `speed`=110, `wait`=0.2, `startOffset`=0, `triggered`=false |
| `sludge` | hazards | Poisonous green water. Touching it is fatal. | — |
| `chaser` | hazards | A wall of darkness that advances once the player passes its start line. Used for escape sequences. | `direction`="right" (right / left / up), `speed`=95, `startDistance`=200, `respawnGap`=360, `stopAt`=0 |
| `pressurePlate` | switches | Active while stood on. | `targets`=[] |
| `lever` | switches | Flips each time the player touches it. | `targets`=[], `startOn`=false |
| `button` | switches | Pressed once, stays pressed. | `targets`=[] |
| `timedSwitch` | switches | Active for a limited time after being touched. | `targets`=[], `duration`=4 |
| `gate` | switches | Barrier that slides open when signalled. | `initiallyOpen`=false, `openDirection`="up" (up / down / left / right), `speed`=260 |
| `lockedDoor` | switches | Opens when the player touches it holding a key of the same colour. | `color`="gold" (gold / silver / bone) |
| `key` | switches | Opens locked doors of the same colour. | `color`="gold" (gold / silver / bone) |
| `checkpoint` | switches | A lantern post. Respawn here after lighting it. | — |
| `breakableWall` | switches | Breaks when the player dashes into it. | — |
| `hiddenWall` | switches | Looks solid but can be walked through. Great for secrets. | `style`="auto" (auto / earth / stone / brick / wood / bone / iron) |
| `spring` | switches | Launches the player upward. | `power`=1000 |
| `ghost` | enemies | Drifts slowly toward the player when nearby. Cannot be stomped. | `range`=260, `speed`=55, `leash`=360 |
| `skeleton` | enemies | Walks back and forth, turning at walls and ledges. Can be stomped. | `speed`=60, `direction`="left" (right / left) |
| `armoredSkeleton` | enemies | Helmeted and spiked. Cannot be stomped; avoid it. | `speed`=50, `direction`="left" (right / left) |
| `bat` | enemies | Flies a repeating patrol. Can be stomped. | `axis`="horizontal" (horizontal / vertical), `distance`=160, `speed`=90, `startOffset`=0 |
| `raven` | enemies | Fast horizontal flyer that sweeps across its range. Can be stomped. | `range`=640, `speed`=230, `direction`="left" (right / left), `pause`=0.8 |
| `shadow` | enemies | Rises from a dark pool when the player comes close and gives chase briefly. | `triggerRange`=200, `speed`=150, `duration`=2.2, `cooldown`=2.5 |
| `relic` | items | Hidden collectible. Each level usually hides one. | — |
| `sign` | items | Shows a short hint when the player stands near it. | `text`="Hint text" |
| `decoration` | scenery | Non-solid scenery. | `kind`="pumpkin" (pumpkin / jackOLantern / lamp / fence / gravestone / cross / deadTree / window / crate / barrel / coffin / candles / candelabra / bell / chain / cobweb / banner / gear / statue / bones / portrait / bookshelf / clockFace / torch / pillar / bush), `layer`="back" (back / front), `flip`=false |

### Triggers / links

Switches (`pressurePlate`, `lever`, `button`, `timedSwitch`) have a `targets` list of object ids. Any object marked as a signal target reacts:

| Target | Reaction while signalled |
| --- | --- |
| `gate` | opens (or closes, if `initiallyOpen`) |
| `movingPlatform`, `pathPlatform`, `movingHazard` with `triggered: true` | move only while signalled |
| `elevator` with `mode: "signal"` | rises (or descends) to its end while signalled |
| `timedPlatform` with `signalMode` | shown / hidden by the signal |
| `conveyor` | reverses direction |

A target is "signalled" when **any** switch targeting it is on. Plates are on while stood on, levers toggle on touch, buttons stay on once pressed, timed switches stay on for `duration` seconds. Keys open locked doors of the same colour (no link needed).

On death the player returns to the last lit checkpoint; enemies, falling/crumbling platforms, timed switches and plates reset. Keys, opened doors, pressed buttons, levers, broken walls and relics stay as they are. Restarting or leaving the level resets everything.

---

## Adding an official (built-in) level

Built-in levels live in **`levels/<world>/`** and the play order is **`levels/manifest.json`**.

1. Open **https://coding-joule.github.io/Hallow-Night/secret-creations/**.
2. **NEW LEVEL** (or **EDIT BUILT-IN** / **OPEN JSON** to start from an existing file). Fill in *Level ID, Name, World, World Order, Global #, Width, Height, Background, Abilities, Start, Goal* at the top, and build the level on the canvas. Drafts auto-save in your browser.
3. **▶ PLAYTEST** — plays it in the real game engine. `Esc` returns to the creator.
4. **✓ VALIDATE LEVEL** — fix any errors listed (click an object id to jump to it).
5. **EXPORT OFFICIAL JSON** — downloads e.g. `18-servants-passage.json` (file name = `<global number>-<slug of name>.json`) and shows the exact path and manifest line, each with a Copy button. (**COPY JSON** puts the full JSON on the clipboard instead.)
6. Upload the file to the matching folder on GitHub, e.g. `levels/haunted-manor/18-servants-passage.json` (replace the old file when editing an existing level).
7. If it is a **new** level, add its path to `levels/manifest.json` at the position where it should be played:
   ```json
   { "levels": [ "…", "haunted-manor/18-servants-passage.json", "…" ] }
   ```
8. Commit. Pages redeploys and the level shows up in Level Select (give it a minute). The workflow also validates every level — if it shows a red ❌ in the **Actions** tab, open it to see which level is broken.

Hand-editing JSON in GitHub works too — the deploy workflow validates every level before publishing, and the game also skips (and logs to the browser console) any level that fails to load.


---

## Public level editor (`/editor/`)

Reached from **LEVEL EDITOR** on the main menu. Anyone can build levels:

* Palette (left) → click to place (hold **Shift** to keep placing) or drag onto the canvas.
* Click to select, drag to move, handles to resize, drag on empty space for box-select, **Shift/Ctrl-click** for multi-select.
* Inspector (right) shows settings for the selected object type; switches get a target list with **⌖ Pick on canvas**. Path platforms: drag the orange points, double-click to add one.
* Wheel = zoom, right/middle-drag or Space-drag = pan, **F** = fit, **G** = grid.
* **Ctrl+Z / Ctrl+Shift+Z** undo/redo, **Ctrl+D** duplicate, **Ctrl+C/V** copy/paste, **Del** delete, arrows nudge, **Ctrl+S** save.
* **My Levels**: new / open / rename / duplicate / delete. **Export ▾**: download JSON, copy JSON, import a JSON file, paste JSON.
* **▶ Playtest** runs the level in the real game; **Esc** comes back with your unsaved edits intact.

**User levels are stored only in that user's browser** (`localStorage["hallow-night-user-levels"]`). The editor never touches the repository and user levels never become built-in levels. To share a level, export the JSON.

## Built-in level creator (`/secret-creations/`)

Uses the same editor engine and schema, with a teal "BUILT-IN LEVEL CREATOR" header, full metadata fields, strict validation and official export (see workflow above). It has `<meta name="robots" content="noindex,nofollow">` and is **not linked or mentioned anywhere** in the normal game or editor.

> ⚠️ **This is not security.** The site is static, so anyone who knows or guesses the URL can open the creator page, and all of its code ships with the site. That is harmless — it can only download JSON files; it cannot change the repository or the published game. Only people who can push to this repo can add official levels.

---

## Save data

All keys are defined in `src/game/config/storageKeys.ts`:

| Key | Contents |
| --- | --- |
| `hallow-night-progress` | cleared levels, best times, relics found, deaths, abilities already introduced |
| `hallow-night-settings` | volumes, screen shake, reduced motion, timer, sharp rendering |
| `hallow-night-user-levels` | public editor levels |
| `hallow-night-creator-drafts` | creator drafts |
| `hallow-night-editor-session` / `hallow-night-creator-session` | last opened level in each editor |

Completing a level unlocks the next. Settings → *Reset progress* clears the campaign save.

## Tuning movement

All important movement values are in **`src/game/config/physics.ts`** (`PLAYER_SPEED`, `PLAYER_ACCELERATION`, `PLAYER_DRAG`, `JUMP_VELOCITY`, `COYOTE_TIME`, `JUMP_BUFFER_TIME`, `WALL_SLIDE_SPEED`, `WALL_JUMP_X`, `WALL_JUMP_Y`, `DASH_SPEED`, `DASH_DURATION`, …). The comment at the top lists what the defaults allow (≈3 tiles of jump height, ≈5 tiles of running jump, ≈8 tiles with a dash). The built-in levels were verified against these values, so big changes may make some jumps impossible.

## The levels

| World | Levels | Introduces |
| --- | --- | --- |
| 1 Old Town | Halloween Street, Back Alley, Iron Fence, Rooftop Run, Town Gate | running & jumping, one-way ledges, pits, moving & path platforms |
| 2 Graveyard | Cemetery Path, Broken Graves, Under the Headstones, Bellkeeper's Hill, Cemetery Exit | spikes, skeletons, crumbling slabs, checkpoints |
| 3 Dead Woods | Deadwood Trail, Hollow Trees, Raven Ridge, The Deep Woods, Witch's Crossing | wall slide & wall jump, bats, ravens, spiked balls, vertical climbs |
| 4 Haunted Manor | Manor Entrance, West Hall, Servants' Passage, Upper Gallery, The Attic | levers, plates, timed switches, keys & doors, gates, phantom platforms, ghosts, hidden walls |
| 5 Catacombs | Beneath the Manor, Bone Passage, Flooded Crypt, Chamber of Chains, Catacomb Escape | dash, cracked walls, falling platforms, pendulums, poison sludge, armoured skeletons, chase |
| 6 Clocktower | Clocktower Base, Inside the Gears, Bell Chamber, Midnight Mechanism, Above the Bells | double jump, elevators, conveyors, looping gear platforms, timed races, a tall climb |
| 7 Black Castle | Castle Wall, Dark Courtyard, Tower of Shadows, Final Ascent, Midnight Crown | shadows, rising darkness, everything combined; level 35 has 6 checkpoints across 5 sections |

Every level hides one **moon relic** (the level-select screen tracks them).

## Tests

The deploy workflow runs Vitest suites for JSON validation, the object schema registry, serialisation round-trips and official file naming, storage/progress utilities, core physics (jump height, one-way platforms, moving platforms, checkpoints, switches) and all built-in levels (strict validation, numbering, safe spawn, ability progression).

## Known limitations

* Audio is procedural and intentionally simple (synth SFX + generative ambient loops). `AudioSystem.ts` is structured so real sound files can replace the synth voices later.
* Art is a coherent but temporary vector style; textures are generated at startup from SVG in `src/game/render/art/`.
* The editors are designed for desktop (mouse + keyboard); the game has keyboard and gamepad input but no touch controls.
* Slopes are supported but only walkable from above (use them on top of solid ground).
* `check-reach` is optimistic: it ignores enemies and timing and treats gates as open, so it catches impossible geometry, not unfair difficulty. Playtest!
