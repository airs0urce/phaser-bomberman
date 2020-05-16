import Player from './Player';
import config from '../config';

export default class Level  {

    constructor(scene, x, y) {
        
        this.scene = scene;
        const map = this.scene.make.tilemap({key: 'map1'});
        const groundTilemap = map.addTilesetImage('tileset-ground');
        this.groundLayer = map.createDynamicLayer('ground', groundTilemap, 0, 0);
        this.groundLayer.setCollisionByProperty({
            collides: true
        });
        
        this.scene.physics.world.bounds.width = this.groundLayer.width;
        this.scene.physics.world.bounds.height = this.groundLayer.height;

        this.bombs = scene.add.group();
    }

    static loadMap(scene, mapName, mapPath) {
        scene.load.tilemapTiledJSON(mapName, mapPath);
    }

    addPlayer() {
        const player = new Player(this, config.tileSize, config.tileSize);
        this._addPlayerColliders(player);

        this.player = player;

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
        this.scene.physics.add.overlap(player, this.bombs, (player2, bomb) => {
            const blockOnDistance = 8;

            const pX = player2.body.center.x;
            const pY = player2.body.center.y;
            const bX = bomb.x - 1; 
            const bY = bomb.y;

            const distance = Phaser.Math.Distance.Between(pX, pY, bX, bY);
            if (distance >= blockOnDistance) {
                if (pX == bX) {
                    player2.setData('blockMovement', (pY > bY) ? 'up': 'down');
                }
                if (pY == bY) {
                    player2.setData('blockMovement', (pX > bX) ? 'left': 'right');
                }
            }
        });
    }

    // setTileUnderPlayer(tile) {
    //     this.tileUnderPlayer = ;
    // }
}
