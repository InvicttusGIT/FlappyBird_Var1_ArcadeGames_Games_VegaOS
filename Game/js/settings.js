/**
 *
 * Game tuning values.
 */

// Colors
const SCORE_BLUE_COLOR = '#037BDC'
const SCORE_WHITE_COLOR = '#FFFFFF'
const RED_COLOR = '#D50035'


const maxVelocity = 500
const minVelocity = 50

const backgroundScrollSpeed = 20

const verticalObstacleGapMin = 430
const verticalObstacleGapMax = 500
const fixedVerticalObstacleGap = 400

// Visual safety margins so obstacles never disappear completely due to screen/top clipping
// or overlapping the ground overlay.
const obstacleMinVisiblePx = 10

const horizontalObstacleSetGapMin = 160
const horizontalObstacleSetGapMax = 300
const fixedHorizontalObstacleSetGap = 220


const scoreToChangeLevel = 20

const minGameSpeed = 170
const maxGameSpeed = 150
const gameSpeedIncrement = 20

// Paper-flight tuning: hold OK to glide up, release to glide down.
const paperFlightUpAcceleration = 1400
const paperFlightDownAcceleration = 700
const paperFlightMaxUpSpeed = 220
const paperFlightMaxDownSpeed = 170
const paperFlightTiltUp = -12
const paperFlightTiltDown = 50
const paperFlightTiltLerp = 0.03

const gameOverShakeDurationMs = 1000
const gameOverShakeIntensity = 0.005
