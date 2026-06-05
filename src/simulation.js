import * as THREE from 'three';

//creating scene and camera --> renderer takes what the camera sees of the scene and displays iton a canvas.
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 5;

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();

export function updateScene(gesture) {
  // will handle switching simulations based on gesture
}