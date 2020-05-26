const Player = require('./Player');
const config = require('../config');
const utils = require('../utils');
const _ = require('lodash');

let animsLoaded = false;
let bonusOverlapPx = 6;

module.exports = class Level  {

    constructor(scene, x, y) {
        this.scene = scene;
        this.map = this.scene.make.tilemap({key: 'map3'});
        this.groundLayer =  this.map.createDynamicLayer(
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
    }


    addPlayer(tileX, tileY, type = 'blue') {
        const player = new Player(
            this, 
            tileX * config.tileSize, 
            tileY * config.tileSize,
            type
        );
        
        this.players.add(player);


        player.once('die', () => {
            this.scene.restart();
        });


        return player;
    }

    addBomb(bomb) {
        this.bombs.add(bomb);


        // bomb.on();
    }

    removeBomb(bomb) {
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
            bricksTiles = _.without(bricksTiles, tile);
        }

        // put bomb count bonuses
        for (i = 0; i < bonusBombCountAmount; i++) {
            const tileIndex = utils.rand(0, bricksTiles.length - 1);
            const tile = bricksTiles[tileIndex];
            tile.setData('contains-bonus', 'bonus-bomb-count');
            bricksTiles = _.without(bricksTiles, tile);
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
