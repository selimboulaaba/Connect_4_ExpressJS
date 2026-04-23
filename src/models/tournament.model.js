const mongoose = require('mongoose')

const tournamentSchema = new mongoose.Schema(
    {
        name: { type: String, default: 'Bracket' },
        host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        maxPlayers: { type: Number, enum: [4], default: 4 },
        status: {
            type: String,
            enum: ['waiting', 'semifinals', 'final', 'complete'],
            default: 'waiting',
        },
        semiGameIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Game' }],
        semiWinners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        finalGameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', default: null },
        championId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true }
)

module.exports = mongoose.model('Tournament', tournamentSchema)
