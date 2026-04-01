/**
 *
 * Game tuning values.
 */

// Colors
const SCORE_BLUE_COLOR = '#037BDC'
const SCORE_WHITE_COLOR = '#FFFFFF'
const ORANGE_COLOR = '#FF5700'


const maxVelocity = 500
const minVelocity = 50

const backgroundScrollSpeed = 20

const verticalObstacleGapMin = 450
const verticalObstacleGapMax = 600
const fixedVerticalObstacleGap = 400

// Visual safety margins so obstacles never disappear completely due to screen/top clipping
// or overlapping the ground overlay.
const obstacleMinVisiblePx = 10

const horizontalObstacleSetGapMin = 160
const horizontalObstacleSetGapMax = 300
const fixedHorizontalObstacleSetGap = 220


const scoreToChangeLevel = 5

const minGameSpeed = 120
const maxGameSpeed = 150
const gameSpeedIncrement = 20

const upwardVelocity = -250
const gravity = 1500   // pixels per second^2

const gameOverShakeDurationMs = 1000
const gameOverShakeIntensity = 0.005
