// Level 1: 0-99 xp, level 2: 100-249, then each level doubles the threshold (250, 500, 1000...).
function levelForXp (xp) {
    if (xp < 100) return 1
    if (xp < 250) return 2
    return Math.floor(Math.log2(xp / 250)) + 3
}

const XP = {
    WIN: 33,
    DRAW: 10,
}

module.exports = { levelForXp, XP }
