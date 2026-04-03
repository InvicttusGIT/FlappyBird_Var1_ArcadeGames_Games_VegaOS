// Create Phaser game instance and set up a simple back‑button bridge for Vega.
const configurations = createConfigurations(preload, create, update)
const game = new Phaser.Game(configurations)

// Store event handler references so they can be removed on cleanup
let keydownHandler = null
let nativeMessageHandler = null

// Vega remote "GoBack" key (keyCode 27) is forwarded to the React Native shell
// so the native app can decide how to exit. This relies on the WebView being
// created with allowSystemKeyEvents={true}.
try {
    keydownHandler = function (event) {
        if (!event || event.keyCode !== 27) return

        try {
            if (typeof requestExitPopupCallback === 'function') {
                requestExitPopupCallback()
            } else if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(
                    JSON.stringify({ type: 'exit-game' })
                )
            }
        } catch (e) {
            // Silently ignore bridge errors on device
        }

        if (event.preventDefault) event.preventDefault()
        return false
    }
    window.addEventListener('keydown', keydownHandler)
} catch (_) {
    // Swallow any unexpected errors in TV webview environments
}

// Listen for messages from React Native (high score updates)
// React Native WebView can send messages via window.postMessage or document events
try {
    nativeMessageHandler = function (event) {
        try {
            // React Native WebView sends messages via event.data
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
            if (data && data.type === 'high-score') {
                const receivedHighScore = typeof data.value === 'number' ? data.value : 0
                if (highScore === undefined || receivedHighScore > highScore) {
                    highScore = receivedHighScore
                    runHighScoreBaseline = highScore
                    // Update display if game is already initialized
                    if (highScoreText !== undefined) {
                        updateHighScoreDisplay()
                    }
                }
            }
            
            // Device ID from native app (requested when needed for ad pre-fetch)
            if (data && data.type === 'device-id') {
                // Store device ID if provided, otherwise keep it null (will use default UUID in parser)
                deviceId = data.value || null

                // If we were already at/after the prefetch point when device ID arrived,
                // kick off prefetch now (if not already loading and nothing cached).
                if (
                    !isPremiumUser &&
                    crashCount >= nextAdPrefetchCrash &&
                    !cachedAdMediaUrl &&
                    !adPrefetchInProgress
                ) {
                    preFetchAdVideo()
                }
            }
            
            // IAP result from native app (minimal payload: success boolean)
            if (data && (data.type === 'iap-result' || data.type === 'iap-premium-status')) {
                const success = data.success === true
                isPremiumUser = success
                if (data.type === 'iap-result') {
                    trackAnalyticsEvent(
                        success
                            ? 'subscription_gameover_success'
                            : 'subscription_gameover_failed'
                    )
                }

                // Purchase flow has finished (success or failure) – allow popup to close now.
                isIapPurchaseInProgress = false
                try {
                    if (removeAdsPopup && typeof removeAdsPopup.hide === 'function') {
                        removeAdsPopup.hide()
                    }
                } catch (_) {}
            }
        } catch (e) {
            // Silently ignore parse errors
        }
    }

    // Listen for messages from React Native (high score updates) via MessageEvent.
    window.addEventListener('message', nativeMessageHandler)
} catch (_) {
    // Swallow any unexpected errors in TV webview environments
}
/**
 *   Load the game assets.
 */
