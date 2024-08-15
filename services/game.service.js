const gameModel = require('../entities/game.entity')
const { getUser } = require('./user.service')
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
    if (existingGame.p1.username === username) {
        throw new Error('What are you doing ? -_-');
    }
    const user = await getUser(username)
    if (existingGame.p2 && existingGame.p2 === user._id) {
        throw new Error('Game already full.');
    }
    const game = await gameModel.findByIdAndUpdate(gameId, { p2: user.user._id }, { new: true, runValidators: true })
    return {
        game
    }
}

exports.updateMove = async (gameId, newMove) => {
    const game = await gameModel.findById(gameId);
    if (newMove.next) {
        game.p1_Moves = [];
        game.p2_Moves = [];
    } else {
        if (newMove.score) {
            if (newMove.p1)
                game.score.p1 = game.score.p1 + 1
            else
                game.score.p2 = game.score.p2 + 1
        } else {
            if (newMove.p1)
                game.p1_Moves.push(newMove.value)
            else
                game.p2_Moves.push(newMove.value)
        }
    }
    await game.save();
    return {
        game
    }
}

