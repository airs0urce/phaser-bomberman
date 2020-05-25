import Player from './Player';
import config from '../config';

export default class Level  {
    static #animsLoaded = false;
    players = [];

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
        this._addAnims();
    }


    addPlayer(tileX, tileY, type = 'blue') {
        const player = new Player(
            this, 
            tileX * config.tileSize, 
            tileY * config.tileSize,
            type
        );
        this._addPlayerColliders(player);

        this.players.push(player);

        return player;
    }

    addBomb(bomb) {
        this.bombs.add(bomb);
    }

    removeBomb(bomb) {
        this.bombs.remove(bomb, true, true);
    }

    _addPlayerColliders(player) {
        this.scene.physics.add.collider(player, this.groundLayer);
        this.scene.physics.add.collider(player, this.bombs);
        this.scene.physics.add.overlap(player, this.bombs, (player, bomb) => {
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
    }

    _addAnims() {
        
        if (Level.#animsLoaded) {
            return;
        }
        Level.#animsLoaded = true;

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
        
    }

}
