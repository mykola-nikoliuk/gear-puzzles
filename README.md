# Gear Puzzles

Gear-train puzzles in the browser: take gears from the tray and put them on the pins so the output
axle turns at the target speed and direction.

**[Play it in the browser](https://mykola-nikoliuk.github.io/gear-puzzles/)**

![The solved demo level turning](docs/demo.gif)

## What's inside

- **Exact simulation.** Rotation spreads through the meshed gears as exact fractions, so a
  12 → 24 → 10 → 20 train gives exactly 1/16 turn/s, with no float drift. Two paths that ask one
  axle for different speeds jam the train.
- **Two layers per axle.** Any gear fits on any layer. Two gears on one axle form a compound gear
  and carry the rotation up to the other layer. The motor's short pin shows at a glance that it
  takes no more gears.
- **Real-world tolerances.** Gears mesh when their pitch circles touch, with a little backlash
  allowed. A gear refuses to go where its teeth would clash with a neighbour or where it would
  spin through another pin.
- **Direct manipulation.** You drag gears over the pins, and a dropped gear lands on the best
  free layer. Dropping on a taken axle swaps the two gears. If a spot is refused, the HUD says
  why.
- **Solver.** A breadth-first search over layouts finds the shortest solution and replays it on
  the board.
- **Level generator.** Seeded and reproducible. It builds a working train from the motor first,
  so every level is solvable by construction. Then it adds spare axles and decoy gears and takes
  the train apart into the tray.
- **Developer panel** ([lil-gui](https://lil-gui.georgealways.com/)). It controls the motor
  speed and direction, gear thickness, axle labels and camera tilt. It also has Reset and Solve,
  plus the generator settings.

## Levels written by Claude

Claude writes levels, and the game keeps only the ones it can prove. The model never places
gears on the board. It writes a short JSON spec: the motor gear, the chain of axles with their
tooth counts and compound gears, the goal speed as it worked it out, spare axles, decoys, a
lesson and hints. The code then checks the spec:

1. **Shape and ranges.** Only the game's gear sizes and sane limits pass.
2. **Arithmetic.** The goal speed is recomputed as an exact fraction. A wrong sum is rejected,
   together with the right value.
3. **Geometry.** The checks catch stacked gears that would clash on a layer and gears that would
   cover a neighbouring axle, with the exact distances.
4. **Proof.** The level is laid out on the board. The solution is replayed move by legal move,
   and the solver confirms that the level cannot be solved in fewer than two moves.

Each failed check goes back to Claude as an error to fix, up to three tries. The HUD shows how
many mistakes the checks caught on the way, so the model's slips stay visible.

- **Gallery.** `yarn author` asks Claude for a level for each brief in `src/ai/briefs.ts` and
  saves the ones that pass to `src/ai/authored.json`. It needs `ANTHROPIC_API_KEY` in `.env`.
  The page proves every saved level again when it loads and drops any that fail.
- **Write your own.** In the panel's _Claude levels_ folder, enter a brief and your own
  Anthropic API key, then press _Write a level_. The key stays in your browser's local storage
  and goes only to the Anthropic API.

## Recording the GIF

With `yarn dev` running and a level turning, call `captureLoop()` in the browser console. It
renders exactly one period of the train, so the GIF loops without a seam. The period is the
shortest time in which every gear advances a whole number of teeth.

## Stack

TypeScript, Three.js, Vite, Vitest, the Anthropic SDK.

## Scripts

```sh
yarn dev    # start the dev server
yarn lint   # type-check, ESLint and Prettier
yarn test   # unit tests
yarn build  # production build
yarn author # write the Claude gallery (needs ANTHROPIC_API_KEY in .env)
```
