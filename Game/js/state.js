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
let backButton
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
let restartEnableTimer
let restartEnabled = false

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

// Premium user flag
let isPremiumUser = false

// Crash counter (used to trigger in-game ad video)
let crashCount = 0

// True while the in-game ad video overlay is playing
let adPlaying = false

// Cached ad media URL (pre-fetched after 2 crashes, used on 3rd crash)
let cachedAdMediaUrl = null

// Device ID from native app (requested once on app launch, constant for device)
let deviceId = null

// Analytics milestone trackers (reset each run)
let scoreMilestonesTracked = {}
let bestMilestonesTracked = {}

// Screen view tracking flags
let hasViewedGameplay = false

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
let backgroundMusic
let flappsBackground

// Exit popup
let exitPopup
let requestExitPopupCallback
let exitPopupPausedGame = false

// Remove-ads popup (separate from exit popup, same dimensions)
let removeAdsPopup