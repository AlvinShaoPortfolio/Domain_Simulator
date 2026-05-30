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

function checkLandmarksInMouth(handResults, mouthBox) {
  if (!mouthBox) return;
  
  const speechLandmarks = [3, 6, 10, 14]; //thumb, index, middle, ring

  //check to see if all landmarks are within the mouth box
  for (const hand of handResults.landmarks){
    for (const index of speechLandmarks){
      const { x, y } = landmarkCoords(hand[index]);
      if (!isInMouthBox(x, y, mouthBox)) return false;
    }
  }
  return true;
}
/*
function CursedSpeechLandmarkCheck(landmarks){

}
*/

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

    //drawFaceLandmarks(faceResults)

    checkLandmarksInMouth(handResults, mouthBox);
  }

  //calling detect for every animation frame
  requestAnimationFrame(detect);
}


detect();