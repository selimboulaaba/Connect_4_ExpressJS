const mongoose = require('mongoose')

// One document per finished round. For draws, winner/loser are just p1/p2 and `draw` is true.
const gameHistorySchema = new mongoose.Schema({
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    loser:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    draw:   { type: Boolean, default: false },
    reason: { type: String, enum: ['connect', 'draw', 'timeout', 'resign'], default: 'connect' },
}, { timestamps: true })

module.exports = mongoose.model('GameHistory', gameHistorySchema)
