import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera } from '@mediapipe/camera_utils';
import { Pose } from '@mediapipe/pose';
import './PoseTracker.css';

const PoseTracker = ({ selectedPose }) => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const poseRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [poseAccuracy, setPoseAccuracy] = useState(0);
    const [segmentAccuracies, setSegmentAccuracies] = useState({});

    const videoConstraints = {
        width: 640,
        height: 480,
        facingMode: 'user',
    };

    const calculatePoseAccuracy = (userLandmarks, targetPose) => {
        if (!targetPose || !userLandmarks) return { total: 0, segments: {} };

        // Define body segments with their corresponding landmark indices
        const bodySegments = {
            head: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            upperBody: [11, 12, 13, 14, 15, 16], // shoulders, elbows, wrists
            torso: [11, 12, 23, 24], // shoulders to hips
            lowerBody: [23, 24, 25, 26, 27, 28] // hips to ankles
        };

        // Define key points that must be visible for each segment
        const requiredPoints = {
            head: [0, 1, 4], // Nose and eyes
            upperBody: [11, 12], // Shoulders
            torso: [11, 12, 23, 24], // Shoulders and hips
            lowerBody: [23, 24, 25, 26] // Hips and knees
        };

        // Helper function to normalize pose relative to shoulders
        const normalizePose = (landmarks) => {
            // Get shoulder points
            const leftShoulder = landmarks[11];
            const rightShoulder = landmarks[12];

            // Calculate shoulder center and width
            const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
            const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;
            const shoulderWidth = Math.sqrt(
                Math.pow(rightShoulder.x - leftShoulder.x, 2) +
                Math.pow(rightShoulder.y - leftShoulder.y, 2)
            );

            // Return normalized landmarks
            return landmarks.map(landmark => ({
                x: (landmark.x - shoulderCenterX) / shoulderWidth,
                y: (landmark.y - shoulderCenterY) / shoulderWidth,
                visibility: landmark.visibility
            }));
        };

        // Normalize both poses
        const normalizedUser = normalizePose(userLandmarks);
        const normalizedTarget = normalizePose(targetPose.landmarks);

        let segmentAccuracies = {};
        let visibleSegments = 0;

        // Calculate accuracy for each body segment
        for (const [segment, points] of Object.entries(bodySegments)) {
            // Check if required points are visible
            const requiredVisible = requiredPoints[segment].every(index => {
                const userPoint = normalizedUser[index];
                const targetPoint = normalizedTarget[index];
                return userPoint.visibility > 0.5 && targetPoint.visibility > 0.5;
            });

            if (!requiredVisible) {
                continue; // Skip this segment if required points aren't visible
            }

            let segmentTotal = 0;
            let segmentPoints = 0;

            // Calculate accuracies for points
            points.forEach(index => {
                const userLandmark = normalizedUser[index];
                const targetLandmark = normalizedTarget[index];

                // Check if point is visible enough in both poses
                if (userLandmark.visibility > 0.5 && targetLandmark.visibility > 0.5) {
                    // Calculate angle between points relative to shoulder center
                    const userAngle = Math.atan2(userLandmark.y, userLandmark.x);
                    const targetAngle = Math.atan2(targetLandmark.y, targetLandmark.x);
                    const angleDiff = Math.abs(userAngle - targetAngle);

                    // Calculate position difference
                    const distance = Math.sqrt(
                        Math.pow(userLandmark.x - targetLandmark.x, 2) +
                        Math.pow(userLandmark.y - targetLandmark.y, 2)
                    );

                    // Combine angle and distance accuracy
                    const angleAccuracy = Math.max(0, 1 - (angleDiff / Math.PI));
                    const distanceAccuracy = Math.max(0, 1 - (distance / 0.5));
                    const pointAccuracy = (angleAccuracy * 0.7 + distanceAccuracy * 0.3);

                    // Add to segment total with visibility weight
                    const weight = Math.min(userLandmark.visibility, targetLandmark.visibility);
                    segmentTotal += pointAccuracy * weight;
                    segmentPoints += weight;
                }
            });

            // Calculate segment accuracy if we have points
            if (segmentPoints > 0) {
                const rawAccuracy = (segmentTotal / segmentPoints) * 100;
                segmentAccuracies[segment] = {
                    accuracy: Math.min(100, Math.max(0, rawAccuracy)),
                    visibility: segmentPoints / points.length
                };
                visibleSegments++;
            }
        }

        // Calculate overall accuracy
        if (visibleSegments === 0) return { total: 0, segments: {} };

        let totalAccuracy = 0;
        let totalWeight = 0;

        // Weight segments differently
        const segmentWeights = {
            head: 1,
            upperBody: 1.2,
            torso: 1.2,
            lowerBody: 1
        };

        for (const [segment, data] of Object.entries(segmentAccuracies)) {
            const weight = segmentWeights[segment] * data.visibility;
            totalAccuracy += data.accuracy * weight;
            totalWeight += weight;
        }

        return {
            total: Math.round(totalWeight > 0 ? totalAccuracy / totalWeight : 0),
            segments: segmentAccuracies
        };
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

        // Calculate pose accuracy if we have a selected pose
        if (selectedPose && selectedPose.landmarks) {
            const accuracyData = calculatePoseAccuracy(results.poseLandmarks, selectedPose);
            setPoseAccuracy(accuracyData.total);
            setSegmentAccuracies(accuracyData.segments);
        }

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
    }, [selectedPose]);

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
                {selectedPose && selectedPose.landmarks && Object.keys(segmentAccuracies).length > 0 && (
                    <div className="accuracy-display" style={{
                        position: 'absolute',
                        top: '20px',
                        left: '20px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '15px',
                        borderRadius: '5px',
                        fontSize: '1.1em',
                        zIndex: 1000
                    }}>
                        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
                            Overall Accuracy: {poseAccuracy}%
                        </div>
                        <div style={{ fontSize: '0.9em' }}>
                            {Object.entries(segmentAccuracies).map(([segment, data]) => (
                                <div key={segment} style={{ marginBottom: '5px' }}>
                                    {segment.charAt(0).toUpperCase() + segment.slice(1)}: {Math.round(data.accuracy)}%
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PoseTracker;
