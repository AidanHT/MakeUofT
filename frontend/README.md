# Workout Pose Tracker

A real-time pose tracking web application that uses your webcam to detect and track body movements. Built with React and MediaPipe Pose detection.

## Features

- Real-time webcam feed
- Body pose detection and tracking
- Visual keypoints and skeleton overlay
- Smooth performance in the browser

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)
- A modern web browser
- Webcam access

## Installation

1. Clone this repository:
```bash
git clone [your-repository-url]
cd pose-tracking-workout
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

1. Start the development server:
```bash
npm start
```

2. Open your browser and navigate to `http://localhost:3000`

3. Allow webcam access when prompted by your browser

## How It Works

The application uses the following technologies:

- React for the user interface
- MediaPipe Pose for pose detection
- TensorFlow.js for running the pose detection model
- HTML5 Canvas for drawing keypoints and skeleton

The pose detection runs entirely in the browser, ensuring privacy and low latency.

## Browser Compatibility

The application works best in:
- Google Chrome (recommended)
- Firefox
- Edge
- Safari

## Troubleshooting

If you encounter issues:

1. Ensure your webcam is properly connected and functioning
2. Check that you've granted webcam permissions to the browser
3. Try refreshing the page
4. Ensure you're using a supported browser
5. Check that all dependencies are properly installed

## License

MIT License 