import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

let switchStates = {
  switch1: false,
  switch2: false,
};

// HTTP API for web UI
app.get('/status', (req, res) => {
  console.log('📥 GET /status called');
  res.json(switchStates);
});

app.post('/update', (req, res) => {
  const { switchId, state } = req.body;
  console.log(`📥 POST /update -> switchId: ${switchId}, state: ${state}`);

  if (switchId in switchStates) {
    switchStates[switchId] = state;

    const payload = JSON.stringify({ switchId, state });

    let clientCount = 0;

    // Broadcast to all WebSocket clients
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(payload);
        clientCount++;
      }
    });

    console.log(`📤 Broadcasted to ${clientCount} clients -> ${payload}`);

    res.json({ success: true });
  } else {
    console.warn(`❌ Invalid switch ID: ${switchId}`);
    res.status(400).json({ error: 'Invalid switch ID' });
  }
});

// WebSocket event logging
wss.on('connection', (ws, req) => {
  console.log(`🔌 New WebSocket connection from ${req.socket.remoteAddress}`);
  
  // Send current switch state to new client
  ws.send(JSON.stringify(switchStates));
  
  ws.on('close', () => {
    console.log(`🔌 WebSocket client disconnected`);
  });
});

const PORT = 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});
