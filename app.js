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

// Create references to different nodes in Firebase
const whiteboardRef = ref(database, 'drawings');
// Separate node for voice notes
const voiceNotesRef = ref(database, 'voiceNotes'); 

// Setup Canvas
const canvas = document.getElementById("whiteboard");
const ctx = canvas.getContext("2d");

let drawing = false;
let currentTool = "pencil"; // Default tool (pencil)
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

// Drawing Events
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

  // Sync drawing data with Firebase
const drawingData = {
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
    ctx.font = `${data.fontSize || 16} px Arial`;  // Default font size to 16 if not specified
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

  // Push voice note to Firebase
  if (voiceNote) {
    push(whiteboardRef, {
      tool: "voiceNote",
      note: voiceNote,
      color: currentColor,
      fontSize: 16,
      x: 50,
      y: currentYPosition
    })
    .then(() => {
      console.log("Voice note sent to Firebase.");
      currentYPosition += 30;
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
      ctx.font = `${data.fontSize || 16} px Arial`;  // Default font size to 16 if not specified
      const xPos = data.x || 50; // Default starting X position if undefined
      const yPos = data.y || currentYPosition; // Use currentYPosition for consistent spacing
      ctx.fillText(data.note, xPos, yPos);
    }
  }
});



/*import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
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

// Create references to different nodes in Firebase
const whiteboardRef = ref(database, 'drawings');
// Separate node for voice notes
const voiceNotesRef = ref(database, 'voiceNotes'); 

// Setup Canvas
const canvas = document.getElementById("whiteboard");
const ctx = canvas.getContext("2d");

let drawing = false;
let currentTool = "pencil"; // Default tool (pencil)
let currentColor = "#000000"; // Default color (black)
let currentShape = "none";  // Default shape is none
let lastX = 0;
let lastY = 0;
let lineWidth = 5;

// Tool Buttons


// Color Picker
document.getElementById("colorPicker").addEventListener("input", (e) => {
  currentColor = e.target.value;
});

// Select shapes
let startX, startY;

// Set default pencil/pen color and eraser size
  ctx.strokeStyle = '#000000';  // Black for pencil/pen
  ctx.lineWidth = 2;  // Pencil/pen width

// Tool buttons event listeners
    document.getElementById('pencilBtn').addEventListener('click', () => {
      currentTool = 'pencil';  // Set tool to pencil
      ctx.strokeStyle = '#000000';  // Default pencil color (black)
      ctx.lineWidth = 2;  // Default pencil size
      currentShape = 'none'; // Reset shape selection
      document.getElementById('shapeSelector').value = 'none'; // Reset dropdown
    });

    document.getElementById('penBtn').addEventListener('click', () => {
      currentTool = 'pen';  // Set tool to pen
      ctx.strokeStyle = '#000000';  // Pen color (black)
      ctx.lineWidth = 4;  // Pen size
      currentShape = 'none'; // Reset shape selection
      document.getElementById('shapeSelector').value = 'none'; // Reset dropdown
    });
    document.getElementById("brushBtn").addEventListener("click", () => {
      currentTool = "brush";
      ctx.strokeStyle = '#000000';  // Brush color (black)
      ctx.lineWidth = 6;  // Brush size
      currentShape = 'none'; // Reset shape selection
      document.getElementById('shapeSelector').value = 'none'; // Reset dropdown
    });
    document.getElementById('eraserBtn').addEventListener('click', () => {
      currentTool = 'eraser';  // Set tool to eraser
      ctx.strokeStyle = '#FFFFFF';  // Eraser color (white)
      ctx.lineWidth = 10;  // Eraser size
      currentShape = 'none'; // Reset shape selection
      document.getElementById('shapeSelector').value = 'none'; // Reset dropdown
    });

    document.getElementById('clearBtn').addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);  // Clear the canvas
    });

    // Shape selection dropdown event
    document.getElementById('shapeSelector').addEventListener('change', (e) => {
      currentShape = e.target.value;  // Update the selected shape
      if (currentShape !== 'none') {
        currentTool = 'none'; // Reset tool if a shape is selected
      }
    });

    // Mouse events for drawing
    canvas.addEventListener('mousedown', (e) => {
      drawing = true;
      startX = e.offsetX;
      startY = e.offsetY;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!drawing) return;

      const width = e.offsetX - startX;
      const height = e.offsetY - startY;

      // Clear the canvas to redraw shape in progress
      // ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (currentShape === 'none') {
        // Draw with pencil or pen
        if (currentTool === 'pencil' || currentTool === 'pen') {
          ctx.lineTo(e.offsetX, e.offsetY);
          ctx.stroke();
        }
        // Erase with eraser
        else if (currentTool === 'eraser') {
          ctx.clearRect(e.offsetX - ctx.lineWidth / 2, e.offsetY - ctx.lineWidth / 2, ctx.lineWidth, ctx.lineWidth);
        }
      } else {
        // Drawing shapes based on selection
        ctx.beginPath();
        switch (currentShape) {
          case 'line':
            ctx.moveTo(startX, startY);
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
            break;
          case 'rectangle':
            ctx.strokeRect(startX, startY, width, height);
            break;
          case 'circle':
            const radius = Math.sqrt(width * width + height * height);
            ctx.arc(startX, startY, radius, 0, Math.PI * 2);
            ctx.stroke();
            break;
          case 'square':
            const side = Math.min(Math.abs(width), Math.abs(height));
            ctx.strokeRect(startX, startY, side, side);
            break;
          case 'triangle':
            ctx.moveTo(startX, startY);  // Top point
            ctx.lineTo(startX + width, startY + height);  // Right point
            ctx.lineTo(startX - width, startY + height);  // Left point
            ctx.closePath();
            ctx.stroke();
            break;
          case 'diamond':
            ctx.moveTo(startX, startY);  // Top point
            ctx.lineTo(startX + width / 2, startY + height);  // Right point
            ctx.lineTo(startX, startY + height * 2);  // Bottom point
            ctx.lineTo(startX - width / 2, startY + height);  // Left point
            ctx.closePath();
            ctx.stroke();
            break;
          default:
            break;
        }
      }
    });

// Mouseup event to stop drawing
  canvas.addEventListener('mouseup', () => {
    drawing = false;
  });

// Mouseout event to stop drawing if mouse leaves canvas
  canvas.addEventListener('mouseout', () => {
    drawing = false;
  });

// Optional: clear canvas function (if you want to add clear canvas functionality)
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Drawing Events
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

  // Sync drawing data with Firebase
const drawingData = {
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
    ctx.font = `${data.fontSize || 16} px Arial`;  // Default font size to 16 if not specified
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

  // Push voice note to Firebase
  if (voiceNote) {
    push(whiteboardRef, {
      tool: "voiceNote",
      note: voiceNote,
      color: currentColor,
      fontSize: 16,
      x: 50,
      y: currentYPosition
    })
    .then(() => {
      console.log("Voice note sent to Firebase.");
      currentYPosition += 30;
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
      ctx.font = `${data.fontSize || 16} px Arial`;  // Default font size to 16 if not specified
      const xPos = data.x || 50; // Default starting X position if undefined
      const yPos = data.y || currentYPosition; // Use currentYPosition for consistent spacing
      ctx.fillText(data.note, xPos, yPos);
    }
  }
}); */
