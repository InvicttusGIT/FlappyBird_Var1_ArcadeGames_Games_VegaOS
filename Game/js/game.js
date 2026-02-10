const configurations = createConfigurations(preload, create, update)
const game = new Phaser.Game(configurations)
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

    // Backgrounds and ground
    this.load.image(assets.scene.background.day, 'assets/background-day.png')
    this.load.image(assets.scene.background.night, 'assets/background-night.png')
    this.load.image(assets.scene.ground.day, 'assets/ground-day.png')
    this.load.image(assets.scene.ground.night, 'assets/ground-night.png')

    // Pipes
    this.load.image(assets.obstacle.pipe.green.top, 'assets/pipe-green-top.png')
    this.load.image(assets.obstacle.pipe.green.bottom, 'assets/pipe-green-bottom.png')
    this.load.image(assets.obstacle.pipe.red.top, 'assets/pipe-red-top.png')
    this.load.image(assets.obstacle.pipe.red.bottom, 'assets/pipe-red-bottom.png')

    // Audio
    this.load.audio('score', 'assets/audio/score.mp3')
    this.load.audio('gameover', 'assets/audio/game-over.mp3')

    // Start game
    this.load.image(assets.scene.messageInitial, 'assets/message-initial.png')
    this.load.image(assets.ui.title, 'assets/FlapDash.png')
    this.load.image(assets.ui.playButton, 'assets/play-button.png')
    this.load.image(assets.ui.musicOn, 'assets/music-on.png')
    this.load.image(assets.ui.musicOff, 'assets/music-off.png')

    // End game
    this.load.image(assets.scene.gameOver, 'assets/gameover.png')
    this.load.image(assets.scene.restart, 'assets/restart-button.png')

    // Birds
    this.load.spritesheet(assets.bird.red, 'assets/bird-red-sprite.png', {
        frameWidth: 34,
        frameHeight: 24
    })
    this.load.spritesheet(assets.bird.blue, 'assets/bird-blue-sprite.png', {
        frameWidth: 34,
        frameHeight: 24
    })
    this.load.spritesheet(assets.bird.yellow, 'assets/bird-yellow-sprite.png', {
        frameWidth: 34,
        frameHeight: 24
    })

    this.load.font('jersey15', 'assets/font/Jersey15.ttf')
}

/**
 *   Create the game objects (images, groups, sprites and animations).
 */
