import Level from "../models/Level";
import Player from "../models/Player";
import Bomb from "../models/Bomb";
import _ from "underscore";
import config from '../config';

const intersects = Phaser.Geom.Intersects.RectangleToRectangle;
const tileSize = 16;

export class Map1Scene extends Phaser.Scene {

    constructor() {
        super('Map1');
        this.cursors = null;
        this.player = null;

        this.keyALastState = false;
    }

    preload() {
        this.load.audio('titleTrack', ['src/assets/audio/all/3 - Track 3.mp3']);
        this.load.audio('bomb-explode', ['src/assets/audio/bomb-explode.mp3']);
        this.load.atlas('objects', 'src/assets/images/objects.png', 'src/assets/images/objects.json');

        Level.loadMap(this, "map1", "src/maps/map2.json");
    }

    create() {
        this.sound.pauseOnBlur = false;
        // this.sound.add('titleTrack').play({loop: true});
        this.audioBombExplode = this.sound.add('bomb-explode');


        this.level = new Level(this, 'map1');
        this.player = this.level.addPlayer();
        
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyA = this.input.keyboard.addKey('A');

        // const debugGraphics = this.add.graphics().setAlpha(0.75);
        //   this.level.groundLayer.renderDebug(debugGraphics, {tileColor: null,collidingTileColor: new Phaser.Display.Color(243, 134, 48, 255), // Color of colliding tilesfaceColor: new Phaser.Display.Color(40, 39, 37, 255) // Color of colliding face edges
        // });
        // PhaserGUIAction(this);
    }

    update(time, delta) {

        this.player.update();

       
        const tileUnderPlayer = this.player.getTile();
        
        // add a bomb
        if (this.keyA.isDown && this.keyALastState != this.keyA.isDown) {
            
            if (!tileUnderPlayer.getData('bomb')) {

                const bomb = new Bomb(
                    this,
                    tileUnderPlayer.pixelX + tileSize/2,
                    tileUnderPlayer.pixelY + tileSize/2,
                    this.level
                );

                
                bomb.setData('tile', tileUnderPlayer);
                tileUnderPlayer.setData('bomb', true);

                bomb.once('animationcomplete', () => {
                    
                    // get inforamtion for explosion
                    const explodeTilesLength = bomb.getData('explodeTilesLength');
                    const explodeTileXY = {
                        x: bomb.x, 
                        y: bomb.y
                    };

                    // destroy bomb
                    bomb.getData('tile').removeData('bomb');

                    bomb.destroy();

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










