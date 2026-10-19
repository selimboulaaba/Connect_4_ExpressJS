const mongoose = require('mongoose')

const gameSchema = new mongoose.Schema(
    {
        p1: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        p2: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },
        // Set for friend invites: only this user may take the p2 seat.
        invitedUser: {
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
            p1: { type: Number, default: 0 },
            p2: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
        },
        // true → p1 played last, so it is p2's turn.
        p1LastMove: {
            type: Boolean,
            default: false,
        },
        // Set once the current round is decided; cleared when the next round starts.
        roundEnd: {
            type: new mongoose.Schema({
                winner: { type: String, enum: ['p1', 'p2', 'draw'] },
                reason: { type: String, enum: ['connect', 'draw', 'timeout', 'resign'] },
            }, { _id: false }),
            default: null,
        },
        // When the current turn began; null while waiting for a player or between rounds.
        turnStartedAt: {
            type: Date,
            default: null,
        },
        // Player who asked for the next round; the other player's request starts it.
        rematchBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        tournamentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tournament',
            default: null,
        },
    },
    {
        timestamps: true
    }
)

gameSchema.index({ updatedAt: -1 })

module.exports = mongoose.model('Game', gameSchema)
