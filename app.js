import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, remove, get, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDMLU4qCZH1xfbK2cMDehm_i_T1LPw2tyY",
    authDomain: "whiteboard-be033.firebaseapp.com",
    projectId: "whiteboard-be033",
    storageBucket: "whiteboard-be033.firebasestorage.app",
    messagingSenderId: "365153102123",
    appId: "1:365153102123:web:75197ed8410d89e79cbd6e",
    measurementId: "G-067ZQ3G1YM"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const userId = user_${Math.floor(Math.random() * 100000)};
console.log('User ID:', userId);


// Create references to different nodes in Firebase
const whiteboardRef = ref(database, 'drawings');
const voiceNotesRef = ref(database, 'voiceNotes'); // Separate node for voice notes

// Setup Canvas
const canvas = document.getElementById("whiteboard");
const ctx = canvas.getContext("2d");

let drawing = false;
let currentTool = "pencil"; // Default tool
let currentColor = "#000000"; // Default color (black)
let lastX = 0;
let lastY = 0;
let lineWidth = 5;

// Tool Buttons
document.getElementById("pencilBtn").addEventListener("click", () => {
  currentTool = "pencil";
  lineWidth = 2; // Pencil width
});
document.getElementById("penBtn").addEventListener("click", () => {
  currentTool = "pen";
  lineWidth = 5; // Sketch pen width
});
document.getElementById("brushBtn").addEventListener("click", () => {
  currentTool = "brush";
  lineWidth = 10; // Brush width
});
document.getElementById("eraserBtn").addEventListener("click", () => {
  currentTool = "eraser";
  lineWidth = 20; // Eraser size
});

// Color Picker
document.getElementById("colorPicker").addEventListener("input", (e) => {
  currentColor = e.target.value;
});

// Mouse Event Listeners for drawing
canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  lastX = e.offsetX;
  lastY = e.offsetY;
});

canvas.addEventListener("mousemove", (e) => {
  if (!drawing) return;

  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.strokeStyle = currentTool === "eraser" ? "#FFFFFF" : currentColor;

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();

  lastX = e.offsetX;
  lastY = e.offsetY;

  // Sync drawing with Firebase
  const drawingData = {
    userId: userId,         // Include the user's ID
    x1: lastX,
    y1: lastY,
    x2: e.offsetX,
    y2: e.offsetY,
    color: currentTool === "eraser" ? "#FFFFFF" : currentColor,
    tool: currentTool,
    width: lineWidth
  };
  
  push(whiteboardRef, drawingData);
});

canvas.addEventListener("mouseup", () => {
  drawing = false;
});

canvas.addEventListener("mouseout", () => {
  drawing = false;
});

// Firebase data listener to sync drawing and voice notes
onChildAdded(whiteboardRef, (snapshot) => {
  const data = snapshot.val();

  if (data.tool === "voiceNote") {
    ctx.fillStyle = data.color || "#000000"; // Default to black if no color specified
    ctx.font = ${data.fontSize || 16}px Arial;  // Default font size to 16 if not specified
    const xPos = data.x || 50;
    const yPos = data.y || 50;
    ctx.fillText(data.note, xPos, yPos);
  } else {
    // Regular drawing data
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(data.x1, data.y1);
    ctx.lineTo(data.x2, data.y2);
    ctx.stroke();
  }
});

// Clear Canvas
document.getElementById("clearBtn").addEventListener("click", () => {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Remove all drawings from Firebase
  remove(whiteboardRef)
    .then(() => {
      console.log('All drawings removed from Firebase');
    })
    .catch((error) => {
      console.error('Error removing drawings:', error);
    });
});

// Save as Image
document.getElementById("saveBtn").addEventListener("click", () => {
  const image = canvas.toDataURL();
  const link = document.createElement("a");
  link.href = image;
  link.download = "whiteboard.png";
  link.click();
});

