const express = require('express')
const router = express.Router()
const tournamentController = require('../controllers/tournament.controller')
const middleware = require('../middlewares/auth.middleware')

router.post('/', middleware.authenticateToken, tournamentController.create)
router.get('/:id', middleware.authenticateToken, tournamentController.getOne)
router.put('/:id/join', middleware.authenticateToken, tournamentController.join)
router.put('/:id/start', middleware.authenticateToken, tournamentController.start)

module.exports = router
