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
 * Build the exit popup UI and return a controller with show/hide/focus helpers.
 * @param {Phaser.Scene} scene
 * @param {object} options
 * @returns {object|null}
 */
function createExitPopup(scene, options) {
    if (!scene) return null
    const opts = options || {}
    const popupWidthRatio = typeof opts.popupWidthRatio === 'number' ? opts.popupWidthRatio : 0.8
    const popupHeightRatio = typeof opts.popupHeightRatio === 'number' ? opts.popupHeightRatio : 0.75
    const popupBgKey = opts.popupBgKey
    const birdsKey = opts.birdsKey
    const headingImageKey = opts.headingImageKey
    const leaveKey = opts.leaveKey
    const stayKey = opts.stayKey
    const onLeave = typeof opts.onLeave === 'function' ? opts.onLeave : null
    const onStay = typeof opts.onStay === 'function' ? opts.onStay : null
    const overlayAlpha = typeof opts.overlayAlpha === 'number' ? opts.overlayAlpha : 0.6

    const overlay = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, overlayAlpha)
    overlay.setDepth(190)
    overlay.setVisible(false)
    overlay.setScrollFactor(0)
    overlay.setInteractive()

    const container = scene.add.container(GAME_CENTER_X, GAME_HEIGHT / 2)
    container.setDepth(200)
    container.setVisible(false)

    const popupBg = scene.add.image(0, 0, popupBgKey).setOrigin(0.5, 0.5)
    fitImageToBox(popupBg, GAME_WIDTH * popupWidthRatio, GAME_HEIGHT * popupHeightRatio)

    const popupWidth = popupBg.displayWidth
    const popupHeight = popupBg.displayHeight

    let heading = null
    if (headingImageKey) {
        heading = scene.add.image(0, -popupHeight * 0.32, headingImageKey).setOrigin(0.5)
        fitImageToBox(heading, popupWidth * 0.5, popupHeight * 0.18)
    }

    const subheadingStyle = Object.assign({
        fontFamily: 'jersey15',
        fontSize: '24px',
        color: '#000000',
        align: 'center',
    }, opts.subheadingStyle || {})
    const subheading = scene.add.text(0, heading.y + 48, opts.subheadingText || 'Are You Sure You Want To Stop Flying?', subheadingStyle).setOrigin(0.5)

    const birds = scene.add.image(0, subheading.y + 80, birdsKey).setOrigin(0.5)
    fitImageToBox(birds, popupWidth * 0.6, popupHeight * 0.20)

    const buttonsY = popupHeight * 0.28
    const buttonOffset = popupWidth * 0.15
    const leaveBtn = scene.add.image(-buttonOffset, buttonsY, leaveKey).setOrigin(0.5).setInteractive()
    const stayBtn = scene.add.image(buttonOffset, buttonsY, stayKey).setOrigin(0.5).setInteractive()
    fitImageToBox(leaveBtn, popupWidth * 0.28, popupHeight * 0.14)
    fitImageToBox(stayBtn, popupWidth * 0.28, popupHeight * 0.14)

    const leaveBase = leaveBtn.scaleX
    const stayBase = stayBtn.scaleX
    let leavePulse = null
    let stayPulse = null
    let focus = 'stay'
    let visible = false

    function stopPulses() {
        if (leavePulse) leavePulse.stop()
        if (stayPulse) stayPulse.stop()
        leavePulse = null
        stayPulse = null
    }

    function setFocus(target) {
        focus = target === 'leave' ? 'leave' : 'stay'
        stopPulses()
        if (leaveBtn) leaveBtn.setScale(leaveBase)
        if (stayBtn) stayBtn.setScale(stayBase)
        const pulseOpts = { scale: 1.08, duration: 450 }
        if (focus === 'leave' && leaveBtn) {
            leavePulse = createPulseTween(scene, leaveBtn, leaveBase, pulseOpts)
        }
        if (focus === 'stay' && stayBtn) {
            stayPulse = createPulseTween(scene, stayBtn, stayBase, pulseOpts)
        }
    }

    function show() {
        visible = true
        overlay.setVisible(true)
        container.setVisible(true)
        setFocus('stay')
    }

    function hide() {
        visible = false
        overlay.setVisible(false)
        container.setVisible(false)
        stopPulses()
    }

    function toggleFocus() {
        setFocus(focus === 'leave' ? 'stay' : 'leave')
    }

    function confirm() {
        if (focus === 'leave') {
            if (onLeave) onLeave()
        } else {
            if (onStay) onStay()
            hide()
        }
    }

    leaveBtn.on('pointerover', () => setFocus('leave'))
    stayBtn.on('pointerover', () => setFocus('stay'))
    leaveBtn.on('pointerdown', () => { setFocus('leave'); confirm() })
    stayBtn.on('pointerdown', () => { setFocus('stay'); confirm() })

    container.add([popupBg, heading, subheading, birds, leaveBtn, stayBtn])

    return {
        show,
        hide,
        toggleFocus,
        confirm,
        isVisible: () => visible,
        getFocus: () => focus
    }
}

/**
 * Get high score from React Native AsyncStorage via postMessage.
 * Requests the high score from the native app and returns 0 immediately.
 * The actual value will be set via message handler in game.js.
 * @returns {number} Always returns 0 initially, actual value set via message handler.
 */
function getHighScore() {
    try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: 'get-high-score' })
            )
        }
    } catch (e) {
        // Silently fail if bridge is not available
    }
    return 0 // Return 0 initially, will be updated via message handler
}

/**
 * Save high score to React Native AsyncStorage via postMessage.
 * @param {number} newHighScore - The new high score to save.
 */
function saveHighScore(newHighScore) {
    try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(
                JSON.stringify({ 
                    type: 'save-high-score', 
                    value: newHighScore 
                })
            )
        }
    } catch (e) {
        // Silently fail if bridge is not available
    }
}

/**
 * Show the full-screen ad video overlay and block game input while it plays.
 * Uses the <video id="ad-video"> element defined in index.html.
 */
function playAdVideo() {
    const video = document.getElementById('ad-video')
    if (!video) return

    // Mark ad as playing so update/restart are gated
    adPlaying = true

    // Mute all game audio while the ad plays
    try {
        if (game && game.scene && game.scene.scenes[0] && game.scene.scenes[0].sound) {
            game.scene.scenes[0].sound.mute = true
        }
    } catch (_) {}

    // Reset playback and show overlay
    try {
        video.currentTime = 0
    } catch (_) {}
    video.style.display = 'block'

    const cleanup = () => {
        // Hide overlay
        video.style.display = 'none'
        // Unmute game audio
        try {
            if (game && game.scene && game.scene.scenes[0] && game.scene.scenes[0].sound) {
                game.scene.scenes[0].sound.mute = false
            }
        } catch (_) {}
        // Stop gating input
        adPlaying = false
        video.removeEventListener('ended', onEnded)
        video.removeEventListener('error', onError)
    }

    const onEnded = () => {
        cleanup()
    }
    const onError = () => {
        cleanup()
    }

    // Attach one-shot listeners
    video.addEventListener('ended', onEnded)
    video.addEventListener('error', onError)

    // Start playback (best-effort; if browser blocks autoplay we just clean up)
    try {
        const playPromise = video.play()
        if (playPromise && typeof playPromise.then === 'function') {
            playPromise.catch(() => {
                cleanup()
            })
        }
    } catch (_) {
        cleanup()
    }
}
