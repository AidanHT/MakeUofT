import express from 'express';
import UserProfile from '../models/UserProfile.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Create or update user profile from questionnaire
router.post('/questionnaire', auth, async (req, res) => {
    try {
        const { age, weight, height, experience, poseCount } = req.body;

        // Get user email from the authenticated user
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if profile already exists
        let userProfile = await UserProfile.findOne({ userId: req.user.userId });

        if (userProfile) {
            // Update existing profile
            userProfile.age = age;
            userProfile.weight = weight;
            userProfile.height = height;
            userProfile.experience = experience;
            userProfile.poseCount = poseCount;
        } else {
            // Create new profile
            userProfile = new UserProfile({
                userId: req.user.userId,
                email: user.email,
                age,
                weight,
                height,
                experience,
                poseCount
            });
        }

        await userProfile.save();

        res.json({
            message: 'Profile updated successfully',
            profile: userProfile
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
    try {
        const userProfile = await UserProfile.findOne({ userId: req.user.userId });
        if (!userProfile) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        res.json(userProfile);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default router; 