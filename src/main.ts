import * as THREE from 'three';

const container = document.getElementById('app');
if (!container) throw new Error('#app container not found');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#101418');
const camera = new THREE.OrthographicCamera();

function resize() {
  const { clientWidth: width, clientHeight: height } = container!;
  const aspect = width / height;
  const viewSize = 10;
  camera.left = (-viewSize * aspect) / 2;
  camera.right = (viewSize * aspect) / 2;
  camera.top = viewSize / 2;
  camera.bottom = -viewSize / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

window.addEventListener('resize', resize);
resize();

renderer.setAnimationLoop(() => renderer.render(scene, camera));
