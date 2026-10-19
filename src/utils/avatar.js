const crypto = require('crypto')

// Avatars are DiceBear "style:seed" strings, drawn by the frontend. Only styles that need no
// attribution are allowed (CC0 or free for commercial use).
const STYLES = ['bottts', 'avataaars', 'open-peeps', 'lorelei', 'pixel-art', 'thumbs']
const AVATAR_RE = new RegExp(`^(${STYLES.join('|')}):[a-z0-9]{4,16}$`)
// Older accounts picked one of twelve colours.
const LEGACY_RE = /^avatar_(?:[1-9]|1[0-2])$/

const isValidAvatar = (value) => typeof value === 'string' && (AVATAR_RE.test(value) || LEGACY_RE.test(value))

function randomAvatar () {
    const style = STYLES[crypto.randomInt(STYLES.length)]
    const seed = crypto.randomBytes(6).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8).padEnd(6, '0')
    return `${style}:${seed}`
}

module.exports = { STYLES, isValidAvatar, randomAvatar }
