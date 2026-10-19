const express = require('express')
const router = express.Router()
const gameController = require('../controllers/game.controller')
const { authenticateToken } = require('../middlewares/auth.middleware')

router.use(authenticateToken)

router.post('/', gameController.createGame)
router.post('/invite', gameController.inviteFriend)
router.get('/history', gameController.getHistory)
router.get('/active', gameController.listActiveGames)
router.get('/:id', gameController.getGame)
router.put('/:id', gameController.joinGame)
router.put('/:id/move', gameController.playMove)
router.post('/:id/forfeit', gameController.forfeitRound)
router.post('/:id/rematch', gameController.requestRematch)
router.post('/:id/decline', gameController.declineInvite)

module.exports = router