function preload() {
    const cam = this.cameras.main
    const barWidth = GAME_WIDTH * 0.6
    const barHeight = 12
    const barX = (GAME_WIDTH - barWidth) / 2
    const barY = cam.centerY

    loadingText = this.add.text(cam.centerX, barY - 30, 'Loading... 0%', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#00ff00'
    }).setOrigin(0.5, 0.5)

    loadingBarBg = this.add.rectangle(barX, barY, barWidth, barHeight, 0x444444).setOrigin(0, 0.5)
    loadingBarFill = this.add.rectangle(barX, barY, 1, barHeight, 0x00ff00).setOrigin(0, 0.5)

    this.load.on('progress', (value) => {
        loadingBarFill.width = Math.max(1, barWidth * value)
        loadingText.setText(`Loading... ${(value * 100).toFixed(0)}%`)
    })

    this.load.on('complete', () => {
        loadingText.destroy()
        loadingBarBg.destroy()
        loadingBarFill.destroy()
    })

    // Single background and ground
    this.load.image(assets.scene.background, 'assets/background-main.png')
    this.load.image(assets.scene.ground, 'assets/ground-main.png')
    // Start screen dedicated background
    this.load.image(assets.scene.startBackground, 'assets/background-start-screen.png')

    // Level obstacles: pencil and ruler sets
    this.load.image(assets.obstacles.pencil.top, 'assets/pencil-top.png')
    this.load.image(assets.obstacles.pencil.bottom, 'assets/pencil-bottom.png')
    this.load.image(assets.obstacles.ruler.top, 'assets/ruler-top.png')
    this.load.image(assets.obstacles.ruler.bottom, 'assets/ruler-bottom.png')

    // Audio
    this.load.audio('score', 'assets/audio/score.mp3')
    this.load.audio('gameover', 'assets/audio/game-over.mp3')
    this.load.audio('backgroundMusic', 'assets/audio/background-music.mp3')
    this.load.audio('gameplayLoopSound', 'assets/audio/wind.mp3')

    // New UI assets
    this.load.image(assets.ui.letsFlyButton, 'assets/btns/lets-fly.png')
    this.load.image(assets.ui.soundOnFocused, 'assets/btns/sound-focus-on.png')
    this.load.image(assets.ui.soundOnUnfocused, 'assets/btns/sound-unfocus-on.png')
    this.load.image(assets.ui.soundOffUnfocused, 'assets/btns/sound-unfocus-off.png')
    this.load.image(assets.ui.soundOffFocused, 'assets/btns/sound-focus-off.png')
    this.load.image(assets.ui.exitPopupBg, 'assets/popup-bg.png')
    this.load.image(assets.ui.exitHeadingImage, 'assets/Leaving the sky.png')
    this.load.image(assets.ui.exitPlaneIllustration, 'assets/plane.png')
    this.load.image(assets.ui.exitLeaveButton, 'assets/btns/leave-uf.png')
    this.load.image(assets.ui.exitStayButton, 'assets/btns/keep-playing-uf.png')
    this.load.image(assets.ui.exitLeaveButtonFocused, 'assets/btns/leave-focused.png')
    this.load.image(assets.ui.exitStayButtonFocused, 'assets/btns/keep-playing-focused.png')
    this.load.image(assets.ui.exitLeaveButtonUnfocused, 'assets/btns/leave-uf.png')
    this.load.image(assets.ui.exitStayButtonUnfocused, 'assets/btns/keep-playing-uf.png')

    // Remove-ads popup
    this.load.image(assets.ui.removeAdsHeadingImage, 'assets/remove-ads-heading.png')
    this.load.image(assets.ui.removeAdsPriceImage, 'assets/price.png')
    this.load.image(assets.ui.removeAdsNotNowButton, 'assets/btns/not-now-uf.png')
    this.load.image(assets.ui.removeAdsGoAdFreeButton, 'assets/btns/go-ads-free-uf.png')
    this.load.image(assets.ui.removeAdsNotNowButtonFocused, 'assets/btns/not-now-focused.png')
    this.load.image(assets.ui.removeAdsGoAdFreeButtonFocused, 'assets/btns/go-ads-free-focused.png')
    this.load.image(assets.ui.removeAdsNotNowButtonUnfocused, 'assets/btns/not-now-uf.png')
    this.load.image(assets.ui.removeAdsGoAdFreeButtonUnfocused, 'assets/btns/go-ads-free-uf.png')

    this.load.image(assets.ui.restartButton, 'assets/btns/restart.png')

    // Paper plane character (single sprite)
    this.load.image(assets.character.paperPlane, 'assets/paper-plane.png')

    // Use new ShantellSans font for all UI text
    this.load.font('shantell', 'assets/font/ShantellSans.ttf')
}

/**
 *   Create the game objects (images, groups, sprites and animations).
 */
