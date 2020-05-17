import config from '../config';

export default class Bomb extends Phaser.Physics.Arcade.Sprite {
    static #animsLoaded = false;
    explodeStarted = false;

    constructor(player, x, y) {
        super(player.scene, x, y, 'atlas', 'bomb-pending-1.png');

        this.player = player;
        this.scene = player.scene;
        this.level = player.level;

        player.scene.add.existing(this);
        player.scene.physics.add.existing(this, true)

        this.setDepth(1);
        this.setName('bomb');
        
        const tile = player.getTile();
        tile.setData('bomb', this);

        this.setData('explodeTilesAround', this.player.explodeTilesAround);
        this.setData('tile', tile);
        
        this.level.addBomb(this);

        this._addAnims();
        this.anims.play("bomb-pending", true);
        this.once('animationcomplete', this.explode);
    }

    static preload(scene) {
        scene.load.audio('bomb-explode', ['src/assets/audio/bomb-explode.mp3']);
    }

    explode() {
        if (this.explodeStarted) {
            return;
        }
        this.explodeStarted = true;
        // get inforamtion for explosion
        const explodeTilesAround = this.player.explodeTilesAround;
        const explodeTileXY = {x: this.x, y: this.y};

        this.scene.sounds.bombExplode.play();
        

        const explodeSprites = [];
        explodeSprites.push({
            dir: 'none',
            sprite: this.scene.add.sprite(explodeTileXY.x, explodeTileXY.y),
            anim: 'bomb-explode-center',
            angle: 0,
            tile: this.level.groundLayer.getTileAtWorldXY(explodeTileXY.x, explodeTileXY.y)
        });

               
        const stopExplode = {top: false, bottom: false, left: false, right: false};
        for (let i = 1; i <= explodeTilesAround; i++) {
            const tail = explodeTilesAround == i;

            const explodeXYs = {
                top: {
                    x: explodeTileXY.x, 
                    y: explodeTileXY.y - i*config.tileSize,
                    tile: null
                },
                bottom: {
                    x: explodeTileXY.x, 
                    y: explodeTileXY.y + i*config.tileSize,
                    tile: null
                },
                left: {
                    x: explodeTileXY.x - i*config.tileSize, 
                    y: explodeTileXY.y,
                    tile: null
                },
                right: {
                    x: explodeTileXY.x + i*config.tileSize, 
                    y: explodeTileXY.y,
                    tile: null
                },
            };

            explodeXYs.top.tile = this.level.groundLayer.getTileAtWorldXY(explodeXYs.top.x, explodeXYs.top.y)
            explodeXYs.bottom.tile = this.level.groundLayer.getTileAtWorldXY(explodeXYs.bottom.x, explodeXYs.bottom.y)
            explodeXYs.left.tile = this.level.groundLayer.getTileAtWorldXY(explodeXYs.left.x, explodeXYs.left.y)
            explodeXYs.right.tile = this.level.groundLayer.getTileAtWorldXY(explodeXYs.right.x, explodeXYs.right.y)


            const noExplodeTileNames = ['wall', 'bricks'];
          

            // get tiles where we have to show explode fire
            if (explodeXYs.top.tile 
                && !noExplodeTileNames.includes(explodeXYs.top.tile.properties.name) 
                && ! explodeXYs.top.tile.getData('bomb-fire') // not a bomb fire
                && !stopExplode.top) {
                explodeSprites.push({
                    // top
                    dir: 'top',
                    sprite: this.scene.add.sprite(explodeXYs.top.x, explodeXYs.top.y).setAngle(-90),
                    anim: (tail ? 'bomb-explode-tail': 'bomb-explode-line'),
                    tile: explodeXYs.top.tile
                });
            } else {
                stopExplode.top = true;
            }

            if (explodeXYs.top.tile && explodeXYs.top.tile.getData('bomb')) {
                 stopExplode.top = true;   
            }

            if (explodeXYs.bottom.tile 
                && !noExplodeTileNames.includes(explodeXYs.bottom.tile.properties.name) 
                && ! explodeXYs.bottom.tile.getData('bomb-fire') // not a bomb fire
                && !stopExplode.bottom) {
                explodeSprites.push({
                    // bottom
                    dir: 'bottom',
                    sprite: this.scene.add.sprite(explodeXYs.bottom.x, explodeXYs.bottom.y).setAngle(90),
                    anim: (tail ? 'bomb-explode-tail': 'bomb-explode-line'),
                    tile: explodeXYs.bottom.tile
                });
            } else {
                stopExplode.bottom = true;
            }
            if (explodeXYs.bottom.tile && explodeXYs.bottom.tile.getData('bomb')) {
                 stopExplode.bottom = true;   
            }

            if (explodeXYs.left.tile 
                && !noExplodeTileNames.includes(explodeXYs.left.tile.properties.name) 
                && ! explodeXYs.left.tile.getData('bomb-fire') // not a bomb fire
                && !stopExplode.left) {
                explodeSprites.push({
                    // left
                    dir: 'left',
                    sprite: this.scene.add.sprite(explodeXYs.left.x, explodeXYs.left.y).setAngle(180),
                    anim: (tail ? 'bomb-explode-tail': 'bomb-explode-line'),
                    tile: explodeXYs.left.tile
                });
            } else {
                stopExplode.left = true;
            }
            if (explodeXYs.left.tile && explodeXYs.left.tile.getData('bomb')) {
                 stopExplode.left = true;   
            }

            if (explodeXYs.right.tile
                && !noExplodeTileNames.includes(explodeXYs.right.tile.properties.name)  
                && ! explodeXYs.right.tile.getData('bomb-fire') // not a bomb fire
                && !stopExplode.right) {     

                explodeSprites.push({
                    // right
                    dir: 'right',
                    sprite: this.scene.add.sprite(explodeXYs.right.x, explodeXYs.right.y).setAngle(0),
                    anim: (tail ? 'bomb-explode-tail': 'bomb-explode-line'),
                    tile: explodeXYs.right.tile
                });
            } else {
                stopExplode.right = true;
            }
            if (explodeXYs.right.tile && explodeXYs.right.tile.getData('bomb')) {
                 stopExplode.right = true;   
            }
        }




        // show explode fire animation on tiles
        let centerSprite = true;
        for (let explodeSprite of explodeSprites) {

            explodeSprite.tile.setData('bomb-fire', true);
            explodeSprite.sprite.anims.play(explodeSprite.anim);
            explodeSprite.sprite.once('animationcomplete', () => {
                explodeSprite.sprite.destroy();
            });

            if (centerSprite) {
                explodeSprite.sprite.once('animationupdate', (animation, frame, gameObject) => {
                    if (frame.textureFrame != 'bomb-explode-2-center.png') {
                        alert('ISSUE!!!');
                    }


                    // explode bombs that touching fire from this bomb                    
                    for (let i = 1; i < explodeSprites.length; i++) {
                        if (explodeSprites[i].tile && explodeSprites[i].tile.getData('bomb')) {         
                            explodeSprites[i].tile.getData('bomb').explode();
                        }
                    }

                });
                explodeSprite.sprite.once('animationcomplete', () => {
                    for (let explodeSprite of explodeSprites) {
                        explodeSprite.tile.removeData('bomb-fire');
                    }
                })
            }
            centerSprite = false;
            
        }

        this.getData('tile').removeData('bomb');
        this.destroy();

    }

    destroy() {
        super.destroy();
        this.level.removeBomb(this);
    }

    _addAnims() {
        if (Bomb.#animsLoaded) {
            return;
        }
        Bomb.#animsLoaded = true;

        const anims = this.scene.anims;

        anims.create({
            key: "bomb-pending",
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
                // {key: 'atlas', frame: 'bomb-pending-1.png'},
            ],
            frameRate: 4,
            repeat: 0,
        });


        const bombExplodeFrameRate = 14;
        anims.create({
            key: "bomb-explode-center",
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
            key: "bomb-explode-line",
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
            key: "bomb-explode-tail",
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
    }

    // setTileUnderPlayer(tile) {
    //     this.tileUnderPlayer = ;
    // }
}

