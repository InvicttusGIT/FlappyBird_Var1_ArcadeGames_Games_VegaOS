/**
 * 
 * Game configurations.
 * @name configurations
 */
const GAME_HEIGHT = 512
const GAME_WIDTH = Math.max(
    288,
    Math.round(GAME_HEIGHT * (window.innerWidth / window.innerHeight))
)
const GAME_CENTER_X = GAME_WIDTH / 2

const configurations = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: true, // Enable debug mode here
            debugShowBody: true, // Specific option to show collision boxes
            debugShowVelocity: true // Shows direction of movement
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
}

/**
 *  Game assets.
 *  @name assets
 */
const assets = {
    bird: {
        red: 'bird-red',
        yellow: 'bird-yellow',
        blue: 'bird-blue'
    },
    obstacle: {
        pipe: {
            green: {
                top: 'pipe-green-top',
                bottom: 'pipe-green-bottom'
            },
            red: {
                top: 'pipe-red-top',
                bottom: 'pipe-red-bo'
            }
        }
    },
    scene: {
        width: GAME_CENTER_X,
        background: {
            day: 'background-day',
            night: 'background-night'
        },
        ground: 'ground',
        gameOver: 'game-over',
        restart: 'restart-button',
        messageInitial: 'message-initial'
    },
    scoreboard: {
        width: 25,
        base: 'number',
        number0: 'number0',
        number1: 'number1',
        number2: 'number2',
        number3: 'number3',
        number4: 'number4',
        number5: 'number5',
        number6: 'number6',
        number7: 'number7',
        number8: 'number8',
        number9: 'number9'
    },
    animation: {
        bird: {
            red: {
                clapWings: 'red-clap-wings',
                stop: 'red-stop'
            },
            blue: {
                clapWings: 'blue-clap-wings',
                stop: 'blue-stop'
            },
            yellow: {
                clapWings: 'yellow-clap-wings',
                stop: 'yellow-stop'
            }
        },
        ground: {
            moving: 'moving-ground',
            stop: 'stop-ground'
        }
    }
}

// Game
/**
 * The main controller for the entire Phaser game.
 * @name game
 * @type {object}
 */
const game = new Phaser.Game(configurations)
/**
 * If it had happened a game over.
 * @type {boolean}
 */
let gameOver
/**
 * If the game has been started.
 * @type {boolean}
 */
let gameStarted
/**
 * Up button component.
 * @type {object}
 */
let selectButton
/**
 * Restart button component.
 * @type {object}
 */
let restartButton
/**
 * Game over banner component.
 * @type {object}
 */
let gameOverBanner
/**
 * Message initial component.
 * @type {object}
 */
let messageInitial
// Bird
/**
 * Player component.
 * @type {object}
 */
let player
/**
 * Bird name asset.
 * @type {string}
 */
let birdName
/**
 * Quantity frames to move up.
 * @type {number}
 */
let framesMoveUp
// Background
/**
 * Day background component.
 * @type {object}
 */
let backgroundDay
/**
 * Night background component.
 * @type {object}
 */
let backgroundNight
/**
 * Ground component.
 * @type {object}
 */
let groundCollider
let groundSprite
// pipes
/**
 * Pipes group component.
 * @type {object}
 */
let pipesGroup
/**
 * Gaps group component.
 * @type {object}
 */
let gapsGroup
/**
 * Counter till next pipes to be created.
 * @type {number}
 */
let nextPipes
/**
 * Current pipe asset.
 * @type {object}
 */
let currentPipe
// score variables
/**
 * Scoreboard group component.
 * @type {object}
 */
let scoreboardGroup
/**
 * Score counter.
 * @type {number}
 */
let score


const maxVelocity = 500
const minVelocity = 50
/**
 * Current velocity of the bird.
 * @type {number}
 */
let currentVelocity = minVelocity
/**
 * Background parallax speed (pixels per second).
 * @type {number}
 */
const backgroundScrollSpeed = 20
/**
 * Ground parallax speed (pixels per second).
 * @type {number}
 */
const groundScrollSpeed = 100
/**
 * Debug text for dt / fps.
 * @type {object}
 */
let debugText
/**
 * Back button handler flag.
 * @type {boolean}
 */
let backHandlerAttached = false
/**
 * Loader visuals.
 * @type {object}
 */
