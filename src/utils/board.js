// Authoritative Connect 4 rules. Positions are "<row><col>" strings, row 0 = top.
const ROWS = 6
const COLS = 7
const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]]

const pos = (row, col) => `${row}${col}`

function buildBoard (p1Moves = [], p2Moves = []) {
    const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null))
    for (const m of p1Moves) board[+m[0]][+m[1]] = 'p1'
    for (const m of p2Moves) board[+m[0]][+m[1]] = 'p2'
    return board
}

// Lowest free row in a column, or -1 when the column is full.
function dropRow (board, col) {
    for (let row = ROWS - 1; row >= 0; row--) {
        if (!board[row][col]) return row
    }
    return -1
}

// Returns the 4 winning positions for `piece`, or null.
function findWinLine (board, piece) {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] !== piece) continue
            for (const [dr, dc] of DIRECTIONS) {
                const line = [pos(r, c)]
                for (let k = 1; k < 4; k++) {
                    const nr = r + dr * k
                    const nc = c + dc * k
                    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== piece) break
                    line.push(pos(nr, nc))
                }
                if (line.length === 4) return line
            }
        }
    }
    return null
}

// 'p1' | 'p2' | 'draw' | null for the current round.
function roundResult (p1Moves = [], p2Moves = []) {
    const board = buildBoard(p1Moves, p2Moves)
    if (findWinLine(board, 'p1')) return 'p1'
    if (findWinLine(board, 'p2')) return 'p2'
    if (p1Moves.length + p2Moves.length >= ROWS * COLS) return 'draw'
    return null
}

module.exports = { ROWS, COLS, pos, buildBoard, dropRow, findWinLine, roundResult }
