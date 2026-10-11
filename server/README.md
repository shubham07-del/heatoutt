# Heatwave Monitor Backend

Real-time heatwave monitoring system backend built with Node.js, Express, MongoDB, and Socket.IO. 

This backend receives data from IoT monitoring nodes (including Arduino Uno Q gateways) and broadcasts it in real-time to the frontend.

## Requirements

- Node.js (v18+)
- MongoDB (Running locally or MongoDB Atlas)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and update the values:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/heatwave_monitor
   DEVICE_API_KEY=your_super_secret_device_key
   FRONTEND_URL=http://localhost:3000
   ```

3. Start the server:
   ```bash
   # Development (auto-restart)
   npm run dev
   
   # Production
   npm start
   ```

## Raspberry Pi Integration

Configure the Arduino Uno Q application to POST a JSON reading to `/api/sensor-data` whenever it has a new sensor/GPS/model reading. Send the request over Wi-Fi with the device API key configured below. GPS coordinates are optional; without GPS or registered coordinates the reading still appears in the dashboard, but has no map marker.

### Python Example for Raspberry Pi

```python
import requests
import datetime
import time

url = "http://YOUR_BACKEND_IP:5000/api/sensor-data" # Update with actual backend URL/IP

headers = {
    "Content-Type": "application/json",
    "x-device-api-key": "your_super_secret_device_key" # Must match .env DEVICE_API_KEY
}

# Example payload loop (replace sample values with readings from your sensors and model)
while True:
    data = {
        "deviceId": "BUS_STOP_01",
        "temperature": 35.4,
        "humidity": 68,
        "predictedTemperature": 37.1,
        "predictionMinutes": 5,
        "predictedRisk": "HIGH",
        "risk": "HIGH",
        "gps": {
            "lat": 20.3548,
            "lng": 85.8186
        },
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }

    try:
        response = requests.post(
            url,
            json=data,
            headers=headers,
            timeout=10
        )
        print("Data sent:", response.json())
    except requests.exceptions.RequestException as e:
        print("Error sending data:", e)

    time.sleep(10) # Choose an interval appropriate for the sampling/model rate
```

## API Endpoints

### 1. Receive Sensor Data (Protected)
- **POST** `/api/sensor-data`
- Headers: `x-device-api-key`
- Required body fields: `deviceId`, `temperature`, `humidity`, `riskClass`, and `riskLabel`. Legacy clients may send `risk` instead of the `riskClass`/`riskLabel` pair. Prediction, GPS, and timestamp fields are optional.
- Body:
  ```json
  {
    "deviceId": "BUS_STOP_01",
    "temperature": 35.4,
    "humidity": 68,
    "riskClass": 2,
    "riskLabel": "HIGH",
    "predictedTemperature": 37.1,
    "predictionMinutes": 5,
    "predictedRisk": "HIGH",
    "risk": "HIGH",
    "gps": { "lat": 20.3548, "lng": 85.8186 },
    "timestamp": "2026-10-08T16:30:00.000Z"
  }
  ```
  `predictionMinutes` is an optional integer from 1 to 60 (defaults to 5), `predictedRisk` is an optional risk level, and `gps` is an optional object with `lat` (-90 to 90) and `lng` (-180 to 180). The dashboard receives each accepted reading immediately over Socket.IO and updates the node marker and device detail panel.

### 2. Get Latest Sensor Data
- **GET** `/api/sensor-data/latest/:deviceId`

### 3. Get Historical Sensor Data
- **GET** `/api/sensor-data/history/:deviceId?hours=24`
- Omitting `hours` returns all stored readings for the device, ordered from oldest to newest. The optional `since` ISO 8601 query parameter fetches records from that timestamp onward.

### 4. Get Device Status
- **GET** `/api/devices/:deviceId/status`

### 5. Health Check
- **GET** `/api/health`

## WebSocket (Socket.IO)

Clients can connect via Socket.IO to receive real-time updates when new sensor data is received.

1. Connect to the Socket.IO server.
2. Emit `subscribe` event with the `deviceId` to join the room.
   ```javascript
   socket.emit("subscribe", "BUS_STOP_01");
   ```
3. Listen for `sensor:update` events.
   ```javascript
   socket.on("sensor:update", (data) => {
     console.log("New sensor data:", data);
   });
   ```
