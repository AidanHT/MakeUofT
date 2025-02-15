import React from 'react';
import PoseTracker from './components/PoseTracker';
import './App.css';

function App() {
    return (
        <div className="App">
            <header className="App-header">
                <h1>Workout Pose Tracker</h1>
            </header>
            <main>
                <PoseTracker />
            </main>
        </div>
    );
}

export default App; 