function create() {
    // Start screen static background (shown only on start screen)
    startBackgroundImage = this.add.image(GAME_CENTER_X, GAME_HEIGHT / 2, assets.scene.startBackground)
    startBackgroundImage.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
    startBackgroundImage.setDepth(0)
    startBackgroundImage.visible = true

    backgroundMain = this.add.tileSprite(assets.scene.width, 256, GAME_WIDTH, GAME_HEIGHT, assets.scene.background).setInteractive()
    backgroundMain.on('pointerdown', () => {
        // Prevent accidental start on TVs: only flap when game already started.
        if (gameStarted && !gameOver) propelPlayer()
        else setPlayButtonFocus(true)
    })

    gapsGroup = this.physics.add.group()
    obstaclesGroup = this.physics.add.group()

    const groundY = 458
    groundSprite = this.add.tileSprite(GAME_WIDTH / 2, groundY, GAME_WIDTH, 112, assets.scene.ground)
    groundSprite.setDepth(10)

    groundCollider = this.physics.add.staticSprite(GAME_WIDTH / 2, groundY, assets.scene.ground)
    groundCollider.setVisible(false)
    groundCollider.setSize(GAME_WIDTH, 108, true)

    selectButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    leftButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    rightButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    upButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    downButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    backButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)

    // Ensure the canvas can receive key events on TV remotes.
    if (this.game && this.game.canvas) {
        this.game.canvas.setAttribute('tabindex', '0')
        this.game.canvas.focus()
        this.game.canvas.addEventListener('pointerdown', function () {
            this.game.canvas.focus()
        }.bind(this))
    }

    // Background music: play continuously in loop without any trigger.
    // This is created once per scene and respects the global sound mute toggle.
    backgroundMusic = this.sound.add('backgroundMusic', {
        volume: 1,
        loop: true
    })
    backgroundMusic.play()

    prepareGame(this)

    // New text-based Game Over heading (centered horizontally, slightly larger)
    gameOverBanner = this.add.text(GAME_CENTER_X, 190, 'GAME OVER', {
        fontFamily: 'shantell',
        fontSize: '55px',
        color: '#353535'
    })
    gameOverBanner.setOrigin(0.5, 0.5)
    gameOverBanner.setDepth(20)
    gameOverBanner.visible = false

    restartButton = this.add.image(assets.scene.width, 300, assets.ui.restartButton).setInteractive()
    restartButton.on('pointerdown', restartGame)
    // Match the start screen play button size (same max box)
    fitImageToBox(restartButton, 200, 100)
    restartButton.setDepth(20)
    restartButton.visible = false
    restartButtonBaseScale = restartButton.scaleX

    // Score text style - Shantell, solid blue, no outline
    const scoreTextStyle = {
        fontFamily: 'shantell',
        fontSize: '50px',
        color: '#326BFB'
    }

    // Label text style - Shantell, same blue, no outline
    const labelTextStyle = {
        fontFamily: 'shantell',
        fontSize: '18px',
        color: '#326BFB',
        letterSpacing: 2
    }

    // Create score text (left side) - 30px from top, 95px from left
    scoreText = this.add.text(40, 10, '0', scoreTextStyle)
    scoreText.setOrigin(0, 0)
    scoreText.setDepth(10)
    scoreText.visible = false

    // Create score label (give a bit more breathing room under the digits)
    scoreLabelText = this.add.text(40, 70, 'Current Score', labelTextStyle)
    scoreLabelText.setOrigin(0, 0)
    scoreLabelText.setDepth(10)
    scoreLabelText.visible = false

    // Create high score text (right side) - 30px from top, 95px from right
    highScoreText = this.add.text(GAME_WIDTH - 40, 10, '0', scoreTextStyle)
    highScoreText.setOrigin(1, 0)  // Right-aligned
    highScoreText.setDepth(10)
    highScoreText.visible = false

    // Create high score label with same vertical gap as current score
    highScoreLabelText = this.add.text(GAME_WIDTH - 40, 70, 'High Score', labelTextStyle)
    highScoreLabelText.setOrigin(1, 0)  // Right-aligned
    highScoreLabelText.setDepth(10)
    highScoreLabelText.visible = false

    // --- Start screen UI (centered container) ---
    createStartScreenUI(this, scoreTextStyle)
    setStartScreenVisible(true)

    // Exit popup UI (hidden by default, controlled via utils)
    const scene = this
    exitPopup = createExitPopup(scene, {
        popupBgKey: assets.ui.exitPopupBg,
        illustrationKey: assets.ui.exitPlaneIllustration,
        headingImageKey: assets.ui.exitHeadingImage,
        leaveKey: assets.ui.exitLeaveButton,
        stayKey: assets.ui.exitStayButton,
        leaveKeyFocused: assets.ui.exitLeaveButtonFocused,
        stayKeyFocused: assets.ui.exitStayButtonFocused,
        leaveKeyUnfocused: assets.ui.exitLeaveButtonUnfocused,
        stayKeyUnfocused: assets.ui.exitStayButtonUnfocused,
        onLeave: () => {
            trackAnalyticsEvent('exit_yes')
            sendExitGame()
        },
        onStay: () => {
            trackAnalyticsEvent('exit_no')
            if (exitPopup) exitPopup.hide()
            if (exitPopupPausedGame) {
                scene.physics.resume()
                propelPlayer()
                exitPopupPausedGame = false
            }
        }
    })

    // Remove-ads popup UI (same size as exit popup, different assets / copy)
    removeAdsPopup = createExitPopup(scene, {
        // Keep popup open after "Go Ad-Free" until native sends iap-result success/fail.
        autoHideOnStay: false,
        popupBgKey: assets.ui.exitPopupBg,
        illustrationKey: assets.ui.removeAdsPriceImage,
        headingImageKey: assets.ui.removeAdsHeadingImage,
        // Make remove-ads headline wider and slightly taller than exit headline
        headingWidthRatio: 0.8,
        headingHeightRatio: 0.22,
        leaveKey: assets.ui.removeAdsNotNowButton,
        stayKey: assets.ui.removeAdsGoAdFreeButton,
        leaveKeyFocused: assets.ui.removeAdsNotNowButtonFocused,
        stayKeyFocused: assets.ui.removeAdsGoAdFreeButtonFocused,
        leaveKeyUnfocused: assets.ui.removeAdsNotNowButtonUnfocused,
        stayKeyUnfocused: assets.ui.removeAdsGoAdFreeButtonUnfocused,
        subheadingText: 'Enjoy uninterrupted gameplay with an ad-free experience.',
        onLeave: () => {
            // "Not now" simply closes the popup (only if a purchase is not already in progress)
            if (isIapPurchaseInProgress) {
                return
            }
            trackAnalyticsEvent('subscription_gameover_sub_later')
            if (removeAdsPopup) removeAdsPopup.hide()
        },
        onStay: () => {
            // "Go Ad-Free" triggers IAP flow (implemented via native bridge)
            if (isIapPurchaseInProgress) {
                return
            }
            isIapPurchaseInProgress = true
            try {
                triggerIAPPurchase()
            } catch (e) {
                // If we fail to even send the request, immediately clear the in-progress flag
                isIapPurchaseInProgress = false
            }
            // Do NOT hide popup here; wait for IAP response from native (success/fail) to hide it.
        }
    })
    requestExitPopupCallback = () => {
        if (!exitPopup) return
        if (exitPopup.isVisible()) return
        if (gameStarted && !gameOver && !exitPopupPausedGame) {
            scene.physics.pause()
            exitPopupPausedGame = true
        }
        exitPopup.show()
    }

    // Notify native shell that web game is fully ready
    try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(
                JSON.stringify({ type: 'web-ready' })
            )
        }
    } catch (e) {
        // Ignore if bridge is not available
    }
}

