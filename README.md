# Gear Puzzles

Composable gear-train puzzles: connect gears so the output shaft spins at the target speed and
direction. Every level is a plain config, and a solver guarantees it is actually solvable — so
levels can be hand-made, randomly generated, or written by an LLM without breaking the game.

## Idea

- **Primitives** — gears, axles, fixed shafts, drivers and targets. Each one follows the same
  contract: _incoming rotation → outgoing rotation_. Any combination is a valid system.
- **Simulation** — rotation propagates through meshed gears as exact fractions (speed ratio and
  direction), no floating-point drift.
- **Solver** — checks that a level config has at least one solution before it is accepted.
- **Generator & LLM mode** — produce new levels; every one of them goes through the solver.
- **Rendering** — Three.js scene with procedurally built gear meshes and meshing animation.

## Stack

TypeScript, Three.js, Vite, Vitest.

## Scripts

```sh
yarn dev    # start the dev server
yarn lint   # type-check, ESLint and Prettier
yarn test   # unit tests
yarn build  # production build
```
