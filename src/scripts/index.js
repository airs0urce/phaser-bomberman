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
    zoom: 2.6,
    backgroundColor: "#000",
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {y: 0},
            debug: false
        }
    },
    scene: [WelcomeScene, Map1Scene]
};

const game = new Phaser.Game(config);


