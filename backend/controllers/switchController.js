import axios from 'axios';

// Replace with your ESP32's actual IP
const ESP32_BASE_URL = "http://192.168.x.x"; // or public IP if port forwarded

export const controlServo = async (req, res) => {
  const { id, state } = req.params;

  try {
    const response = await axios.get(`${ESP32_BASE_URL}/servo/${id}/${state}`);
    res.send({ status: "success", message: response.data });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message });
  }
};
