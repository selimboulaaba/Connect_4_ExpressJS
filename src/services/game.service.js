const gameModel = require('../models/game.model')
const GameHistory = require('../models/gameHistory.model')
const userModel = require('../models/user.model')
const { getUserByUsername, updateExperience, updateStats, removePendingGameInvite } = require('./user.service')
const { checkAchievements, ACHIEVEMENTS } = require('../utils/achievements')
const tournamentService = require('./tournament.service')
const mongoose = require('mongoose');
const cron = require('node-cron');

exports.createGame = async (newGame) => {
    const game = await gameModel.create(newGame)
    return {
        game
    }
}

exports.getGame = async (id) => {
    const game = await gameModel.findById(id)
        .populate('p1', 'username avatar')
        .populate('p2', 'username avatar');
    return {
        game
    }
}

exports.listActiveGames = async () => {
    // Spectatable = two players joined AND (someone has moved OR match touched recently).
    // Hides stale "both joined, never played" lobbies that clutter the list.
    const recent = new Date(Date.now() - 25 * 60 * 1000)
    const games = await gameModel
        .find({
            p2: { $ne: null },
            $or: [
                { $expr: { $gt: [{ $add: [{ $size: '$p1_Moves' }, { $size: '$p2_Moves' }] }, 0] } },
                { updatedAt: { $gte: recent } },
            ],
        })
        .populate('p1', 'username avatar')
        .populate('p2', 'username avatar')
        .sort({ updatedAt: -1 })
        .limit(25)
    return { games }
}

exports.joinGame = async (gameId, username) => {
    if (!mongoose.isValidObjectId(gameId)) {
        throw new Error('Insert a Valid Game ID.');
    }
    const existingGame = await gameModel.findById(gameId).populate("p1");
    if (!existingGame) {
        throw new Error('Insert a Valid Game ID.');
    }
    const user = await getUserByUsername(username)
    if (existingGame.p2 && existingGame.p2.toString() === user.user._id.toString()) {
        throw new Error('Game already full.');
    }
    if (existingGame.p1.username != username) {
        existingGame.p2 = user.user._id;
        await existingGame.save();
        try {
            await removePendingGameInvite(user.user._id, gameId)
        } catch (e) {
            /* non-fatal */
        }
    }
    const joined = await gameModel.findById(gameId)
        .populate('p1', 'username avatar')
        .populate('p2', 'username avatar');
    return {
        game: joined
    }
}

exports.updateMove = async (gameId, newMove, req) => {
    const game = await gameModel.findById(gameId)
        .populate('p1', 'username avatar')
        .populate('p2', 'username avatar');

    if (newMove.forfeit) {
        // The player whose turn it was ran out of time — opponent scores
        if (!game.p1LastMove) {
            // It was P1's turn → P2 scores
            game.score.p2 = game.score.p2 + 1
            await updateExperience(game.p2._id, req)
            await updateStats(game.p2._id, game.p1._id, req)
        } else {
            // It was P2's turn → P1 scores
            game.score.p1 = game.score.p1 + 1
            await updateExperience(game.p1._id, req)
            await updateStats(game.p1._id, game.p2._id, req)
        }
        // Reset board for next round
        game.p1_Moves = []
        game.p2_Moves = []
        if ((game.score.p1 + game.score.p2) % 2 === 0) {
            game.p1LastMove = false
        } else {
            game.p1LastMove = true
        }
    } else if (newMove.next) {
        game.p1_Moves = [];
        game.p2_Moves = [];
        if ((game.score.p1 + game.score.p2) % 2 === 0) {
            game.p1LastMove = false
        } else if ((game.score.p1 + game.score.p2) % 2 === 1) {
            game.p1LastMove = true
        }
    } else {
        if (newMove.score) {
            if (!game.p1LastMove) {
                game.score.p1 = game.score.p1 + 1
                game.p1_Moves.push(newMove.value)
                game.p1LastMove = true
                await updateExperience(game.p1._id, req)
                GameHistory.create({ winner: game.p1._id, loser: game.p2._id })
                await updateStats(game.p1._id, game.p2._id, req)

                const winner = await userModel.findById(game.p1._id)
                const loser = await userModel.findById(game.p2._id)
                const newAchievements = checkAchievements(winner, loser, game, true)
                if (newAchievements.length > 0) {
                    await userModel.findByIdAndUpdate(game.p1._id, { $push: { achievements: { $each: newAchievements } } })
                    try {
                        const io = req.app.get('io')
                        const users = req.app.get('users')
                        const socketId = users[winner.username]
                        if (socketId) {
                            io.to(socketId).emit('achievementsUnlocked', { achievements: newAchievements.map(a => ACHIEVEMENTS[a]) })
                        }
                    } catch (error) {
                        console.log('Socket error (achievements)')
                    }
                }
            } else if (game.p1LastMove) {
                game.score.p2 = game.score.p2 + 1
                game.p2_Moves.push(newMove.value)
                game.p1LastMove = false
                await updateExperience(game.p2._id, req)
                GameHistory.create({ winner: game.p2._id, loser: game.p1._id })
                await updateStats(game.p2._id, game.p1._id, req)

                const winner = await userModel.findById(game.p2._id)
                const loser = await userModel.findById(game.p1._id)
                const newAchievements = checkAchievements(winner, loser, game, false)
                if (newAchievements.length > 0) {
                    await userModel.findByIdAndUpdate(game.p2._id, { $push: { achievements: { $each: newAchievements } } })
                    try {
                        const io = req.app.get('io')
                        const users = req.app.get('users')
                        const socketId = users[winner.username]
                        if (socketId) {
                            io.to(socketId).emit('achievementsUnlocked', { achievements: newAchievements.map(a => ACHIEVEMENTS[a]) })
                        }
                    } catch (error) {
                        console.log('Socket error (achievements)')
                    }
                }
            }
        } else {
            if (!game.p1LastMove) {
                game.p1_Moves.push(newMove.value)
                game.p1LastMove = true
            } else if (game.p1LastMove) {
                game.p2_Moves.push(newMove.value)
                game.p1LastMove = false
            }
        }
    }
    await game.save();
    try {
        await tournamentService.handleGameUpdated(game._id)
    } catch (e) {
        console.log('Tournament advance error', e.message)
    }
    const fresh = await gameModel.findById(gameId)
        .populate('p1', 'username avatar')
        .populate('p2', 'username avatar')
    return {
        game: fresh || game
    }
}

exports.getGamesByUsername = async (username) => {
    const { user } = await getUserByUsername(username)
    const games = await gameModel.find({
        $or: [
            { "p1": user._id },
            { "p2": user._id }
        ]
    })
        .populate("p1")
        .populate("p2")
    return {
        games
    }
}

exports.inviteFriend = async (newGame) => {
    const game = await gameModel.create(newGame)
    return {
        game
    }
}

cron.schedule('30 2 * * *', async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    await gameModel.deleteMany({
        createdAt: { $lt: cutoffDate }
    });
});

// Abandoned games: no moves after both players assigned, or waiting forever for P2.
cron.schedule('15 * * * *', async () => {
    const staleNoMoves = new Date(Date.now() - 2 * 60 * 60 * 1000)
    await gameModel.deleteMany({
        p2: { $ne: null },
        p1_Moves: { $size: 0 },
        p2_Moves: { $size: 0 },
        updatedAt: { $lt: staleNoMoves },
    })
    const staleWaitingP2 = new Date(Date.now() - 48 * 60 * 60 * 1000)
    await gameModel.deleteMany({
        p2: null,
        updatedAt: { $lt: staleWaitingP2 },
    })
})

