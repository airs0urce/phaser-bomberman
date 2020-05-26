const config = require('../config');
const Bomb = require('./Bomb');

let animsLoaded = false;

class Player extends Phaser.Physics.Arcade.Sprite {
    
    constructor(level, x, y, type = 'blue') {
        super(level.scene, x, y, 'atlas', `man-${type}-move-down.png`);
        this.type = type;

        this.tile = null;
        this.speed = 68;
        this.keyADownLastState = false;

        this.handleMovements = true;
        this.tileInitialized = false;
        this.dieStarted = false;
        this.gamepadIndex = 0;
        this.bombPower = 2;
        this.bombsMax = 2;

        this.level = level;
        this.scene = level.scene;        

        this.groundLayer = this.level.groundLayer;

        this.scene.add.existing(this);
        this.scene.physics.add.existing(this)
        
        this.setName('player');
        this.body.setSize(config.tileSize - 1, config.tileSize);
        this.setOffset(4, 5);
        this.setDisplayOrigin(4, 5);
        this.setDepth(10);

        this._addAnims();        
    }

    setGamepadIndex(index) {
        this.gamepadIndex = index;
        return this;
    }

    update() {
        if (! this.active) {
            return;
        }
        const inputs = this.scene.inputs;

        const pressed = {up: false, down: false, left: false, right: false, placeBomb: false};
        
        if (this.type == 'blue') {
            pressed.up = inputs.cursors.up.isDown;
            pressed.down = inputs.cursors.down.isDown;
            pressed.left = inputs.cursors.left.isDown;
            pressed.right = inputs.cursors.right.isDown;
            pressed.placeBomb = inputs.keyA.isDown;
        }
        
        
        if (inputs.gamepad.total != 0) {
            const pad = inputs.gamepad.getPad(this.gamepadIndex);            
            if (pad) {

                switch (pad.getAxisValue(0)) {
                    case -1:
                        pressed.left = true;
                        break;
                    case 1:
                        pressed.right = true;
                        break;
                }
                switch (pad.getAxisValue(1)) {
                    case -1:
                        pressed.up = true;
                        break;
                    case 1:
                        pressed.down = true;
                        break;
                }
                

                if (! pressed.up) {
                    pressed.up = pad.up;
                }
                if (! pressed.down) {
                    pressed.down = pad.down;
                }
                if (! pressed.left) {
                    pressed.left = pad.left;
                }
                if (! pressed.right) {
                    pressed.right = pad.right;
                }
                if (! pressed.placeBomb) {
                    pressed.placeBomb = pad.A;
                }
            }
        }
        this.pressed = pressed;

        this._updateTile();
        this._updateMovements();
        this._updateCollisionSliding();
        this._updateDropBomb();
    }

    die() {
        if (this.dieStarted) {
            return;
        }
        this.dieStarted = true;

        this.handleMovements = false;
        this.scene.sounds.playerDie.play();
        this.body.stop();
        this.play(`man-${this.type}-die`, true);
        this.once(`animationcomplete-man-${this.type}-die`, (currentAnim, currentFrame, sprite) => {
            sprite.destroy();
        })

    }

    getTile() {
        return this.getData('tile');
    }

    _updateMovements() {
        if (! this.handleMovements) {
            return;
        }
        // Stop any previous movement from the last frame
        this.body.setVelocity(0);

        // Movement
        if (this.pressed.left && this.getData('blockMovement') !== 'left') {
            this.body.setVelocityX(-this.speed);
        } else if (this.pressed.right && this.getData('blockMovement') !== 'right') {
            this.body.setVelocityX(this.speed);
        } else if (this.pressed.up && this.getData('blockMovement') !== 'up') {
            this.body.setVelocityY(-this.speed);
        } else if (this.pressed.down && this.getData('blockMovement') !== 'down') {
            this.body.setVelocityY(this.speed);
        }
        this.setData('blockMovement', null);

        // Movement animations
        if (this.pressed.left) {
            this.play(`man-${this.type}-left-walk`, true);
        } else if (this.pressed.right) {
            this.play(`man-${this.type}-right-walk`, true);
        } else if (this.pressed.up) {
            this.play(`man-${this.type}-up-walk`, true);
        } else if (this.pressed.down) {
            this.play(`man-${this.type}-down-walk`, true);
        } else {
            if (this.anims.currentAnim) {
                this.anims.setCurrentFrame(this.anims.currentAnim.frames[0]);
                this.anims.stop();
            }
        }
    }

