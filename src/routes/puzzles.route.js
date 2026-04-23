const express = require('express')
const router = express.Router()
const puzzleController = require('../controllers/puzzle.controller')
const middleware = require('../middlewares/auth.middleware')

router.get('/today', puzzleController.getToday)
router.post('/today/solve', middleware.authenticateToken, puzzleController.solveToday)

module.exports = router
