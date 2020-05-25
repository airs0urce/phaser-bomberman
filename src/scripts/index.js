import * as Phaser from "phaser";
import {WelcomeScene} from "./scenes/WelcomeScene";
import {Map1Scene} from "./scenes/Map1Scene";
import modifyPhaser from "./modifyPhaser";

modifyPhaser(Phaser);

var config = {
    type: Phaser.AUTO,
    width: 240,
    height: 208,
    pixelArt: true,
    zoom: 3.2,
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
    scene: [WelcomeScene, Map1Scene],
};

const game = new Phaser.Game(config);

game.sound.volume = 0;
// game.sound.volume = 1;