// ---------------------------
// UI helpers (keep modular)
// ---------------------------

function createStartScreenUI(scene, scoreTextStyle) {
    // Container centered
    startUiContainer = scene.add.container(GAME_CENTER_X, GAME_HEIGHT / 2)
    startUiContainer.setDepth(50)

    // New heading text: "Paper Flight" (match game-over spacing to button)
    // Game over: heading at ~190, button at ~300 => delta ~110.
    // Here we keep the same relative gap: heading at -60, button at +50.
    startTitleImage = scene.add.text(0, -70, 'Paper Flight', {
        fontFamily: 'shantell',
        fontSize: '55px',
        color: '#353535'
    })
    startTitleImage.setOrigin(0.5, 0.5)

    // New circular "LET'S FLY" button
    playButtonImage = scene.add.image(0, 35, assets.ui.letsFlyButton).setInteractive()
    playButtonImage.setOrigin(0.5, 0.5)
    // Smaller box + extra scale-down so it is clearly smaller than restart button
    fitImageToBox(playButtonImage, 150, 150)
    playButtonImage.setScale(playButtonImage.scaleX * 0.75)
    playButtonBaseScale = playButtonImage.scaleX

    // New hint text with updated font/color (smaller, to de‑emphasize)
    playHintText = scene.add.text(
        0,
        115,
        'PRESS "OK" TO FLY',
        {
            fontFamily: 'shantell',
            fontSize: '22px',
            color: '#353535',
        }
    )
    playHintText.setOrigin(0.5, 0.5)
    playHintText.visible = false

    startUiContainer.add([startTitleImage, playButtonImage, playHintText])

    // Pointer focus behavior (mouse/touch)
    playButtonImage.on('pointerover', () => setStartScreenFocus('play'))
    playButtonImage.on('pointerout', () => {})
    playButtonImage.on('pointerdown', () => {
        setStartScreenFocus('play')
        attemptStartFromPlayButton()
    })

    // Music toggle icon (top-right, same placement as high score numbers)
    // Existing focus/press behavior retained; we only swap textures.
    musicToggleImage = scene.add.image(GAME_WIDTH - 50, 30, assets.ui.soundOnUnfocused).setOrigin(1, 0).setInteractive()
    musicToggleImage.setDepth(60)
    musicToggleImage.on('pointerdown', () => {
        setStartScreenFocus('music')
        toggleMusic(scene)
    })
    // Music icon size control (tweak as desired)
    fitImageToBox(musicToggleImage, 64, 64)
    musicButtonBaseScale = musicToggleImage.scaleX
    musicToggleImage.on('pointerover', () => setStartScreenFocus('music'))
    musicToggleImage.on('pointerout', () => {})
}

function sendExitGame() {
    try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'exit-game' }))
            return
        }
    } catch (_) {}
    // Fallback: close window if available
    try {
        window.close()
    } catch (_) {}
}

function setStartScreenVisible(visible) {
    if (startUiContainer) startUiContainer.visible = visible
    if (musicToggleImage) musicToggleImage.visible = visible
    if (startBackgroundImage) startBackgroundImage.visible = visible
    // Hide gameplay background/ground while start screen is visible
    if (backgroundMain) backgroundMain.visible = !visible
    if (groundSprite) groundSprite.visible = !visible
    // Hide player while start screen is shown
    if (player) {
        player.visible = !visible
    }

    // Hide score UI on start screen
    if (visible) {
        if (scoreText) scoreText.visible = false
        if (scoreLabelText) scoreLabelText.visible = false
        if (highScoreText) highScoreText.visible = false
        if (highScoreLabelText) highScoreLabelText.visible = false
    }

    // Ensure a default focused state on start screen
    if (visible) {
        setStartScreenFocus('play')
        trackAnalyticsEvent('view_home')
    } else {
        setStartScreenFocus(null)
    }
}

function setStartScreenFocus(target) {
    startScreenFocus = target
    const isPlay = target === 'play'
    const isMusic = target === 'music'
    setPlayButtonFocus(isPlay)
    setMusicButtonPulse(game.scene.scenes[0], isMusic)
}

function setPlayButtonFocus(focused) {
    playButtonFocused = focused
    if (!playButtonImage) return

    if (playHintText) playHintText.visible = focused

    if (focused) {
        playPulseTween = startPulse(playButtonImage, playButtonBaseScale, playPulseTween, {
            scale: 1.08,
            duration: 450
        })
    } else {
        playPulseTween = stopPulse(playButtonImage, playButtonBaseScale, playPulseTween)
    }
}

function attemptStartFromPlayButton() {
    if (gameOver || gameStarted) return
    if (startScreenFocus !== 'play') return
    trackAnalyticsEvent('home_play_btn_pressed')
    startGame(game.scene.scenes[0])
    setStartScreenVisible(false)
}

function setRestartPulse(scene, enabled) {
    if (!restartButton) return
    if (enabled) {
        restartPulseTween = startPulse(restartButton, restartButtonBaseScale, restartPulseTween, {
            scale: 1.06,
            duration: 450
        })
    } else {
        restartPulseTween = stopPulse(restartButton, restartButtonBaseScale, restartPulseTween)
    }
}

