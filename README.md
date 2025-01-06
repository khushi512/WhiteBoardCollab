# Real-Time Collaboration Whiteboard

## Project Description
This project implements a collaborative whiteboard where multiple users can draw, annotate, and share their whiteboards in real-time. Using Firebase as a backend for real-time data synchronization, this whiteboard allows users to draw with various tools (pencil, pen, eraser, shapes, etc.), save and export the board as images or PDFs, and even integrate voice notes with the Web Speech API.

## Features
- **Real-time Collaboration**: Multiple users can draw, edit, and interact with the whiteboard simultaneously.
- **Advanced Drawing Tools**: Includes pencil, pen, brush, eraser, and shape tools (rectangle, circle, square, triangle, and diamond).
- **Text Annotation**: Users can add and customize text on the whiteboard.
- **Save and Export**: Save the board as an image (PNG) or PDF.
- **Voice Notes**: Integration with the Web Speech API for voice input.
- **Firebase Backend**: Uses Firebase Firestore to store and sync drawing data in real-time across all connected clients.

## Technologies Used
- **Frontend**: HTML5, CSS3, JavaScript (ES6)
- **Backend**: Firebase Firestore (for real-time synchronization)
- **Libraries**: jsPDF (for PDF generation), Web Speech API (for voice notes)
- **Real-Time Data**: Firebase Firestore to sync drawing data
- **Canvas**: HTML5 `<canvas>` for rendering the whiteboard

## Setup Instructions

### Prerequisites
- You need to have a Firebase account and create a Firebase project.
- Make sure you have a Firebase Firestore database enabled for this project.
- You must have the Firebase SDKs for Firestore and the Web Speech API enabled.

### Steps to Setup

1. **Create Firebase Project**: 
   - Go to the [Firebase Console](https://console.firebase.google.com/).
   - Create a new Firebase project and enable Firestore (or Realtime Database).
   - Obtain your Firebase configuration keys (API key, Auth domain, etc.).

2. **Firebase Setup**:
   - Add the Firebase confi
