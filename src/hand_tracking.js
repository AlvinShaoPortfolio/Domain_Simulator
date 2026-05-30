import { HandLandmarker, FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

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

/*
function drawFaceLandmarks(faceResults) {
  if (faceResults.faceLandmarks.length === 0) return;
  
  faceResults.faceLandmarks[0].forEach((landmark, index) => {
    const { x, y } = landmarkCoords(landmark);

    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fillStyle = "yellow";
    ctx.fill();
    ctx.fillStyle = "black";
    ctx.font = "10px Arial";
    ctx.fillText(index, x, y);
  });
}
*/

function landmarkCoords(landmark) {
  return {
    x: (1 - landmark.x) * canvas.width,
    y: landmark.y * canvas.height,
  };
}

//gathering coordinates for the mouth
function getMouthBox(faceResults) {
  if (faceResults.faceLandmarks.length === 0) return null;
  
  const face = faceResults.faceLandmarks[0];
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

function drawHandLandmarks(handResults){
  //for both hands i am finding the landmarks of each hand and then 
  //drawing a dot at the landmark location using the drawing context
  handResults.landmarks.forEach((hand, handIndex) => {
    const isLeft = handResults.handedness[handIndex][0].categoryName === "Right";

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

function checkLandmarksInMouth(handResults, mouthBox) {
  if (!mouthBox) return;
  if (!handResults.landmarks || handResults.landmarks.length === 0) return false;
  
  const speechLandmarks = [3, 6, 10, 14]; //thumb, index, middle, ring

  //check to see if all landmarks are within the mouth box
  for (const hand of handResults.landmarks) {
    const landmarkMap = getHandLandmarkMap(hand);

    if (!cursedSpeechLandmarkCheck(hand)) return false;
    
    for (const index of speechLandmarks) {
      const { x, y } = landmarkMap[index];
      if (!isInMouthBox(x, y, mouthBox)) return false;
    }
  }
  return true;
}

function cursedSpeechLandmarkCheck(hand){
  const landmarkMap = getHandLandmarkMap(hand);
  const thumb = landmarkMap[3];
  const index = landmarkMap[6];
  const middle = landmarkMap[10];
  const ring = landmarkMap[14];

  return (thumb.y < index.y) && (index.y < middle.y) && (middle.y < ring.y);
}

function sykkunoLandmarkCheck(hand){
  const landmarkMap = getHandLandmarkMap(hand);
  const tip = landmarkMap[8];
  const dip = landmarkMap[7];
  const pip = landmarkMap[6];
  const minY = Math.max(...Object.values(landmarkMap).map(l => l.y));

  const wrist = hand[0].z;
  const knuckle = hand[9].z;
  const palmFacingCamera = knuckle < wrist;

  const straight = Math.abs(tip.x - dip.x) < 10 && Math.abs(dip.x - pip.x) < 10;

  const top = (tip.y <= minY + 2)

  return top && palmFacingCamera && straight
}

function detectGesture(handResults, mouthBox) {
  for (const hand of handResults.landmarks) {
    if (checkLandmarksInMouth(handResults, mouthBox)) return "cursedSpeech";
    if (sykkunoLandmarkCheck(hand)) return "picture!";
  }
  return null;
}

function detect(){
  if (video.currentTime !== lastFrameTime){//checking if its a new frame
    lastFrameTime = video.currentTime;

    //getting hand and face landmarks
    const handResults = handLandmarker.detectForVideo(video, performance.now());
    const faceResults = faceLandmarker.detectForVideo(video, performance.now());

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const mouthBox = getMouthBox(faceResults);

    if (mouthBox){ 
      drawMouthBox(mouthBox);
    }
    drawHandLandmarks(handResults)

    
    const gesture = detectGesture(handResults, mouthBox);
    console.log(gesture ?? "idle")
  }

  //calling detect for every animation frame
  requestAnimationFrame(detect);
}


detect();