import {Player} from "../models/Player";
import _ from "underscore";

const intersects = Phaser.Geom.Intersects.RectangleToRectangle;
const tileSize = 16;

export class Map1Scene extends Phaser.Scene {

    constructor() {
        super('Map1');
        this.groundLayer = null;
        this.cursors = null;
        this.player = null;

        this.keyALastState = false;
    }

    preload() {
        this.load.audio('titleTrack', ['src/assets/audio/all/3 - Track 3.mp3']);
        this.load.audio('bomb-explode', ['src/assets/audio/bomb-explode.mp3']);
        this.load.tilemapTiledJSON("map1", "src/maps/map2.json");
        this.load.atlas('objects', 'src/assets/images/objects.png', 'src/assets/images/objects.json');
    }

    create() {

        const map = this.make.tilemap({key: 'map1'});
        const groundTilemap = map.addTilesetImage('tileset-ground');

        // create the ground layer    
        this.groundLayer = map.createDynamicLayer('ground', groundTilemap, 0, 0);
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        // set the boundaries of our game world
        this.physics.world.bounds.width = this.groundLayer.width;
        this.physics.world.bounds.height = this.groundLayer.height;


        this.sound.pauseOnBlur = false;
        // this.sound.add('titleTrack').play({loop: true});
        this.audioBombExplode = this.sound.add('bomb-explode');


        

        // new Player(this, 1, 1);



        // const debugGraphics = this.add.graphics().setAlpha(0.75);
        //   this.groundLayer.renderDebug(debugGraphics, {tileColor: null,collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tilesfaceColor: new Phaser.Display.Color(40, 39, 37, 255) // Color of colliding face edges
        // });


        this.player = this.physics.add.sprite(tileSize, tileSize, 'objects', 'man-blue-move-down.png');
        this.player.setName('player');
        this.player.body.setSize(15, tileSize);
        this.player.setOffset(4, 5);
        this.player.setDisplayOrigin(4, 5);
        this.player.setDepth(10);

        this.bombs = this.add.group();

        this.physics.add.collider(this.player, this.groundLayer);
        this.physics.add.collider(this.player, this.bombs);
        this.physics.add.overlap(this.player, this.bombs, (player, bomb) => {
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



        const anims = this.anims;
        anims.create({
            key: "man-blue-left-walk",
            frames: [
                {key: 'objects', frame: 'man-blue-move-left.png'},
                {key: 'objects', frame: 'man-blue-move-left-anim-1.png'},
                {key: 'objects', frame: 'man-blue-move-left.png'},
                {key: 'objects', frame: 'man-blue-move-left-anim-2.png'},
            ],
            frameRate: 8,
            repeat: -1,
        });
        anims.create({
            key: "man-blue-right-walk",
            frames: [
                {key: 'objects', frame: 'man-blue-move-right.png'},
                {key: 'objects', frame: 'man-blue-move-right-anim-1.png'},
                {key: 'objects', frame: 'man-blue-move-right.png'},
                {key: 'objects', frame: 'man-blue-move-right-anim-2.png'},
            ],
            frameRate: 8,
            repeat: -1
        });
        anims.create({
            key: "man-blue-up-walk",
            frames: [
                {key: 'objects', frame: 'man-blue-move-up.png'},
                {key: 'objects', frame: 'man-blue-move-up-anim-1.png'},
                {key: 'objects', frame: 'man-blue-move-up.png'},
                {key: 'objects', frame: 'man-blue-move-up-anim-2.png'},
            ],
            frameRate: 8,
            repeat: -1
        });
        anims.create({
            key: "man-blue-down-walk",
            frames: [
                {key: 'objects', frame: 'man-blue-move-down.png'},
                {key: 'objects', frame: 'man-blue-move-down-anim-1.png'},
                {key: 'objects', frame: 'man-blue-move-down.png'},
                {key: 'objects', frame: 'man-blue-move-down-anim-2.png'},
            ],
            frameRate: 8,
            repeat: -1
        });

        anims.create({
            key: "bomb-pending",
            frames: [
                {key: 'objects', frame: 'bomb-pending-1.png'},
                {key: 'objects', frame: 'bomb-pending-2.png'},
                {key: 'objects', frame: 'bomb-pending-1.png'},
                {key: 'objects', frame: 'bomb-pending-2.png'},
                {key: 'objects', frame: 'bomb-pending-1.png'},
                {key: 'objects', frame: 'bomb-pending-3.png'},
            ],
            frameRate: 4,
            repeat: 1,
        });


        const bombExplodeFrameRate = 14;
        anims.create({
            key: "bomb-explode-center",
            frames: [
                {key: 'objects', frame: 'bomb-explode-1-center.png'},
                {key: 'objects', frame: 'bomb-explode-2-center.png'},
                {key: 'objects', frame: 'bomb-explode-3-center.png'},
                {key: 'objects', frame: 'bomb-explode-4-center.png'},
                {key: 'objects', frame: 'bomb-explode-3-center.png'},
                {key: 'objects', frame: 'bomb-explode-2-center.png'},
                {key: 'objects', frame: 'bomb-explode-1-center.png'},
            ],
            frameRate: bombExplodeFrameRate,
            repeat: 0,
        });
        anims.create({
            key: "bomb-explode-line",
            frames: [
                {key: 'objects', frame: 'bomb-explode-1-line.png'},
                {key: 'objects', frame: 'bomb-explode-2-line.png'},
                {key: 'objects', frame: 'bomb-explode-3-line.png'},
                {key: 'objects', frame: 'bomb-explode-4-line.png'},
                {key: 'objects', frame: 'bomb-explode-3-line.png'},
                {key: 'objects', frame: 'bomb-explode-2-line.png'},
                {key: 'objects', frame: 'bomb-explode-1-line.png'},
            ],
            frameRate: bombExplodeFrameRate,
            repeat: 0,
        });
        anims.create({
            key: "bomb-explode-tail",
            frames: [
                {key: 'objects', frame: 'bomb-explode-1-tail.png'},
                {key: 'objects', frame: 'bomb-explode-2-tail.png'},
                {key: 'objects', frame: 'bomb-explode-3-tail.png'},
                {key: 'objects', frame: 'bomb-explode-4-tail.png'},
                {key: 'objects', frame: 'bomb-explode-3-tail.png'},
                {key: 'objects', frame: 'bomb-explode-2-tail.png'},
                {key: 'objects', frame: 'bomb-explode-1-tail.png'},
            ],
            frameRate: bombExplodeFrameRate,
            repeat: 0,
        });


        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey('A');


        // setInterval(() => {
        //   console.log(this.player);
        // }, 5000)
        // console.log(this.groundLayer);
        // window.groundLayer = this.groundLayer

        // PhaserGUIAction(this);
    }

    update(time, delta) {
        const speed = 70;

        // Stop any previous movement from the last frame
        this.player.body.setVelocity(0);

        // Movement
        if (this.cursors.left.isDown && this.player.getData('blockMovement') !== 'left') {
            this.player.body.setVelocityX(-speed);
        } else if (this.cursors.right.isDown && this.player.getData('blockMovement') !== 'right') {
            this.player.body.setVelocityX(speed);
        } else if (this.cursors.up.isDown && this.player.getData('blockMovement') !== 'up') {
            this.player.body.setVelocityY(-speed);
        } else if (this.cursors.down.isDown && this.player.getData('blockMovement') !== 'down') {
            this.player.body.setVelocityY(speed);
        }
        this.player.setData('blockMovement', null);

        // Movement animations
        if (this.cursors.left.isDown) {
            this.player.anims.play("man-blue-left-walk", true);
        } else if (this.cursors.right.isDown) {
            this.player.anims.play("man-blue-right-walk", true);
        } else if (this.cursors.up.isDown) {
            this.player.anims.play("man-blue-up-walk", true);
        } else if (this.cursors.down.isDown) {
            this.player.anims.play("man-blue-down-walk", true);
        } else {
            if (this.player.anims.currentAnim) {
                this.player.anims.setCurrentFrame(this.player.anims.currentAnim.frames[0]);
                this.player.anims.stop();
            }
        }


        let tileUnderPlayer = null;
        
        if (this.cursors.left.isDown 
            || this.cursors.right.isDown 
            || this.cursors.up.isDown 
            || this.cursors.down.isDown
            || this.keyA.isDown
        ) {

            tileUnderPlayer = this.groundLayer.getTileAtWorldXY(
                this.player.body.center.x, 
                this.player.body.center.y
            );
        }

        // collision sliding
        

        if (this.cursors.right.isDown && this.player.body.blocked.right) {

            const upRightTile = this.groundLayer.getTileAtWorldXY(this.player.body.x + tileSize + 1, this.player.body.y);
            const downRightTile = this.groundLayer.getTileAtWorldXY(this.player.body.x + tileSize + 1, this.player.body.y + tileSize - 1);

            if (!upRightTile.getData('bomb') && !downRightTile.getData('bomb')) {
                if (upRightTile && upRightTile.properties.name == 'ground') {
                    this.player.body.setVelocityY(-speed);
                } else if (downRightTile && downRightTile.properties.name == 'ground') {
                    this.player.body.setVelocityY(speed);
                }
            }

        }
        if (this.cursors.left.isDown && this.player.body.blocked.left) {
            const upLeftTile = this.groundLayer.getTileAtWorldXY(this.player.body.x - 1, this.player.body.y);
            const downLeftTile = this.groundLayer.getTileAtWorldXY(this.player.body.x - 1, this.player.body.y + tileSize - 1);
            
            if (!upLeftTile.getData('bomb') && !downLeftTile.getData('bomb')) {
                if (upLeftTile && upLeftTile.properties.name == 'ground') {
                    this.player.body.setVelocityY(-speed);
                } else if (downLeftTile && downLeftTile.properties.name == 'ground') {
                    this.player.body.setVelocityY(speed);
                }
            }
        }
        if (this.cursors.up.isDown && this.player.body.blocked.up) {

            const upLeftTile = this.groundLayer.getTileAtWorldXY(this.player.body.x, this.player.body.y - 1);
            const upRightTile = this.groundLayer.getTileAtWorldXY(this.player.body.x + tileSize - 1, this.player.body.y - 1);

            if (!upLeftTile.getData('bomb') && !upRightTile.getData('bomb')) {
                if (upLeftTile && upLeftTile.properties.name == 'ground') {
                    this.player.body.setVelocityX(-speed);
                } else if (upRightTile && upRightTile.properties.name == 'ground') {
                    this.player.body.setVelocityX(speed);
                }
            }
        }
        if (this.cursors.down.isDown && this.player.body.blocked.down) {
            const downLeftTile = this.groundLayer.getTileAtWorldXY(this.player.body.x, this.player.body.y + tileSize + 1);
            const downRightTile = this.groundLayer.getTileAtWorldXY(this.player.body.x + tileSize - 1, this.player.body.y + tileSize + 1);

            if (!downLeftTile.getData('bomb') && !downRightTile.getData('bomb')) {
                if (downLeftTile && downLeftTile.properties.name == 'ground') {
                    this.player.body.setVelocityX(-speed);
                } else if (downRightTile && downRightTile.properties.name == 'ground') {
                    this.player.body.setVelocityX(speed);
                }
            }
        }

        // add a bomb
        if (this.keyA.isDown && this.keyALastState != this.keyA.isDown) {
            
            if (!tileUnderPlayer.getData('bomb')) {
                const bomb = this.physics.add.staticSprite(
                    tileUnderPlayer.pixelX + tileSize / 2,
                    tileUnderPlayer.pixelY + tileSize / 2,
                    'objects', 'bomb-pending-1.png'
                );


                bomb.explodeTilesLength = 2;
                bomb.setDepth(1);
                bomb.setName('bomb');
                bomb.setData('tile', tileUnderPlayer);
                // bomb.setSize(4, 4);
                tileUnderPlayer.setData('bomb', true);
                bomb.anims.play("bomb-pending", true);

                this.bombs.add(bomb);

                bomb.once('animationcomplete', () => {
                    
                    // get inforamtion for explosion
                    const explodeTilesLength = bomb.explodeTilesLength;
                    const explodeTileXY = {
                        x: bomb.x, 
                        y: bomb.y
                    };

                    // destroy bomb
                    bomb.getData('tile').removeData('bomb');
                    this.bombs.remove(bomb, true, true);

                    // this.audioBombExplode.play();

                    const explodeSprites = [];
                    explodeSprites.push({
                        sprite: this.add.sprite(explodeTileXY.x, explodeTileXY.y),
                        anim: 'bomb-explode-center',
                        angle: 0
                    });
                    const stopExplode = {top: false, bottom: false, left: false, right: false};
                    for (let i = 1; i <= explodeTilesLength; i++) {
                        const tail = explodeTilesLength == i;

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

                        explodeXYs.top.tile = this.groundLayer.getTileAtWorldXY(explodeXYs.top.x, explodeXYs.top.y)
                        explodeXYs.bottom.tile = this.groundLayer.getTileAtWorldXY(explodeXYs.bottom.x, explodeXYs.bottom.y)
                        explodeXYs.left.tile = this.groundLayer.getTileAtWorldXY(explodeXYs.left.x, explodeXYs.left.y)
                        explodeXYs.right.tile = this.groundLayer.getTileAtWorldXY(explodeXYs.right.x, explodeXYs.right.y)


                        const noExplodeTileNames = ['wall', 'bricks'];
     
                        if (explodeXYs.top.tile && 
                            !noExplodeTileNames.includes(explodeXYs.top.tile.properties.name) 
                            && !stopExplode.top) {
                            explodeSprites.push({
                                // top
                                sprite: this.add.sprite(explodeXYs.top.x, explodeXYs.top.y),
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
                                sprite: this.add.sprite(explodeXYs.bottom.x, explodeXYs.bottom.y),
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
                                sprite: this.add.sprite(explodeXYs.left.x, explodeXYs.left.y),
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
                                sprite: this.add.sprite(explodeXYs.right.x, explodeXYs.right.y),
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
                });

            }
        }
        this.keyALastState = this.keyA.isDown;

    }

    
}










