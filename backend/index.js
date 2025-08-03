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
  res.json(switchStates);
});

app.post('/update', (req, res) => {
  const { switchId, state } = req.body;
  if (switchId in switchStates) {
    switchStates[switchId] = state;

    // Push the update to all ESP32s
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ switchId, state }));
      }
    });

    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid switch ID' });
  }
});

const PORT = 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
