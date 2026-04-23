const mongoose = require('mongoose')

const puzzleSchema = new mongoose.Schema(
    {
        date: { type: String, required: true, unique: true },
        p1_Moves: { type: [String], default: [] },
        p2_Moves: { type: [String], default: [] },
        solution: { type: String, required: true },
        solvedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        xpReward: { type: Number, default: 50 },
        hint: { type: String, default: '' },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Puzzle', puzzleSchema)