let loadingText
let loadingBarBg
let loadingBarFill


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
    this.load.image(assets.scene.ground, 'assets/ground-sprite.png')

    // Pipes
    this.load.image(assets.obstacle.pipe.green.top, 'assets/pipe-green-top.png')
    this.load.image(assets.obstacle.pipe.green.bottom, 'assets/pipe-green-bottom.png')
    this.load.image(assets.obstacle.pipe.red.top, 'assets/pipe-red-top.png')
    this.load.image(assets.obstacle.pipe.red.bottom, 'assets/pipe-red-bottom.png')

    // Start game
    this.load.image(assets.scene.messageInitial, 'assets/message-initial.png')

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

    // Numbers
    this.load.image(assets.scoreboard.number0, 'assets/number0.png')
    this.load.image(assets.scoreboard.number1, 'assets/number1.png')
    this.load.image(assets.scoreboard.number2, 'assets/number2.png')
    this.load.image(assets.scoreboard.number3, 'assets/number3.png')
    this.load.image(assets.scoreboard.number4, 'assets/number4.png')
    this.load.image(assets.scoreboard.number5, 'assets/number5.png')
    this.load.image(assets.scoreboard.number6, 'assets/number6.png')
    this.load.image(assets.scoreboard.number7, 'assets/number7.png')
    this.load.image(assets.scoreboard.number8, 'assets/number8.png')
    this.load.image(assets.scoreboard.number9, 'assets/number9.png')
}

/**
 *   Create the game objects (images, groups, sprites and animations).
 */
function create() {
    backgroundDay = this.add.tileSprite(assets.scene.width, 256, GAME_WIDTH, GAME_HEIGHT, assets.scene.background.day).setInteractive()
    backgroundDay.on('pointerdown', moveBird)
    backgroundNight = this.add.tileSprite(assets.scene.width, 256, GAME_WIDTH, GAME_HEIGHT, assets.scene.background.night).setInteractive()
    backgroundNight.visible = false
    backgroundNight.on('pointerdown', moveBird)

    gapsGroup = this.physics.add.group()
    pipesGroup = this.physics.add.group()
    scoreboardGroup = this.physics.add.staticGroup()

    const groundY = 458
    groundSprite = this.add.tileSprite(GAME_WIDTH / 2, groundY, GAME_WIDTH, 112, assets.scene.ground)
    groundSprite.setDepth(10)

    groundCollider = this.physics.add.staticSprite(GAME_WIDTH / 2, groundY, assets.scene.ground)
    groundCollider.setVisible(false)
    groundCollider.setSize(GAME_WIDTH, 112, true)

    messageInitial = this.add.image(assets.scene.width, 156, assets.scene.messageInitial)
    messageInitial.setDepth(30)
    messageInitial.visible = false

    selectButton = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)

    debugText = this.add.text(4, 4, 'dt: 0 ms', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#00ff00'
    })
    debugText.setDepth(50)

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
    gameOverBanner.setDepth(20)
    gameOverBanner.visible = false

    restartButton = this.add.image(assets.scene.width, 300, assets.scene.restart).setInteractive()
    restartButton.on('pointerdown', restartGame)
    restartButton.setDepth(20)
    restartButton.visible = false
}

/**
 *  Update the scene frame by frame, responsible for move and rotate the bird and to create and move the pipes.
 */
