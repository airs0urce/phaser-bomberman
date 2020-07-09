const Phaser = require("phaser");
const WelcomeScene = require("./scenes/WelcomeScene");
const Map1Scene = require("./scenes/Map1Scene");
const UIScene = require("./scenes/UIScene");
const modifyPhaser = require("./modifyPhaser");

modifyPhaser(Phaser);

var config = {
    type: Phaser.AUTO,
    width: 330,
    height: 208,
    pixelArt: true,
    roundPixels: true,
    zoom: 2.6,
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
    scene: [WelcomeScene, Map1Scene, UIScene],
};

const game = new Phaser.Game(config);

game.sound.volume = 0;
// game.sound.volume = 1;






// 