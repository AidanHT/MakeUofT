import { createCanvas, loadImage } from 'canvas';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';

// Set up a virtual DOM for MediaPipe
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    resources: 'usable',
    runScripts: 'dangerously'
});
global.window = dom.window;
global.document = window.document;
global.navigator = window.navigator;
global.fetch = fetch;

// Load MediaPipe script
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
document.body.appendChild(script);

class PhotoPoseAnalyzer {
    constructor() {
        this.pose = null;
        this.results = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Wait for MediaPipe to load
            await new Promise((resolve) => {
                if (window.Pose) {
                    resolve();
                } else {
                    script.onload = resolve;
                }
            });

            console.log('Creating Pose instance...');
            this.pose = new window.Pose({
                locateFile: (file) => {
                    console.log('Loading MediaPipe file:', file);
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                }
            });

            console.log('Setting up pose options...');
            this.pose.setOptions({
                modelComplexity: 1,
                smoothLandmarks: true,
                enableSegmentation: false,
                smoothSegmentation: false,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.isInitialized = true;
            console.log('Pose detector initialized successfully');
            return this;
        } catch (error) {
            console.error('Error initializing pose detector:', error);
            throw error;
        }
    }

    async analyzePose(imageElement) {
        if (!this.pose || !this.isInitialized) {
            throw new Error('Pose detector not initialized. Call initialize() first.');
        }

        try {
            console.log('Starting pose analysis...');

            return new Promise((resolve, reject) => {
                // Set up one-time result handler
                const handleResults = (results) => {
                    if (results.poseLandmarks) {
                        // Create a snapshot of the pose data
                        const poseSnapshot = {
                            timestamp: new Date().toISOString(),
                            landmarks: results.poseLandmarks.map(landmark => ({
                                x: landmark.x,
                                y: landmark.y,
                                z: landmark.z,
                                visibility: landmark.visibility
                            }))
                        };
                        resolve(poseSnapshot);
                    } else {
                        resolve(null);
                    }
                };

                // Set the results handler
                this.pose.onResults(handleResults);

                // Send the image for processing
                this.pose.send({ image: imageElement })
                    .catch(reject);
            });
        } catch (error) {
            console.error('Error during pose analysis:', error);
            throw error;
        }
    }

    drawPoseOnCanvas(canvas, imageElement, poseData) {
        const ctx = canvas.getContext('2d');

        // Set canvas dimensions to match image
        canvas.width = imageElement.width;
        canvas.height = imageElement.height;

        // Draw the original image
        ctx.drawImage(imageElement, 0, 0);

        if (!poseData || !poseData.landmarks) return;

        // Draw pose connections
        function drawConnection(landmarks, start, end, color) {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];

            if (startPoint.visibility > 0.5 && endPoint.visibility > 0.5) {
                ctx.beginPath();
                ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
                ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }

        const landmarks = poseData.landmarks;

        // Draw body parts with different colors
        // Upper body (green)
        const upperBodyColor = '#00FF00';
        drawConnection(landmarks, 11, 12, upperBodyColor); // shoulders
        drawConnection(landmarks, 11, 13, upperBodyColor); // left upper arm
        drawConnection(landmarks, 13, 15, upperBodyColor); // left lower arm
        drawConnection(landmarks, 12, 14, upperBodyColor); // right upper arm
        drawConnection(landmarks, 14, 16, upperBodyColor); // right lower arm

        // Head (red)
        const headColor = '#FF0000';
        drawConnection(landmarks, 0, 1, headColor);
        drawConnection(landmarks, 1, 2, headColor);
        drawConnection(landmarks, 2, 3, headColor);
        drawConnection(landmarks, 3, 7, headColor);
        drawConnection(landmarks, 0, 4, headColor);
        drawConnection(landmarks, 4, 5, headColor);
        drawConnection(landmarks, 5, 6, headColor);
        drawConnection(landmarks, 6, 8, headColor);

        // Torso (blue)
        const torsoColor = '#0000FF';
        drawConnection(landmarks, 11, 23, torsoColor); // left shoulder to hip
        drawConnection(landmarks, 12, 24, torsoColor); // right shoulder to hip
        drawConnection(landmarks, 23, 24, torsoColor); // hips

        // Lower body (yellow)
        const lowerBodyColor = '#FFFF00';
        drawConnection(landmarks, 23, 25, lowerBodyColor); // left hip to knee
        drawConnection(landmarks, 25, 27, lowerBodyColor); // left knee to ankle
        drawConnection(landmarks, 24, 26, lowerBodyColor); // right hip to knee
        drawConnection(landmarks, 26, 28, lowerBodyColor); // right knee to ankle

        // Draw landmarks
        landmarks.forEach((landmark) => {
            if (landmark.visibility > 0.5) {
                ctx.beginPath();
                ctx.arc(
                    landmark.x * canvas.width,
                    landmark.y * canvas.height,
                    5,
                    0,
                    2 * Math.PI
                );
                ctx.fillStyle = '#FFFFFF';
                ctx.fill();
                ctx.strokeStyle = '#000000';
                ctx.stroke();
            }
        });
    }
}

export default PhotoPoseAnalyzer; 