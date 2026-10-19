const tournamentService = require('../services/tournament.service')
const { asyncHandler, HttpError } = require('../utils/http')

const create = asyncHandler(async (req, res) => {
    const t = await tournamentService.createTournament(req.user.id, req.body?.name)
    res.status(201).json({ tournament: await tournamentService.getTournament(t._id) })
})

const getOne = asyncHandler(async (req, res) => {
    const t = await tournamentService.getTournament(req.params.id)
    if (!t) throw new HttpError(404, 'Tournament not found.')
    res.json({ tournament: t })
})

const join = asyncHandler(async (req, res) => {
    res.json({ tournament: await tournamentService.joinTournament(req.params.id, req.user.id) })
})

const start = asyncHandler(async (req, res) => {
    res.json({ tournament: await tournamentService.startTournament(req.params.id, req.user.id) })
})

module.exports = { create, getOne, join, start }
