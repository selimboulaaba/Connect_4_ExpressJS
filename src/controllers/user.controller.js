const userService = require('../services/user.service')
const { asyncHandler, assertObjectId } = require('../utils/http')

const createUser = asyncHandler(async (req, res) => {
    res.status(201).json(await userService.signup(req.body))
})

const signIn = asyncHandler(async (req, res) => {
    res.json(await userService.signin(req.body))
})

const getUser = asyncHandler(async (req, res) => {
    res.json({ user: await userService.getMe(req.user.id) })
})

const getUsersByUsername = asyncHandler(async (req, res) => {
    res.json({ users: await userService.searchUsers(req.params.username, req.user.id) })
})

const handleFriend = asyncHandler(async (req, res) => {
    res.json({ user: await userService.toggleFriend(req.user.id, req.body?.friendId) })
})

const updateProfile = asyncHandler(async (req, res) => {
    res.json(await userService.updateProfile(req.user.id, req.params.id, req.body))
})

const getLeaderBoard = asyncHandler(async (req, res) => {
    res.json({ users: await userService.getLeaderBoard() })
})

const dismissPendingInvite = asyncHandler(async (req, res) => {
    assertObjectId(req.body?.gameId, 'Invalid game ID.')
    await userService.removePendingGameInvite(req.user.id, req.body.gameId)
    res.json({ user: await userService.getMe(req.user.id) })
})

const getOnlineStatus = asyncHandler(async (req, res) => {
    res.json({ onlineFriends: await userService.getOnlineStatus(req.user.id) })
})

module.exports = {
    createUser,
    getUsersByUsername,
    signIn,
    getUser,
    handleFriend,
    updateProfile,
    getLeaderBoard,
    getOnlineStatus,
    dismissPendingInvite,
}
