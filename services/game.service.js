const gameModel = require('../entities/game.entity')

exports.createGame = async (newGame) => {
    const game = await gameModel.create(newGame)
    return {
        game
    }
}

exports.getGame = async (id) => {
    const game = await gameModel.findById(id)
    return {
        game
    }
}