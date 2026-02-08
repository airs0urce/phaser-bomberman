const Player = require('./Player');
const config = require('../config');
const utils = require('../utils');
const a = require('awaiting');
const HtmlOverlay = require('../HtmlOverlay');

let animsLoaded = false;
let bonusOverlapPx = 6;

module.exports = class Level  {

    constructor(scene, mapKey) {
        this.scene = scene;
        this.map = this.scene.make.tilemap({key: mapKey || 'map3'});
        this.groundLayer =  this.map.createLayer(
            'ground', 
            this.map.addTilesetImage('tileset-ground'), 
            0, 0
        );
        this.groundLayer.setCollisionByProperty({collides: true});
        
        this.scene.physics.world.bounds.width = this.groundLayer.width;
        this.scene.physics.world.bounds.height = this.groundLayer.height;

        this.bombs = scene.add.group();
        this.bonuses = scene.add.group();
        this.players = scene.add.group();

        this._addAnims();
        this._addBonusesOnMap();
        this._addPlayerColliders();

        this.gameFinished = false;
    }

    addPlayer(tileX, tileY, type = 'blue', fullName = 'player') {
        const player = new Player(
            this, 
            tileX * config.tileSize, 
            tileY * config.tileSize,
            type,
            fullName
        );
        
        this.players.add(player);

        player.once('die', () => {            
            this.players.remove(player, true, true);
            this.handleGameFinish()
        });

        return player;
    }

    async handleGameFinish() {
        this.gameFinished = true;
        const players = this.players.getChildren();

        if (players.length == 1) {
            // wait 1 sec to give bombs explode
            await a.delay(1000);

            if (this.scene.stopTitleMusic) this.scene.stopTitleMusic();

            const registry = this.scene.game.registry;
            const centerX = this.scene.cameras.main.centerX;
            const centerY = this.scene.cameras.main.centerY;

            // if after 1 sec all players died
            let message;
            if (players.length == 0) {
                message = 'Draw';
                registry.set('draws', (registry.get('draws') || 0) + 1);
            } else {
                const lastPlayer = players[0];
                message = `Winner is ${lastPlayer.fullName}!`;
                if (lastPlayer.type === 'blue') {
                    registry.set('player1Wins', (registry.get('player1Wins') || 0) + 1);
                } else {
                    registry.set('player2Wins', (registry.get('player2Wins') || 0) + 1);
                }
            }

            const overlay = new HtmlOverlay(this.scene);

            const p1Wins = registry.get('player1Wins') || 0;
            const p2Wins = registry.get('player2Wins') || 0;
            const draws = registry.get('draws') || 0;

            overlay.showPanel(centerX, centerY, [
                { text: message, fontSize: 40, color: '#fff' },
                { text: `Blue: ${p1Wins}  Red: ${p2Wins}  Draw: ${draws}`, fontSize: 20, color: '#ccc' },
            ]);

            this.scene.sounds.vsGameFinish.play();

            await a.delay(3000);


            this.scene.sounds.vsGameFinish.on('complete', () => {
                this.scene.advanceLevel();
            });
        }
    }

    addBomb(bomb) {
        this.bombs.add(bomb);
    }

    removeBomb(bomb) {
        if (! this.bombs.children) {
            // Fix for this error:
            //
            // Uncaught TypeError: Cannot read property 'contains' of undefined
            // at Group.remove (webpack-internal:///./node_modules/phaser/src/gameobjects/group/Group.js:609)
            // at Level.removeBomb (webpack-internal:///./src/scripts/models/Level.js:68)
            // at Bomb.destroy (webpack-internal:///./src/scripts/models/Bomb.js:341)
            return;
        }
        this.bombs.remove(bomb, true, true);
    }

    dropBonusIfNeed(tile) {
        const containsBonus = tile.getData('contains-bonus');
        if (! containsBonus) {
            return;
        }

        // 'bonus-bomb-power' or 'bonus-bomb-count'
        const type = containsBonus

        const bonus = this.scene.physics.add.sprite(
            tile.x*config.tileSize, 
            tile.y*config.tileSize, 
            'atlas', `${type}.png`
        );
        bonus.setData('type', type);
        bonus.setOrigin(0);
        bonus.body.setSize(config.tileSize, config.tileSize);
        bonus.body.setOffset(0, 0);
        bonus.body.setSize(
            config.tileSize - bonusOverlapPx*2, 
            config.tileSize - bonusOverlapPx*2
        );
        bonus.body.setOffset(
            bonusOverlapPx, 
            bonusOverlapPx
        );

        bonus.setData('tile', tile);        
        tile.setData('bonus', bonus);
        this.bonuses.add(bonus);

        return true;
        
    }

    _addBonusesOnMap() {
        let bricksTiles = [];
        this.map.forEachTile((tile) => {
            if (tile.properties.name == 'bricks') {
                bricksTiles.push(tile)
            }
        });

        // 'bonus-bomb-power' / 'bonus-bomb-count'
        const bonusBombPowerAmount = Math.round(bricksTiles.length / 12);
        const bonusBombCountAmount = Math.round(bricksTiles.length / 12);

        let i;
        // put bomb power bonuses
        for (i = 0; i < bonusBombPowerAmount; i++) {
            const tileIndex = utils.rand(0, bricksTiles.length - 1);
            const tile = bricksTiles[tileIndex];
            tile.setData('contains-bonus', 'bonus-bomb-power');
            bricksTiles = bricksTiles.filter(t => t !== tile);
        }

        // put bomb count bonuses
        for (i = 0; i < bonusBombCountAmount; i++) {
            const tileIndex = utils.rand(0, bricksTiles.length - 1);
            const tile = bricksTiles[tileIndex];
            tile.setData('contains-bonus', 'bonus-bomb-count');
            bricksTiles = bricksTiles.filter(t => t !== tile);
        }
        
    }

    _addPlayerColliders() {
        this.scene.physics.add.collider(this.players, this.groundLayer);
        this.scene.physics.add.collider(this.players, this.bombs);
        this.scene.physics.add.overlap(this.players, this.bombs, (player, bomb) => {
            const blockOnDistance = 8;

            const pX = player.body.center.x;
            const pY = player.body.center.y;
            const bX = bomb.x - 1; 
            const bY = bomb.y;

            const distance = Phaser.Math.Distance.Between(pX, pY, bX, bY);
            if (distance >= blockOnDistance) {
                if (pX == bX) {
                    player.setData('blockMovement', (pY > bY) ? 'up': 'down');
                }
                if (pY == bY) {
                    player.setData('blockMovement', (pX > bX) ? 'left': 'right');
                }
            }
        });

        this.scene.physics.add.overlap(this.players, this.bonuses, (player, bonus) => {
            if (bonus.getData('type') == 'bonus-bomb-power') {
                player.bombPower += 1;
            } else if (bonus.getData('type') == 'bonus-bomb-count') {
                player.bombsMax += 1;
            }
            this.scene.sounds.playerTookBonus.play();
            bonus.getData('tile').removeData('bonus');
            bonus.destroy();
        });
    }

    _addAnims() {
        
        if (animsLoaded) {
            return;
        }
        animsLoaded = true;

        const anims = this.scene.anims;

        
        anims.create({
            key: `brick-destroy-tileset1`,
            frames: [
                {key: 'atlas', frame: `tile_set1brick-explode1.png`},
                {key: 'atlas', frame: `tile_set1brick-explode2.png`},
                {key: 'atlas', frame: `tile_set1brick-explode3.png`},
                {key: 'atlas', frame: `tile_set1brick-explode4.png`},
                {key: 'atlas', frame: `tile_set1brick-explode5.png`},
                {key: 'atlas', frame: `tile_set1brick-explode6.png`},
            ],
            frameRate: 10,
            repeat: 0,
        });

        anims.create({
            key: `brick-destroy-tileset2`,
            frames: [
                {key: 'atlas', frame: `tile_set2brick-explode1.png`},
                {key: 'atlas', frame: `tile_set2brick-explode2.png`},
                {key: 'atlas', frame: `tile_set2brick-explode3.png`},
                {key: 'atlas', frame: `tile_set2brick-explode4.png`},
                {key: 'atlas', frame: `tile_set2brick-explode5.png`},
                {key: 'atlas', frame: `tile_set2brick-explode6.png`},
            ],
            frameRate: 10,
            repeat: 0,
        });

        anims.create({
            key: `brick-destroy-tileset3`,
            frames: [
                {key: 'atlas', frame: `tile_set3brick-explode1.png`},
                {key: 'atlas', frame: `tile_set3brick-explode2.png`},
                {key: 'atlas', frame: `tile_set3brick-explode3.png`},
                {key: 'atlas', frame: `tile_set3brick-explode4.png`},
                {key: 'atlas', frame: `tile_set3brick-explode5.png`},
                {key: 'atlas', frame: `tile_set3brick-explode6.png`},
            ],
            frameRate: 10,
            repeat: 0,
        });

        anims.create({
            key: `brick-destroy-tileset4`,
            frames: [
                {key: 'atlas', frame: `tile_set4brick-explode1.png`},
                {key: 'atlas', frame: `tile_set4brick-explode2.png`},
                {key: 'atlas', frame: `tile_set4brick-explode3.png`},
                {key: 'atlas', frame: `tile_set4brick-explode4.png`},
                {key: 'atlas', frame: `tile_set4brick-explode5.png`},
                {key: 'atlas', frame: `tile_set4brick-explode6.png`},
            ],
            frameRate: 10,
            repeat: 0,
        });

        anims.create({
            key: `bonus-explode`,
            frames: [
                {key: 'atlas', frame: `bonus-explode1.png`},
                {key: 'atlas', frame: `bonus-explode2.png`},
                {key: 'atlas', frame: `bonus-explode3.png`},
                {key: 'atlas', frame: `bonus-explode4.png`},
                {key: 'atlas', frame: `bonus-explode5.png`},
                {key: 'atlas', frame: `bonus-explode6.png`},
            ],
            frameRate: 10,
            repeat: 0,
        });
        
    }

}
