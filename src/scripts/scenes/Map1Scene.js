const Level = require("../models/Level");
const Player = require("../models/Player");
const Bomb = require("../models/Bomb");
const _ = require("underscore");
const config = require('../config');

const intersects = Phaser.Geom.Intersects.RectangleToRectangle;
const tileSize = 16;

module.exports = class Map1Scene extends Phaser.Scene {

    constructor() {
        super('Map1');
        this.inputs = {};
        this.sounds = {};        
        this.keyALastState = false;
    }

    preload() {
        // Level
        this.load.audio('titleTrack', [__dirname + 'src/assets/audio/all/3 - Track 3.mp3']);
        this.load.atlas('atlas', __dirname + 'src/assets/images/atlas.png', __dirname + 'src/assets/images/atlas.json');
        this.load.tilemapTiledJSON("map3", __dirname + "src/maps/map3.json");
        

        // Bomb
        this.load.audio('bomb-explode', [__dirname + 'src/assets/audio/bomb-explode.mp3']);
        this.load.audio('bomb-place', [__dirname + 'src/assets/audio/bomb-place.mp3']);

        // PLayer
        this.load.audio('player-die', [__dirname + 'src/assets/audio/player-die.mp3']);
        this.load.audio('player-took-bonus', [__dirname + 'src/assets/audio/player-took-bonus.mp3']);
        
        
    }

    create() {

        this.sound.pauseOnBlur = false;

        this.inputs = {
            cursors: this.input.keyboard.createCursorKeys(),
            keyA: this.input.keyboard.addKey('A'),
            gamepad: this.input.gamepad
        }

        this.sounds = {
            titleTrack: this.sound.add('titleTrack'),
            bombExplode: this.sound.add('bomb-explode'),
            bombPlace: this.sound.add('bomb-place').setVolume(1.4),
            playerDie: this.sound.add('player-die'),
            playerTookBonus: this.sound.add('player-took-bonus'),
        }

        this.sounds.titleTrack.play({loop: true});

        
        this.level = new Level(this, 'map3');
        this.players = this.add.group();



        // this.players.add(this.level.addPlayer(1, 2, 'red').setGamepadIndex(0));
        this.players.add(this.level.addPlayer(1, 1, 'blue').setGamepadIndex(1));

        // const debugGraphics = this.add.graphics().setAlpha(0.75);
        //   this.level.groundLayer.renderDebug(debugGraphics, {tileColor: null,collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tilesfaceColor: new Phaser.Display.Color(40, 39, 37, 255) // Color of colliding face edges
        // });
        // PhaserGUIAction(this);
    }

    update(time, delta) {
        this.players.getChildren().forEach((player) => {
            player.update();
        })
    }

    
}










