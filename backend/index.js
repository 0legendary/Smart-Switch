// server.js
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

let switchStates = {
  switch1: false,
  switch2: false,
};

const clients = new Map(); // Map<ws, { type: 'esp32' | 'web' }>

// ------------------------- API Routes -------------------------

// Get current state
app.get('/status', (req, res) => {
  console.log('📥 GET /status');
  res.json(switchStates);
});

// Update state from frontend
app.post('/update', (req, res) => {
  const { switchId, state } = req.body;

  console.log(`📥 POST /update -> switchId: ${switchId}, state: ${state}`);

  if (!['switch1', 'switch2'].includes(switchId)) {
    return res.status(400).json({ error: 'Invalid switch ID' });
  }

  switchStates[switchId] = state;

  const payload = JSON.stringify({ switchId, state });

  let sentCount = 0;

  for (const [client, meta] of clients.entries()) {
    if (client.readyState === 1) {
      client.send(payload);
      sentCount++;
    }
  }

  console.log(`📤 Broadcasted "${payload}" to ${sentCount} clients`);
  res.json({ success: true });
});

// ------------------------- WebSocket Server -------------------------

wss.on('connection', (ws, req) => {
  console.log(`🔌 New WebSocket connection from ${req.socket.remoteAddress}`);

  // Store connection as unknown until identified
  clients.set(ws, { type: 'unknown' });

  // Send current state to newly connected client
  ws.send(JSON.stringify(switchStates));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const { switchId, state, type } = data;

      // First-time identify client (esp32 or web)
      if (type === 'esp32' || type === 'web') {
        clients.set(ws, { type });
        console.log(`🆔 Client identified as: ${type}`);
        return;
      }

      // If ESP32 sends updated state (e.g., manual override), sync backend
      if (switchId && typeof state === 'boolean') {
        if (!['switch1', 'switch2'].includes(switchId)) return;

        switchStates[switchId] = state;

        const payload = JSON.stringify({ switchId, state });
        let relayCount = 0;

        for (const [client, meta] of clients.entries()) {
          if (client !== ws && client.readyState === 1) {
            client.send(payload);
            relayCount++;
          }
        }

        console.log(`🔁 Relayed update from ${req.socket.remoteAddress} to ${relayCount} other clients`);
      }
    } catch (err) {
      console.error('❌ Invalid message format:', message);
    }
  });

  ws.on('close', () => {
    console.log(`🔌 WebSocket client disconnected`);
    clients.delete(ws);
  });
});

// ------------------------- Start Server -------------------------

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});