function setMusicButtonPulse(scene, enabled) {
    if (!musicToggleImage) return
    if (enabled) {
        musicPulseTween = startPulse(musicToggleImage, musicButtonBaseScale, musicPulseTween, {
            scale: 1.06,
            duration: 450
        })
        musicToggleImage.setTexture(
            isMusicOn ? assets.ui.soundOnFocused : assets.ui.soundOffFocused
        )
    } else {
        musicPulseTween = stopPulse(musicToggleImage, musicButtonBaseScale, musicPulseTween)
        musicToggleImage.setTexture(
            isMusicOn ? assets.ui.soundOnUnfocused : assets.ui.soundOffUnfocused
        )
    }
}

function startPulse(target, baseScale, existingTween, options) {
    if (existingTween) existingTween.stop()
    target.setScale(baseScale)
    return createPulseTween(target.scene, target, baseScale, options)
}

function stopPulse(target, baseScale, existingTween) {
    if (existingTween) {
        existingTween.stop()
        // Properly destroy tween to prevent memory accumulation
        if (typeof existingTween.remove === 'function') {
            existingTween.remove()
        }
    }
    target.setScale(baseScale)
    return null
}

function toggleMusic(scene) {
    isMusicOn = !isMusicOn
    trackAnalyticsEvent('music_' + (isMusicOn ? 'on' : 'off'))
    if (musicToggleImage) {
        musicToggleImage.setTexture(
            isMusicOn
                ? (startScreenFocus === 'music' ? assets.ui.soundOnFocused : assets.ui.soundOnUnfocused)
                : (startScreenFocus === 'music' ? assets.ui.soundOffFocused : assets.ui.soundOffUnfocused)
        )
    }

    // If you later re-enable bg music, wire it here.
    // For now, we mute/unmute Phaser sound manager (HTML5 audio backend).
    if (scene && scene.sound) {
        scene.sound.mute = !isMusicOn
    }
}

/**
 *  Update the scene frame by frame, responsible for move and rotate the player and to create and move obstacles.
 */
function update(t, dt) {
    const flapPressed = Phaser.Input.Keyboard.JustDown(selectButton) 
    const flapHeld = !!(selectButton && selectButton.isDown)
    const leftPressed = Phaser.Input.Keyboard.JustDown(leftButton)
    const rightPressed = Phaser.Input.Keyboard.JustDown(rightButton)
    const upPressed = Phaser.Input.Keyboard.JustDown(upButton)
    const backPressed = Phaser.Input.Keyboard.JustDown(backButton)
    
    const deltaMs = dt || (this.game && this.game.loop ? this.game.loop.delta : 0) || 0

    // If an in-game ad video is playing, freeze all gameplay & input.
    if (adPlaying) {
        return
    }

    if (exitPopup && exitPopup.isVisible()) {
        if (leftPressed || rightPressed) {
            exitPopup.toggleFocus()
        }
        if (flapPressed) {
            exitPopup.confirm()
        }
        if (backPressed) {
            exitPopup.hide()
        }
        return
    }

    // Remove-ads popup should behave like a modal (steal focus from gameplay behind it)
    if (removeAdsPopup && removeAdsPopup.isVisible()) {
        // While purchase is in progress, keep popup visible and ignore navigation/confirm/back.
        if (!isIapPurchaseInProgress) {
            if (leftPressed || rightPressed) {
                removeAdsPopup.toggleFocus()
            }
            if (flapPressed) {
                removeAdsPopup.confirm()
            }
            if (backPressed) {
                trackAnalyticsEvent('subscription_gameover_sub_later')
                removeAdsPopup.hide()
            }
        }
        return
    }

    //background image parallax effect
    if (!gameOver) {
    const parallaxDeltaBg = backgroundScrollSpeed * (deltaMs / 1000)
    backgroundMain.tilePositionX += parallaxDeltaBg
    if (!gameOver)
        groundSprite.tilePositionX += currentGameSpeed * (deltaMs / 1000)
    }
    if (gameOver) {
        if (flapPressed && restartEnabled)
            restartGame()
        return
    }

    if (!gameStarted) {
        // Horizontal navigation: left -> play, right -> music
        if (leftPressed) setStartScreenFocus('play')
        if (rightPressed) setStartScreenFocus('music')

        // Vertical navigation:
        // - music ↓ -> play
        // - play ↑ -> music
        if (upPressed) {
            if (startScreenFocus === 'play') setStartScreenFocus('music')
        }

        if (flapPressed) {
            if (startScreenFocus === 'play') attemptStartFromPlayButton()
            if (startScreenFocus === 'music') toggleMusic(this)
        }
        return
    }

    const deltaSeconds = deltaMs / 1000
    const isGlidingUp = flapHeld || upButton.isDown
    // Down input should not force a faster descent; the plane comes down naturally.
    if (isGlidingUp) currentVelocity -= paperFlightUpAcceleration * deltaSeconds
    else currentVelocity += paperFlightDownAcceleration * deltaSeconds

    if (currentVelocity < -paperFlightMaxUpSpeed) currentVelocity = -paperFlightMaxUpSpeed
    if (currentVelocity > paperFlightMaxDownSpeed) currentVelocity = paperFlightMaxDownSpeed
    player.setVelocityY(currentVelocity)

    const targetAngle = isGlidingUp ? paperFlightTiltUp : paperFlightTiltDown
    player.angle += (targetAngle - player.angle) * paperFlightTiltLerp

    obstaclesGroup.children.iterate(function (child) {
        if (child == undefined)
            return

        if (child.x < -50) {
            // Return to pool instead of destroying (prevents GPU memory leak)
            child.setActive(false).setVisible(false)
            child.setVelocityX(0)
        } else {
            child.setVelocityX(-currentGameSpeed)
        }
    })

    gapsGroup.children.iterate(function (child) {
        child.body.setVelocityX(-currentGameSpeed)
    })

    obstacleTravelDistanceSinceLast += currentGameSpeed * (deltaMs / 1000)
    if (obstacleTravelDistanceSinceLast >= nextObstacleSpawnDistance) {
        makeObstacles(game.scene.scenes[0])
        obstacleTravelDistanceSinceLast = 0
        nextObstacleSpawnDistance = getHorizontalObstacleSetGap()
    }
}

