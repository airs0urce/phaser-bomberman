const config = require('../config');

let animsLoaded = false;
let explodeSoundPlaying = 0;
const safePlayerOverlapPx = 6;

module.exports = class Bomb extends Phaser.Physics.Arcade.Sprite {

    constructor(player, x, y) {
        super(player.scene, x, y, 'atlas', 'bomb-pending-1.png');

        this.player = player;
        this.scene = player.scene;
        this.level = player.level;

        player.scene.add.existing(this);
        player.scene.physics.add.existing(this, true)

        this.explodeStarted = false;
        this.touchingBombs = [];

        this.setDepth(1);
        this.setName('bomb');
        
        const tile = player.getTile();
        tile.setData('bomb', this);

        this.setData('bombPower', this.player.bombPower);
        this.setData('tile', tile);
        
        this.level.addBomb(this);

        this.scene.sounds.bombPlace.play({delay: 0.02});

        this._addAnims();
        this.play("bomb-pending");
        this.once('animationcomplete', this.explode);

        this.fireGroup = this.scene.add.group();
        this.destructingGroup = this.scene.add.group();

        this.scene.physics.add.collider(this.level.players, this.destructingGroup);
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
            width: config.tileSize - safePlayerOverlapPx*2, 
            height: config.tileSize - safePlayerOverlapPx*2
        };
        sprite.body.setSize(bodySize.width, bodySize.height);
        sprite.body.setOffset(
            safePlayerOverlapPx, 
            safePlayerOverlapPx
        );

        return sprite;   
    }

    _wallDestroy(tile) {
        const wallDestruct = this.scene.physics.add.staticSprite(tile.pixelX, tile.pixelY,);

        wallDestruct.setOrigin(0);
        wallDestruct.body.setSize(config.tileSize, config.tileSize);
        wallDestruct.body.setOffset(config.tileSize);
        const tileSetId = tile.properties.tile_set_id;

        this.destructingGroup.add(wallDestruct);

        const dropped = this.level.dropBonusIfNeed(tile);
        if (dropped) {
            wallDestruct.visible = false;
        }
        
        this.level.map.replaceTile(tile, {name: 'ground', tile_set_id: tileSetId});

        wallDestruct.play(`brick-destroy-tileset${tileSetId}`);
        wallDestruct.once('animationcomplete', () => {
            wallDestruct.destroy();
        });
    }

    _bonusDestroy(bonus) {
        bonus.play(`bonus-explode`);
        bonus.once('animationcomplete', () => {
            bonus.getData('tile').removeData('bonus')
            bonus.destroy();
        });   
    }

    explode() {
        if (this.explodeStarted) {
            return;
        }
        if (this.level.gameFinished) {
            // continue pending animation
            this.play("bomb-pending-forever");
            return;
        }
        this.explodeStarted = true;
        // get inforamtion for explosion
        const bombPower = this.player.bombPower;
        const explodeTileXY = {x: this.x, y: this.y};

        
        if (explodeSoundPlaying >= 1) {
            this.scene.sounds.bombExplode.play({seek: 0.3});
        } else {
            this.scene.sounds.bombExplode.play({seek: 0});
        }
        explodeSoundPlaying += 1;
        this.scene.sounds.bombExplode.once('complete', () => {
            explodeSoundPlaying--;
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
        for (let i = 1; i <= bombPower; i++) {
            const tail = bombPower == i;

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

            if (! stopExplode.top && explodeXYs.top.tile) {
                if (!noExplodeTileNames.includes(explodeXYs.top.tile.properties.name) 
                    && !explodeXYs.top.tile.getData('bomb-fire-center')
                    && !explodeXYs.top.tile.getData('bomb')
                    && !explodeXYs.top.tile.getData('bonus')) {
                    explodeSprites.push({
                        // top
                        dir: 'top',
                        sprite: this._createExplodeFireSprite(explodeXYs.top.x, explodeXYs.top.y, 'top'),
                        anim: (tail ? 'bomb-explode-tail': 'bomb-explode-line'),
                        tile: explodeXYs.top.tile
                    });
                } else {
                    if (explodeXYs.top.tile.getData('bonus')) {
                        this._bonusDestroy(explodeXYs.top.tile.getData('bonus'));
                    }
                    if (explodeXYs.top.tile.properties.name === 'bricks') {
                        this._wallDestroy(explodeXYs.top.tile);
                    }

                    if (!explodeXYs.top.tile.getData('bomb-fire')) {
                        stopExplode.top = true;    
                    }

                    if (explodeXYs.top.tile.getData('bomb')) {
                        this.touchingBombs.push(explodeXYs.top.tile.getData('bomb'));
                    }
                    
                }
                if (explodeXYs.top.tile.getData('bomb-fire-center')) {
                     stopExplode.top = true;   
                }
            }

            if (! stopExplode.bottom && explodeXYs.bottom.tile) {
                if (!noExplodeTileNames.includes(explodeXYs.bottom.tile.properties.name)
                    && !explodeXYs.bottom.tile.getData('bomb-fire-center')
                    && !explodeXYs.bottom.tile.getData('bomb')
                    && !explodeXYs.bottom.tile.getData('bonus')) {
                    explodeSprites.push({
                        // bottom
                        dir: 'bottom',
                        sprite: this._createExplodeFireSprite(explodeXYs.bottom.x, explodeXYs.bottom.y, 'bottom'),
                        anim: (tail ? 'bomb-explode-tail': 'bomb-explode-line'),
                        tile: explodeXYs.bottom.tile
                    });
                } else {
                    if (explodeXYs.bottom.tile.getData('bonus')) {
                        this._bonusDestroy(explodeXYs.bottom.tile.getData('bonus'));
                    }
                    if (explodeXYs.bottom.tile.properties.name === 'bricks') {
                        this._wallDestroy(explodeXYs.bottom.tile);
                    }
                    
                    if (!explodeXYs.bottom.tile.getData('bomb-fire')) {
                        stopExplode.bottom = true;
                    }
                    if (explodeXYs.bottom.tile.getData('bomb')) {
                        this.touchingBombs.push(explodeXYs.bottom.tile.getData('bomb'));
                    }
                }
                if (explodeXYs.bottom.tile.getData('bomb-fire-center')) {
                     stopExplode.bottom = true;   
                }
            }

            if (! stopExplode.left && explodeXYs.left.tile) {
                if (!noExplodeTileNames.includes(explodeXYs.left.tile.properties.name)
                    && !explodeXYs.left.tile.getData('bomb-fire-center')
                    && !explodeXYs.left.tile.getData('bomb')
                    && !explodeXYs.left.tile.getData('bonus')) {
                    explodeSprites.push({
                        // left
                        dir: 'left',
                        sprite: this._createExplodeFireSprite(explodeXYs.left.x, explodeXYs.left.y, 'left'),
                        anim: (tail ? 'bomb-explode-tail': 'bomb-explode-line'),
                        tile: explodeXYs.left.tile
                    });
                } else {
                    if (explodeXYs.left.tile.getData('bonus')) {
                        this._bonusDestroy(explodeXYs.left.tile.getData('bonus'));
                    }
                    if (explodeXYs.left.tile.properties.name === 'bricks') {
                        this._wallDestroy(explodeXYs.left.tile);
                    }
                    
                    if (!explodeXYs.left.tile.getData('bomb-fire')) {
                        stopExplode.left = true;
                    }

                    if (explodeXYs.left.tile.getData('bomb')) {
                        this.touchingBombs.push(explodeXYs.left.tile.getData('bomb'));
                    }
                }
                if (explodeXYs.left.tile.getData('bomb-fire-center')) {
                     stopExplode.left = true;   
                }
            }


            if (! stopExplode.right && explodeXYs.right.tile) {
                if (!noExplodeTileNames.includes(explodeXYs.right.tile.properties.name)
                    && !explodeXYs.right.tile.getData('bomb-fire-center')
                    && !explodeXYs.right.tile.getData('bomb')
                    && !explodeXYs.right.tile.getData('bonus')) {     
                    explodeSprites.push({
                        // right
                        dir: 'right',
                        sprite: this._createExplodeFireSprite(explodeXYs.right.x, explodeXYs.right.y, 'right'),
                        anim: (tail ? 'bomb-explode-tail': 'bomb-explode-line'),
                        tile: explodeXYs.right.tile
                    });
                } else {
                    if (explodeXYs.right.tile.getData('bonus')) {
                        this._bonusDestroy(explodeXYs.right.tile.getData('bonus'));
                    }
                    if (explodeXYs.right.tile.properties.name === 'bricks') {
                        this._wallDestroy(explodeXYs.right.tile);
                    }
                    if (!explodeXYs.right.tile.getData('bomb-fire')) {
                        stopExplode.right = true;
                    }
                    if (explodeXYs.right.tile.getData('bomb')) {
                        this.touchingBombs.push(explodeXYs.right.tile.getData('bomb'));
                    }
                }
                if (explodeXYs.right.tile.getData('bomb-fire-center')) {
                     stopExplode.right = true;   
                }
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

            if (centerSprite) {
                explodeSprite.tile.setData('bomb-fire-center', true);
            } else {
                explodeSprite.tile.setData('bomb-fire', true);
            }
            
            explodeSprite.sprite.play(explodeSprite.anim);
            explodeSprite.sprite.once('animationcomplete', () => {
                explodeSprite.sprite.destroy();
            });

            if (centerSprite) {
                explodeSprite.sprite.once('animationupdate', (animation, frame, gameObject) => {
                    if (frame.textureFrame != 'bomb-explode-2-center.png') {
                        alert('ISSUE!!!');
                    }


                    // explode bombs that touching fire from this bomb                    
                    for (const bomb of this.touchingBombs) {
                        bomb.explode();
                    }
                });
                explodeSprite.sprite.once('animationcomplete', () => {
                    for (let explodeSprite of explodeSprites) {
                        explodeSprite.tile.removeData('bomb-fire');
                        explodeSprite.tile.removeData('bomb-fire-center');
                    }
                    this.level.removeBomb(this);
                })
            }
            centerSprite = false;
            
        }

        this.getData('tile').removeData('bomb');
        this.visible = false;
    }

    destroy() {
        super.destroy();
        this.level.removeBomb(this);
    }

    _addAnims() {
        if (animsLoaded) {
            return;
        }
        animsLoaded = true;

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

        anims.create({
            key: "bomb-pending-forever",
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

