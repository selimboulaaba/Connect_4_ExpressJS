const mongoose = require('mongoose')
const { randomAvatar } = require('../utils/avatar')

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        friends: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                index: true,
            }
        ],
        lvl: {
            type: Number,
            default: 1
        },
        xp: {
            type: Number,
            default: 0,
            index: true,
        },
        stats: {
            wins:   { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws:  { type: Number, default: 0 },
            streak: { type: Number, default: 0 },
            bestStreak: { type: Number, default: 0 },
        },
        achievements: { type: [String], default: [] },
        // DiceBear "style:seed"; legacy accounts may still hold "avatar_N".
        avatar: { type: String, default: randomAvatar },
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
        timestamps: true,
        toJSON: {
            transform (doc, ret) {
                delete ret.password
                delete ret.__v
                return ret
            },
        },
    }
)

// Fields that are safe to show about other players.
userSchema.statics.PUBLIC_FIELDS = 'username avatar lvl xp stats'

module.exports = mongoose.model('User', userSchema)
