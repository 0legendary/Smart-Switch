import { useEffect, useState } from "react";
import axios from "axios";

const API = "https://smart-switch.onrender.com";

function App() {
  const [states, setStates] = useState({ switch1: false, switch2: false });

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API}/status`);
      setStates(res.data);
    } catch (err) {
      console.error("Error fetching status:", err);
    }
  };

  const toggleSwitch = async (switchId) => {
    const newState = !states[switchId];
    try {
      await axios.post(`${API}/update`, {
        switchId,
        state: newState,
      });
      setStates({ ...states, [switchId]: newState });
    } catch (err) {
      console.error("Error updating switch:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Smart Switch Panel</h1>
        <div className="space-y-4">
          {Object.keys(states).map((id) => (
            <div key={id}>
              <button
                onClick={() => toggleSwitch(id)}
                className={`w-full py-3 rounded-xl font-semibold transition duration-300 text-white text-lg ${
                  states[id]
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-gray-400 hover:bg-gray-500"
                }`}
              >
                {id.toUpperCase()} {states[id] ? "🟢 ON" : "⚪ OFF"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
