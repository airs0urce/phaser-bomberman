const Phaser = require("phaser");
const WelcomeScene = require("./scenes/WelcomeScene");
const LevelSelectScene = require("./scenes/LevelSelectScene");
const Map1Scene = require("./scenes/Map1Scene");
const OnlineMapSelectScene = require("./scenes/OnlineMapSelectScene");
const OnlineLobbyScene = require("./scenes/OnlineLobbyScene");
const OnlineGameScene = require("./scenes/OnlineGameScene");
const modifyPhaser = require("./modifyPhaser");
const TouchControls = require("./TouchControls");

modifyPhaser(Phaser);

function calculateZoom() {
    if (!TouchControls.isTouchDevice()) return 2.6;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    // Game takes at most 50% of width (leave room for controls on sides)
    const zoomByH = vh / 208;
    const zoomByW = (vw * 0.50) / 240;
    return Math.min(zoomByH, zoomByW);
}

var config = {
    type: Phaser.AUTO,
    width: 240,
    height: 208,
    pixelArt: true,
    roundPixels: true,
    zoom: calculateZoom(),
    parent: 'game-container',
    backgroundColor: "#000",
    input: {
        gamepad: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {y: 0},
            // debug: true
        }
    },
    scene: [WelcomeScene, LevelSelectScene, Map1Scene, OnlineMapSelectScene, OnlineLobbyScene, OnlineGameScene],
};

const game = new Phaser.Game(config);

const touchControls = new TouchControls();
touchControls.init();
game.registry.set('touchControls', touchControls);

window.addEventListener('resize', () => {
    if (TouchControls.isTouchDevice()) {
        game.scale.setZoom(calculateZoom());
    }
});

// game.sound.volume = 0;
game.sound.volume = 1;
