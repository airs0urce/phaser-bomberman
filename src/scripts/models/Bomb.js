
export default class Bomb extends Phaser.Physics.Arcade.Sprite {
    static #animsLoaded = false;

    constructor(player, x, y, level) {
        super(player.scene, x, y, 'atlas', 'bomb-pending-1.png');

        this.level = level;
        this.player = player;
        this.scene = player.scene;

        player.scene.add.existing(this);
        player.scene.physics.add.existing(this, true)

        this.setDepth(1);
        this.setName('bomb');
        
        const tile = player.getTile();

        this.setData('explodeTilesAround', this.player.explodeTilesAround);
        this.setData('tile', tile);
        tile.setData('bomb', true);
        
        level.addBomb(this);

        this._addAnims();
        this.anims.play("bomb-pending", true);
        this.once('animationcomplete', this.explode);
    }

    static preload(scene) {
        scene.load.audio('bomb-explode', ['src/assets/audio/bomb-explode.mp3']);
    }

    explode() {
        // get inforamtion for explosion
        const explodeTilesAround = this.player.getData('explodeTilesAround');
        const explodeTileXY = {x: this.x, y: this.y};

        // this.audioBombExplode.play();

        const explodeSprites = [];
        explodeSprites.push({
            sprite: this.scene.add.sprite(explodeTileXY.x, explodeTileXY.y),
            anim: 'bomb-explode-center',
            angle: 0
        });
        const stopExplode = {top: false, bottom: false, left: false, right: false};
        for (let i = 1; i <= explodeTilesAround; i++) {
            const tail = explodeTilesAround == i;

            const explodeXYs = {
                top: {
                    x: explodeTileXY.x, 
                    y: explodeTileXY.y - i*tileSize,
                    tile: null
                },
                bottom: {
                    x: explodeTileXY.x, 
                    y: explodeTileXY.y + i*tileSize,
                    tile: null
                },
                left: {
                    x: explodeTileXY.x - i*tileSize, 
                    y: explodeTileXY.y,
                    tile: null
                },
                right: {
                    x: explodeTileXY.x + i*tileSize, 
                    y: explodeTileXY.y,
                    tile: null
                },
            };

            explodeXYs.top.tile = this.level.groundLayer.getTileAtWorldXY(explodeXYs.top.x, explodeXYs.top.y)
            explodeXYs.bottom.tile = this.level.groundLayer.getTileAtWorldXY(explodeXYs.bottom.x, explodeXYs.bottom.y)
            explodeXYs.left.tile = this.level.groundLayer.getTileAtWorldXY(explodeXYs.left.x, explodeXYs.left.y)
            explodeXYs.right.tile = this.level.groundLayer.getTileAtWorldXY(explodeXYs.right.x, explodeXYs.right.y)


            const noExplodeTileNames = ['wall', 'bricks'];

            if (explodeXYs.top.tile && 
                !noExplodeTileNames.includes(explodeXYs.top.tile.properties.name) 
                && !stopExplode.top) {
                explodeSprites.push({
                    // top
                    sprite: this.scene.add.sprite(explodeXYs.top.x, explodeXYs.top.y),
                    anim: (tail ? 'bomb-explode-tail': 'bomb-explode-line'),
                    angle: -90,
                });
            } else {
                stopExplode.top = true;
            }

            if (explodeXYs.bottom.tile 
                && !noExplodeTileNames.includes(explodeXYs.bottom.tile.properties.name) 
                && !stopExplode.bottom) {
                explodeSprites.push({
                    // bottom
                    sprite: this.scene.add.sprite(explodeXYs.bottom.x, explodeXYs.bottom.y),
                    anim: (tail ? 'bomb-explode-tail': 'bomb-explode-line'),
                    angle: 90,
                });
            } else {
                stopExplode.bottom = true;
            }

            if (explodeXYs.left.tile 
                && !noExplodeTileNames.includes(explodeXYs.left.tile.properties.name) 
                && !stopExplode.left) {
                explodeSprites.push({
                    // left
                    sprite: this.scene.add.sprite(explodeXYs.left.x, explodeXYs.left.y),
                    anim: (tail ? 'bomb-explode-tail': 'bomb-explode-line'),
                    angle: 180,
                });
            } else {
                stopExplode.left = true;
            }

            if (explodeXYs.right.tile
                && !noExplodeTileNames.includes(explodeXYs.right.tile.properties.name) 
                && !stopExplode.right) {
                explodeSprites.push({
                    // right
                    sprite: this.scene.add.sprite(explodeXYs.right.x, explodeXYs.right.y),
                    anim: (tail ? 'bomb-explode-tail': 'bomb-explode-line'),
                    angle: 0,
                });
            } else {
                stopExplode.right = true;
            }
        }

        let letListenSecondFrameAdded = false;
        for (let explodeSprite of explodeSprites) {
            explodeSprite.sprite.setAngle(explodeSprite.angle);
            explodeSprite.sprite.once('animationcomplete', () => {
                explodeSprite.sprite.destroy();
            });
            if (! letListenSecondFrameAdded) {
                explodeSprite.sprite.once('animationupdate', (animation, frame, gameObject) => {
                    if (frame.textureFrame != 'bomb-explode-2-center.png') {
                        alert('ISSUE!');
                    }
                    // here we can explode bombs that touching fire

                });
            }
            letListenSecondFrameAdded = true;

            explodeSprite.sprite.anims.play(explodeSprite.anim);
        }

        // destroy bomb
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
            ],
            frameRate: 4,
            repeat: 1,
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

