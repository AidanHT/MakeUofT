import React, { useState, useEffect } from 'react';
import PoseTracker from './components/PoseTracker';
import './App.css';

function App() {
    const [selectedPose, setSelectedPose] = useState(null);
    const [poseData, setPoseData] = useState(null);
    const [loading, setLoading] = useState(false);

    const poses = [
        'seated-forward-fold',
        'triangle-pose',
        'upward-facing-dog',
        'crescent-lunge',
        'tree-pose',
        'mountain-pose',
        'dancers-pose'
    ];

    const loadPoseData = async (poseName) => {
        if (!poseName) {
            setPoseData(null);
            setSelectedPose(null);
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`/pose_results/${poseName}_pose.json`);
            if (!response.ok) {
                throw new Error('Failed to load pose data');
            }
            const data = await response.json();
            setPoseData(data);
            setSelectedPose(poseName);
        } catch (error) {
            console.error('Error loading pose data:', error);
            alert('Failed to load pose data. Please try again.');
            setPoseData(null);
            setSelectedPose(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>Workout Pose Tracker</h1>
                <div className="pose-selector">
                    <select
                        value={selectedPose || ''}
                        onChange={(e) => loadPoseData(e.target.value)}
                        style={{
                            padding: '8px 16px',
                            fontSize: '1em',
                            margin: '10px',
                            borderRadius: '4px'
                        }}
                    >
                        <option value="">Select a pose...</option>
                        {poses.map(pose => (
                            <option key={pose} value={pose}>
                                {pose.split('-').map(word =>
                                    word.charAt(0).toUpperCase() + word.slice(1)
                                ).join(' ')}
                            </option>
                        ))}
                    </select>
                </div>
            </header>
            <main>
                {loading ? (
                    <div className="loading">Loading pose data...</div>
                ) : (
                    <PoseTracker selectedPose={poseData} />
                )}
            </main>
        </div>
    );
}

export default App; 