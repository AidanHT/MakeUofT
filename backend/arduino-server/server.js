const express = require('express');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const server = require('http').createServer(app);

// Add basic route for testing connection
app.get('/', (req, res) => {
  res.send('Arduino server is running');
});

// Modified CORS settings to be more permissive during development
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins during development
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Modified SerialPort initialization
let port;
try {
  port = new SerialPort({
    path: 'COM3',
    baudRate: 115200
  });
} catch (err) {
  console.error('Failed to open serial port:', err);
  process.exit(1);
}

const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// Enhanced error handling for serial port
port.on('error', (err) => {
  console.error('Serial port error:', err);
});

port.on('open', () => {
  console.log('Serial port opened successfully');
});

// Parse incoming data from Arduino with validation
parser.on('data', (data) => {
  try {
    const sensorData = JSON.parse(data);
    
    // Validate data structure
    if (!isValidSensorData(sensorData)) {
      console.warn('Invalid sensor data format:', data);
      return;
    }

    // Log all received data
    console.log('Received sensor data:', {
      heartRate: sensorData.heartRate,
      acceleration: sensorData.acceleration,
      gyroscope: sensorData.gyroscope,
      temperature: sensorData.temperature
    });
    
    // Emit the sensor data to all connected clients
    io.emit('sensorData', sensorData);
  } catch (err) {
    console.error('Error parsing sensor data:', err, 'Raw data:', data);
  }
});

// Data validation function
function isValidSensorData(data) {
  return (
    typeof data.heartRate === 'number' &&
    data.acceleration &&
    typeof data.acceleration.x === 'number' &&
    typeof data.acceleration.y === 'number' &&
    typeof data.acceleration.z === 'number' &&
    data.gyroscope &&
    typeof data.gyroscope.x === 'number' &&
    typeof data.gyroscope.y === 'number' &&
    typeof data.gyroscope.z === 'number' &&
    typeof data.temperature === 'number'
  );
}

// Enhanced Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected, ID:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected, ID:', socket.id);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Start the server with error handling
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => { // Listen on all network interfaces
  console.log(`Server running on port ${PORT}`);
  console.log(`Test the connection at http://localhost:${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.close(() => {
    port.close();
    process.exit(0);
  });
}); 