function update(t, dt) {
    const flapPressed = Phaser.Input.Keyboard.JustDown(selectButton) 
    
    const deltaMs = dt || (this.game && this.game.loop ? this.game.loop.delta : 0) || 0

    if (debugText) {
        const fps = deltaMs > 0 ? (1000 / deltaMs).toFixed(1) : '0'
        debugText.setText(`dt: ${deltaMs.toFixed(1)} ms (${fps} fps)`)
    }
    //background image parallax effect
    if (!gameOver) {
    const parallaxDeltaBg = backgroundScrollSpeed * (deltaMs / 1000)
    if (backgroundDay.visible)
        backgroundDay.tilePositionX += parallaxDeltaBg
    if (backgroundNight.visible)
        backgroundNight.tilePositionX += parallaxDeltaBg
    if (!gameOver)
        groundSprite.tilePositionX += groundScrollSpeed * (deltaMs / 1000)
    }
    if (gameOver) {
        if (flapPressed)
            restartGame()
        return
    }

    if (!gameStarted) {
        if (flapPressed)
            moveBird()
        return
    }

    if (framesMoveUp > 0)
        framesMoveUp--
    else 
    if (flapPressed )
        moveBird()
    else {
        currentVelocity += 1500 * (deltaMs / 1000)

        if (currentVelocity > maxVelocity) {
            currentVelocity = maxVelocity
        }
        player.setVelocityY(currentVelocity);

        if (player.angle < 90 && currentVelocity > 0)
        {
            player.angle += 1.25
        }
    }

    pipesGroup.children.iterate(function (child) {
        if (child == undefined)
            return



        if (child.x < -50)
            child.destroy()
        else
            child.setVelocityX(-100)

    })

    gapsGroup.children.iterate(function (child) {
        child.body.setVelocityX(-100)
    })

    nextPipes++
    if (nextPipes === 130) {
        makePipes(game.scene.scenes[0])
        nextPipes = 0
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

    gameOverBanner.visible = true
    restartButton.visible = true
}

/**
 *   Update the scoreboard.
 *   @param {object} _ - Game object that overlapped, in this case the bird (ignored).
 *   @param {object} gap - Game object that was overlapped, in this case the gap.
 */
function updateScore(_, gap) {
    score++
    gap.destroy()

    if (score % 10 == 0) {
        backgroundDay.visible = !backgroundDay.visible
        backgroundNight.visible = !backgroundNight.visible

        if (currentPipe === assets.obstacle.pipe.green)
            currentPipe = assets.obstacle.pipe.red
        else
            currentPipe = assets.obstacle.pipe.green

        pipesGroup.children.iterate(function (child) {
            if (!child)
                return
            if (child.texture && child.texture.key === assets.obstacle.pipe.green.top || child.texture.key === assets.obstacle.pipe.red.top)
                child.setTexture(currentPipe.top)
            else if (child.texture && child.texture.key === assets.obstacle.pipe.green.bottom || child.texture.key === assets.obstacle.pipe.red.bottom)
                child.setTexture(currentPipe.bottom)
        })
    }

    updateScoreboard()
}

/**
 * Create pipes and gap in the game.
 * @param {object} scene - Game scene.
 */
function makePipes(scene) {
    if (!gameStarted || gameOver) return

    const pipeTopY = Phaser.Math.Between(-120, 120)

    const gap = scene.add.line(GAME_WIDTH, pipeTopY + 210, 0, 0, 0, 98)
    gapsGroup.add(gap)
    gap.body.allowGravity = false
    gap.visible = false

    const pipeTop = pipesGroup.create(GAME_WIDTH, pipeTopY, currentPipe.top)
    pipeTop.body.setSize(pipeTop.width-10, pipeTop.height-5)

    pipeTop.body.allowGravity = false

    const pipeBottom = pipesGroup.create(GAME_WIDTH, pipeTopY + 420, currentPipe.bottom)
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

    
    currentVelocity = -200
    //currentVelocity = minVelocity
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
 * Update the game scoreboard.
 */
function updateScoreboard() {
    scoreboardGroup.clear(true, true)

    const scoreAsString = score.toString()
    if (scoreAsString.length == 1)
        scoreboardGroup.create(assets.scene.width, 30, assets.scoreboard.base + score).setDepth(10)
    else {
        let initialPosition = assets.scene.width - ((score.toString().length * assets.scoreboard.width) / 2)

        for (let i = 0; i < scoreAsString.length; i++) {
            scoreboardGroup.create(initialPosition, 30, assets.scoreboard.base + scoreAsString[i]).setDepth(10)
            initialPosition += assets.scoreboard.width
        }
    }
}

/**
 * Restart the game. 
 * Clean all groups, hide game over objects and stop game physics.
 */
function restartGame() {
    pipesGroup.clear(true, true)
    pipesGroup.clear(true, true)
    gapsGroup.clear(true, true)
    scoreboardGroup.clear(true, true)
    player.destroy()
    gameOverBanner.visible = false
    restartButton.visible = false

    const gameScene = game.scene.scenes[0]
    prepareGame(gameScene)

    gameScene.physics.resume()
}

/**
 * Restart all variable and configurations, show main and recreate the bird.
 * @param {object} scene - Game scene.
 */
function prepareGame(scene) {
    framesMoveUp = 0
    nextPipes = 0
    currentPipe = assets.obstacle.pipe.green
    score = 0
    currentVelocity = minVelocity
    gameOver = false
    backgroundDay.visible = true
    backgroundNight.visible = false
    messageInitial.visible = true

    birdName = getRandomBird()
    player = scene.physics.add.sprite(100, 250, birdName)
    player.body.setSize(25,20)
    player.setCollideWorldBounds(true)
    player.anims.play(getAnimationBird(birdName).clapWings, true)
    player.body.allowGravity = false

    scene.physics.add.collider(player, groundCollider, hitBird, null, scene)
    scene.physics.add.collider(player, pipesGroup, hitBird, null, scene)

    scene.physics.add.overlap(player, gapsGroup, updateScore, null, scene)

}

/**
 * Start the game, create pipes and hide the main menu.
 * @param {object} scene - Game scene.
 */
function startGame(scene) {
    gameStarted = true
    messageInitial.visible = false

    player.body.allowGravity = true

    const score0 = scoreboardGroup.create(assets.scene.width, 30, assets.scoreboard.number0)
    score0.setDepth(20)

    makePipes(scene)
}