/**
 *  Player collision event.
 *  @param {object} player - Game object that collided, in this case the player. 
 */
function handlePlayerHit(player) {
    this.physics.pause()
    gameOver = true
    gameStarted = false

    // Count crashes so we can trigger in-game ad video
    crashCount++
    trackAnalyticsEvent('player_crash', { crashCount: crashCount, score: score })
    trackAnalyticsEvent('view_gameover')

    this.cameras.main.shake(gameOverShakeDurationMs, gameOverShakeIntensity)

    // Stop gameplay background loop on game over
    if (gameplayLoopSound && gameplayLoopSound.isPlaying) {
        try {
            gameplayLoopSound.stop()
        } catch (_) {}
    }

    if (gameOverSound && !gameOverSound.isPlaying) {
        try {
            gameOverSound.play()
        } catch (_) {}
    }

    gameOverBanner.visible = true
    restartButton.visible = true
    // Temporarily disable restart click until shake completes
    if (restartEnableTimer) {
        restartEnableTimer.remove(false)
        restartEnableTimer = null
    }
    restartEnabled = false
    if (restartButton) restartButton.disableInteractive()
    setRestartPulse(this, false)
    restartEnableTimer = this.time.delayedCall(gameOverShakeDurationMs, () => {
        if (!restartButton) return
        restartEnabled = true
        restartButton.setInteractive()
        setRestartPulse(this, true)
    })
    
    // If this run beat the saved high score, persist it now
    const previousHighScore = highScore
    let isNewHighScore = false
    if (score > previousHighScore && score > 0) {
        highScore = score
        saveHighScore(highScore)
        isNewHighScore = true
    }

    // Update and display high score
    updateHighScoreDisplay()

    // Fire score milestones every game over, but fire best_* only when a new high score (>0) is set.
    // When no new high score, pass 0 so best_* is not emitted.
    const bestValueForAnalytics = isNewHighScore ? highScore : 0
    trackScoreMilestones(score, bestValueForAnalytics)

    // Only show ads for non-premium users
    if (!isPremiumUser) {
        // Dynamic scheduling based on last ad play:
        //  - Prefetch when crashCount >= nextAdPrefetchCrash
        //  - Play when crashCount >= nextAdPlayCrash and a cached URL is ready and we're not loading.

        // Kick off prefetch if we've reached/passed the prefetch crash and nothing is cached/ loading.
        if (
            crashCount >= nextAdPrefetchCrash &&
            !cachedAdMediaUrl &&
            !adPrefetchInProgress
        ) {
            if (!deviceId) {
                requestDeviceId()
                // When device ID arrives, preFetchAdVideo() will be invoked from the message handler.
            } else {
                preFetchAdVideo()
            }
        }

        // Attempt to play the ad if we've reached the play threshold, prefetch is done, and we have media.
        if (
            crashCount >= nextAdPlayCrash &&
            !adPrefetchInProgress &&
            cachedAdMediaUrl
        ) {
            const playOnCrash = crashCount
            setTimeout(() => {
                playAdVideo()
            }, gameOverShakeDurationMs)

            // After actually scheduling playback, move the window forward
            lastAdPlayCrash = playOnCrash
            nextAdPrefetchCrash = lastAdPlayCrash + 2
            nextAdPlayCrash = lastAdPlayCrash + 3
        }
    }
}


/**
 *   Update the scoreboard.
 *   @param {object} _ - Game object that overlapped, in this case the player (ignored).
 *   @param {object} gap - Game object that was overlapped, in this case the gap.
 */
function updateScore(_, gap) {
    score++
    gap.destroy()

    if (score > 0 && score % scoreToChangeLevel === 0)
        advanceLevel()
    if (scoreSound) {
        try {
            scoreSound.play()
        } catch (_) {}
    }

    updateScoreboard()
    updateHighScoreDisplay() // Update high score display when score changes
}

function advanceLevel() {
    toggleObstaclesByLevel()
}

