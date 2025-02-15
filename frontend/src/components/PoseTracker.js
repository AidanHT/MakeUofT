import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera } from '@mediapipe/camera_utils';
import { Pose } from '@mediapipe/pose';
import './PoseTracker.css';

const PoseTracker = () => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const poseRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const videoConstraints = {
        width: 640,
        height: 480,
        facingMode: 'user',
    };

    const onResults = useCallback((results) => {
        if (!canvasRef.current || !results.poseLandmarks) return;

        const canvasElement = canvasRef.current;
        const canvasCtx = canvasElement.getContext('2d');
        const videoWidth = webcamRef.current.video.videoWidth;
        const videoHeight = webcamRef.current.video.videoHeight;

        // Set canvas dimensions to match video
        canvasElement.width = videoWidth;
        canvasElement.height = videoHeight;

        // Clear canvas
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        // Draw pose landmarks
        if (results.poseLandmarks) {
            // Draw the pose landmarks
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

            // Mirror the canvas context
            canvasCtx.scale(-1, 1);
            canvasCtx.translate(-videoWidth, 0);

            // Draw connectors
            canvasCtx.lineWidth = 3;

            // Draw pose connections
            function drawConnection(landmarks, start, end, color) {
                const startPoint = landmarks[start];
                const endPoint = landmarks[end];

                if (startPoint.visibility > 0.5 && endPoint.visibility > 0.5) {
                    canvasCtx.beginPath();
                    canvasCtx.moveTo(startPoint.x * videoWidth, startPoint.y * videoHeight);
                    canvasCtx.lineTo(endPoint.x * videoWidth, endPoint.y * videoHeight);
                    canvasCtx.strokeStyle = color;
                    canvasCtx.stroke();
                }
            }

            const landmarks = results.poseLandmarks;

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
            landmarks.forEach((landmark, index) => {
                if (landmark.visibility > 0.5) {
                    canvasCtx.beginPath();
                    canvasCtx.arc(
                        landmark.x * videoWidth,
                        landmark.y * videoHeight,
                        5,
                        0,
                        2 * Math.PI
                    );
                    canvasCtx.fillStyle = '#FFFFFF';
                    canvasCtx.fill();
                    canvasCtx.strokeStyle = '#000000';
                    canvasCtx.stroke();
                }
            });

            canvasCtx.restore();
        }
    }, []);

    useEffect(() => {
        let pose = null;
        let camera = null;

        const initializePose = async () => {
            try {
                pose = new Pose({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
                    }
                });

                pose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    smoothSegmentation: false,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                pose.onResults(onResults);

                if (webcamRef.current && webcamRef.current.video) {
                    camera = new Camera(webcamRef.current.video, {
                        onFrame: async () => {
                            if (webcamRef.current && webcamRef.current.video) {
                                await pose.send({ image: webcamRef.current.video });
                            }
                        },
                        width: 640,
                        height: 480
                    });

                    camera.start();
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Error initializing pose detection:', err);
                setError('Failed to initialize pose detection. Please try refreshing the page.');
                setIsLoading(false);
            }
        };

        initializePose();

        return () => {
            if (camera) {
                camera.stop();
            }
            if (pose) {
                pose.close();
            }
        };
    }, [onResults]);

    return (
        <div className="pose-tracker">
            {isLoading && (
                <div className="loading">
                    <p>Loading pose detector... Please wait a moment.</p>
                    <p style={{ fontSize: '0.9em', color: '#666' }}>
                        This may take a few seconds to initialize.
                    </p>
                </div>
            )}
            {error && (
                <div className="error">
                    <p>{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '10px',
                            padding: '8px 16px',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}
            <div className="camera-container">
                <Webcam
                    ref={webcamRef}
                    className="webcam"
                    mirrored={true}
                    videoConstraints={videoConstraints}
                />
                <canvas ref={canvasRef} className="pose-canvas" />
            </div>
        </div>
    );
};

export default PoseTracker;