// Save as PDF
document.getElementById("savePdfBtn").addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const canvasImage = canvas.toDataURL("image/png");
  doc.addImage(canvasImage, "PNG", 10, 10, 180, 160);
  doc.save("whiteboard.pdf");
});


// Check if voice note already exists in Firebase
function doesVoiceNoteExist(noteContent) {
  return new Promise((resolve, reject) => {
    // Create a query to search for voice notes with the specific content
    const voiceNoteQuery = query(ref(database, 'drawings'), orderByChild('note'), equalTo(noteContent));

    get(voiceNoteQuery)
      .then((snapshot) => {
        if (snapshot.exists()) {
          resolve(true); // Note exists
        } else {
          resolve(false); // Note does not exist
        }
      })
      .catch((error) => {
        console.error('Error checking for existing voice note:', error);
        reject(error);
      });
  });
}

// Web Speech API for Voice Notes
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'en-US';  // Set the language to English
recognition.interimResults = true;  // Show intermediate results (optional)

recognition.onstart = function() {
  console.log("Voice recognition started. Speak now.");
};

let voiceNote = ""; // Declare voiceNote here

recognition.onresult = function(event) {
  let transcript = event.results[event.results.length - 1][0].transcript;
  console.log("Recognized text: ", transcript);
  voiceNote = transcript;

  if (voiceNote) {
    push(whiteboardRef, {
      userId: userId,      // Include userId with the voice note
      tool: "voiceNote",
      note: voiceNote,
      color: currentColor,
      fontSize: 16,
      x: 50,
      y: 50
    })
    .then(() => {
      console.log("Voice note sent to Firebase.");
    })
    .catch((error) => {
      console.error("Error sending voice note to Firebase:", error);
    });
  }
};


recognition.onerror = function(event) {
  console.error("Speech recognition error: ", event);
};

recognition.onend = function() {
  console.log("Voice recognition has stopped.");
};

// Voice Search Button
document.getElementById("voiceSearchBtn").addEventListener("click", () => {
  console.log("Voice recognition started.");
  recognition.start(); // Start listening for speech
});

// Handle the voice note
let currentYPosition = 50; // Initial Y position for text

document.getElementById("voiceNoteBtn").addEventListener("click", () => {
  if (voiceNote) {
    alert("Voice Note: " + voiceNote);

    // Push the voice note to Firebase with updated Y position
    push(whiteboardRef, {
      tool: "voiceNote",
      note: voiceNote,
      color: "#000000", // Black text color
      fontSize: 16,     // Default font size
      x: 50,            // Starting X position
      y: currentYPosition // Use current Y position
    })
    .then(() => {
      console.log("Voice note pushed to Firebase.");
      currentYPosition += 30; // Increment Y position for the next voice note
    })
    .catch((error) => {
      console.error("Error pushing voice note to Firebase:", error);
    });
  } else {
    alert("No voice note recorded.");
  }
});

// Firebase listener to render the drawings and voice notes from Firebase
onChildAdded(whiteboardRef, (snapshot) => {
  const data = snapshot.val();

  // Check if the data exists
  if (data) {
    if (data.tool !== "voiceNote") {
      // Drawing logic
      ctx.strokeStyle = data.color || "#000000"; // Default color if undefined
      ctx.lineWidth = data.width || 5; // Default width if undefined
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(data.x1, data.y1);
      ctx.lineTo(data.x2, data.y2);
      ctx.stroke();
    } else if (data.tool === "voiceNote") {
      // Voice note rendering logic
      ctx.fillStyle = data.color || "#000000";  // Default to black if no color specified
      ctx.font = ${data.fontSize || 16}px Arial;  // Default font size to 16 if not specified
      const xPos = data.x || 50; // Default starting X position if undefined
      const yPos = data.y || currentYPosition; // Use currentYPosition for consistent spacing
      ctx.fillText(data.note, xPos, yPos);
    }
  }
});
