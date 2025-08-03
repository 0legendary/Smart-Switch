import express from 'express';
import cors from 'cors';
import switchRoutes from './routes/switch.js';

const app = express();
app.use(cors());
app.use(express.json());

// Dummy initial switch states (you can later sync this with ESP32)
let switchStates = {
  switch1: false,
  switch2: false,
};

// GET /status - return current state
app.get('/status', (req, res) => {
  res.json(switchStates);
});

// POST /update - update switch state
app.post('/update', (req, res) => {
  const { switchId, state } = req.body;
  console.log("Received update request: ", switchId, state);
  
  if (switchId in switchStates) {
    switchStates[switchId] = state;
    res.json({ success: true, message: `${switchId} set to ${state}` });
  } else {
    res.status(400).json({ success: false, message: "Invalid switch ID" });
  }
});

// // Other routes like /switch/:id/:state
// app.use('/switch', switchRoutes);

const PORT = 4000;
app.listen(4000, '0.0.0.0', () => console.log("Server started on all interfaces"));

