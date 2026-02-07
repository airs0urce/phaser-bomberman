const Phaser = require("phaser");
const WelcomeScene = require("./scenes/WelcomeScene");
const LevelSelectScene = require("./scenes/LevelSelectScene");
const Map1Scene = require("./scenes/Map1Scene");
const modifyPhaser = require("./modifyPhaser");

modifyPhaser(Phaser);

var config = {
    type: Phaser.AUTO,
    width: 240,
    height: 208,
    pixelArt: true,
    roundPixels: true,
    zoom: 2.6,
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
    scene: [WelcomeScene, LevelSelectScene, Map1Scene],
};

const game = new Phaser.Game(config);

// game.sound.volume = 0;
game.sound.volume = 1;
