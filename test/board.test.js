const test = require('node:test')
const assert = require('node:assert')
const { buildBoard, dropRow, findWinLine, roundResult } = require('../src/utils/board')
const { levelForXp } = require('../src/utils/level')

test('pieces stack from the bottom', () => {
    const board = buildBoard(['50'], ['40'])
    assert.strictEqual(dropRow(board, 0), 3)
    assert.strictEqual(dropRow(board, 1), 5)
    assert.strictEqual(dropRow(buildBoard(['50', '30', '10'], ['40', '20', '00']), 0), -1)
})

test('detects horizontal, vertical and both diagonals', () => {
    assert.deepStrictEqual(findWinLine(buildBoard(['50', '51', '52', '53']), 'p1'), ['50', '51', '52', '53'])
    assert.ok(findWinLine(buildBoard([], ['56', '46', '36', '26']), 'p2'))
    assert.ok(findWinLine(buildBoard(['50', '41', '32', '23']), 'p1'))
    assert.ok(findWinLine(buildBoard(['53', '44', '35', '26']), 'p1'))
    assert.strictEqual(findWinLine(buildBoard(['50', '51', '52', '54']), 'p1'), null)
})

test('round result reports winner, draw or nothing', () => {
    assert.strictEqual(roundResult(['50', '51', '52', '53'], ['40', '41', '42']), 'p1')
    assert.strictEqual(roundResult(['50'], ['51']), null)
    // A full board with no line of four.
    const p1 = ['55', '52', '50', '40', '45', '43', '35', '32', '51', '12', '24', '02', '26', '33', '05', '20', '14', '21', '04', '00', '11']
    const p2 = ['56', '46', '53', '42', '54', '44', '34', '25', '22', '36', '41', '31', '15', '30', '16', '23', '10', '13', '03', '06', '01']
    assert.strictEqual(roundResult(p1, p2), 'draw')
})

test('levels follow the xp thresholds', () => {
    assert.strictEqual(levelForXp(0), 1)
    assert.strictEqual(levelForXp(99), 1)
    assert.strictEqual(levelForXp(100), 2)
    assert.strictEqual(levelForXp(250), 3)
    assert.strictEqual(levelForXp(499), 3)
    assert.strictEqual(levelForXp(500), 4)
})
