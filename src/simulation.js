import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

//creating scene and camera --> renderer takes what the camera sees of the scene and displays iton a canvas.
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.background = new THREE.Color(0x222222);

camera.position.set(0, 5, 10);

const GESTURE_THRESHOLD = 20;
let gestureBuffer = null;
let gestureCount = 0;
let currentGesture = null;

function animate() {
  requestAnimationFrame(animate);
  scene.rotation.y += 0.005;
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

    loader.load('/mahoraga.glb', (gltf) => {
      const model = gltf.scene;
      model.scale.set(0.5, 0.5, 0.5);
      scene.add(model);
      console.log('model loaded');
    });
}
function initCursedSpeech() {
    console.log("cursedSpeech")


}
function initRabbitEscape() {
    console.log("rabbitEscape")
}