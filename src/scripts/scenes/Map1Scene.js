import Level from "../models/Level";
import Player from "../models/Player";
import Bomb from "../models/Bomb";
import _ from "underscore";
import config from '../config';

const intersects = Phaser.Geom.Intersects.RectangleToRectangle;
const tileSize = 16;

export class Map1Scene extends Phaser.Scene {

    inputs = {};
    sounds = {};

    constructor() {
        super('Map1');
        
        this.keyALastState = false;
    }

    preload() {
        Player.preload(this);
        Level.preload(this);
        Bomb.preload(this);
    }

    create() {

        this.sound.pauseOnBlur = false;

        this.inputs = {
            cursors: this.input.keyboard.createCursorKeys(),
            keyA: this.input.keyboard.addKey('A'),
            gamepad: this.input.gamepad
        }

        // this.sound.add('titleTrack').play({loop: true});
        this.sounds = {
            'bombExplode': this.sound.add('bomb-explode')
        }

        
        this.level = new Level(this, 'map1');
        this.player = this.level.addPlayer();

        // const debugGraphics = this.add.graphics().setAlpha(0.75);
        //   this.level.groundLayer.renderDebug(debugGraphics, {tileColor: null,collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tilesfaceColor: new Phaser.Display.Color(40, 39, 37, 255) // Color of colliding face edges
        // });
        // PhaserGUIAction(this);
    }

    update(time, delta) {
        this.player.update();
    }

    
}










