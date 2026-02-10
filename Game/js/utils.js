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

/**
 * Fit an image inside a max width/height box while keeping aspect ratio.
 * @param {Phaser.GameObjects.Image} image
 * @param {number} maxW
 * @param {number} maxH
 */
function fitImageToBox(image, maxW, maxH) {
    if (!image) return
    const srcW = image.width || 1
    const srcH = image.height || 1
    const scale = Math.min(maxW / srcW, maxH / srcH)
    image.setScale(scale)
}

/**
 * Create a reusable pulse tween for UI elements.
 * @param {Phaser.Scene} scene
 * @param {Phaser.GameObjects.GameObject} target
 * @param {number} baseScale
 * @param {object} [options]
 * @returns {Phaser.Tweens.Tween|null}
 */
function createPulseTween(scene, target, baseScale, options) {
    if (!scene || !scene.tweens || !target) return null
    const opts = options || {}
    const scale = typeof opts.scale === 'number' ? opts.scale : 1.08
    const duration = typeof opts.duration === 'number' ? opts.duration : 450
    const ease = opts.ease || 'Sine.easeInOut'
    return scene.tweens.add({
        targets: target,
        scale: baseScale * scale,
        duration,
        yoyo: true,
        repeat: -1,
        ease
    })
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
