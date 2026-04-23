const mongoose = require('mongoose')

const gameHistorySchema = new mongoose.Schema({
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    loser:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

module.exports = mongoose.model('GameHistory', gameHistorySchema)
