const Puzzle = require('../models/puzzle.model')
const userModel = require('../models/user.model')

const DEFAULT_HINT = 'Blue has three in a column. Finish the stack of four.'

async function ensurePuzzleForDate(dateStr) {
    let p = await Puzzle.findOne({ date: dateStr })
    if (p) return p
    // Vertical win for p1 in column 0: pieces at rows 5,4,3 — play row 2 ("20").
    p = await Puzzle.create({
        date: dateStr,
        p1_Moves: ['50', '40', '30'],
        p2_Moves: ['51', '52', '53'],
        solution: '20',
        xpReward: 50,
        hint: DEFAULT_HINT,
    })
    return p
}

exports.getTodayPuzzle = async (dateStr, userId) => {
    const p = await ensurePuzzleForDate(dateStr)
    const uid = userId && userId.toString()
    const alreadySolved = !!uid && p.solvedBy.some((id) => id.toString() === uid)
    return {
        date: p.date,
        p1_Moves: p.p1_Moves,
        p2_Moves: p.p2_Moves,
        xpReward: p.xpReward,
        alreadySolved,
    }
}

exports.solveToday = async (dateStr, userId, move) => {
    const p = await ensurePuzzleForDate(dateStr)
    if (p.solvedBy.some((id) => id.equals(userId))) {
        const err = new Error('Already solved today.')
        err.code = 'ALREADY'
        throw err
    }
    const normalized = String(move).trim()
    if (normalized === p.solution) {
        p.solvedBy.push(userId)
        await p.save()
        return { correct: true, xpAwarded: p.xpReward, hint: p.hint }
    }
    return { correct: false }
}
