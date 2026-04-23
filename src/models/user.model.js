const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            require: true
        },
        password: {
            type: String,
            require: true
        },
        friends: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                default: [],
            }
        ],
        lvl: {
            type: Number,
            require: true,
            default: 1
        },
        xp: {
            type: Number,
            require: true,
            default: 0
        },
        stats: {
            wins:   { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws:  { type: Number, default: 0 },
        },
        achievements: { type: [String], default: [] },
        avatar: { type: String, default: 'avatar_1' },
        pendingGameInvites: {
            type: [
                {
                    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
                    fromUsername: { type: String, required: true },
                    createdAt: { type: Date, default: Date.now },
                },
            ],
            default: [],
        },
    },
    {
        new: true,
        timestamps: true
    }
)

module.exports = mongoose.model('User', userSchema)
