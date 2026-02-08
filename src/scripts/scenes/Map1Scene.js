const Level = require("../models/Level");
const Player = require("../models/Player");
const Bomb = require("../models/Bomb");
const config = require('../config');
const levels = require('../levels');
const HtmlOverlay = require('../HtmlOverlay');

const intersects = Phaser.Geom.Intersects.RectangleToRectangle;
const tileSize = 16;

module.exports = class Map1Scene extends Phaser.Scene {

    constructor() {
        super('Map1');
        this.inputs = {};
        this.sounds = {};
        this.levelIndex = 0;
    }

    init(data) {
        this.levelIndex = (data && data.levelIndex !== undefined) ? data.levelIndex : 0;
    }

    preload() {
        // Audio
        this.load.audio('titleTrack', [__dirname + 'src/assets/audio/track_8.mp3']);
        this.load.audio('bomb-explode', [__dirname + 'src/assets/audio/bomb-explode.mp3']);
        this.load.audio('bomb-place', [__dirname + 'src/assets/audio/bomb-place.mp3']);
        this.load.audio('player-die', [__dirname + 'src/assets/audio/player-die.mp3']);
        this.load.audio('player-took-bonus', [__dirname + 'src/assets/audio/player-took-bonus.mp3']);
        this.load.audio('vs-game-finish', [__dirname + 'src/assets/audio/vs-game-finish.mp3']);

        // Sprites
        this.load.atlas('atlas', __dirname + 'src/assets/images/atlas.png', __dirname + 'src/assets/images/atlas.json');

        // Load all level maps
        for (const level of levels) {
            this.load.tilemapTiledJSON(level.mapKey, __dirname + 'src/maps/' + level.mapKey + '.json');
        }
    }

    create() {
        this.sound.pauseOnBlur = false;

        this.inputs = {
            cursors: this.input.keyboard.createCursorKeys(),
            keyBombSpace: this.input.keyboard.addKey('SPACE'),
            keyBombA: this.input.keyboard.addKey('A'),
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

        const currentLevel = levels[this.levelIndex];
        this.level = new Level(this, currentLevel.mapKey);
        this.players = this.add.group();
        const player1 = this.level.addPlayer(1, 1, 'blue', 'Blue').setGamepadIndex(1);
        const player2 = this.level.addPlayer(13, 11, 'red', 'Red').setGamepadIndex(0);

        this.players.add(player1);
        this.players.add(player2);

        // Show level name briefly
        const overlay = new HtmlOverlay(this);
        overlay.showText(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 30,
            currentLevel.name, {
                fontSize: 36, color: '#fff',
                fadeOutDelay: 1500, fadeOutDuration: 500,
            }
        );

        // Esc key handler
        this.input.keyboard.addKey('ESC').on('down', () => {
            this.restart();
        });

        // Touch controls (mobile)
        const tc = this.game.registry.get('touchControls');
        if (tc && tc.enabled) {
            tc.show();
            tc.onMenuPress = () => { this.restart(); };
            this.events.on('shutdown', () => { tc.hide(); });
        }

        // Show esc hint
        const escHint = document.getElementById('esc-hint');
        if (escHint) escHint.style.display = '';
        this.events.on('shutdown', () => {
            if (escHint) escHint.style.display = 'none';
        });

        this.scene.launch('UIScene');
    }

    update(time, delta) {
        this.players.getChildren().forEach((player) => {
            player.update();
        });
    }

    advanceLevel() {
        this.sound.stopAll();
        const nextIndex = this.levelIndex + 1;
        if (nextIndex < levels.length) {
            this.scene.start('Map1', { levelIndex: nextIndex });
        } else {
            this.scene.start('LevelSelect');
        }
    }

    restart() {
        this.sound.stopAll()
        this.scene.start('LevelSelect');
    }

    stopTitleMusic() {
        this.sounds.titleTrack.stop();
    }

    startTitleMusic() {
        this.sounds.titleTrack.play({loop: true});
    }
}
