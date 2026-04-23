const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

// Periodic check for expired sessions and broadcasting updates
setInterval(() => {
  const now = Date.now();
  db.all(`SELECT * FROM sessions WHERE status = 'ACTIVE'`, [], (err, rows) => {
    if (err) return;
    
    let updated = false;
    rows.forEach(row => {
      if (now >= row.endTime) {
        db.run(`UPDATE sessions SET status = 'EXPIRED' WHERE id = ?`, [row.id]);
        updated = true;
      }
    });

    // Broadcast current state to all clients
    db.all(`SELECT * FROM sessions ORDER BY id DESC`, [], (err, allRows) => {
      if (!err) {
        io.emit('sync_sessions', allRows);
      }
    });
  });
}, 1000);

// API Routes

// Create session
app.post('/api/sessions', (req, res) => {
  const { customerId, rcId, durationMinutes } = req.body;
  const startTime = Date.now();
  const endTime = startTime + durationMinutes * 60 * 1000;
  
  db.run(`INSERT INTO sessions (customerId, rcId, startTime, durationMinutes, endTime, status) VALUES (?, ?, ?, ?, ?, ?)`,
    [customerId, rcId, startTime, durationMinutes, endTime, 'ACTIVE'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Get all sessions
app.get('/api/sessions', (req, res) => {
  db.all(`SELECT * FROM sessions ORDER BY id DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Extend session
app.post('/api/sessions/:id/extend', (req, res) => {
  const id = req.params.id;
  const { extraMinutes } = req.body;
  
  db.get(`SELECT * FROM sessions WHERE id = ?`, [id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Not found' });
    
    const newEndTime = row.endTime + extraMinutes * 60 * 1000;
    db.run(`UPDATE sessions SET endTime = ?, status = 'ACTIVE' WHERE id = ?`, [newEndTime, id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

// Finish session manually
app.post('/api/sessions/:id/finish', (req, res) => {
  const id = req.params.id;
  db.run(`UPDATE sessions SET status = 'FINISHED' WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Reset (delete) session
app.delete('/api/sessions/:id', (req, res) => {
  const id = req.params.id;
  db.run(`DELETE FROM sessions WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  db.all(`SELECT * FROM sessions ORDER BY id DESC`, [], (err, rows) => {
    if (!err) socket.emit('sync_sessions', rows);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
