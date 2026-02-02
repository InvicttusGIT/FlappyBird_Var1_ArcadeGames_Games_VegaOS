/**
 *
 * Game state variables.
 */
let gameOver
let gameStarted
let selectButton
let leftButton
let rightButton
let upButton
let downButton
let restartButton
let gameOverBanner
let messageInitial

// Start screen UI
let startUiContainer
let startTitleImage
let playButtonImage
let playHintText
let playButtonFocused = false
let playPulseTween
let playButtonBaseScale = 1
let startScreenFocus = 'play'

// Music toggle pulse
let musicPulseTween
let musicButtonBaseScale = 1

// Music toggle UI
let musicToggleImage
let isMusicOn = true

// Restart pulse (reused animation)
let restartPulseTween
let restartButtonBaseScale = 1

let player
let birdName
let framesMoveUp

let backgroundDay
let backgroundNight

let groundCollider
let groundSprite

let pipesGroup
let gapsGroup
let pipeTravelDistanceSinceLast
let nextPipeSpawnDistance
let currentPipe

let scoreText
let scoreLabelText
let score
let highScore
let runHighScoreBaseline = 0
let highScoreText
let highScoreLabelText

let currentVelocity = minVelocity
let isDayTheme = true

let debugText
let backHandlerAttached = false

let loadingText
let loadingBarBg
let loadingBarFill

let currentGameSpeed = minGameSpeed

let flapSound
let gameOverSound
let scoreSound