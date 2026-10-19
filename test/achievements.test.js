const test = require('node:test')
const assert = require('node:assert')
const { roundWinAchievements, totalsAchievements, levelAchievements, ACHIEVEMENTS } = require('../src/utils/achievements')

const user = (over = {}) => ({ lvl: 1, achievements: [], stats: { wins: 1, losses: 0, draws: 0, streak: 1 }, ...over })
const game = (over = {}) => ({ score: { p1: 1, p2: 0 }, p1_Moves: ['50', '51', '52', '53'], p2_Moves: ['40', '41', '42'], ...over })

test('line shape decides skyscraper vs sharp angle', () => {
    const vertical = roundWinAchievements(user(), user(), { game: game(), winnerSeat: 'p1', reason: 'connect', line: ['20', '30', '40', '50'] })
    assert.ok(vertical.includes('skyscraper'))
    assert.ok(!vertical.includes('diagonal'))
    const diagonal = roundWinAchievements(user(), user(), { game: game(), winnerSeat: 'p1', reason: 'connect', line: ['50', '41', '32', '23'] })
    assert.ok(diagonal.includes('diagonal'))
    const horizontal = roundWinAchievements(user(), user(), { game: game(), winnerSeat: 'p1', reason: 'connect', line: ['50', '51', '52', '53'] })
    assert.ok(!horizontal.includes('diagonal') && !horizontal.includes('skyscraper'))
})

test('comeback needs a two-point deficit before the winning round', () => {
    // p2 had 2, p1 had 0 and just won: score now 1–2.
    const won = roundWinAchievements(user(), user(), { game: game({ score: { p1: 1, p2: 2 } }), winnerSeat: 'p1', reason: 'connect' })
    assert.ok(won.includes('comeback'))
    const close = roundWinAchievements(user(), user(), { game: game({ score: { p1: 2, p2: 2 } }), winnerSeat: 'p1', reason: 'connect' })
    assert.ok(!close.includes('comeback'))
})

test('buzzer beater only for slow winning moves, not timeouts', () => {
    assert.ok(roundWinAchievements(user(), user(), { game: game(), winnerSeat: 'p1', reason: 'connect', elapsedMs: 27000 }).includes('buzzer'))
    assert.ok(!roundWinAchievements(user(), user(), { game: game(), winnerSeat: 'p1', reason: 'connect', elapsedMs: 3000 }).includes('buzzer'))
    assert.ok(!roundWinAchievements(user(), user(), { game: game(), winnerSeat: 'p1', reason: 'timeout', elapsedMs: 30000 }).includes('buzzer'))
})

test('streaks, totals and levels', () => {
    const hot = roundWinAchievements(user({ stats: { wins: 12, streak: 10 } }), user(), { game: game(), winnerSeat: 'p1', reason: 'resign' })
    assert.ok(['ten_wins', 'streak_5', 'streak_10'].every((id) => hot.includes(id)))
    assert.deepStrictEqual(totalsAchievements(user({ stats: { wins: 40, losses: 50, draws: 10 } })), ['marathon'])
    assert.deepStrictEqual(levelAchievements(10), ['level_5', 'level_10'])
    assert.deepStrictEqual(levelAchievements(4), [])
})

test('every achievement has a label and description', () => {
    assert.strictEqual(Object.keys(ACHIEVEMENTS).length, 21)
    for (const a of Object.values(ACHIEVEMENTS)) assert.ok(a.label && a.desc)
})
