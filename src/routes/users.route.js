const express = require('express')
const router = express.Router()
const userController = require('../controllers/user.controller')
const { authenticateToken } = require('../middlewares/auth.middleware')
const { rateLimit } = require('../middlewares/rateLimit.middleware')

// Slows down password guessing without bothering normal players.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 })

router.post('/signup', authLimiter, userController.createUser)
router.post('/signin', authLimiter, userController.signIn)

router.get('/', authenticateToken, userController.getUser)
router.get('/leaderboard', authenticateToken, userController.getLeaderBoard)
router.get('/online-status', authenticateToken, userController.getOnlineStatus)
router.post('/pending-invites/dismiss', authenticateToken, userController.dismissPendingInvite)
router.post('/handleFriend', authenticateToken, userController.handleFriend)
router.get('/search/:username', authenticateToken, userController.getUsersByUsername)
router.put('/:id', authenticateToken, userController.updateProfile)

module.exports = router
