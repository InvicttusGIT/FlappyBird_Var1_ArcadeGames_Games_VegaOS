/**
 *
 * Game configuration and assets.
 */
const GAME_HEIGHT = 512
const GAME_WIDTH = Math.max(
    288,
    Math.round(GAME_HEIGHT * (window.innerWidth / window.innerHeight))
)
const GAME_CENTER_X = GAME_WIDTH / 2

function createConfigurations(preload, create, update) {
    return {
        type: Phaser.AUTO,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        parent: 'game-container',
        // Vega WebView: HTML <audio> works reliably, WebAudio often doesn't.
        // Force Phaser to use HTML5 Audio instead of Web Audio.
        audio: {
            disableWebAudio: true
        },
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        physics: {
            default: 'arcade',
        },
        scene: {
            preload,
            create,
            update
        }
    }
}

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
        ground: {
            day: 'ground-day',
            night: 'ground-night'
        },
        gameOver: 'game-over',
        restart: 'restart-button',
    },
    ui: {
        title: 'ui-title',
        playButton: 'ui-play-button',
        musicOn: 'ui-music-on',
        musicOff: 'ui-music-off',
        exitPopupBg: 'ui-exit-popup-bg',
        exitBirds: 'ui-exit-birds',
        exitHeadingImage: 'ui-exit-heading-image',
        exitLeaveButton: 'ui-exit-leave-button',
        exitStayButton: 'ui-exit-stay-button',
        exitLeaveButtonFocused: 'ui-exit-leave-button-focused',
        exitStayButtonFocused: 'ui-exit-stay-button-focused',
        exitLeaveButtonUnfocused: 'ui-exit-leave-button-unfocused',
        exitStayButtonUnfocused: 'ui-exit-stay-button-unfocused',

        // Remove-ads popup UI
        removeAdsHeadingImage: 'ui-remove-ads-heading-image',
        removeAdsPriceImage: 'ui-remove-ads-price-image',
        removeAdsNotNowButton: 'ui-remove-ads-not-now-button',
        removeAdsGoAdFreeButton: 'ui-remove-ads-go-ad-free-button',
        removeAdsNotNowButtonFocused: 'ui-remove-ads-not-now-button-focused',
        removeAdsGoAdFreeButtonFocused: 'ui-remove-ads-go-ad-free-button-focused',
        removeAdsNotNowButtonUnfocused: 'ui-remove-ads-not-now-button-unfocused',
        removeAdsGoAdFreeButtonUnfocused: 'ui-remove-ads-go-ad-free-button-unfocused'
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
