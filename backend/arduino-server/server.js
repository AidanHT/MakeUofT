const express = require('express');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
const server = require('http').createServer(app);

// Add this near the top of the file
const DEBUG = false;

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

// Add structured data events for specific sensor types
parser.on('data', (data) => {
  if (DEBUG) {
    console.log('Raw data received:', data);
    console.log('Data length:', data.length);
    console.log('Data buffer:', Buffer.from(data));
  }
  try {
    // Skip empty data
    if (!data || data.trim() === '') {
      return;
    }

    // Clean the data: remove any extra characters and ensure proper JSON format
    let cleanedData = data.trim()
      .replace(/\r?\n|\r/g, '') // Remove any newlines
      .replace(/}{/g, '}') // Remove any concatenated JSON objects
      .replace(/\u0000/g, '') // Remove null bytes
      .replace(/[^\x20-\x7E]/g, ''); // Remove non-printable characters

    // Ensure the data starts with { and ends with }
    if (!cleanedData.startsWith('{') || !cleanedData.endsWith('}')) {
      console.warn('Malformed JSON data received:', data);
      return;
    }

    const sensorData = JSON.parse(cleanedData);
    
    // Validate data structure
    if (!isValidSensorData(sensorData)) {
      console.warn('Invalid sensor data format:', cleanedData);
      return;
    }

    // Log the successful parse
    console.log('Successfully parsed sensor data:', sensorData);

    // Emit individual events for each sensor type
    io.emit('heartRate', { 
      value: sensorData.heartRate,
      timestamp: Date.now() 
    });

    io.emit('motion', {
      acceleration: sensorData.acceleration,
      gyroscope: sensorData.gyroscope,
      timestamp: Date.now()
    });

    io.emit('temperature', {
      value: sensorData.temperature,
      timestamp: Date.now()
    });

    // Keep the original combined event for backwards compatibility
    io.emit('sensorData', {
      ...sensorData,
      timestamp: Date.now()
    });

  } catch (err) {
    console.error('Error parsing sensor data:', err.message);
    console.error('Raw data:', JSON.stringify(data));
    console.error('Data type:', typeof data);
    console.error('Data length:', data.length);
  }
});

// Add API endpoints for REST clients
app.use(express.json());

// GET endpoint to fetch latest sensor values
let latestSensorData = null;
parser.on('data', (data) => {
  try {
    if (!data || data.trim() === '') return;

    let cleanedData = data.trim()
      .replace(/\r?\n|\r/g, '')
      .replace(/}{/g, '}')
      .replace(/\u0000/g, '')
      .replace(/[^\x20-\x7E]/g, '');

    if (!cleanedData.startsWith('{') || !cleanedData.endsWith('}')) return;

    latestSensorData = JSON.parse(cleanedData);
  } catch (err) {
    console.error('Error updating latest sensor data:', err.message);
  }
});

app.get('/api/sensors', (req, res) => {
  if (latestSensorData) {
    res.json({
      ...latestSensorData,
      timestamp: Date.now()
    });
  } else {
    res.status(503).json({ error: 'No sensor data available yet' });
  }
});

// Add specific endpoints for each sensor type
app.get('/api/sensors/heartrate', (req, res) => {
  if (latestSensorData?.heartRate !== undefined) {
    res.json({
      value: latestSensorData.heartRate,
      timestamp: Date.now()
    });
  } else {
    res.status(503).json({ error: 'Heart rate data not available' });
  }
});

app.get('/api/sensors/motion', (req, res) => {
  if (latestSensorData?.acceleration && latestSensorData?.gyroscope) {
    res.json({
      acceleration: latestSensorData.acceleration,
      gyroscope: latestSensorData.gyroscope,
      timestamp: Date.now()
    });
  } else {
    res.status(503).json({ error: 'Motion data not available' });
  }
});

app.get('/api/sensors/temperature', (req, res) => {
  if (latestSensorData?.temperature !== undefined) {
    res.json({
      value: latestSensorData.temperature,
      timestamp: Date.now()
    });
  } else {
    res.status(503).json({ error: 'Temperature data not available' });
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