/**
 *
 * Utility helpers.
 */
function getRandomBetween(min, max) {
    // Ensure min is less than or equal to max, swap if needed.
    if (min > max) {
        [min, max] = [max, min]
    }
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function ensureAudioIsActive(scene) {
    if (!scene || !scene.sound) return

    // Defensive: some TV WebViews may mute/pause media when focus changes.
    scene.sound.mute = false
    if (typeof scene.sound.volume === 'number' && scene.sound.volume <= 0) {
        scene.sound.volume = 1
    }

    // Ensure individual sounds are not muted (Phaser Sound objects support setMute in both backends).
    if (flapSound && typeof flapSound.setMute === 'function') flapSound.setMute(false)
    if (scoreSound && typeof scoreSound.setMute === 'function') scoreSound.setMute(false)
    if (gameOverSound && typeof gameOverSound.setMute === 'function') gameOverSound.setMute(false)
}

/**
 * Get high score from localStorage.
 * @returns {number} The high score, or 0 if not set.
 */
function getHighScore() {
    try {
        const stored = localStorage.getItem('flappyBirdHighScore')
        return stored ? parseInt(stored, 10) : 0
    } catch (e) {
        // localStorage may not be available in some environments
        return 0
    }
}

/**
 * Save high score to localStorage.
 * @param {number} newHighScore - The new high score to save.
 */
function saveHighScore(newHighScore) {
    try {
        localStorage.setItem('flappyBirdHighScore', newHighScore.toString())
    } catch (e) {
        // localStorage may not be available, silently fail
    }
}
