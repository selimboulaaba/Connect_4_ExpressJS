const express = require('express')
const router = express.Router()
const puzzleController = require('../controllers/puzzle.controller')
const { authenticateToken, optionalAuth } = require('../middlewares/auth.middleware')

router.get('/today', optionalAuth, puzzleController.getToday)
router.post('/today/solve', authenticateToken, puzzleController.solveToday)

module.exports = router