function toggleObstaclesByLevel() {
    const nextObstacleSet =
        currentObstacleSet === assets.obstacles.pencil
            ? assets.obstacles.ruler
            : assets.obstacles.pencil
    currentObstacleSet = nextObstacleSet

    obstaclesGroup.children.iterate(function (child) {
        if (!child)
            return
        if (child.texture && (child.texture.key === assets.obstacles.pencil.top || child.texture.key === assets.obstacles.ruler.top))
            child.setTexture(currentObstacleSet.top)
        else if (child.texture && (child.texture.key === assets.obstacles.pencil.bottom || child.texture.key === assets.obstacles.ruler.bottom))
            child.setTexture(currentObstacleSet.bottom)
    })
}

function getHorizontalObstacleSetGap() {
    return getRandomBetween(horizontalObstacleSetGapMin, horizontalObstacleSetGapMax)
}

/**
 * Create obstacle pair and score gap in the game.
 * @param {object} scene - Game scene.
 */
function makeObstacles(scene) {
    if (!gameStarted || gameOver) return

    // Obstacle sprites use center-origin; keep the lower obstacle's top edge
    // from being fully covered by the ground visuals.
    //
    // groundSprite: center at y=458 with height=112 => ground top boundary is 402.
    const groundY = 458
    const groundSpriteHeight = 112
    const groundTopY = groundY - groundSpriteHeight / 2

    // Obstacle asset height is 256 => half is 128.
    const obstacleHeight = 256
    const obstacleHalfHeight = obstacleHeight / 2

    const verticalGap = getRandomBetween(verticalObstacleGapMin, verticalObstacleGapMax)

    // Ensure at least N pixels of the upper obstacle remain visible below the screen top.
    // Upper obstacle bottom edge = obstacleTopY + obstacleHalfHeight.
    const obstacleTopYMinFromTopVisibility = obstacleMinVisiblePx - obstacleHalfHeight

    // Ensure at least N pixels of the lower obstacle remain visible above the ground overlay.
    // Lower obstacle top edge = (obstacleTopY + verticalGap) - obstacleHalfHeight.
    // Require: lower obstacle top edge <= (groundTopY - obstacleMinVisiblePx)
    const obstacleTopYMaxFromGroundVisibility = groundTopY - obstacleMinVisiblePx + obstacleHalfHeight - verticalGap

    // Keep your original spawn range as a fallback guard.
    const obstacleTopYMin = Math.max(-120, obstacleTopYMinFromTopVisibility)
    const obstacleTopYMaxClamped = Math.max(obstacleTopYMin, obstacleTopYMaxFromGroundVisibility)
    // Lower obstacle center = obstacleTopY + verticalGap
    // Lower obstacle top edge = (obstacleTopY + verticalGap) - obstacleHalfHeight
    // Require: lower obstacle top edge <= (groundTopY - obstacleMinVisiblePx)
    const obstacleTopY = Phaser.Math.Between(obstacleTopYMin, obstacleTopYMaxClamped)

    const gapCenterY = obstacleTopY + (verticalGap / 2)
    const gapLineHeight = verticalGap
    const gap = scene.add.line(GAME_WIDTH, gapCenterY, 0, -gapLineHeight / 2, 0, gapLineHeight / 2)
    gapsGroup.add(gap)
    gap.body.allowGravity = false
    gap.body.setSize(1, gapLineHeight, true)
    gap.visible = false

    // Use object pooling: get() reuses inactive sprites instead of creating new ones
    let upperObstacle = obstaclesGroup.get(GAME_WIDTH, obstacleTopY, currentObstacleSet.top)
    if (!upperObstacle) {
        // Fallback: create new sprite only if pool is exhausted
        upperObstacle = obstaclesGroup.create(GAME_WIDTH, obstacleTopY, currentObstacleSet.top)
    } else {
        // Reactivate pooled sprite with new position and texture
        upperObstacle.setActive(true).setVisible(true)
        upperObstacle.setPosition(GAME_WIDTH, obstacleTopY)
        upperObstacle.setTexture(currentObstacleSet.top)
    }
    upperObstacle.body.setSize(upperObstacle.width - 20, upperObstacle.height - 12)
    upperObstacle.body.allowGravity = false

    let lowerObstacle = obstaclesGroup.get(GAME_WIDTH, obstacleTopY + verticalGap, currentObstacleSet.bottom)
    if (!lowerObstacle) {
        // Fallback: create new sprite only if pool is exhausted
        lowerObstacle = obstaclesGroup.create(GAME_WIDTH, obstacleTopY + verticalGap, currentObstacleSet.bottom)
    } else {
        // Reactivate pooled sprite with new position and texture
        lowerObstacle.setActive(true).setVisible(true)
        lowerObstacle.setPosition(GAME_WIDTH, obstacleTopY + verticalGap)
        lowerObstacle.setTexture(currentObstacleSet.bottom)
    }
    lowerObstacle.body.setSize(lowerObstacle.width - 20, lowerObstacle.height - 12)
    lowerObstacle.body.allowGravity = false
}

/**
 * Apply upward impulse to the player.
 */
function propelPlayer() {
    if (gameOver)
        return

    if (!gameStarted)
        startGame(game.scene.scenes[0])

    currentVelocity = -paperFlightMaxUpSpeed * 0.55
    player.setVelocityY(currentVelocity)
    player.angle = paperFlightTiltUp
    framesMoveUp = 0
}

