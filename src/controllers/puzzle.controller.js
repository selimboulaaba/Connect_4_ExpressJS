const jwt = require('jsonwebtoken')
const puzzleService = require('../services/puzzle.service')
const userService = require('../services/user.service')

function todayStr() {
    return new Date().toISOString().split('T')[0]
}

async function getToday(req, res) {
    try {
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
        let userId = null
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.TOKEN_SECRET)
                const u = await userService.getUserByUsername(decoded.username)
                userId = u.user._id
            } catch {
                userId = null
            }
        }
        const data = await puzzleService.getTodayPuzzle(todayStr(), userId)
        res.json(data)
    } catch (error) {
        return res.status(400).json({ message: error.message })
    }
}

async function solveToday(req, res) {
    try {
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET)
        const user = await userService.getUserByUsername(decoded.username)
        const result = await puzzleService.solveToday(todayStr(), user.user._id, req.body.move)
        if (result.correct) {
            await userService.addXP(user.user._id, result.xpAwarded, req)
        }
        res.json(result)
    } catch (error) {
        if (error.code === 'ALREADY') {
            return res.status(400).json({ message: error.message })
        }
        return res.status(400).json({ message: error.message })
    }
}

module.exports = { getToday, solveToday }
