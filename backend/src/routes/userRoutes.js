const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register a new user
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        user = new User({
            email,
            password: hashedPassword
        });

        await user.save();

        // Create token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            token,
            userId: user._id
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            userId: user._id,
            hasPreferences: !!user.preferences.name
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user preferences
router.post('/preferences', auth, async (req, res) => {
    try {
        const { name, experienceLevel, practiceDuration, focusAreas, practiceFrequency } = req.body;

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.preferences = {
            name,
            experienceLevel,
            practiceDuration,
            focusAreas,
            practiceFrequency
        };

        await user.save();

        res.json({ message: 'Preferences updated successfully', preferences: user.preferences });
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user preferences and stats
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            preferences: user.preferences,
            stats: user.stats
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user stats
router.post('/stats', auth, async (req, res) => {
    try {
        const { sessionAccuracy, pose } = req.body;

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update stats
        user.stats.totalSessions += 1;
        user.stats.lastPractice = new Date();

        // Update average accuracy
        const currentTotal = user.stats.averageAccuracy * (user.stats.totalSessions - 1);
        user.stats.averageAccuracy = (currentTotal + sessionAccuracy) / user.stats.totalSessions;

        // Update favorite pose if this pose has better accuracy
        if (!user.stats.favoriteYogaPose || sessionAccuracy > user.stats.averageAccuracy) {
            user.stats.favoriteYogaPose = pose;
        }

        await user.save();

        res.json({ message: 'Stats updated successfully', stats: user.stats });
    } catch (error) {
        console.error('Update stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 