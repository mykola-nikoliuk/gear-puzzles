import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { checkGoal } from './core/goal';
import { demoGoal, demoLevel } from './levels/demo';
import { Clock } from './render/clock';
import { enableGearDragging } from './render/dragGears';
import { LevelView } from './render/levelView';
import { Simulation } from './render/simulation';
import { createHud } from './ui/hud';
import { AxleLabels } from './ui/labels';
import { createPanel } from './ui/panel';

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

const level = new LevelView(demoLevel);
const simulation = new Simulation(demoLevel);
scene.add(level.root);
level.markGoal(demoGoal.axleId);
const labels = new AxleLabels(demoLevel, level.pinTop);
scene.add(labels.root);
const updateHud = createHud(container, demoGoal);

const bounds = level.bounds;
const center = new THREE.Vector3((bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2);
const camera = new THREE.PerspectiveCamera(35);
const tilt = { value: 0.6, onChange: () => resize() };
const MARGIN = 1.15;

/** Moves the camera back until the whole level fits, looking down at a slight tilt. */
function resize() {
  const { clientWidth: width, clientHeight: height } = container;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

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

const clock = new Clock();
const now = () => clock.now();
enableGearDragging({ canvas: renderer.domElement, camera, view: level, simulation, now });
createPanel({
  simulation,
  clock,
  view: level,
  labels: labels.root,
  start: demoLevel,
  goal: demoGoal,
  tilt,
});

renderer.setAnimationLoop(() => {
  level.setAngles(simulation.anglesAt(now()));
  updateHud(checkGoal(simulation.state, demoGoal));
  labels.update(simulation.system, simulation.state);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
});
