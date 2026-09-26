import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { encodeLoop, loopFrames } from './dev/loopGif';
import { toNumber } from './core/fraction';
import { checkGoal, type Goal } from './core/goal';
import type { GearSystem } from './core/model';
import { demoGoal, demoLevel, demoSolution } from './levels/demo';
import { generateLevel } from './levels/generate';
import { loopPeriod } from './render/animate';
import { Clock } from './render/clock';
import { enableGearDragging } from './render/dragGears';
import { focusPoint, halfExtents } from './render/framing';
import { LevelView, levelBounds, type Bounds } from './render/levelView';
import { Simulation } from './render/simulation';
import { createHud } from './ui/hud';
import { AxleLabels } from './ui/labels';
import { createPanel, type ActiveLevel } from './ui/panel';

function getContainer(): HTMLElement {
  const element = document.getElementById('app');
  if (!element) throw new Error('#app container not found');
  return element;
}

const container = getContainer();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'label-layer';
container.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#101418');
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment()).texture;
scene.environmentIntensity = 0.45;

const sun = new THREE.DirectionalLight('#ffffff', 1.2);
sun.position.set(-20, -30, 60);
scene.add(sun);

const hud = createHud(container, demoGoal);
const camera = new THREE.PerspectiveCamera(35);
const tilt = { value: 0.6, onChange: () => resize() };
const MARGIN = 1.15;
const clock = new Clock();
const now = () => clock.now();

interface Mounted extends ActiveLevel {
  readonly labelSet: AxleLabels;
  unmount(): void;
}

/** Builds the scene objects, simulation and input for one level. */
function mount(start: GearSystem, goal: Goal, solution?: GearSystem): Mounted {
  const focus = focusPoint(start, goal.axleId);
  const view = new LevelView(start, {
    ...(solution ? { reach: solution } : {}),
    trayCenterX: focus.x,
  });
  view.markGoal(goal.axleId);
  const labelSet = new AxleLabels(start, view.pinTop);
  scene.add(view.root, labelSet.root);
  const simulation = new Simulation(start, now());
  const stopDragging = enableGearDragging({
    canvas: renderer.domElement,
    camera,
    view,
    simulation,
    now,
    onRefusal: hud.setHint,
  });
  hud.setGoal(goal);

  return {
    simulation,
    view,
    labels: labelSet.root,
    labelSet,
    start,
    goal,
    ...(solution ? { solution } : {}),
    unmount() {
      stopDragging();
      hud.setHint(null);
      scene.remove(view.root, labelSet.root);
      labelSet.dispose();
    },
  };
}

let active = mount(demoLevel, demoGoal, demoSolution);

/** Moves the camera back until `bounds` fits a width × height view, looking down at a slight tilt. */
function frameCamera(bounds: Bounds, width: number, height: number) {
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  const focus = focusPoint(active.start, active.goal.axleId);
  const center = new THREE.Vector3(focus.x, focus.y);
  const half = halfExtents(bounds, focus);
  const halfHeight = half.height;
  const halfWidth = half.width / camera.aspect;
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const distance = (Math.max(halfHeight, halfWidth) * MARGIN) / tanHalfFov;

  camera.position.set(center.x, center.y - distance * tilt.value, distance);
  camera.lookAt(center);
}

/** Fits the whole level, tray included, into the window. */
function resize() {
  const { clientWidth: width, clientHeight: height } = container;
  frameCamera(active.view.bounds, width, height);
  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);
}

window.addEventListener('resize', resize);
resize();

/** Swaps the level on screen, keeping the panel's settings. */
function load(start: GearSystem, goal: Goal, solution?: GearSystem) {
  active.unmount();
  active = mount(start, goal, solution);
  resize();
  panel.sync();
}

const panel = createPanel({
  clock,
  level: () => active,
  tilt,
  generate: ({ seed, ...options }) => {
    try {
      const { level, goal, solution } = generateLevel(seed, options);
      load(level, goal, solution);
    } catch (error) {
      hud.setHint(error instanceof Error ? error.message : String(error));
    }
  },
  demo: () => load(demoLevel, demoGoal, demoSolution),
});

function frame() {
  const { simulation, view, labelSet, goal } = active;
  view.update(performance.now() / 1000);
  view.setAngles(simulation.anglesAt(now()));
  const shown = simulation.shownAt(now());
  hud.setStatus(checkGoal(shown.state, goal));
  labelSet.update(shown.system, shown.state);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
renderer.setAnimationLoop(frame);

/**
 * Dev only: renders one seamless loop of the board as it turns now, framed on the board
 * without the tray, and downloads it as a GIF. Run `captureLoop()` in the console.
 */
function captureLoop({ fps = 25, width = 720, height = 480 } = {}) {
  const { simulation, view } = active;
  const period = loopPeriod(simulation.system, simulation.state);
  if (!period) throw new Error('Nothing turns, so there is no loop to capture');
  const { times, delay } = loopFrames(toNumber(period), fps);

  renderer.setAnimationLoop(null);
  const pixelRatio = renderer.getPixelRatio();
  renderer.setPixelRatio(1);
  renderer.setSize(width, height);
  frameCamera(levelBounds(simulation.system), width, height);

  const context = Object.assign(document.createElement('canvas'), { width, height }).getContext(
    '2d',
    { willReadFrequently: true },
  );
  if (!context) throw new Error('No 2D canvas to read frames from');
  const start = now();
  const frames = times.map((time) => {
    view.setAngles(simulation.anglesAt(start + time));
    renderer.render(scene, camera);
    context.drawImage(renderer.domElement, 0, 0);
    return context.getImageData(0, 0, width, height);
  });

  renderer.setPixelRatio(pixelRatio);
  resize();
  renderer.setAnimationLoop(frame);

  const gif = encodeLoop(frames, delay);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([gif], { type: 'image/gif' }));
  link.download = 'gear-puzzles.gif';
  link.click();
  URL.revokeObjectURL(link.href);
  return { seconds: toNumber(period), frames: frames.length, bytes: gif.length };
}

if (import.meta.env.DEV) Object.assign(window, { captureLoop });
