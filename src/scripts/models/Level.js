import Player from './Player';
import config from '../config';

export default class Level  {

    players = [];

    constructor(scene, x, y) {
        
        this.scene = scene;
        this.map = this.scene.make.tilemap({key: 'map3'});
        this.groundLayer =  this.map.createDynamicLayer(
            'ground', 
            this.map.addTilesetImage('tileset-ground'), 
            0, 0
        ).setCollisionByProperty({collides: true});
        
        this.scene.physics.world.bounds.width = this.groundLayer.width;
        this.scene.physics.world.bounds.height = this.groundLayer.height;

        this.bombs = scene.add.group();
    }


    addPlayer(tileX, tileY, type = 'blue') {
        const player = new Player(
            this, 
            tileX * config.tileSize, 
            tileY = config.tileSize,
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

}
