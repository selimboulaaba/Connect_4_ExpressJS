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
            required: false,
        },
        p1_Moves: {
            type: [String],
            default: [],
        },
        p2_Moves: {
            type: [String],
            default: [],
        }
    },
    {
        new: true,
        timestamps: true
    }
)

module.exports = mongoose.model('Game', gameSchema)