function create() {
    backgroundDay = this.add.tileSprite(assets.scene.width, 256, GAME_WIDTH, GAME_HEIGHT, assets.scene.background.day).setInteractive()
    backgroundDay.on('pointerdown', () => {
        // Prevent accidental start on TVs: only flap when game already started.
        if (gameStarted && !gameOver) moveBird()
        else setPlayButtonFocus(true)
    })
    backgroundNight = this.add.tileSprite(assets.scene.width, 256, GAME_WIDTH, GAME_HEIGHT, assets.scene.background.night).setInteractive()
    backgroundNight.visible = false
    backgroundNight.on('pointerdown', () => {
        if (gameStarted && !gameOver) moveBird()
        else setPlayButtonFocus(true)
    })

    gapsGroup = this.physics.add.group()
    pipesGroup = this.physics.add.group()

    const groundY = 458
    // Start with day ground; will be toggled with theme changes
    groundSprite = this.add.tileSprite(GAME_WIDTH / 2, groundY, GAME_WIDTH, 112, assets.scene.ground.day)
    groundSprite.setDepth(10)

    groundCollider = this.physics.add.staticSprite(GAME_WIDTH / 2, groundY, assets.scene.ground.day)
    groundCollider.setVisible(false)
    groundCollider.setSize(GAME_WIDTH, 112, true)

    messageInitial = this.add.image(assets.scene.width, 156, assets.scene.messageInitial)
    messageInitial.setDepth(30)
    messageInitial.visible = false

    selectButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    leftButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    rightButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    upButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    downButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)

    // Ensure the canvas can receive key events on TV remotes.
    if (this.game && this.game.canvas) {
        this.game.canvas.setAttribute('tabindex', '0')
        this.game.canvas.focus()
        this.game.canvas.addEventListener('pointerdown', function () {
            this.game.canvas.focus()
        }.bind(this))
    }

    // Red Bird Animations
    this.anims.create({
        key: assets.animation.bird.red.clapWings,
        frames: this.anims.generateFrameNumbers(assets.bird.red, {
            start: 0,
            end: 2
        }),
        frameRate: 10,
        repeat: -1
    })
    this.anims.create({
        key: assets.animation.bird.red.stop,
        frames: [{
            key: assets.bird.red,
            frame: 1
        }],
        frameRate: 20
    })

    // Blue Bird animations
    this.anims.create({
        key: assets.animation.bird.blue.clapWings,
        frames: this.anims.generateFrameNumbers(assets.bird.blue, {
            start: 0,
            end: 2
        }),
        frameRate: 10,
        repeat: -1
    })
    this.anims.create({
        key: assets.animation.bird.blue.stop,
        frames: [{
            key: assets.bird.blue,
            frame: 1
        }],
        frameRate: 20
    })

    // Yellow Bird animations
    this.anims.create({
        key: assets.animation.bird.yellow.clapWings,
        frames: this.anims.generateFrameNumbers(assets.bird.yellow, {
            start: 0,
            end: 2
        }),
        frameRate: 10,
        repeat: -1
    })
    this.anims.create({
        key: assets.animation.bird.yellow.stop,
        frames: [{
            key: assets.bird.yellow,
            frame: 1
        }],
        frameRate: 20
    })

    prepareGame(this)

    gameOverBanner = this.add.image(assets.scene.width, 206, assets.scene.gameOver)
    // Match the start screen FlapDash size (same max box)
    fitImageToBox(gameOverBanner, 400, 200)
    gameOverBanner.setDepth(20)
    gameOverBanner.visible = false

    restartButton = this.add.image(assets.scene.width, 300, assets.scene.restart).setInteractive()
    restartButton.on('pointerdown', restartGame)
    // Match the start screen play button size (same max box)
    fitImageToBox(restartButton, 200, 100)
    restartButton.setDepth(20)
    restartButton.visible = false
    restartButtonBaseScale = restartButton.scaleX

    // Audio watchdog: re-assert sound enabled on focus/visibility changes (Vega WebView can mute intermittently).
    const scene = this
    if (scene.game && scene.game.events) {
        scene.game.events.on(Phaser.Core.Events.FOCUS, () => ensureAudioIsActive(scene))
        scene.game.events.on(Phaser.Core.Events.BLUR, () => ensureAudioIsActive(scene))
    }
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) ensureAudioIsActive(scene)
    })
    window.addEventListener('focus', () => ensureAudioIsActive(scene))

    // Score text style with blue color and white stroke (reused for UI copy)
    const scoreTextStyle = {
        fontFamily: 'jersey15',
        fontSize: '50px',
        color: SCORE_BLUE_COLOR,
        stroke: SCORE_WHITE_COLOR,
        strokeThickness: 6
    }

    // Label text style (white color, smaller font)
    const labelTextStyle = {
        fontFamily: 'jersey15',
        fontSize: '18px',
        color: SCORE_WHITE_COLOR,
        stroke: SCORE_BLUE_COLOR,
        strokeThickness: 3,
        letterSpacing: 2
    }

    // Create score text (left side) - 30px from top, 95px from left
    scoreText = this.add.text(40, 10, '0', scoreTextStyle)
    scoreText.setOrigin(0, 0)
    scoreText.setDepth(10)
    scoreText.visible = false

    // Create score label (below score text, 30px margin from bottom of number)
    // Number is 150px font size, so label at 30 + 150 + 30 = 210
    scoreLabelText = this.add.text(40, 60, 'CURRENT SCORE', labelTextStyle)
    scoreLabelText.setOrigin(0, 0)
    scoreLabelText.setDepth(10)
    scoreLabelText.visible = false

    // Create high score text (right side) - 30px from top, 95px from right
    highScoreText = this.add.text(GAME_WIDTH - 40, 10, '0', scoreTextStyle)
    highScoreText.setOrigin(1, 0)  // Right-aligned
    highScoreText.setDepth(10)
    highScoreText.visible = false

    // Create high score label (below high score text, 30px margin from bottom of number)
    highScoreLabelText = this.add.text(GAME_WIDTH - 40, 60, 'HIGH SCORE', labelTextStyle)
    highScoreLabelText.setOrigin(1, 0)  // Right-aligned
    highScoreLabelText.setDepth(10)
    highScoreLabelText.visible = false

    // --- Start screen UI (centered container) ---
    createStartScreenUI(this, scoreTextStyle)
    setStartScreenVisible(true)
}

// ---------------------------
// UI helpers (keep modular)
// ---------------------------

