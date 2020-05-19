import config from '../config';

export default class Bomb extends Phaser.Physics.Arcade.Sprite {
    static #animsLoaded = false;
    static #explodeSoundPlaying = 0;
    explodeStarted = false;
    static #safePlayerOverlapPx = 6;
    

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

        this.scene.sounds.bombPlace.play({delay: 0.05});

        this._addAnims();
        this.anims.play("bomb-pending", true);
        this.once('animationcomplete', this.explode);

        this.fireGroup = this.scene.add.group();
    }

    _createExplodeFireSprite(x, y, dir) {
        const sprite = this.scene.physics.add.sprite(x, y);
        sprite.setOrigin(0.5);

        const angle = {
            'none': 0,
            'top': -90,
            'bottom': 90,
            'left': 180,
            'right': 0,
        }[dir]
        sprite.setAngle(angle);        
        
        const bodySize = {
            width: config.tileSize - Bomb.#safePlayerOverlapPx*2, 
            height: config.tileSize - Bomb.#safePlayerOverlapPx*2
        };
        sprite.body.setSize(bodySize.width, bodySize.height);
        sprite.body.setOffset(
            Bomb.#safePlayerOverlapPx, 
            Bomb.#safePlayerOverlapPx
        );

        return sprite;   
    }

    explode() {
        if (this.explodeStarted) {
            return;
        }
        this.explodeStarted = true;
        // get inforamtion for explosion
        const explodeTilesAround = this.player.explodeTilesAround;
        const explodeTileXY = {x: this.x, y: this.y};

        
        if (Bomb.#explodeSoundPlaying >= 1) {
            this.scene.sounds.bombExplode.play({seek: 0.3});
        } else {
            this.scene.sounds.bombExplode.play({seek: 0});
        }
        Bomb.#explodeSoundPlaying += 1;
        this.scene.sounds.bombExplode.once('complete', () => {
            Bomb.#explodeSoundPlaying--;
        });
        
        const groundLayer = this.level.groundLayer;

        const explodeSprites = [];
        explodeSprites.push({
            dir: 'none',
            sprite: this._createExplodeFireSprite(explodeTileXY.x, explodeTileXY.y, 'none'),
            anim: 'bomb-explode-center',
            angle: 0,
            tile: groundLayer.getTileAtWorldXY(explodeTileXY.x, explodeTileXY.y)
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

            explodeXYs.top.tile = groundLayer.getTileAtWorldXY(explodeXYs.top.x, explodeXYs.top.y)
            explodeXYs.bottom.tile = groundLayer.getTileAtWorldXY(explodeXYs.bottom.x, explodeXYs.bottom.y)
            explodeXYs.left.tile = groundLayer.getTileAtWorldXY(explodeXYs.left.x, explodeXYs.left.y)
            explodeXYs.right.tile = groundLayer.getTileAtWorldXY(explodeXYs.right.x, explodeXYs.right.y)


            const noExplodeTileNames = ['wall', 'bricks'];
          

            // get tiles where we have to show explode fire
            if (explodeXYs.top.tile 
                && !noExplodeTileNames.includes(explodeXYs.top.tile.properties.name) 
                && ! explodeXYs.top.tile.getData('bomb-fire') // not a bomb fire
                && !stopExplode.top) {
                explodeSprites.push({
                    // top
                    dir: 'top',
                    sprite: this._createExplodeFireSprite(explodeXYs.top.x, explodeXYs.top.y, 'top'),
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
                    sprite: this._createExplodeFireSprite(explodeXYs.bottom.x, explodeXYs.bottom.y, 'bottom'),
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
                    sprite: this._createExplodeFireSprite(explodeXYs.left.x, explodeXYs.left.y, 'left'),
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
                    sprite: this._createExplodeFireSprite(explodeXYs.right.x, explodeXYs.right.y, 'right'),
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

        for (let explodeSprite of explodeSprites) {            
            this.fireGroup.add(explodeSprite.sprite);            
        }
        this.scene.physics.add.overlap(this.scene.players, this.fireGroup, (player, fireSprite) => {
            player.die();
        });

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

