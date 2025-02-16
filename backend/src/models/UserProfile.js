import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    age: {
        type: Number,
        required: true,
        min: 13,
        max: 100
    },
    weight: {
        type: Number,
        required: true,
        min: 30,
        max: 200
    },
    height: {
        type: Number,
        required: true,
        min: 100,
        max: 250
    },
    experience: {
        type: String,
        required: true,
        enum: ['beginner', 'intermediate', 'advanced']
    },
    poseCount: {
        type: Number,
        required: true,
        min: 1,
        max: 8
    },
    practiceDuration: {
        type: Number,
        required: true,
        enum: [15, 30, 45, 60],
        default: 30
    },
    practiceFrequency: {
        type: String,
        required: true,
        enum: ['daily', 'weekly', 'occasional'],
        default: 'weekly'
    },
    focusAreas: {
        type: [String],
        required: true,
        validate: {
            validator: function (areas) {
                const validAreas = ['Flexibility', 'Strength', 'Balance', 'Mindfulness'];
                return areas.every(area => validAreas.includes(area));
            },
            message: 'Invalid focus area'
        },
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
userProfileSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const UserProfile = mongoose.model('UserProfile', userProfileSchema);

export default UserProfile; 