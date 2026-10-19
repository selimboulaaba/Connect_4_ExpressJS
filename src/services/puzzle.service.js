const Puzzle = require('../models/puzzle.model')
const { HttpError } = require('../utils/http')

// Each position is legal, has no winner yet, and has exactly one winning move for p1 (who is to play).
const PUZZLES = [
    { p1_Moves: ['50', '40', '30'], p2_Moves: ['51', '52', '53'], solution: '20', hint: 'Look at the left edge. One more disc finishes the stack.' },
    { p1_Moves: ['52', '53', '54'], p2_Moves: ['51', '43', '44'], solution: '55', hint: 'The bottom row is almost yours, but one side is blocked.' },
    { p1_Moves: ['50', '41', '32', '52', '43'], p2_Moves: ['51', '42', '53', '33', '56'], solution: '23', hint: 'Follow the diagonal climbing from the bottom-left corner.' },
    { p1_Moves: ['50', '51', '53'], p2_Moves: ['40', '41', '43'], solution: '52', hint: 'Mind the gap on the bottom row.' },
    { p1_Moves: ['56', '46', '36'], p2_Moves: ['55', '54', '45'], solution: '26', hint: 'The right edge is three high.' },
    { p1_Moves: ['44', '35', '26', '55', '46'], p2_Moves: ['54', '45', '56', '36', '50'], solution: '53', hint: 'A diagonal is waiting for its first disc.' },
]
const XP_REWARD = 50

function puzzleForDate (dateStr) {
    const day = Math.floor(Date.parse(`${dateStr}T00:00:00Z`) / 86400000)
    return PUZZLES[day % PUZZLES.length]
}

async function ensurePuzzleForDate (dateStr) {
    const existing = await Puzzle.findOne({ date: dateStr })
    if (existing) return existing
    try {
        return await Puzzle.create({ date: dateStr, xpReward: XP_REWARD, ...puzzleForDate(dateStr) })
    } catch (e) {
        // Two requests raced to create today's puzzle; the unique index kept one.
        if (e.code === 11000) return Puzzle.findOne({ date: dateStr })
        throw e
    }
}

exports.getTodayPuzzle = async (dateStr, userId) => {
    const p = await ensurePuzzleForDate(dateStr)
    const alreadySolved = !!userId && p.solvedBy.some((id) => String(id) === String(userId))
    return {
        date: p.date,
        p1_Moves: p.p1_Moves,
        p2_Moves: p.p2_Moves,
        xpReward: p.xpReward,
        hint: p.hint,
        alreadySolved,
        solvedCount: p.solvedBy.length,
        solution: alreadySolved ? p.solution : undefined,
    }
}

exports.solveToday = async (dateStr, userId, move) => {
    if (typeof move !== 'string' || !/^[0-5][0-6]$/.test(move)) throw new HttpError(400, 'Invalid move.')
    const p = await ensurePuzzleForDate(dateStr)
    if (p.solvedBy.some((id) => String(id) === String(userId))) throw new HttpError(409, "You've already solved today's puzzle.")
    if (move !== p.solution) return { correct: false }
    // $addToSet keeps a double-click from awarding XP twice.
    const res = await Puzzle.updateOne({ _id: p._id, solvedBy: { $ne: userId } }, { $addToSet: { solvedBy: userId } })
    if (!res.modifiedCount) throw new HttpError(409, "You've already solved today's puzzle.")
    return { correct: true, xpAwarded: p.xpReward, solution: p.solution }
}

exports.countSolvedBy = (userId) => Puzzle.countDocuments({ solvedBy: userId })
