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

let esp32Connection = null; // store ws instance of esp32

// ------------------------- API Routes -------------------------

app.get('/status', (req, res) => {
  console.log('📥 GET /status');
  res.json({
    ...switchStates,
    esp32Connected: !!esp32Connection,
  });
});

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

function broadcastToFrontend(data) {
  const payload = JSON.stringify(data);
  let count = 0;

  for (const [client, meta] of clients.entries()) {
    if (meta.type === 'web' && client.readyState === 1) {
      client.send(payload);
      count++;
    }
  }

  console.log(`📢 Sent to ${count} frontend clients:`, data);
}

wss.on('connection', (ws, req) => {
  console.log(`🔌 New WebSocket connection from ${req.socket.remoteAddress}`);
  clients.set(ws, { type: 'unknown' });

  // Send current switch state immediately
  ws.send(JSON.stringify({ ...switchStates, type: 'init' }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const { switchId, state, type } = data;

      if (type === 'esp32') {
        clients.set(ws, { type: 'esp32' });
        esp32Connection = ws;
        console.log('🆔 ESP32 connected');
        broadcastToFrontend({ type: 'esp32Status', connected: true });
        return;
      }

      if (type === 'web') {
        clients.set(ws, { type: 'web' });
        console.log('🆔 Web client connected');
        ws.send(JSON.stringify({ type: 'esp32Status', connected: !!esp32Connection }));
        return;
      }

      // ESP32 sent manual state update (future case)
      if (switchId && typeof state === 'boolean') {
        if (!['switch1', 'switch2'].includes(switchId)) return;

        switchStates[switchId] = state;

        const updatePayload = JSON.stringify({ switchId, state });
        for (const [client, meta] of clients.entries()) {
          if (client !== ws && client.readyState === 1) {
            client.send(updatePayload);
          }
        }
      }
    } catch (err) {
      console.error('❌ Invalid message format:', message);
    }
  });

  ws.on('close', () => {
    const meta = clients.get(ws);
    clients.delete(ws);
    console.log(`🔌 WebSocket client disconnected`);

    // If it was the ESP32 client, clear reference and notify
    if (meta?.type === 'esp32') {
      esp32Connection = null;
      console.log('❗ ESP32 disconnected');
      broadcastToFrontend({ type: 'esp32Status', connected: false });
    }
  });
});

// ------------------------- Start Server -------------------------

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});
