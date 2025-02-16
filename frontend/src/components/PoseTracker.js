import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Webcam from 'react-webcam';
import { Camera } from '@mediapipe/camera_utils';
import { Pose } from '@mediapipe/pose';
import './PoseTracker.css';
import io from 'socket.io-client';

const PoseTracker = ({ userPreferences }) => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const poseRef = useRef(null);
    const cameraRef = useRef(null);
    const cleanupInProgressRef = useRef(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [poseAccuracy, setPoseAccuracy] = useState(0);
    const [segmentAccuracies, setSegmentAccuracies] = useState({});
    const [poseFeedback, setPoseFeedback] = useState('');
    const [wsConnection, setWsConnection] = useState(null);
    const [selectedPose, setSelectedPose] = useState(null);

    // New state variables for pose cycling
    const [availablePoses, setAvailablePoses] = useState([]);
    const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(15);
    const [isSessionComplete, setIsSessionComplete] = useState(false);
    const [totalPosesCompleted, setTotalPosesCompleted] = useState(0);

    // Add new state variables for session control
    const [isSessionStarted, setIsSessionStarted] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Constants
    const POSE_DURATION = 15; // seconds
    const poseNames = [
        'crescent-lunge',
        'dancers-pose',
        'high-plank-pose',
        'mountain-pose',
        'seated-forward-fold',
        'tree-pose',
        'triangle-pose',
        'upward-facing-dog'
    ];

    // Throttle pose detection frames
    const lastProcessedTime = useRef(0);
    const FRAME_RATE = 30; // Process 30 frames per second
    const FRAME_INTERVAL = 1000 / FRAME_RATE;

    // Memoize video constraints
    const videoConstraints = useMemo(() => ({
        width: 640,
        height: 480,
        facingMode: 'user',
    }), []);

    // Memoize segment definitions
    const bodySegments = useMemo(() => ({
        head: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        upperBody: [11, 12, 13, 14, 15, 16],
        torso: [11, 12, 23, 24],
        lowerBody: [23, 24, 25, 26, 27, 28]
    }), []);

    const requiredPoints = useMemo(() => ({
        head: [0, 1, 4],
        upperBody: [11, 12],
        torso: [11, 12, 23, 24],
        lowerBody: [23, 24, 25, 26]
    }), []);

    const segmentWeights = useMemo(() => ({
        head: 1,
        upperBody: 1.2,
        torso: 1.2,
        lowerBody: 1
    }), []);

    // Memoize normalization function
    const normalizePose = useCallback((landmarks) => {
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];

        const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
        const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;
        const shoulderWidth = Math.sqrt(
            Math.pow(rightShoulder.x - leftShoulder.x, 2) +
            Math.pow(rightShoulder.y - leftShoulder.y, 2)
        );

        return landmarks.map(landmark => ({
            x: (landmark.x - shoulderCenterX) / shoulderWidth,
            y: (landmark.y - shoulderCenterY) / shoulderWidth,
            visibility: landmark.visibility
        }));
    }, []);

    // Optimize pose accuracy calculation
    const calculatePoseAccuracy = useCallback((userLandmarks, targetPose) => {
        if (!targetPose?.landmarks || !userLandmarks) return { total: 0, segments: {} };

        const normalizedUser = normalizePose(userLandmarks);
        const normalizedTarget = normalizePose(targetPose.landmarks);

        let segmentAccuracies = {};
        let visibleSegments = 0;

        for (const [segment, points] of Object.entries(bodySegments)) {
            const requiredVisible = requiredPoints[segment].every(index => {
                const userPoint = normalizedUser[index];
                const targetPoint = normalizedTarget[index];
                return userPoint.visibility > 0.5 && targetPoint.visibility > 0.5;
            });

            if (!requiredVisible) continue;

            let segmentTotal = 0;
            let segmentPoints = 0;

            for (const index of points) {
                const userLandmark = normalizedUser[index];
                const targetLandmark = normalizedTarget[index];

                if (userLandmark.visibility > 0.5 && targetLandmark.visibility > 0.5) {
                    const userAngle = Math.atan2(userLandmark.y, userLandmark.x);
                    const targetAngle = Math.atan2(targetLandmark.y, targetLandmark.x);
                    const angleDiff = Math.abs(userAngle - targetAngle);

                    const distance = Math.hypot(
                        userLandmark.x - targetLandmark.x,
                        userLandmark.y - targetLandmark.y
                    );

                    const angleAccuracy = Math.max(0, 1 - (angleDiff / Math.PI));
                    const distanceAccuracy = Math.max(0, 1 - (distance / 0.5));
                    const pointAccuracy = (angleAccuracy * 0.7 + distanceAccuracy * 0.3);

                    const weight = Math.min(userLandmark.visibility, targetLandmark.visibility);
                    segmentTotal += pointAccuracy * weight;
                    segmentPoints += weight;
                }
            }

            if (segmentPoints > 0) {
                const rawAccuracy = (segmentTotal / segmentPoints) * 100;
                segmentAccuracies[segment] = {
                    accuracy: Math.min(100, Math.max(0, rawAccuracy)),
                    visibility: segmentPoints / points.length
                };
                visibleSegments++;
            }
        }

        if (visibleSegments === 0) return { total: 0, segments: {} };

        let totalAccuracy = 0;
        let totalWeight = 0;

        for (const [segment, data] of Object.entries(segmentAccuracies)) {
            const weight = segmentWeights[segment] * data.visibility;
            totalAccuracy += data.accuracy * weight;
            totalWeight += weight;
        }

        return {
            total: Math.round(totalWeight > 0 ? totalAccuracy / totalWeight : 0),
            segments: segmentAccuracies
        };
    }, [bodySegments, requiredPoints, segmentWeights, normalizePose]);

    // Optimize onResults callback
    const onResults = useCallback((results) => {
        if (!canvasRef.current || !results.poseLandmarks) return;

        // Only process pose detection if session is started and not paused
        if (!isSessionStarted || isPaused) return;

        // Throttle frame processing
        const now = performance.now();
        if (now - lastProcessedTime.current < FRAME_INTERVAL) return;
        lastProcessedTime.current = now;

        const canvasElement = canvasRef.current;
        const canvasCtx = canvasElement.getContext('2d');
        const videoWidth = webcamRef.current?.video?.videoWidth || 640;
        const videoHeight = webcamRef.current?.video?.videoHeight || 480;

        // Set canvas dimensions to match video
        if (canvasElement.width !== videoWidth) {
            canvasElement.width = videoWidth;
            canvasElement.height = videoHeight;
        }

        // Calculate pose accuracy if we have a selected pose and session is started
        if (selectedPose?.landmarks && isSessionStarted && !isPaused) {
            const accuracyData = calculatePoseAccuracy(results.poseLandmarks, selectedPose);
            setPoseAccuracy(accuracyData.total);
            setSegmentAccuracies(accuracyData.segments);
        }

        // Draw pose landmarks with optimized rendering
        if (results.poseLandmarks) {
            canvasCtx.save();
            canvasCtx.clearRect(0, 0, videoWidth, videoHeight);
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
    }, [selectedPose, isPaused, calculatePoseAccuracy, isSessionStarted]);

    useEffect(() => {
        const loadPoses = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Default to 1 pose if no preferences
                const count = userPreferences?.poseCount || 1;
                console.log('Loading poses with count:', count);

                // Load all poses up to the user's poseCount
                const posesToLoad = poseNames.slice(0, count);
                console.log('Poses to load:', posesToLoad);

                const loadedPoses = await Promise.all(
                    posesToLoad.map(async (poseName) => {
                        try {
                            const response = await fetch(`${process.env.PUBLIC_URL}/pose_results/${poseName}_pose.json`);
                            if (!response.ok) {
                                throw new Error(`Failed to load pose: ${poseName}`);
                            }
                            const poseData = await response.json();
                            return { ...poseData, name: poseName };
                        } catch (err) {
                            console.error(`Error loading pose ${poseName}:`, err);
                            throw err;
                        }
                    })
                );

                console.log('Loaded poses:', loadedPoses);
                setAvailablePoses(loadedPoses);
                if (loadedPoses.length > 0) {
                    setSelectedPose(loadedPoses[0]);
                }
                setIsLoading(false);
            } catch (err) {
                console.error('Error loading pose data:', err);
                setError('Failed to load pose data. Please check your internet connection and try again.');
                setIsLoading(false);
            }
        };

        if (userPreferences) {
            loadPoses();
        }
    }, [userPreferences]);

    const cleanup = useCallback(() => {
        if (cleanupInProgressRef.current) return;
        cleanupInProgressRef.current = true;

        try {
            if (cameraRef.current) {
                cameraRef.current.stop();
                cameraRef.current = null;
            }
            if (poseRef.current) {
                poseRef.current.close();
                poseRef.current = null;
            }
        } catch (err) {
            console.error('Error during cleanup:', err);
        } finally {
            cleanupInProgressRef.current = false;
        }
    }, []);

    // Timer effect for pose cycling
    useEffect(() => {
        if (!availablePoses.length || isSessionComplete || !isSessionStarted || isPaused) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    // Time to switch poses
                    setCurrentPoseIndex(currentIndex => {
                        const nextIndex = currentIndex + 1;
                        // Increment completed poses count for the pose that just finished
                        setTotalPosesCompleted(prev => prev + 1);

                        if (nextIndex >= availablePoses.length) {
                            setIsSessionComplete(true);
                            cleanup();
                            return currentIndex;
                        }
                        setSelectedPose(availablePoses[nextIndex]);
                        return nextIndex;
                    });
                    return POSE_DURATION;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [availablePoses, isSessionComplete, cleanup, isSessionStarted, isPaused]);

    // Handler for starting the session
    const handleStartSession = useCallback(() => {
        // Reset game state
        setGameState({
            level: 1,
            totalScore: 0,
            currentStreak: 0,
            achievements: [],
            highestAccuracy: 0
        });

        // Initialize or reinitialize WebSocket if needed
        if (!wsConnection) {
            const ws = new WebSocket('ws://localhost:8000/ws/pose-feedback');
            ws.onopen = () => {
                console.log('Connected to feedback server');
                setWsConnection(ws);
            };
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setError('Failed to connect to the feedback server. Please try again.');
            };
        }

        setIsSessionStarted(true);
        setIsPaused(false);
        setTimeRemaining(POSE_DURATION);
        setTotalPosesCompleted(0);
    }, [wsConnection]);

    // Handler for pausing/resuming the session
    const handlePauseResume = useCallback(() => {
        setIsPaused(prev => !prev);
    }, []);

    // Handler for resetting the session
    const handleReset = useCallback(() => {
        cleanup();
        setIsSessionStarted(false);
        setIsPaused(false);
        setIsSessionComplete(false);
        setCurrentPoseIndex(0);
        setTimeRemaining(POSE_DURATION);
        setTotalPosesCompleted(0);
        if (availablePoses.length > 0) {
            setSelectedPose(availablePoses[0]);
        }
    }, [cleanup, availablePoses]);

    // Optimize MediaPipe initialization
    useEffect(() => {
        const initializePose = async () => {
            try {
                setIsLoading(true);
                setError(null);

                cleanup();

                const pose = new Pose({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
                });

                pose.setOptions({
                    modelComplexity: 1,
                    smoothLandmarks: true,
                    enableSegmentation: false,
                    smoothSegmentation: false,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                await pose.initialize();
                pose.onResults(onResults);
                poseRef.current = pose;

                if (webcamRef.current?.video) {
                    const camera = new Camera(webcamRef.current.video, {
                        onFrame: async () => {
                            if (webcamRef.current?.video && poseRef.current && !cleanupInProgressRef.current && !isPaused) {
                                try {
                                    await poseRef.current.send({ image: webcamRef.current.video });
                                } catch (err) {
                                    if (!err.message?.includes('already deleted')) {
                                        console.error('Error in pose detection frame:', err);
                                    }
                                }
                            }
                        },
                        width: 640,
                        height: 480
                    });

                    await camera.start();
                    cameraRef.current = camera;
                }

                setIsInitialized(true);
                setIsLoading(false);
            } catch (err) {
                console.error('Error initializing pose detection:', err);
                setError('Failed to initialize pose detection. Please ensure you have granted camera permissions and try again.');
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            if (webcamRef.current?.video) {
                initializePose();
            }
        }, 1000);

        return () => {
            clearTimeout(timeoutId);
            cleanup();
        };
    }, [onResults, cleanup, isPaused]);

    // Cleanup on unmount
    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    useEffect(() => {
        // Initialize WebSocket connection
        const ws = new WebSocket('ws://localhost:8000/ws/pose-feedback');

        ws.onopen = () => {
            console.log('Connected to feedback server');
            setWsConnection(ws);
        };

        ws.onmessage = (event) => {
            setPoseFeedback(event.data);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        return () => {
            if (ws) {
                ws.close();
            }
        };
    }, []);

    // Send pose data to backend when accuracy updates
    useEffect(() => {
        if (wsConnection && selectedPose && Object.keys(segmentAccuracies).length > 0) {
            const poseData = {
                pose_name: selectedPose.name || 'unknown pose',
                overall_accuracy: poseAccuracy,
                segment_accuracies: segmentAccuracies
            };
            wsConnection.send(JSON.stringify(poseData));
        }
    }, [poseAccuracy, segmentAccuracies, selectedPose, wsConnection]);

    // Add dynamic accuracy class
    const getAccuracyClass = useCallback((accuracy) => {
        if (accuracy >= 95) return 'perfect';
        if (accuracy >= 80) return 'high';
        return '';
    }, []);

    // Add sound effects with error handling
    const playSound = useCallback((type) => {
        const soundPaths = {
            achievement: `${process.env.PUBLIC_URL}/sounds/achievement.mp3`,
            levelUp: `${process.env.PUBLIC_URL}/sounds/level-up.mp3`,
            score: `${process.env.PUBLIC_URL}/sounds/score.mp3`,
            perfect: `${process.env.PUBLIC_URL}/sounds/perfect.mp3`
        };

        const path = soundPaths[type];
        if (!path) return;

        try {
            const audio = new Audio(path);
            audio.play().catch(err => {
                console.warn(`Sound playback failed for ${type}:`, err);
                // Continue without sound if file is missing or playback fails
            });
        } catch (err) {
            console.warn(`Failed to create audio for ${type}:`, err);
            // Continue without sound if audio creation fails
        }
    }, []);

    // Add missing game state variables
    const [gameState, setGameState] = useState({
        level: 1,
        totalScore: 0,
        currentStreak: 0,
        achievements: [],
        highestAccuracy: 0
    });
    const [showAchievement, setShowAchievement] = useState(null);
    const [scorePopup, setScorePopup] = useState(null);
    const [accuracyRating, setAccuracyRating] = useState(null);
    const [gameFeedback, setGameFeedback] = useState(null);

    // Add handlers for game mechanics
    const handleNewScore = useCallback((score, x, y) => {
        setScorePopup({ score, x, y });
        setTimeout(() => setScorePopup(null), 1000);
    }, []);

    const handleNewAchievement = useCallback((achievement) => {
        setShowAchievement(achievement);
        setTimeout(() => setShowAchievement(null), 3000);
    }, []);

    // Update the websocket message handler
    useEffect(() => {
        if (wsConnection) {
            wsConnection.onmessage = (event) => {
                try {
                    const feedback = JSON.parse(event.data);
                    console.log('Received feedback:', feedback); // Debug log

                    // Update game state with smooth animations
                    setGameState(prev => ({
                        ...prev,
                        level: feedback.level || prev.level,
                        totalScore: feedback.total_score || prev.totalScore,
                        currentStreak: feedback.current_streak || prev.currentStreak,
                        highestAccuracy: Math.max(prev.highestAccuracy, poseAccuracy)
                    }));

                    // Handle score popup with position randomization
                    if (feedback.score) {
                        const rect = canvasRef.current?.getBoundingClientRect();
                        if (rect) {
                            const randomOffset = Math.random() * 100 - 50;
                            handleNewScore(
                                feedback.score,
                                rect.right - 100 + randomOffset,
                                rect.top + 50 + Math.random() * 50
                            );
                            playSound('score');
                        }
                    }

                    // Handle accuracy rating
                    if (feedback.accuracy_rating) {
                        setAccuracyRating(feedback.accuracy_rating);
                        if (feedback.accuracy_rating === 'PERFECT') {
                            playSound('perfect');
                        }
                    }

                    // Handle level up
                    if (feedback.level_up) {
                        handleNewAchievement(`🎉 Level Up! You've reached level ${feedback.level}!`);
                        playSound('levelUp');
                    }

                    // Handle achievements
                    if (feedback.new_achievements?.length > 0) {
                        feedback.new_achievements.forEach(achievement => {
                            handleNewAchievement(achievement);
                            playSound('achievement');
                        });
                    }

                    // Update game feedback
                    if (feedback.feedback) {
                        setGameFeedback(feedback.feedback);
                    }

                } catch (error) {
                    console.error('Error processing websocket message:', error);
                }
            };
        }
    }, [wsConnection, playSound, handleNewAchievement, handleNewScore, poseAccuracy, canvasRef]);

    // Add streak bonus calculation
    const calculateStreakBonus = useCallback((streak) => {
        if (streak >= 10) return 3.0; // Triple points
        if (streak >= 5) return 2.0;  // Double points
        if (streak >= 3) return 1.5;  // 50% bonus
        return 1.0;
    }, []);

    // Add pose difficulty bonus
    const calculatePoseDifficulty = useCallback((poseName) => {
        const difficultyMap = {
            'mountain-pose': 1.0,
            'tree-pose': 1.2,
            'warrior-pose': 1.3,
            'triangle-pose': 1.4,
            'crow-pose': 1.5
        };
        return difficultyMap[poseName] || 1.0;
    }, []);

    // Calculate final score with bonuses
    const calculateFinalScore = useCallback((baseScore, streak, poseName) => {
        const streakBonus = calculateStreakBonus(streak);
        const difficultyBonus = calculatePoseDifficulty(poseName);
        return Math.round(baseScore * streakBonus * difficultyBonus);
    }, [calculateStreakBonus, calculatePoseDifficulty]);

    // Add new state for sensor data
    const [sensorData, setSensorData] = useState({
        heartRate: 0,
        temperature: 0,
        acceleration: { x: 0, y: 0, z: 0 },
        gyroscope: { x: 0, y: 0, z: 0 }
    });

    // Add Socket.IO connection for Arduino data
    useEffect(() => {
        const arduinoSocket = io('http://localhost:3001');

        arduinoSocket.on('connect', () => {
            console.log('Connected to Arduino server');
        });

        arduinoSocket.on('heartRate', (data) => {
            setSensorData(prev => ({ ...prev, heartRate: data.value }));
        });

        arduinoSocket.on('temperature', (data) => {
            setSensorData(prev => ({ ...prev, temperature: data.value }));
        });

        arduinoSocket.on('motion', (data) => {
            setSensorData(prev => ({
                ...prev,
                acceleration: data.acceleration,
                gyroscope: data.gyroscope
            }));
        });

        arduinoSocket.on('error', (error) => {
            console.error('Arduino socket error:', error);
        });

        return () => {
            arduinoSocket.disconnect();
        };
    }, []);

    return (
        <div className="pose-tracker">
            {/* Game Overlay */}
            <div className="game-overlay">
                <div className="game-stats">
                    <div className="game-stat">
                        <span className="stat-label">Level</span>
                        <span className="stat-value">{gameState.level}</span>
                        <div className="level-progress">
                            <div
                                className="level-progress-fill"
                                style={{ width: `${(gameState.totalScore % 1000) / 10}%` }}
                            />
                        </div>
                    </div>
                    <div className="game-stat">
                        <span className="stat-label">Score</span>
                        <span className="stat-value">{gameState.totalScore}</span>
                    </div>
                    <div className="game-stat">
                        <span className="stat-label">Streak</span>
                        <span className="stat-value">{gameState.currentStreak}x</span>
                    </div>
                </div>
            </div>

            {/* Score Popup */}
            {scorePopup && (
                <div
                    className="score-popup"
                    style={{
                        left: scorePopup.x,
                        top: scorePopup.y
                    }}
                >
                    +{scorePopup.score}
                </div>
            )}

            {/* Achievement Popup */}
            {showAchievement && (
                <div className="achievement-popup">
                    <div className="achievement-title">🏆 Achievement Unlocked!</div>
                    <div className="achievement-description">{showAchievement}</div>
                </div>
            )}

            <div className="pose-header">
                <h1>Pose Tracking</h1>
                {!isSessionComplete ? (
                    <>
                        {!isSessionStarted ? (
                            <div className="session-controls">
                                <h3>Ready to start your yoga session?</h3>
                                <p>You will perform {availablePoses.length} poses, holding each for {POSE_DURATION} seconds.</p>
                                <button
                                    className="start-button"
                                    onClick={handleStartSession}
                                    disabled={!isInitialized || isLoading}
                                >
                                    Start Session
                                </button>
                            </div>
                        ) : (
                            <div className="pose-info">
                                <h3>Current Pose: {selectedPose?.name?.replace(/-/g, ' ').replace(/_pose$/, '')}</h3>
                                <div className="timer">Time Remaining: {timeRemaining}s</div>
                                <div className="progress">
                                    Pose {currentPoseIndex + 1} of {availablePoses.length || userPreferences?.poseCount || 1}
                                </div>
                                <div className="session-controls">
                                    <button
                                        className={`control-button ${isPaused ? 'resume' : 'pause'}`}
                                        onClick={handlePauseResume}
                                    >
                                        {isPaused ? 'Resume' : 'Pause'}
                                    </button>
                                    <button
                                        className="control-button reset"
                                        onClick={handleReset}
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="session-complete">
                        <h3>Session Complete!</h3>
                        <p>You completed {totalPosesCompleted} poses</p>
                        <button
                            className="start-button"
                            onClick={handleReset}
                        >
                            Start New Session
                        </button>
                    </div>
                )}
            </div>

            <div className="pose-container">
                <div className="webcam-section">
                    <div className="webcam-container">
                        <Webcam
                            ref={webcamRef}
                            videoConstraints={videoConstraints}
                            style={{ display: 'block' }}
                            mirrored={true}
                            onUserMediaError={(err) => {
                                console.error('Webcam error:', err);
                                setError('Failed to access camera. Please ensure you have granted camera permissions.');
                                setIsLoading(false);
                            }}
                        />
                        <canvas ref={canvasRef} className="pose-canvas" />
                        {isLoading && (
                            <div className="loading-overlay">
                                <div className="loading-spinner"></div>
                                <div>Loading pose detection...</div>
                            </div>
                        )}
                    </div>
                    {selectedPose && isSessionStarted && (
                        <div className="reference-pose">
                            <h3>Reference Pose</h3>
                            {console.log('Loading image for pose:', selectedPose.name)}
                            <img
                                src={selectedPose.name.endsWith('-pose')
                                    ? `/training/photos/${selectedPose.name}.png`
                                    : `/training/photos/${selectedPose.name}-pose.png`}
                                alt={selectedPose.name.replace(/-/g, ' ')}
                                className="reference-image"
                                onError={(e) => {
                                    console.error('Error loading image:', e.target.src);
                                    e.target.style.display = 'none';
                                }}
                                onLoad={() => console.log('Successfully loaded image for:', selectedPose.name)}
                            />
                        </div>
                    )}
                </div>

                <div className="stats-section">
                    <div className="accuracy-card">
                        <h3>Overall Accuracy</h3>
                        <div className={`accuracy-value ${isSessionStarted ? getAccuracyClass(poseAccuracy) : 'perfect'}`}>
                            {isSessionStarted ? poseAccuracy : 100}%
                        </div>
                        {isSessionStarted && accuracyRating && (
                            <div className={`accuracy-rating ${accuracyRating}`}>
                                {accuracyRating}
                            </div>
                        )}
                    </div>

                    <div className="segment-accuracies">
                        {isSessionStarted ? (
                            Object.entries(segmentAccuracies).map(([segment, data]) => (
                                <div key={segment} className="segment-item">
                                    <label>{segment.replace(/([A-Z])/g, ' $1').trim()}</label>
                                    <div className="accuracy-bar">
                                        <div
                                            className="accuracy-fill"
                                            style={{ width: `${data.accuracy}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Show default 100% segments before session starts
                            Object.keys(bodySegments).map((segment) => (
                                <div key={segment} className="segment-item">
                                    <label>{segment.replace(/([A-Z])/g, ' $1').trim()}</label>
                                    <div className="accuracy-bar">
                                        <div
                                            className="accuracy-fill"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {isSessionStarted && gameFeedback && (
                        <div className="feedback-card">
                            <h3>Instructor Feedback</h3>
                            <div className="feedback-section">
                                {gameFeedback}
                            </div>
                        </div>
                    )}

                    <div className="sensor-data-section">
                        <h3>Biometric Data</h3>
                        <div className="sensor-grid">
                            <div className="sensor-card">
                                <span className="sensor-label">Heart Rate</span>
                                <span className="sensor-value">{sensorData.heartRate} BPM</span>
                            </div>
                            <div className="sensor-card">
                                <span className="sensor-label">Temperature</span>
                                <span className="sensor-value">{sensorData.temperature}°C</span>
                            </div>
                            <div className="sensor-card">
                                <span className="sensor-label">Motion</span>
                                <div className="motion-data">
                                    <div>
                                        <small>Acceleration (m/s²)</small>
                                        <div>X: {sensorData.acceleration.x.toFixed(2)}</div>
                                        <div>Y: {sensorData.acceleration.y.toFixed(2)}</div>
                                        <div>Z: {sensorData.acceleration.z.toFixed(2)}</div>
                                    </div>
                                    <div>
                                        <small>Rotation (deg/s)</small>
                                        <div>X: {sensorData.gyroscope.x.toFixed(2)}</div>
                                        <div>Y: {sensorData.gyroscope.y.toFixed(2)}</div>
                                        <div>Z: {sensorData.gyroscope.z.toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <p>{error}</p>
                    <button
                        className="retry-button"
                        onClick={() => {
                            setError(null);
                            window.location.reload();
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}
        </div>
    );
};

export default PoseTracker;