function createStartScreenUI(scene, scoreTextStyle) {
    // Container centered
    startUiContainer = scene.add.container(GAME_CENTER_X, GAME_HEIGHT / 2)
    startUiContainer.setDepth(50)

    startTitleImage = scene.add.image(0, -70, assets.ui.title)
    startTitleImage.setOrigin(0.5, 0.5)
    // FlapDash target size: fit within ~250w x 150h
    fitImageToBox(startTitleImage, 400, 200)

    playButtonImage = scene.add.image(0, 40, assets.ui.playButton).setInteractive()
    playButtonImage.setOrigin(0.5, 0.5)
    // Play button size control (tweak as desired)
    fitImageToBox(playButtonImage, 200, 100)
    // Store base scale so focus tween doesn't override the resized value
    playButtonBaseScale = playButtonImage.scaleX

    // Hint text (only visible when play button is focused)
    playHintText = scene.add.text(
        0,
        120,
        'PRESS "OK" TO FLY',
        {
            fontFamily: scoreTextStyle.fontFamily || 'jersey15',
            fontSize: '22px',
            color: SCORE_BLUE_COLOR,
            stroke: SCORE_WHITE_COLOR,
            strokeThickness: 6,
            letterSpacing: 2
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
    musicToggleImage = scene.add.image(GAME_WIDTH - 40, 10, assets.ui.musicOn).setOrigin(1, 0).setInteractive()
    musicToggleImage.setDepth(60)
    musicToggleImage.on('pointerdown', () => {
        setStartScreenFocus('music')
        toggleMusic(scene)
    })
    // Music icon size control (tweak as desired)
    fitImageToBox(musicToggleImage, 50, 50)
    musicButtonBaseScale = musicToggleImage.scaleX
    musicToggleImage.on('pointerover', () => setStartScreenFocus('music'))
    musicToggleImage.on('pointerout', () => {})
}

function setStartScreenVisible(visible) {
    if (startUiContainer) startUiContainer.visible = visible
    if (musicToggleImage) musicToggleImage.visible = visible

    // Keep existing messageInitial hidden (legacy)
    if (messageInitial) messageInitial.visible = false

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
    } else {
        musicPulseTween = stopPulse(musicToggleImage, musicButtonBaseScale, musicPulseTween)
    }
}

function startPulse(target, baseScale, existingTween, options) {
    if (existingTween) existingTween.stop()
    target.setScale(baseScale)
    return createPulseTween(target.scene, target, baseScale, options)
}

function stopPulse(target, baseScale, existingTween) {
    if (existingTween) existingTween.stop()
    target.setScale(baseScale)
    return null
}

function toggleMusic(scene) {
    isMusicOn = !isMusicOn
    if (musicToggleImage) {
        musicToggleImage.setTexture(isMusicOn ? assets.ui.musicOn : assets.ui.musicOff)
    }

    // If you later re-enable bg music, wire it here.
    // For now, we mute/unmute Phaser sound manager (HTML5 audio backend).
    if (scene && scene.sound) {
        scene.sound.mute = !isMusicOn
    }
}

/**
 *  Update the scene frame by frame, responsible for move and rotate the bird and to create and move the pipes.
 */
function update(t, dt) {
    const flapPressed = Phaser.Input.Keyboard.JustDown(selectButton) 
    const leftPressed = Phaser.Input.Keyboard.JustDown(leftButton)
    const rightPressed = Phaser.Input.Keyboard.JustDown(rightButton)
    const upPressed = Phaser.Input.Keyboard.JustDown(upButton)
    const downPressed = Phaser.Input.Keyboard.JustDown(downButton)
    
    const deltaMs = dt || (this.game && this.game.loop ? this.game.loop.delta : 0) || 0

    //background image parallax effect
    if (!gameOver) {
    const parallaxDeltaBg = backgroundScrollSpeed * (deltaMs / 1000)
    if (backgroundDay.visible)
        backgroundDay.tilePositionX += parallaxDeltaBg
    if (backgroundNight.visible)
        backgroundNight.tilePositionX += parallaxDeltaBg
    if (!gameOver)
        groundSprite.tilePositionX += currentGameSpeed * (deltaMs / 1000)
    }
    if (gameOver) {
        if (flapPressed && restartEnabled)
            restartGame()
        return
    }

    if (!gameStarted) {
        // Horizontal navigation: left/right between play and music
        if (leftPressed) setStartScreenFocus('play')
        if (rightPressed) setStartScreenFocus('music')
        // Vertical navigation: play (down) -> music, music (up) -> play
        if (upPressed) {
            if (startScreenFocus === 'play') setStartScreenFocus('music')
        }
        if (downPressed) {
            if (startScreenFocus === 'music') setStartScreenFocus('play')
        }
        if (flapPressed) {
            if (startScreenFocus === 'play') attemptStartFromPlayButton()
            if (startScreenFocus === 'music') toggleMusic(this)
        }
        return
    }

    if (framesMoveUp > 0)
        framesMoveUp--
    else 
    if (flapPressed )
        moveBird()
    else {
        currentVelocity += gravity * (deltaMs / 1000)

        if (currentVelocity > maxVelocity) {
            currentVelocity = maxVelocity
        }
        player.setVelocityY(currentVelocity);

        if (player.angle < 90 && currentVelocity > 0)
        {
            player.angle += 1.75
        }
    }

    pipesGroup.children.iterate(function (child) {
        if (child == undefined)
            return



        if (child.x < -50)
            child.destroy()
        else
            child.setVelocityX(-currentGameSpeed)

    })

    gapsGroup.children.iterate(function (child) {
        child.body.setVelocityX(-currentGameSpeed)
    })
    
    pipeTravelDistanceSinceLast += currentGameSpeed * (deltaMs / 1000)
    if (pipeTravelDistanceSinceLast >= nextPipeSpawnDistance) {
        makePipes(game.scene.scenes[0])
        pipeTravelDistanceSinceLast = 0
        nextPipeSpawnDistance = getHorizontalPipeSetGap()
    }
}

/**
 *  Bird collision event.
 *  @param {object} player - Game object that collided, in this case the bird. 
 */
function hitBird(player) {
    this.physics.pause()
    gameOver = true
    gameStarted = false

    player.anims.play(getAnimationBird(birdName).stop)
    this.cameras.main.shake(gameOverShakeDurationMs, gameOverShakeIntensity)
    ensureAudioIsActive(this)
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
    if (score > highScore) {
        highScore = score
        saveHighScore(highScore)
    }

    // Update and display high score
    updateHighScoreDisplay()
}

/**
 *   Update the scoreboard.
 *   @param {object} _ - Game object that overlapped, in this case the bird (ignored).
 *   @param {object} gap - Game object that was overlapped, in this case the gap.
 */
function updateScore(_, gap) {
    score++
    gap.destroy()
    
    if (score > 0 && score % scoreToChangeLevel === 0)
        advanceLevel()
    ensureAudioIsActive(game.scene.scenes[0])
    if (scoreSound) {
        try {
            scoreSound.play()
        } catch (_) {}
    }

    updateScoreboard()
    updateHighScoreDisplay() // Update high score display when score changes
}

function advanceLevel() {
    toggleThemeAndPipes()
}

function toggleThemeAndPipes() {
    isDayTheme = !isDayTheme

    backgroundDay.visible = isDayTheme
    backgroundNight.visible = !isDayTheme

    // Toggle ground visuals with theme
    if (groundSprite) {
        groundSprite.setTexture(
            isDayTheme ? assets.scene.ground.day : assets.scene.ground.night
        )
    }

    currentPipe = isDayTheme ? assets.obstacle.pipe.green : assets.obstacle.pipe.red

    pipesGroup.children.iterate(function (child) {
        if (!child)
            return
        if (child.texture && (child.texture.key === assets.obstacle.pipe.green.top || child.texture.key === assets.obstacle.pipe.red.top))
            child.setTexture(currentPipe.top)
        else if (child.texture && (child.texture.key === assets.obstacle.pipe.green.bottom || child.texture.key === assets.obstacle.pipe.red.bottom))
            child.setTexture(currentPipe.bottom)
    })
}

function getVerticalPipeGap() {
    if (useRandomPipeGaps)
        return getRandomBetween(verticalPipeGapMin, verticalPipeGapMax)
    return fixedVerticalPipeGap
}

function getHorizontalPipeSetGap() {
    if (useRandomPipeGaps)
        return getRandomBetween(horizontalPipeSetGapMin, horizontalPipeSetGapMax)
    return fixedHorizontalPipeSetGap
}

/**
 * Create pipes and gap in the game.
 * @param {object} scene - Game scene.
 */
function makePipes(scene) {
    if (!gameStarted || gameOver) return

    const pipeTopY = Phaser.Math.Between(-120, 120)
    const verticalGap = getVerticalPipeGap()

    const gapCenterY = pipeTopY + (verticalGap / 2)
    const gapLineHeight = verticalGap
    const gap = scene.add.line(GAME_WIDTH, gapCenterY, 0, -gapLineHeight / 2, 0, gapLineHeight / 2)
    gapsGroup.add(gap)
    gap.body.allowGravity = false
    gap.body.setSize(1, gapLineHeight, true)
    gap.visible = false

    const pipeTop = pipesGroup.create(GAME_WIDTH, pipeTopY, currentPipe.top)
    pipeTop.body.setSize(pipeTop.width-10, pipeTop.height-5)

    pipeTop.body.allowGravity = false

    const pipeBottom = pipesGroup.create(GAME_WIDTH, pipeTopY + verticalGap, currentPipe.bottom)
    pipeBottom.body.setSize(pipeBottom.width-10, pipeBottom.height-5 )
    pipeBottom.body.allowGravity = false
}

/**
 * Move the bird in the screen.
 */
function moveBird() {
    if (gameOver)
        return

    if (!gameStarted)
        startGame(game.scene.scenes[0])
    
    currentVelocity = upwardVelocity
    player.setVelocityY(currentVelocity)
    player.angle = -20
    framesMoveUp = 5
}

/**
 * Get a random bird color.
 * @return {string} Bird color asset.
 */
function getRandomBird() {
    switch (Phaser.Math.Between(0, 2)) {
        case 0:
            return assets.bird.red
        case 1:
            return assets.bird.blue
        case 2:
        default:
            return assets.bird.yellow
    }
}

/**
 * Get the animation name from the bird.
 * @param {string} birdColor - Game bird color asset.
 * @return {object} - Bird animation asset.
 */
function getAnimationBird(birdColor) {
    switch (birdColor) {
        case assets.bird.red:
            return assets.animation.bird.red
        case assets.bird.blue:
            return assets.animation.bird.blue
        case assets.bird.yellow:
        default:
            return assets.animation.bird.yellow
    }
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
        scoreLabelText.setStroke(ORANGE_COLOR)
        scoreText.setColor(ORANGE_COLOR)
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
    restartEnabled = false
    pipesGroup.clear(true, true)
    pipesGroup.clear(true, true)
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
        scoreLabelText.setStroke(SCORE_BLUE_COLOR)
        scoreText.setColor(SCORE_BLUE_COLOR)

    const gameScene = game.scene.scenes[0]
    setRestartPulse(gameScene, false)
    prepareGame(gameScene)

    gameScene.physics.resume()
}

/**
 * Restart all variable and configurations, show main and recreate the bird.
 * @param {object} scene - Game scene.
 */
function prepareGame(scene) {
    framesMoveUp = 0
    pipeTravelDistanceSinceLast = 0
    nextPipeSpawnDistance = getHorizontalPipeSetGap()
    isDayTheme = true
    currentPipe = assets.obstacle.pipe.green
    score = 0
    // Load high score from localStorage on game start
    if (highScore === undefined) {
        highScore = getHighScore()
    }
    runHighScoreBaseline = highScore
    currentVelocity = minVelocity
    gameOver = false
    restartEnabled = false
    backgroundDay.visible = isDayTheme
    backgroundNight.visible = !isDayTheme
    // Ensure ground starts in day theme as well
    if (groundSprite) {
        groundSprite.setTexture(assets.scene.ground.day)
    }
    // Start screen UI
    setStartScreenVisible(true)

    birdName = getRandomBird()
    player = scene.physics.add.sprite(100, 250, birdName)
    player.body.setSize(25,20)
    player.setCollideWorldBounds(true)
    player.anims.play(getAnimationBird(birdName).clapWings, true)
    player.body.allowGravity = false

    scoreSound = scene.sound.add('score', { volume: 0.1 })
    gameOverSound = scene.sound.add('gameover', { volume: 0.1 })

    scene.physics.add.collider(player, groundCollider, hitBird, null, scene)
    scene.physics.add.collider(player, pipesGroup, hitBird, null, scene)

    scene.physics.add.overlap(player, gapsGroup, updateScore, null, scene)

    // Hide scoreboards on start screen (they'll be shown when game starts)
    if (scoreText) scoreText.visible = false
    if (scoreLabelText) scoreLabelText.visible = false
    if (highScoreText) highScoreText.visible = false
    if (highScoreLabelText) highScoreLabelText.visible = false
}

/**
 * Start the game, create pipes and hide the main menu.
 * @param {object} scene - Game scene.
 */
function startGame(scene) {
    gameStarted = true
    setStartScreenVisible(false)
    moveBird() //give bird an initial jump

    player.body.allowGravity = true

    // Display initial score (0) on top left and high score on top right
    updateScoreboard()
    updateHighScoreDisplay()

    makePipes(scene)
}

