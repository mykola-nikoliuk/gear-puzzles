import GUI from 'lil-gui';
import type * as THREE from 'three';
import { fraction, negate, type Fraction } from '../core/fraction';
import type { GearSystem } from '../core/model';
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

interface Options {
  readonly simulation: Simulation;
  readonly clock: Clock;
  readonly view: LevelView;
  readonly labels: THREE.Object3D;
  readonly layouts: { readonly start: GearSystem; readonly solution: GearSystem };
  /** Camera tilt from 0 (straight down) to 1; the callback re-frames the camera. */
  readonly tilt: { value: number; onChange: () => void };
}

/** A developer panel for poking at the demo: motor, looks and layout shortcuts. */
export function createPanel({ simulation, clock, view, labels, layouts, tilt }: Options): GUI {
  const gui = new GUI({ title: 'Gear Puzzles' });
  const state = {
    speed: '1/4' as MotorSpeed,
    reversed: false,
    paused: false,
    thickness: 1,
    reset: () => setLayout(layouts.start),
    solve: () => setLayout(layouts.solution),
  };

  const driverVelocity = () => motorVelocity(state.speed, state.reversed);
  const setLayout = (layout: GearSystem) => {
    const system = { ...layout, driver: { ...layout.driver, velocity: driverVelocity() } };
    simulation.setSystem(system, clock.now());
    view.placeGears(system);
  };
  const updateMotor = () => setLayout(simulation.system);

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
  looks
    .add(state, 'thickness', 0.3, 1.4, 0.05)
    .name('Gear thickness')
    .onChange((scale: number) => view.setThickness(scale));
  looks.add(labels, 'visible').name('Axle labels');
  looks.add(tilt, 'value', 0, 1.2, 0.05).name('Camera tilt').onChange(tilt.onChange);

  const level = gui.addFolder('Level');
  level.add(state, 'reset').name('Reset');
  level.add(state, 'solve').name('Show solution');

  return gui;
}
