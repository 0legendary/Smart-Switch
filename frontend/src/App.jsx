import { useEffect, useState, useRef } from "react";
import axios from "axios";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { Loader2, WifiOff, Wifi, Lightbulb, Wind } from "lucide-react";
import React from "react";

// const API = "https://smart-switch.onrender.com";
const API = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

function App() {
  const [states, setStates] = useState({ switch1: false, switch2: false });
  const [espConnected, setEspConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);

  const switchInfo = {
    switch1: { label: "Light", icon: <Lightbulb className="w-6 h-6" /> },
    switch2: { label: "Fan", icon: <Wind className="w-6 h-6" /> },
  };

  useEffect(() => {
    fetchStatus();
    setupWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/status`);
      console.log("Status:", res.data);

      setStates(res.data);
    } catch (err) {
      console.error("Error fetching status:", err);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    const ws = new WebSocket(SOCKET_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "web" }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle ESP32 connection status message
        if (data.type === "esp32Status") {
          setEspConnected(data.connected);
          return;
        }

        // Handle switch state init
        if (data.type === "init") {
          const { switch1, switch2 } = data;
          setStates((prev) => ({
            ...prev,
            switch1: switch1 ?? prev.switch1,
            switch2: switch2 ?? prev.switch2,
          }));
          return;
        }

        // Handle regular switch updates
        if ("switchId" in data && "state" in data) {
          setStates((prev) => ({ ...prev, [data.switchId]: data.state }));
          return;
        }

        // Fallback: merged object
        if ("switch1" in data || "switch2" in data) {
          setStates((prev) => ({ ...prev, ...data }));
        }
      } catch (e) {
        console.error("WS Message Error:", e);
      }
    };

    ws.onclose = () => {
      setEspConnected(false);
    };
  };

  const toggleSwitch = async (switchId) => {
    const newState = !states[switchId];
    try {
      const res = await axios.post(`${API}/update`, {
        switchId,
        state: newState,
      });
      if (!res?.data?.success) throw new Error("Failed to update switch state");
      setStates((prev) => ({ ...prev, [switchId]: newState }));
    } catch (err) {
      await fetchStatus();
      console.error("Error updating switch:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-tr from-gray-900 via-black to-gray-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background animated glow dots */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.1), transparent 70%), radial-gradient(circle at 10% 20%, rgba(0,255,255,0.06), transparent 80%), radial-gradient(circle at 85% 70%, rgba(255,0,255,0.05), transparent 80%)",
          backgroundBlendMode: "screen",
          animation: "bgGlow 15s ease-in-out infinite alternate",
          zIndex: 0,
        }}
      />

      {/* Container */}
      <div className="relative z-10 bg-gray-900 bg-opacity-90 rounded-3xl shadow-2xl max-w-md w-full px-8 py-4 pb-8 flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-100 tracking-wide mt-4">
            Smart Switch
          </h1>
          <div
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full transition-all duration-300 font-semibold cursor-default select-none mt-4 ${
              espConnected
                ? "bg-green-900 text-green-400 ring-2 ring-green-500"
                : "bg-red-900 text-red-400 ring-2 ring-red-500"
            }`}
          >
            {espConnected ? (
              <Wifi className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <WifiOff className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <span className="uppercase tracking-wider text-xs sm:text-sm select-none">
              {espConnected ? "Connected" : "Offline"}
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-16">
            <Loader2 className="animate-spin h-10 w-10 text-purple-500 drop-shadow-lg" />
            <p className="text-gray-400 font-medium text-lg">
              Loading switch states...
            </p>
          </div>
        ) : (
          // Switch List
          <div className="space-y-5">
            {["switch1", "switch2"].map((id) => {
              const isOn = states[id];
              const info = switchInfo[id] || {
                label: id.toUpperCase(),
                icon: null,
              };

              return (
                <motion.button
                  key={id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleSwitch(id)}
                  className={`w-full flex justify-between items-center px-5 py-3 rounded-xl
          transition-all duration-400 border-1 focus:outline-none
          ${
            isOn
              ? "border-green-600 bg-gray-800 bg-gradient-to-r from-black via-gray-900 to-black shadow-inner text-white"
              : "border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800 text-gray-400"
          }
          ring-offset-2 ring-green-700 ring-offset-gray-900
          focus:ring-1`}
                  aria-pressed={isOn}
                  aria-label={`Toggle switch ${info.label}`}
                  type="button"
                >
                  <span className="uppercase font-semibold tracking-wide text-lg select-none">
                    {info.label}
                  </span>
                  <span
                    className={`flex items-center gap-2 font-semibold text-sm select-none ${
                      isOn ? "text-green-500" : "text-gray-500"
                    }`}
                  >
                    {info.icon &&
                      React.cloneElement(info.icon, {
                        className: isOn ? "text-green-600" : "text-gray-500",
                      })}
                    {isOn ? "ON" : "OFF"}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom animation styles */}
      <style>{`
        @keyframes bgGlow {
          0% {
            background-position: 0% 50%, 100% 30%, 50% 100%;
          }
          50% {
            background-position: 100% 50%, 0% 70%, 50% 0%;
          }
          100% {
            background-position: 0% 50%, 100% 30%, 50% 100%;
          }
        }

        button:focus {
          outline-offset: 3px;
        }
      `}</style>
    </div>
  );
}

export default App;
