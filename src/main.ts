import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { demoLevel } from './levels/demo';
import { propagate } from './core/propagate';
import { anglesAt } from './render/animate';
import { initialAngles } from './render/phase';
import { LevelView, levelBounds } from './render/levelView';

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

const scene = new THREE.Scene();
scene.background = new THREE.Color('#101418');
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment()).texture;
scene.environmentIntensity = 0.25;

const sun = new THREE.DirectionalLight('#ffffff', 1.2);
sun.position.set(-20, -30, 60);
scene.add(sun);

const level = new LevelView(demoLevel);
const propagation = propagate(demoLevel);
const startAngles = initialAngles(demoLevel);
scene.add(level.root);

const bounds = levelBounds(demoLevel);
const center = new THREE.Vector3((bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2);
const camera = new THREE.PerspectiveCamera(35);
const TILT = 0.6;
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

  camera.position.set(center.x, center.y - distance * TILT, distance);
  camera.lookAt(center);
  renderer.setSize(width, height);
}

window.addEventListener('resize', resize);
resize();

renderer.setAnimationLoop((time) => {
  level.setAngles(anglesAt(demoLevel, propagation, startAngles, time / 1000));
  renderer.render(scene, camera);
});
