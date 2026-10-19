const express = require('express')
const router = express.Router()
const tournamentController = require('../controllers/tournament.controller')
const { authenticateToken } = require('../middlewares/auth.middleware')

router.use(authenticateToken)

router.post('/', tournamentController.create)
router.get('/:id', tournamentController.getOne)
router.put('/:id/join', tournamentController.join)
router.put('/:id/start', tournamentController.start)

module.exports = router
