import * as THREE from 'three';

//creating scene and camera --> renderer takes what the camera sees of the scene and displays iton a canvas.
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.background = new THREE.Color(0x222222);

camera.position.set(0, 0, 15);

const GESTURE_THRESHOLD = 20;
let gestureBuffer = null;
let gestureCount = 0;
let currentGesture = null;
let isLoading = false;
let particleSystem = null;
let startPositions = null;
let targetPositions = null;
let progress = 0;

function animate() {
  requestAnimationFrame(animate);
  scene.rotation.y += 0.020;

  //lerping logic
  if (particleSystem && progress < 1) {
    progress += 0.025;
    const positions = particleSystem.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i++) {
      positions[i] = startPositions[i] + (targetPositions[i] - startPositions[i]) * progress;
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

animate();

function shouldSwitchGesture(gesture) {
  if (gesture === gestureBuffer) {
    gestureCount++;
  } else {
    gestureBuffer = gesture;
    gestureCount = 1;
  }
  return gestureCount >= GESTURE_THRESHOLD;
}

export function updateScene(gesture) {
  if (gesture === currentGesture) return;

  if (currentGesture === null || !gesture) {
    currentGesture = gesture;
    scene.clear();
  } 
  else if (shouldSwitchGesture(gesture)) {
    currentGesture = gesture;
    scene.clear();
  } else return;
  
  if (gesture === "mahoraga") initMahoraga();
  else if (gesture === "cursedSpeech") initCursedSpeech();
  //else if (gesture === "rabbitEscape") initRabbitEscape();
}

function initMahoraga() {
  console.log("mahoraga")

  const outerRingCount = 5000;
  const outerRadius = 5;

  startPositions = new Float32Array(outerRingCount*3);
  targetPositions = new Float32Array(outerRingCount*3);

  for (let i =0; i < outerRingCount; i++){
    startPositions[i*3] = (Math.random() - 0.5) * 30;
    startPositions[i*3+1] = (Math.random() - 0.5) * 30;
    startPositions[i*3+2] = (Math.random() - 0.5) * 30;

    const angle = (i / outerRingCount) * 2 * Math.PI
    const adjustedRadius = outerRadius + (Math.random() - 0.5) * 2;
    targetPositions[i * 3] = Math.cos(angle) * adjustedRadius;
    targetPositions[i * 3 + 1] = Math.sin(angle) * adjustedRadius;
    targetPositions[i * 3 + 2] = (Math.random() - 0.5) * 2;
  }

  const positions = new Float32Array(outerRingCount * 3);

  for (let i = 0; i < positions.length; i++) {
    positions[i] = startPositions[i];
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 });
  particleSystem = new THREE.Points(geometry, material);
  progress = 0;
  scene.add(particleSystem);
}

function initCursedSpeech() {
  console.log("cursedSpeech")


}
function initRabbitEscape() {
  console.log("rabbitEscape")
}