/**
 * Update the game scoreboard - displays current score on top left.
 */
function updateScoreboard() {
    // Only show score during gameplay and game over, not on start screen
    if (!gameStarted && !gameOver) {
        if (scoreText) scoreText.visible = false
        if (scoreLabelText) scoreLabelText.visible = false
        return
    }

    // Update score text
    if (scoreText) {
        scoreText.setText(score.toString())
        scoreText.visible = true
    }
    if (scoreLabelText) {
        scoreLabelText.visible = true
    }
}

/**
 * Update and display the high score on top right corner.
 */
function updateHighScoreDisplay() {
    // Only show high score during gameplay and game over, not on start screen
    if (!gameStarted && !gameOver) {
        if (highScoreText) highScoreText.visible = false
        if (highScoreLabelText) highScoreLabelText.visible = false
        return
    }

    // Hide high score during gameplay once current score surpasses it
    if (gameStarted && !gameOver && score > runHighScoreBaseline) {
        if (highScoreText) highScoreText.visible = false
        if (highScoreLabelText) highScoreLabelText.visible = false
        scoreLabelText.setStroke(RED_COLOR)
        scoreText.setColor(RED_COLOR)
        return
    }

    // Update high score text
    if (highScoreText) {
        highScoreText.setText(highScore.toString())
        highScoreText.visible = true
    }
    if (highScoreLabelText) {
        highScoreLabelText.visible = true
    }
}

/**
 * Restart the game. 
 * Clean all groups, hide game over objects and stop game physics.
 */
function restartGame() {
    // Do not allow restarting while an ad video is playing
    if (adPlaying) return
    trackAnalyticsEvent('restart_btn_pressed')
    restartEnabled = false
    obstaclesGroup.clear(true, true)
    gapsGroup.clear(true, true)
    player.destroy()
    gameOverBanner.visible = false
    restartButton.visible = false
    if (restartEnableTimer) {
        restartEnableTimer.remove(false)
        restartEnableTimer = null
    }
    if (restartButton) restartButton.disableInteractive()
    if (gameOverSound && gameOverSound.isPlaying)
        gameOverSound.stop()

    // reset score text colors
    scoreText.setColor('#326BFB')
    scoreLabelText.setColor('#326BFB')

    const gameScene = game.scene.scenes[0]
    setRestartPulse(gameScene, false)
    prepareGame(gameScene)

    gameScene.physics.resume()
}

/**
 * Restart all variables/configuration, show main UI, and recreate the player.
 * @param {object} scene - Game scene.
 */
function prepareGame(scene) {
    framesMoveUp = 0
    obstacleTravelDistanceSinceLast = 0
    nextObstacleSpawnDistance = getHorizontalObstacleSetGap()
    currentObstacleSet = assets.obstacles.pencil
    score = 0
    scoreMilestonesTracked = {}
    bestMilestonesTracked = {}
    // Request high score from React Native AsyncStorage
    // Initialize to 0 if undefined, will be updated via message handler
    if (highScore === undefined) {
        highScore = 0
        getHighScore() // Request high score from native app
    }
    runHighScoreBaseline = highScore
    currentVelocity = minVelocity
    gameOver = false
    restartEnabled = false
    if (groundSprite) {
        groundSprite.setTexture(assets.scene.ground)
    }
    // Start screen UI
    setStartScreenVisible(true)

    player = scene.physics.add.sprite(100, 250, assets.character.paperPlane)
    player.body.setCircle(13, 7, 2)
    player.setCollideWorldBounds(true)
    // player.angle = 15
    player.body.allowGravity = false
    // Ensure hidden beneath start screen until gameplay begins
    if (!gameStarted) {
        player.visible = false
    }

    scoreSound = scene.sound.add('score', { volume: 0.1 })
    gameOverSound = scene.sound.add('gameover', { volume: 0.1 })

    scene.physics.add.collider(player, groundCollider, handlePlayerHit, null, scene)
    scene.physics.add.collider(player, obstaclesGroup, handlePlayerHit, null, scene)

    scene.physics.add.overlap(player, gapsGroup, updateScore, null, scene)

    // Hide scoreboards on start screen (they'll be shown when game starts)
    if (scoreText) scoreText.visible = false
    if (scoreLabelText) scoreLabelText.visible = false
    if (highScoreText) highScoreText.visible = false
    if (highScoreLabelText) highScoreLabelText.visible = false
}

/**
 * Start gameplay, create obstacles, and hide the main menu.
 * @param {object} scene - Game scene.
 */
function startGame(scene) {
    gameStarted = true
    trackAnalyticsEvent('game_start')
    if (!hasViewedGameplay) {
        trackAnalyticsEvent('view_gameplay')
        hasViewedGameplay = true
    }
    setStartScreenVisible(false)

    // Start gameplay loop sound when gameplay begins
    if (!gameplayLoopSound) {
        gameplayLoopSound = scene.sound.add('gameplayLoopSound', {
            volume: 0.4,
            loop: true
        })
    }
    try {
        gameplayLoopSound.play()
    } catch (_) {}

    propelPlayer() // give player an initial upward impulse

    player.body.allowGravity = false

    // Display initial score (0) on top left and high score on top right
    updateScoreboard()
    updateHighScoreDisplay()

    makeObstacles(scene)
}

