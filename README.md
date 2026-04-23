# RC Café Tracker System

A modern, web-based tracking system for RC Café rentals.

## Features
- **Admin Dashboard**: Manage sessions securely (start, extend, finish, delete).
- **Public Display Board**: Large real-time countdown timer designed for customers.
- **Color Coding**: Green (Active), Yellow (Running out of time < 2m), Red (Expired).
- **Audio Feedback**: Display board chimes automatically when time is up.

---

## 📂 Folder Structure

```text
tracker/
├── backend/                  # Node.js + Express Backend
│   ├── database.js           # SQLite DB Setup
│   ├── rc_tracker.db         # Automatically created DB file
│   ├── server.js             # API / Socket.io server
│   ├── package.json
│   └── node_modules/         
└── frontend/                 # Vite + React Frontend
    ├── public/               
    ├── src/                  
    │   ├── AdminDashboard.jsx
    │   ├── DisplayBoard.jsx  
    │   ├── App.jsx           
    │   ├── main.jsx          
    │   └── index.css         # Theming & Styles
    ├── package.json          
    └── vite.config.js        
```

---

## 🛠️ Step-by-Step Setup

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your computer.

### 1. Start the Backend
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Start the server (runs on `http://localhost:5000`):
   ```bash
   node server.js
   ```

### 2. Start the Frontend
1. Open a **new** terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open your browser to the URL displayed in your terminal (usually `http://localhost:5173`).

---

## 🚀 How to Use It

1. Open `http://localhost:5173` on the admin's PC or tablet.
2. Click **"Open Customer Display"** at the top right to open the customer-facing board.
3. Drag the display tab onto your secondary screen (e.g., TV or large monitor facing the café).
4. On the display board click the header text once to allow the browser to play alert sounds.
5. In the Admin Dashboard: Create a new session with an RC Unit and Customer ID, and watch it show up synchronously on the big board!

## ⚙️ Deployment Guide

### Running it forever locally (Production setup)
If running on a dedicated shop computer, you can use `PM2` to keep it running in the background automatically:

1. Install PM2: `npm install -g pm2`
2. Start Backend: `pm2 start backend/server.js --name "rc-backend"`
3. Build Frontend: `cd frontend && npm run build`
4. Serve the `frontend/dist` folder using any static server like `serve` (`npm install -g serve` -> `serve -s frontend/dist -p 3000`).

*(Or, just use `npm run dev` easily every morning if you don't mind the console window remaining open!)*
