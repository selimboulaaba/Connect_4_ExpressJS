const puzzleService = require('../services/puzzle.service')
const userService = require('../services/user.service')
const { asyncHandler } = require('../utils/http')

// Puzzles roll over at midnight UTC.
const todayStr = () => new Date().toISOString().split('T')[0]

const getToday = asyncHandler(async (req, res) => {
    res.json(await puzzleService.getTodayPuzzle(todayStr(), req.user?.id))
})

const solveToday = asyncHandler(async (req, res) => {
    const result = await puzzleService.solveToday(todayStr(), req.user.id, req.body?.move)
    if (result.correct) await userService.addXP(req.user.id, result.xpAwarded)
    res.json(result)
})

module.exports = { getToday, solveToday }
