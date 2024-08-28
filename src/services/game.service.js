const gameModel = require('../models/game.model')
const { getUserByUsername } = require('./user.service')
const mongoose = require('mongoose');

exports.createGame = async (newGame) => {
    const game = await gameModel.create(newGame)
    return {
        game
    }
}

exports.getGame = async (id) => {
    const game = await gameModel.findById(id)
        .populate('p1', 'username')
        .populate('p2', 'username');
    return {
        game
    }
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
    if (existingGame.p2 && existingGame.p2 === user._id) {
        throw new Error('Game already full.');
    }
    if (existingGame.p1.username != username) {
        existingGame.p2 = user.user._id;
        await existingGame.save();
    }
    existingGame.p2 = user.user;
    return {
        game: existingGame
    }
}

exports.updateMove = async (gameId, newMove) => {
    const game = await gameModel.findById(gameId)
        .populate('p1', 'username')
        .populate('p2', 'username');

    if (newMove.next) {
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
            } else if (game.p1LastMove) {
                game.score.p2 = game.score.p2 + 1
                game.p2_Moves.push(newMove.value)
                game.p1LastMove = false
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
    return {
        game
    }
}

exports.getGamesByUsername = async (username) => {
    const user = await getUserByUsername(username)
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

