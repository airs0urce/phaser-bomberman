const Level = require("../models/Level");
const Player = require("../models/Player");
const Bomb = require("../models/Bomb");
const config = require('../config');
const levels = require('../levels');
const HtmlOverlay = require('../HtmlOverlay');

module.exports = class OnlineGameScene extends Phaser.Scene {

    constructor() {
        super('OnlineGame');
        this.inputs = {};
        this.sounds = {};
    }

    init(data) {
        this.net = data.net;
        this.playerId = data.playerId;
        this.levelIndex = data.level;
        this.bonusMap = data.bonuses;
        this.currentRound = data.round || 1;
        this.totalRounds = data.totalRounds || 1;
        this._scores = data.scores || { 1: 0, 2: 0, draws: 0 };
    }

    preload() {
        // Load all assets (may already be cached if Map1Scene was visited before)
        this.load.audio('titleTrack', [__dirname + 'src/assets/audio/track_8.mp3']);
        this.load.audio('bomb-explode', [__dirname + 'src/assets/audio/bomb-explode.mp3']);
        this.load.audio('bomb-place', [__dirname + 'src/assets/audio/bomb-place.mp3']);
        this.load.audio('player-die', [__dirname + 'src/assets/audio/player-die.mp3']);
        this.load.audio('player-took-bonus', [__dirname + 'src/assets/audio/player-took-bonus.mp3']);
        this.load.audio('vs-game-finish', [__dirname + 'src/assets/audio/vs-game-finish.mp3']);

        this.load.atlas('atlas', __dirname + 'src/assets/images/atlas.png', __dirname + 'src/assets/images/atlas.json');

        this.load.spritesheet('tileset-ground', __dirname + 'src/assets/images/ground.png', {
            frameWidth: 16,
            frameHeight: 16
        });

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
        };

        this.sounds = {
            titleTrack: this.sound.add('titleTrack'),
            bombExplode: this.sound.add('bomb-explode'),
            bombPlace: this.sound.add('bomb-place').setVolume(1.4),
            playerDie: this.sound.add('player-die'),
            playerTookBonus: this.sound.add('player-took-bonus'),
            vsGameFinish: this.sound.add('vs-game-finish'),
        };

        this.sounds.titleTrack.play({ loop: true });

        // Register bomb/explosion animations (normally done by Bomb class constructor)
        this._registerAnimations();

        const currentLevel = levels[this.levelIndex];
        this.level = new Level(this, currentLevel.mapKey);
        this.players = this.add.group();

        // Set up local player as blue (P1) or red (P2)
        const isPlayer1 = this.playerId === 1;
        const localType = isPlayer1 ? 'blue' : 'red';
        const remoteType = isPlayer1 ? 'red' : 'blue';

        // Add players at spawn positions
        this.localPlayer = this.level.addPlayer(1, 1, 'blue', 'Blue');
        this.remotePlayer = this.level.addPlayer(13, 11, 'red', 'Red');

        this.players.add(this.localPlayer);
        this.players.add(this.remotePlayer);

        // Track which player object is ours
        if (!isPlayer1) {
            // Swap references - we're player 2
            [this.localPlayer, this.remotePlayer] = [this.remotePlayer, this.localPlayer];
        }

        // Disable Phaser physics for both players (server is authoritative)
        this.localPlayer.body.enable = false;
        this.remotePlayer.body.enable = false;

        // Server position tracking for interpolation
        this._serverPos = {};     // pid -> { x, y }
        this._prevServerPos = {}; // pid -> { x, y }
        this._lastStateTick = 0;
        this._stateTimestamp = 0;

        // Bomb tracking: server bomb ID -> client Bomb sprite
        this.bombSprites = new Map();

        // Track which bricks are already destroyed (to avoid replaying)
        this.destroyedBrickKeys = new Set();

        // Track revealed bonuses
        this.bonusSpriteKeys = new Set();
        this.bonusSpriteMap = new Map(); // "x,y" -> sprite

        // Track collected bonuses
        this.collectedBonusKeys = new Set();

        // Track fires that are currently shown
        this.activeFireBombs = new Map(); // "x,y" -> bomb sprite that created the fire

        // Game over state
        this.isGameOver = false;

        // Set up network callbacks
        this.net.onState = (state) => this._applyServerState(state);
        this.net.onGameOver = (msg) => this._handleGameOver(msg);
        this.net.onRoundStart = (msg) => this._handleRoundStart(msg);
        this.net.onPlayerDisconnected = (pid) => {
            if (!this.isGameOver) {
                this._showMessage('Opponent disconnected');
            }
        };
        this.net.onDisconnect = () => {
            if (!this.isGameOver) {
                this._showMessage('Connection lost');
            }
        };

        // Esc key handler
        this.input.keyboard.addKey('ESC').on('down', () => {
            this.net.disconnect();
            this.sound.stopAll();
            // Clear hash so we don't auto-join on next visit
            window.history.replaceState(null, '', '/');
            this.scene.start('LevelSelect');
        });

        // Touch controls (mobile)
        const tc = this.game.registry.get('touchControls');
        if (tc && tc.enabled) {
            tc.show();
            tc.onMenuPress = () => {
                this.net.disconnect();
                this.sound.stopAll();
                window.history.replaceState(null, '', '/');
                this.scene.start('LevelSelect');
            };
            this.events.on('shutdown', () => { tc.hide(); });
        }

        // Show level name and round info briefly
        this.htmlOverlay = new HtmlOverlay(this);

        const roundText = this.totalRounds > 1
            ? `Round ${this.currentRound}/${this.totalRounds}: ${currentLevel.name}`
            : currentLevel.name + ' (Online)';

        const startLines = [{ text: roundText, fontSize: 36, color: '#fff' }];
        if (this.totalRounds > 1 && this.currentRound > 1) {
            startLines.push({ text: `Score: ${this._scores[1]} - ${this._scores[2]}`, fontSize: 26, color: '#ff0' });
        }
        this.htmlOverlay.showPanel(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 20,
            startLines,
            { fadeOutDelay: 1500, fadeOutDuration: 500 }
        );
    }

    update(time, delta) {
        if (this.isGameOver) return;

        // Capture and send local inputs
        const cursors = this.inputs.cursors;
        const tc = this.game.registry.get('touchControls');
        const inputs = {
            up: cursors.up.isDown || (tc && tc.enabled && tc.state.up),
            down: cursors.down.isDown || (tc && tc.enabled && tc.state.down),
            left: cursors.left.isDown || (tc && tc.enabled && tc.state.left),
            right: cursors.right.isDown || (tc && tc.enabled && tc.state.right),
            bomb: this.inputs.keyBombSpace.isDown || this.inputs.keyBombA.isDown || (tc && tc.enabled && tc.state.bomb),
        };
        this.net.sendInputs(inputs);

        // Interpolate both players between previous and current server positions
        // Server sends at 20Hz (50ms). We interpolate over that interval.
        const elapsed = time - this._stateTimestamp;
        const t = Math.min(elapsed / 50, 1); // 0..1 over 50ms

        for (const pid of [this.playerId, this.playerId === 1 ? 2 : 1]) {
            const isLocal = pid === this.playerId;
            const sprite = isLocal ? this.localPlayer : this.remotePlayer;
            if (!sprite.active || sprite.dieStarted) continue;

            const prev = this._prevServerPos[pid];
            const curr = this._serverPos[pid];
            if (!prev || !curr) continue;

            // Lerp between previous and current server position
            sprite.x = prev.x + (curr.x - prev.x) * t;
            sprite.y = prev.y + (curr.y - prev.y) * t;
        }

        // Play walk animation for local player based on inputs
        if (this.localPlayer.active && !this.localPlayer.dieStarted) {
            const type = this.localPlayer.type;
            if (inputs.left) {
                this.localPlayer.play(`man-${type}-left-walk`, true);
            } else if (inputs.right) {
                this.localPlayer.play(`man-${type}-right-walk`, true);
            } else if (inputs.up) {
                this.localPlayer.play(`man-${type}-up-walk`, true);
            } else if (inputs.down) {
                this.localPlayer.play(`man-${type}-down-walk`, true);
            } else {
                if (this.localPlayer.anims.currentAnim) {
                    this.localPlayer.anims.setCurrentFrame(this.localPlayer.anims.currentAnim.frames[0]);
                    this.localPlayer.anims.stop();
                }
            }
        }
    }

    _applyServerState(state) {
        if (this.isGameOver) return;

        this._stateTimestamp = this.time.now;

        // Update player positions for interpolation
        for (const pidStr of Object.keys(state.players)) {
            const pid = parseInt(pidStr);
            const sp = state.players[pid];
            const isLocal = pid === this.playerId;
            const playerSprite = isLocal ? this.localPlayer : this.remotePlayer;

            if (!playerSprite.active) continue;

            if (!sp.alive) {
                if (!playerSprite.dieStarted) {
                    playerSprite.die();
                }
                continue;
            }

            // Shift current -> previous, store new current
            this._prevServerPos[pid] = this._serverPos[pid] || { x: sp.x, y: sp.y };
            this._serverPos[pid] = { x: sp.x, y: sp.y };

            // Remote player animation based on movement
            if (!isLocal) {
                const prev = this._prevServerPos[pid];
                const moved = Math.abs(sp.x - prev.x) > 0.01 || Math.abs(sp.y - prev.y) > 0.01;
                const dirMap = {
                    'left': `man-${playerSprite.type}-left-walk`,
                    'right': `man-${playerSprite.type}-right-walk`,
                    'up': `man-${playerSprite.type}-up-walk`,
                    'down': `man-${playerSprite.type}-down-walk`,
                };

                if (moved && dirMap[sp.dir]) {
                    playerSprite.play(dirMap[sp.dir], true);
                } else if (!moved) {
                    if (playerSprite.anims.currentAnim) {
                        playerSprite.anims.setCurrentFrame(playerSprite.anims.currentAnim.frames[0]);
                        playerSprite.anims.stop();
                    }
                }
            }
        }

        // Update bombs
        const serverBombIds = new Set();
        for (const bomb of state.bombs) {
            serverBombIds.add(bomb.id);

            if (!this.bombSprites.has(bomb.id)) {
                // Create new bomb sprite
                const bx = bomb.tileX * config.tileSize + config.tileSize / 2;
                const by = bomb.tileY * config.tileSize + config.tileSize / 2;
                const bombSprite = this.add.sprite(bx, by, 'atlas', 'bomb-pending-1.png');
                bombSprite.setDepth(1);
                bombSprite.play('bomb-pending-forever');
                this.bombSprites.set(bomb.id, bombSprite);
                this.sounds.bombPlace.play({ delay: 0.02 });
            }

            if (bomb.exploded && this.bombSprites.has(bomb.id)) {
                const bombSprite = this.bombSprites.get(bomb.id);
                if (!bombSprite.getData('exploded')) {
                    bombSprite.setData('exploded', true);
                    bombSprite.visible = false;
                    this.sounds.bombExplode.play();
                }
            }
        }

        // Remove bomb sprites no longer in server state
        for (const [id, sprite] of this.bombSprites) {
            if (!serverBombIds.has(id)) {
                sprite.destroy();
                this.bombSprites.delete(id);
            }
        }

        // Update fires (show fire sprites with correct animation + rotation)
        const currentFireKeys = new Set();
        const dirAngles = { 'none': 0, 'top': -90, 'bottom': 90, 'left': 180, 'right': 0 };
        for (const fire of state.fires) {
            const key = `${fire.tileX},${fire.tileY}`;
            currentFireKeys.add(key);

            if (!this.activeFireBombs.has(key)) {
                const fx = fire.tileX * config.tileSize + config.tileSize / 2;
                const fy = fire.tileY * config.tileSize + config.tileSize / 2;
                const fireSprite = this.add.sprite(fx, fy, 'atlas');
                fireSprite.setDepth(2);

                // Pick animation based on fire type (center/line/tail)
                const animName = `bomb-explode-${fire.fireType || 'center'}`;
                const angle = dirAngles[fire.fireDir] || 0;
                fireSprite.setAngle(angle);
                fireSprite.play(animName);
                fireSprite.once('animationcomplete', () => {
                    fireSprite.destroy();
                });
                this.activeFireBombs.set(key, fireSprite);
            }
        }
        // Remove fire sprites no longer active
        for (const [key, sprite] of this.activeFireBombs) {
            if (!currentFireKeys.has(key)) {
                if (sprite.active) sprite.destroy();
                this.activeFireBombs.delete(key);
            }
        }

        // Destroyed bricks
        for (const brick of state.destroyedBricks) {
            const key = `${brick.tileX},${brick.tileY}`;
            if (!this.destroyedBrickKeys.has(key)) {
                this.destroyedBrickKeys.add(key);

                // Replace tile to ground
                const tile = this.level.groundLayer.getTileAt(brick.tileX, brick.tileY);
                if (tile && tile.properties.name === 'bricks') {
                    this.level.map.replaceTile(tile, { name: 'ground', tile_set_id: brick.tileSetId });

                    // Play destroy animation
                    const wallDestruct = this.add.sprite(
                        brick.tileX * config.tileSize,
                        brick.tileY * config.tileSize,
                        'atlas'
                    );
                    wallDestruct.setOrigin(0);
                    wallDestruct.setDepth(2);
                    wallDestruct.play(`brick-destroy-tileset${brick.tileSetId}`);
                    wallDestruct.once('animationcomplete', () => wallDestruct.destroy());
                }
            }
        }

        // Revealed bonuses
        for (const bonus of state.revealedBonuses) {
            const key = `${bonus.tileX},${bonus.tileY}`;
            if (!this.bonusSpriteKeys.has(key)) {
                this.bonusSpriteKeys.add(key);
                const bonusSprite = this.add.sprite(
                    bonus.tileX * config.tileSize,
                    bonus.tileY * config.tileSize,
                    'atlas',
                    `${bonus.type}.png`
                );
                bonusSprite.setOrigin(0);
                bonusSprite.setDepth(0);
                this.bonusSpriteMap.set(key, bonusSprite);
            }
        }

        // Collected bonuses (picked up by player)
        for (const collected of state.collectedBonuses) {
            const key = `${collected.tileX},${collected.tileY}`;
            if (!this.collectedBonusKeys.has(key)) {
                this.collectedBonusKeys.add(key);
                const bonusSprite = this.bonusSpriteMap.get(key);
                if (bonusSprite) {
                    bonusSprite.destroy();
                    this.bonusSpriteMap.delete(key);
                }
                this.sounds.playerTookBonus.play();
            }
        }

        // Exploded bonuses (destroyed by bomb explosion)
        if (state.explodedBonuses) {
            for (const exploded of state.explodedBonuses) {
                const key = `${exploded.tileX},${exploded.tileY}`;
                const bonusSprite = this.bonusSpriteMap.get(key);
                if (bonusSprite && bonusSprite.active) {
                    // Play destruction animation then remove
                    bonusSprite.play('bonus-explode');
                    bonusSprite.once('animationcomplete', () => {
                        bonusSprite.destroy();
                    });
                    this.bonusSpriteMap.delete(key);
                    this.bonusSpriteKeys.delete(key);
                }
            }
        }
    }

    _handleGameOver(msg) {
        if (this.isGameOver) return;
        this.isGameOver = true;

        this.sounds.titleTrack.stop();

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        // Update local scores
        if (msg.scores) {
            this._scores = msg.scores;
        }

        const totalRounds = msg.totalRounds || this.totalRounds;
        const isMultiRound = totalRounds > 1;
        const matchOver = msg.matchOver !== undefined ? msg.matchOver : true;

        let roundMessage;
        if (msg.winner === 0) {
            roundMessage = 'Draw!';
        } else if (msg.winner === this.playerId) {
            roundMessage = 'You win!';
        } else {
            roundMessage = 'You lose!';
        }

        if (msg.reason === 'disconnect') {
            roundMessage += ' (Opponent disconnected)';
        }

        this.sounds.vsGameFinish.play();

        if (matchOver && isMultiRound) {
            // Determine overall winner
            const myId = this.playerId;
            const opId = myId === 1 ? 2 : 1;
            const myWins = this._scores[myId] || 0;
            const opWins = this._scores[opId] || 0;

            let matchResult;
            if (myWins > opWins) {
                matchResult = 'You win the match!';
            } else if (opWins > myWins) {
                matchResult = 'You lose the match!';
            } else {
                matchResult = 'Match is a draw!';
            }

            const matchLines = [
                { text: 'MATCH OVER', fontSize: 36, fontWeight: 'bold', color: '#ff0' },
                { text: matchResult, fontSize: 36, color: '#fff' },
                { text: `Final Score: ${this._scores[1]} - ${this._scores[2]}`, fontSize: 26, color: '#aaa' },
            ];
            if (this._scores.draws > 0) {
                matchLines.push({ text: `(${this._scores.draws} draw${this._scores.draws > 1 ? 's' : ''})`, fontSize: 20, color: '#888' });
            }
            this.htmlOverlay.showPanel(centerX, centerY, matchLines);

            // Return to menu after delay
            this.time.delayedCall(5000, () => {
                this.net.disconnect();
                this.sound.stopAll();
                window.history.replaceState(null, '', '/');
                this.scene.start('LevelSelect');
            });
        } else if (matchOver) {
            // Single round match
            this.htmlOverlay.showPanel(centerX, centerY, [
                { text: roundMessage, fontSize: 40, color: '#fff' },
            ]);

            this.time.delayedCall(4000, () => {
                this.net.disconnect();
                this.sound.stopAll();
                window.history.replaceState(null, '', '/');
                this.scene.start('LevelSelect');
            });
        } else {
            // More rounds to play - show round result and score
            this.htmlOverlay.showPanel(centerX, centerY, [
                { text: roundMessage, fontSize: 36, color: '#fff' },
                { text: `Score: ${this._scores[1]} - ${this._scores[2]}`, fontSize: 26, color: '#ff0' },
                { text: 'Next round starting...', fontSize: 20, color: '#888' },
            ]);

            // Server will send round_start after ~4 seconds
        }
    }

    _handleRoundStart(msg) {
        this.sound.stopAll();
        this.scene.restart({
            net: this.net,
            playerId: this.playerId,
            level: msg.level,
            bonuses: msg.bonuses,
            round: msg.round,
            totalRounds: msg.totalRounds,
            scores: msg.scores || this._scores,
        });
    }

    _showMessage(text) {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        this.htmlOverlay.showText(centerX, centerY + 20, text, {
            fontSize: 26, color: '#ff0',
        });
    }

    _registerAnimations() {
        const anims = this.anims;

        // Skip if already registered (e.g., from a previous scene)
        if (anims.exists('bomb-explode-center')) return;

        // Bomb pending
        anims.create({
            key: 'bomb-pending',
            frames: [
                {key: 'atlas', frame: 'bomb-pending-1.png'},
                {key: 'atlas', frame: 'bomb-pending-2.png'},
                {key: 'atlas', frame: 'bomb-pending-1.png'},
                {key: 'atlas', frame: 'bomb-pending-2.png'},
                {key: 'atlas', frame: 'bomb-pending-1.png'},
                {key: 'atlas', frame: 'bomb-pending-3.png'},
                {key: 'atlas', frame: 'bomb-pending-1.png'},
                {key: 'atlas', frame: 'bomb-pending-2.png'},
                {key: 'atlas', frame: 'bomb-pending-1.png'},
                {key: 'atlas', frame: 'bomb-pending-2.png'},
            ],
            frameRate: 4,
            repeat: 0,
        });

        anims.create({
            key: 'bomb-pending-forever',
            frames: [
                {key: 'atlas', frame: 'bomb-pending-1.png'},
                {key: 'atlas', frame: 'bomb-pending-2.png'},
                {key: 'atlas', frame: 'bomb-pending-1.png'},
                {key: 'atlas', frame: 'bomb-pending-2.png'},
                {key: 'atlas', frame: 'bomb-pending-1.png'},
                {key: 'atlas', frame: 'bomb-pending-3.png'},
                {key: 'atlas', frame: 'bomb-pending-1.png'},
                {key: 'atlas', frame: 'bomb-pending-2.png'},
                {key: 'atlas', frame: 'bomb-pending-1.png'},
                {key: 'atlas', frame: 'bomb-pending-2.png'},
            ],
            frameRate: 4,
            repeat: -1,
        });

        // Explosion animations
        const bombExplodeFrameRate = 14;
        anims.create({
            key: 'bomb-explode-center',
            frames: [
                {key: 'atlas', frame: 'bomb-explode-1-center.png'},
                {key: 'atlas', frame: 'bomb-explode-2-center.png'},
                {key: 'atlas', frame: 'bomb-explode-3-center.png'},
                {key: 'atlas', frame: 'bomb-explode-4-center.png'},
                {key: 'atlas', frame: 'bomb-explode-3-center.png'},
                {key: 'atlas', frame: 'bomb-explode-2-center.png'},
                {key: 'atlas', frame: 'bomb-explode-1-center.png'},
            ],
            frameRate: bombExplodeFrameRate,
            repeat: 0,
        });
        anims.create({
            key: 'bomb-explode-line',
            frames: [
                {key: 'atlas', frame: 'bomb-explode-1-line.png'},
                {key: 'atlas', frame: 'bomb-explode-2-line.png'},
                {key: 'atlas', frame: 'bomb-explode-3-line.png'},
                {key: 'atlas', frame: 'bomb-explode-4-line.png'},
                {key: 'atlas', frame: 'bomb-explode-3-line.png'},
                {key: 'atlas', frame: 'bomb-explode-2-line.png'},
                {key: 'atlas', frame: 'bomb-explode-1-line.png'},
            ],
            frameRate: bombExplodeFrameRate,
            repeat: 0,
        });
        anims.create({
            key: 'bomb-explode-tail',
            frames: [
                {key: 'atlas', frame: 'bomb-explode-1-tail.png'},
                {key: 'atlas', frame: 'bomb-explode-2-tail.png'},
                {key: 'atlas', frame: 'bomb-explode-3-tail.png'},
                {key: 'atlas', frame: 'bomb-explode-4-tail.png'},
                {key: 'atlas', frame: 'bomb-explode-3-tail.png'},
                {key: 'atlas', frame: 'bomb-explode-2-tail.png'},
                {key: 'atlas', frame: 'bomb-explode-1-tail.png'},
            ],
            frameRate: bombExplodeFrameRate,
            repeat: 0,
        });

        // Bonus explode
        anims.create({
            key: 'bonus-explode',
            frames: [
                {key: 'atlas', frame: 'bonus-explode1.png'},
                {key: 'atlas', frame: 'bonus-explode2.png'},
                {key: 'atlas', frame: 'bonus-explode3.png'},
                {key: 'atlas', frame: 'bonus-explode4.png'},
                {key: 'atlas', frame: 'bonus-explode5.png'},
                {key: 'atlas', frame: 'bonus-explode6.png'},
            ],
            frameRate: 10,
            repeat: 0,
        });
    }
}
