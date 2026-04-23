const jwt = require('jsonwebtoken')
const tournamentService = require('../services/tournament.service')
const userService = require('../services/user.service')

async function create(req, res) {
    try {
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET)
        const user = await userService.getUserByUsername(decoded.username)
        const t = await tournamentService.createTournament(user.user._id, req.body.name)
        res.status(201).json({ tournament: t })
    } catch (error) {
        return res.status(400).json({ message: error.message })
    }
}

async function getOne(req, res) {
    try {
        const t = await tournamentService.getTournament(req.params.id)
        if (!t) return res.status(404).json({ message: 'Not found' })
        res.json({ tournament: t })
    } catch (error) {
        return res.status(400).json({ message: error.message })
    }
}

async function join(req, res) {
    try {
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET)
        const user = await userService.getUserByUsername(decoded.username)
        const t = await tournamentService.joinTournament(req.params.id, user.user._id)
        res.json({ tournament: t })
    } catch (error) {
        return res.status(400).json({ message: error.message })
    }
}

async function start(req, res) {
    try {
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET)
        const user = await userService.getUserByUsername(decoded.username)
        const t = await tournamentService.startTournament(req.params.id, user.user._id)
        res.json({ tournament: t })
    } catch (error) {
        return res.status(400).json({ message: error.message })
    }
}

module.exports = { create, getOne, join, start }
