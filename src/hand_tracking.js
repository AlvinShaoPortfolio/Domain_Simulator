import { HandLandmarker, FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"
import { updateScene } from './simulation.js';

//fetches wasm files to run mediapipes in browser
const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
);

//creating an object for hand landmarks 
const handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
  baseOptions: {
    modelAssetPath:
      "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    delegate: "GPU",
  },
  runningMode: "VIDEO", 
  numHands: 2,
});

const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
  baseOptions: {
    modelAssetPath:
      "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    delegate: "GPU",
  },
  runningMode: "VIDEO", 
  numFaces: 1,
});

const video = document.getElementById("webcam");
const canvas = document.getElementById("output");
const ctx = canvas.getContext("2d")

//ask for perm to use webcam
const stream = await navigator.mediaDevices.getUserMedia({ video: true})

//sets the stream into the video obj
video.srcObject = stream;
await video.play()

canvas.width = video.videoWidth;
canvas.height = video.videoHeight;

let lastFrameTime = -1;

function landmarkCoords(landmark) {
  return {
    x: (1 - landmark.x) * canvas.width,
    y: landmark.y * canvas.height,
  };
}

//gathering coordinates for the mouth
function getMouthBox(faceObject) {
  if (faceObject.faceLandmarks.length === 0) return null;
  
  const face = faceObject.faceLandmarks[0];
  const mouthIndices = [137, 164, 152, 366]; //right, up, down, left
  
  const coords = mouthIndices.map(i => landmarkCoords(face[i]));

  const xs = coords.map(c => c.x);
  const ys = coords.map(c => c.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function drawMouthBox({minX, maxX, minY, maxY}){
    ctx.strokeStyle = "blue";
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
}

function getHandLandmarkMap(hand) {
  return Object.fromEntries(
    hand.map((landmark, index) => [index, landmarkCoords(landmark)])
  );
}

function drawHandLandmarks(handObjects){
  //for both hands i am finding the landmarks of each hand and then 
  //drawing a dot at the landmark location using the drawing context
  handObjects.landmarks.forEach((hand, handIndex) => {
    const isLeft = handObjects.handedness[handIndex][0].categoryName === "Right"; //checking === right beacuse I mirrored the camera.

    hand.forEach((landmark, index) => {
      const {x, y} = landmarkCoords(landmark)

      ctx.beginPath();
      ctx.font = "16px Arial";
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "black";
      ctx.fillText(index, x, y);
      ctx.fillStyle = isLeft ? "green" : "red";
      ctx.fill();
    });
  });
}

function isInMouthBox(x, y, mouthBox) {
  return ((x >= mouthBox.minX && x <= mouthBox.maxX) && (y >= mouthBox.minY && y <= mouthBox.maxY))
}

//custom gesture recognizing ----------------------------------------------------------------------------------------------------------------------------------------
//cursed Speech
function cursedSpeechLandmarkCheck(hand){
  const landmarkMap = getHandLandmarkMap(hand);
  const thumb = landmarkMap[3];
  const index = landmarkMap[6];
  const middle = landmarkMap[10];
  const ring = landmarkMap[14];

  return (thumb.y < index.y) && (index.y < middle.y) && (middle.y < ring.y);
}

function cursedSpeech(handObjects, mouthBox) {
  const hands = handObjects.landmarks
  const speechLandmarks = [3, 6, 10, 14]; //thumb, index, middle, ring

  if (!mouthBox) return;
  if (!hands || hands.length === 0) return false;

  //check to see if all landmarks are within the mouth box
  for (const hand of hands) {
    const landmarkMap = getHandLandmarkMap(hand);

    if (!cursedSpeechLandmarkCheck(hand)) return false;
    
    for (const index of speechLandmarks) {
      const { x, y } = landmarkMap[index];
      if (!isInMouthBox(x, y, mouthBox)) return false;
    }
  }
  return true;
}

//mahoraga 
function isFist(hand){
  const landmarkMap = getHandLandmarkMap(hand);
  const fingerTips = [8, 12, 16, 20];
  const fingerBases = [5, 9, 13, 17];
  
  return fingerTips.every((tip, i) => { //check to see if tips are above bases but also if tips/basess are close in dist
    const tipPos = landmarkMap[tip];
    const basePos = landmarkMap[fingerBases[i]];
    const dist = Math.hypot(tipPos.x - basePos.x, tipPos.y - basePos.y);
    return dist < 80; 
  });
}

function mahoraga(handObjects){
  const hands = handObjects.landmarks

  if (!hands || hands.length !== 2) return false;

  const hand1Index = handObjects.handedness[0][0].categoryName;
  const hand1 = hand1Index === "Left" ? hands[0] : hands[1];
  const hand2 = hand1Index === "Left" ? hands[1] : hands[0]; 

  const rightOverLeft = hand1[0].y > hand2[0].y

  return isFist(hand1) && isFist(hand2) && rightOverLeft;
}

//rabbit escape
function indexInterlaced(hand1, hand2){
  if (!hand1 || !hand2) return false;

  const indexLandmarks = [7, 8];

  return indexLandmarks.every(landmark => {
    const p1 = landmarkCoords(hand1[landmark]);
    const p2 = landmarkCoords(hand2[landmark]);
    const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    return dist < 20; 
  });
}


function rabbitEscape(handObjects){
  const hands = handObjects.landmarks

  if (!hands || hands.length !== 2) return false;

  const [hand1, hand2] = hands;

  const map1 = getHandLandmarkMap(hand1);
  const map2 = getHandLandmarkMap(hand2);

  const fingerLandmarks = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  const thumb1Highest = fingerLandmarks.every(i => map1[4].y <= map1[i].y);
  const thumb2Lowest = fingerLandmarks.every(i => map2[4].y >= map2[i].y);

  //console.log("thumb1" + thumb1Highest + "      " + "thumb2" + thumb2Lowest + "      " + "interlaced" + indexInterlaced(handObjects))

  return thumb1Highest && thumb2Lowest && indexInterlaced(hand1, hand2)
}

function detectGesture(handObjects, mouthBox) {
  if (rabbitEscape(handObjects)) return "rabbitEscape";
  if (cursedSpeech(handObjects, mouthBox)) return "cursedSpeech";
  if (mahoraga(handObjects)) return "mahoraga";
  return null;
}

function detect(){
  if (video.currentTime !== lastFrameTime){//checking if its a new frame
    lastFrameTime = video.currentTime;

    //getting hand and face landmarks
    const handObjects = handLandmarker.detectForVideo(video, performance.now());
    const faceObject = faceLandmarker.detectForVideo(video, performance.now());

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const mouthBox = getMouthBox(faceObject);

    //drawing the box around mouth + landmarks on the hand
    if (mouthBox){ 
      drawMouthBox(mouthBox);
    }
    drawHandLandmarks(handObjects)

    const gesture = detectGesture(handObjects, mouthBox);
    updateScene(gesture);
  }

  //calling detect for every animation frame
  requestAnimationFrame(detect);
}


detect();