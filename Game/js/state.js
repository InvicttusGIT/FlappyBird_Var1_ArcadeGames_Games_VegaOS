/**
 *
 * Game state variables.
 */
let gameOver
let gameStarted
let selectButton
let restartButton
let gameOverBanner
let messageInitial

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