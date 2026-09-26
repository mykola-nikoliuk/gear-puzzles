import GUI from 'lil-gui';
import type * as THREE from 'three';
import { fraction, negate, type Fraction } from '../core/fraction';
import type { Goal } from '../core/goal';
import type { GearSystem } from '../core/model';
import { moveGear, placementError } from '../core/placement';
import { solve, type Move, type Solution } from '../core/solver';
import type { Clock } from '../render/clock';
import type { LevelView } from '../render/levelView';
import type { Simulation } from '../render/simulation';

/** Motor speeds offered in the panel, in turns per second. */
export const MOTOR_SPEEDS = ['1/8', '1/4', '1/2', '1'] as const;
export type MotorSpeed = (typeof MOTOR_SPEEDS)[number];

export function motorVelocity(speed: MotorSpeed, reversed: boolean): Fraction {
  const [num = 1, den = 1] = speed.split('/').map(Number);
  const velocity = fraction(num, den);
  return reversed ? negate(velocity) : velocity;
}

/** Pause between replayed solver moves, in milliseconds. */
const MOVE_DELAY = 700;

export function solveLabel(solution: Solution | null): string {
  if (!solution) return 'Solve: no solution';
  const count = solution.moves.length;
  if (count === 0) return 'Solve: already solved';
  return `Solve: ${count} ${count === 1 ? 'move' : 'moves'}`;
}

/** Everything the panel touches that belongs to the level on screen. */
export interface ActiveLevel {
  readonly simulation: Simulation;
  readonly view: LevelView;
  readonly labels: THREE.Object3D;
  readonly start: GearSystem;
  readonly goal: Goal;
}

interface Options {
  readonly clock: Clock;
  /** The level on screen now; it changes when a new one is mounted. */
  readonly level: () => ActiveLevel;
  /** Camera tilt from 0 (straight down) to 1; the callback re-frames the camera. */
  readonly tilt: { value: number; onChange: () => void };
}

export interface Panel {
  readonly gui: GUI;
  /** Applies the panel's settings (motor, looks) to a freshly mounted level. */
  sync(): void;
}

/** A developer panel for poking at the demo: motor, looks and layout shortcuts. */
export function createPanel({ clock, level, tilt }: Options): Panel {
  const gui = new GUI({ title: 'Gear Puzzles' });
  const state = {
    speed: '1/4' as MotorSpeed,
    reversed: false,
    paused: false,
    thickness: 1,
    labels: true,
    reset: () => {
      solveButton.name('Solve');
      setLayout(level().start);
    },
    solve: () => {
      const { simulation, goal } = level();
      const solution = solve(simulation.system, goal);
      solveButton.name(solveLabel(solution));
      if (solution) replay(solution.moves);
    },
  };

  const driverVelocity = () => motorVelocity(state.speed, state.reversed);
  const setLayout = (layout: GearSystem) => {
    const { simulation, view } = level();
    const system = { ...layout, driver: { ...layout.driver, velocity: driverVelocity() } };
    simulation.setSystem(system, clock.now());
    view.placeGears(system);
  };
  const updateMotor = () => setLayout(level().simulation.system);
  const updateLooks = () => {
    level().view.setThickness(state.thickness);
    level().labels.visible = state.labels;
  };

  /** Plays the moves one by one; stops if the player has changed the board in between. */
  const replay = ([move, ...rest]: readonly Move[]) => {
    if (!move) return;
    setTimeout(() => {
      const { gearId, axleId, layer } = move;
      const { system } = level().simulation;
      if (placementError(system, gearId, axleId, layer) !== null) return;
      setLayout(moveGear(system, gearId, axleId, layer));
      replay(rest);
    }, MOVE_DELAY);
  };

  const motor = gui.addFolder('Motor');
  motor
    .add(state, 'speed', [...MOTOR_SPEEDS])
    .name('Speed, turn/s')
    .onChange(updateMotor);
  motor.add(state, 'reversed').name('Clockwise').onChange(updateMotor);
  motor
    .add(state, 'paused')
    .name('Pause')
    .onChange((paused: boolean) => (clock.paused = paused));

  const looks = gui.addFolder('View');
  looks.add(state, 'thickness', 0.3, 1.4, 0.05).name('Gear thickness').onChange(updateLooks);
  looks.add(state, 'labels').name('Axle labels').onChange(updateLooks);
  looks.add(tilt, 'value', 0, 1.2, 0.05).name('Camera tilt').onChange(tilt.onChange);

  const layout = gui.addFolder('Level');
  layout.add(state, 'reset').name('Reset');
  const solveButton = layout.add(state, 'solve').name('Solve');

  return {
    gui,
    sync() {
      solveButton.name('Solve');
      updateMotor();
      updateLooks();
    },
  };
}