    _updateCollisionSliding() {
        // collision sliding
        if (this.pressed.right && this.body.blocked.right) {
            const upRightTile = this.groundLayer.getTileAtWorldXY(this.body.x + config.tileSize + 1, this.body.y);
            const downRightTile = this.groundLayer.getTileAtWorldXY(this.body.x + config.tileSize + 1, this.body.y + config.tileSize - 1);

            if (!upRightTile.getData('bomb') && !downRightTile.getData('bomb')) {
                if (upRightTile && upRightTile.properties.name == 'ground') {
                    this.body.setVelocityY(-this.speed);
                } else if (downRightTile && downRightTile.properties.name == 'ground') {
                    this.body.setVelocityY(this.speed);
                }
            }

        }
        if (this.pressed.left && this.body.blocked.left) {
            const upLeftTile = this.groundLayer.getTileAtWorldXY(this.body.x - 1, this.body.y);
            const downLeftTile = this.groundLayer.getTileAtWorldXY(this.body.x - 1, this.body.y + config.tileSize - 1);
            
            if (!upLeftTile.getData('bomb') && !downLeftTile.getData('bomb')) {
                if (upLeftTile && upLeftTile.properties.name == 'ground') {
                    this.body.setVelocityY(-this.speed);
                } else if (downLeftTile && downLeftTile.properties.name == 'ground') {
                    this.body.setVelocityY(this.speed);
                }
            }
        }
        if (this.pressed.up && this.body.blocked.up) {
            const upLeftTile = this.groundLayer.getTileAtWorldXY(this.body.x, this.body.y - 1);
            const upRightTile = this.groundLayer.getTileAtWorldXY(this.body.x + config.tileSize - 1, this.body.y - 1);
               
            if (!upLeftTile.getData('bomb') && !upRightTile.getData('bomb')) {
                if (upLeftTile && upLeftTile.properties.name == 'ground') {
                    this.body.setVelocityX(-this.speed);
                } else if (upRightTile && upRightTile.properties.name == 'ground') {
                    this.body.setVelocityX(this.speed);
                }
            }
        }
        if (this.pressed.down && this.body.blocked.down) {
            const downLeftTile = this.groundLayer.getTileAtWorldXY(this.body.x, this.body.y + config.tileSize + 1);
            const downRightTile = this.groundLayer.getTileAtWorldXY(this.body.x + config.tileSize - 1, this.body.y + config.tileSize + 1);

            if (!downLeftTile.getData('bomb') && !downRightTile.getData('bomb')) {
                if (downLeftTile && downLeftTile.properties.name == 'ground') {
                    this.body.setVelocityX(-this.speed);
                } else if (downRightTile && downRightTile.properties.name == 'ground') {
                    this.body.setVelocityX(this.speed);
                }
            }
        }
    }

    _updateTile() {

        if (this.pressed.left 
            || this.pressed.right
            || this.pressed.up
            || this.pressed.down
            || ! this.tileInitialized
        ) {
            // update tile under player
            const tile = this.groundLayer.getTileAtWorldXY(
                this.body.center.x, 
                this.body.center.y
            );
            this.setData('tile', tile);
            this.tileInitialized = true;
        }
    }

    _updateDropBomb() {
        // don't add bombs to other tiles when player moves with pressed A
        if (this.keyADownLastState == this.pressed.placeBomb) {
            return;
        } else {
            this.keyADownLastState = this.pressed.placeBomb;
        }
        if (! this.pressed.placeBomb) {
            return;
        }

        const tileUnderPlayer = this.getTile();
        
        // don't add bomb if there is already one
        if (tileUnderPlayer.getData('bomb')) {
            return;
        }

        // this.bombsMax
        const userBombs = this.level.bombs.getChildren().filter((bomb) => {
            return bomb.player == this && !bomb.explodeStarted;
        });
        if (userBombs.length >= this.bombsMax) {
            return;
        }


        // add a bomb
        const bomb = new Bomb(
            this,
            tileUnderPlayer.pixelX + config.tileSize/2,
            tileUnderPlayer.pixelY + config.tileSize/2,
        );
    }

    _addAnims() {
        
        if (animsLoaded) {
            return;
        }
        animsLoaded = true;

        const anims = this.scene.anims;

        for (let playerType of ['blue', 'red']) {
            anims.create({
                key: `man-${playerType}-left-walk`,
                frames: [
                    {key: 'atlas', frame: `man-${playerType}-move-left.png`},
                    {key: 'atlas', frame: `man-${playerType}-move-left-anim-1.png`},
                    {key: 'atlas', frame: `man-${playerType}-move-left.png`},
                    {key: 'atlas', frame: `man-${playerType}-move-left-anim-2.png`},
                ],
                frameRate: 9,
                repeat: -1,
            });
            
            anims.create({
                key: `man-${playerType}-right-walk`,
                frames: [
                    {key: 'atlas', frame: `man-${playerType}-move-right.png`},
                    {key: 'atlas', frame: `man-${playerType}-move-right-anim-1.png`},
                    {key: 'atlas', frame: `man-${playerType}-move-right.png`},
                    {key: 'atlas', frame: `man-${playerType}-move-right-anim-2.png`},
                ],
                frameRate: 9,
                repeat: -1
            });
            anims.create({
                key: `man-${playerType}-up-walk`,
                frames: [
                    {key: 'atlas', frame: `man-${playerType}-move-up.png`},
                    {key: 'atlas', frame: `man-${playerType}-move-up-anim-1.png`},
                    {key: 'atlas', frame: `man-${playerType}-move-up.png`},
                    {key: 'atlas', frame: `man-${playerType}-move-up-anim-2.png`},
                ],
                frameRate: 9,
                repeat: -1
            });
            anims.create({
                key: `man-${playerType}-down-walk`,
                frames: [
                    {key: 'atlas', frame: `man-${playerType}-move-down.png`},
                    {key: 'atlas', frame: `man-${playerType}-move-down-anim-1.png`},
                    {key: 'atlas', frame: `man-${playerType}-move-down.png`},
                    {key: 'atlas', frame: `man-${playerType}-move-down-anim-2.png`},
                ],
                frameRate: 9,
                repeat: -1
            });

            anims.create({
                key: `man-${playerType}-die`,
                frames: [
                    {key: 'atlas', frame: `man-${playerType}-die-1.png`},
                    {key: 'atlas', frame: `man-${playerType}-die-2.png`},
                    {key: 'atlas', frame: `man-${playerType}-die-3.png`},
                    {key: 'atlas', frame: `man-${playerType}-die-4.png`},
                    {key: 'atlas', frame: `man-${playerType}-die-5.png`},
                    {key: 'atlas', frame: `man-${playerType}-die-6.png`},
                    {key: 'atlas', frame: `man-${playerType}-die-7.png`},
                ],
                frameRate: 9,
                repeat: 0
            });
        }
        
    }

}

module.exports = Player;