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
        this.load.audio('titleTrack', [__dirname + 'src/assets/audio/track_8.mp3']);
        this.load.atlas('atlas', __dirname + 'src/assets/images/atlas.png', __dirname + 'src/assets/images/atlas.json');
        this.load.tilemapTiledJSON("map1", __dirname + "src/maps/map1.json");
        

        // Bomb
        this.load.audio('bomb-explode', [__dirname + 'src/assets/audio/bomb-explode.mp3']);
        this.load.audio('bomb-place', [__dirname + 'src/assets/audio/bomb-place.mp3']);

        // PLayer
        this.load.audio('player-die', [__dirname + 'src/assets/audio/player-die.mp3']);
        this.load.audio('player-took-bonus', [__dirname + 'src/assets/audio/player-took-bonus.mp3']);

        this.load.audio('vs-game-finish', [__dirname + 'src/assets/audio/vs-game-finish.mp3']);
       
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
            vsGameFinish: this.sound.add('vs-game-finish'),
        }

        this.startTitleMusic();

        
        this.level = new Level(this, 'map1');
        this.players = this.add.group();

        const player1 = this.level.addPlayer(1, 1, 'blue', 'Anh Dima').setGamepadIndex(1);
        const player2 = this.level.addPlayer(18, 11, 'red', 'Em Tho').setGamepadIndex(0);

        this.players.add(player1);
        this.players.add(player2);


// this.cameras.main.startFollow(player1, true);


// var cameraNew = this.cameras.add(0, 0, 330, 208);
// cameraNew.setZoom(3.6);
// cameraNew.roundPixels = true;
        

        // const debugGraphics = this.add.graphics().setAlpha(0.75);
        //   this.level.groundLayer.renderDebug(debugGraphics, {tileColor: null,collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tilesfaceColor: new Phaser.Display.Color(40, 39, 37, 255) // Color of colliding face edges
        // });
        // PhaserGUIAction(this);

        this.scene.launch('UIScene');

        this.graphics = this.add.graphics({ fillStyle: { color: 0x2266aa } });
        this.graphics.clear();
        this.graphics.fillPointShape({x: 20, y: 20}, 10);





        
    }

    update(time, delta) {
        this.players.getChildren().forEach((player) => {
            player.update();
        });
    }

    restart() {
        this.sound.stopAll()
        this.scene.restart();
    }

    stopTitleMusic() {
        this.sounds.titleTrack.stop();
        
    }

    startTitleMusic() {
        this.sounds.titleTrack.play({loop: true});
    }

    
}










