const mongoose = require('mongoose')

const gameSchema = new mongoose.Schema(
    {
        p1: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        p2: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        p1_Moves: {
            type: [String],
            default: [],
        },
        p2_Moves: {
            type: [String],
            default: [],
        },
        score: {
            p1: {
                type: Number,
                default: 0,
            },
            p2: {
                type: Number,
                default: 0,
            },
        },
        p1LastMove: {
            type: Boolean,
            default: false,
        }
    },
    {
        new: true,
        timestamps: true
    }
)

module.exports = mongoose.model('Game', gameSchema)
