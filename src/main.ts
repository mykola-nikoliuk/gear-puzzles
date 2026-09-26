import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { checkGoal, type Goal } from './core/goal';
import type { GearSystem } from './core/model';
import { demoGoal, demoLevel, demoSolution } from './levels/demo';
import { generateLevel } from './levels/generate';
import { Clock } from './render/clock';
import { enableGearDragging } from './render/dragGears';
import { LevelView } from './render/levelView';
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
scene.environmentIntensity = 0.25;

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
  const view = new LevelView(start, solution);
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

/** Moves the camera back until the whole level fits, looking down at a slight tilt. */
function resize() {
  const { clientWidth: width, clientHeight: height } = container;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  const bounds = active.view.bounds;
  const center = new THREE.Vector3(
    (bounds.minX + bounds.maxX) / 2,
    (bounds.minY + bounds.maxY) / 2,
  );
  const halfHeight = (bounds.maxY - bounds.minY) / 2;
  const halfWidth = (bounds.maxX - bounds.minX) / 2 / camera.aspect;
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const distance = (Math.max(halfHeight, halfWidth) * MARGIN) / tanHalfFov;

  camera.position.set(center.x, center.y - distance * tilt.value, distance);
  camera.lookAt(center);
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

renderer.setAnimationLoop(() => {
  active.view.setAngles(active.simulation.anglesAt(now()));
  hud.setStatus(checkGoal(active.simulation.state, active.goal));
  active.labelSet.update(active.simulation.system, active.simulation.state);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});
