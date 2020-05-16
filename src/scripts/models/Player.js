import config from '../config';
import Bomb from './Bomb';

export default class Player extends Phaser.Physics.Arcade.Sprite {
    static #animsLoaded = false;
    tile = null;
    speed = 70;
    keyADownLastState = false;
    explodeTilesAround = 3;

    constructor(level, x, y) {
        super(level.scene, x, y, 'atlas', 'man-blue-move-down.png');

        this.level = level;
        this.scene = level.scene;

        this.scene.add.existing(this);
        this.scene.physics.add.existing(this)
        
        this.setName('player');
        this.body.setSize(config.tileSize - 1, config.tileSize);
        this.setOffset(4, 5);
        this.setDisplayOrigin(4, 5);
        this.setDepth(10);

        this._addAnims();

        

    }

    static preload(scene) {
        
    }

    update(inputs) {

        const pressed = {up: false, down: false, left: false, right: false};
        pressed.up = this.scene.inputs.cursors.up.isDown;
        pressed.down = this.scene.inputs.cursors.down.isDown;
        pressed.left = this.scene.inputs.cursors.left.isDown;
        pressed.right = this.scene.inputs.cursors.right.isDown;
        pressed.placeBomb = this.scene.inputs.keyA.isDown;
        if (this.scene.inputs.gamepad.total != 0) {
            const pad = this.scene.inputs.gamepad.getPad(0);
            if (! pressed.up) pressed.up = pad.up;
            if (! pressed.down) pressed.down = pad.down;
            if (! pressed.left) pressed.left = pad.left;
            if (! pressed.right) pressed.right = pad.right;
            if (! pressed.placeBomb) pressed.placeBomb = pad.A;
        }

        this.pressed = pressed;

        this._updateTile();
        this._updateMovements();
        this._updateCollisionSliding();
        this._updateAddBomb();
    }

    _updateMovements() {

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
            this.anims.play("man-blue-left-walk", true);
        } else if (this.pressed.right) {
            this.anims.play("man-blue-right-walk", true);
        } else if (this.pressed.up) {
            this.anims.play("man-blue-up-walk", true);
        } else if (this.pressed.down) {
            this.anims.play("man-blue-down-walk", true);
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
            const upRightTile = this.level.groundLayer.getTileAtWorldXY(this.body.x + config.tileSize + 1, this.body.y);
            const downRightTile = this.level.groundLayer.getTileAtWorldXY(this.body.x + config.tileSize + 1, this.body.y + config.tileSize - 1);

            if (!upRightTile.getData('bomb') && !downRightTile.getData('bomb')) {
                if (upRightTile && upRightTile.properties.name == 'ground') {
                    this.body.setVelocityY(-this.speed);
                } else if (downRightTile && downRightTile.properties.name == 'ground') {
                    this.body.setVelocityY(this.speed);
                }
            }

        }
        if (this.pressed.left && this.body.blocked.left) {
            const upLeftTile = this.level.groundLayer.getTileAtWorldXY(this.body.x - 1, this.body.y);
            const downLeftTile = this.level.groundLayer.getTileAtWorldXY(this.body.x - 1, this.body.y + config.tileSize - 1);
            
            if (!upLeftTile.getData('bomb') && !downLeftTile.getData('bomb')) {
                if (upLeftTile && upLeftTile.properties.name == 'ground') {
                    this.body.setVelocityY(-this.speed);
                } else if (downLeftTile && downLeftTile.properties.name == 'ground') {
                    this.body.setVelocityY(this.speed);
                }
            }
        }
        if (this.pressed.up && this.body.blocked.up) {

            const upLeftTile = this.level.groundLayer.getTileAtWorldXY(this.body.x, this.body.y - 1);
            const upRightTile = this.level.groundLayer.getTileAtWorldXY(this.body.x + config.tileSize - 1, this.body.y - 1);

            if (!upLeftTile.getData('bomb') && !upRightTile.getData('bomb')) {
                if (upLeftTile && upLeftTile.properties.name == 'ground') {
                    this.body.setVelocityX(-this.speed);
                } else if (upRightTile && upRightTile.properties.name == 'ground') {
                    this.body.setVelocityX(this.speed);
                }
            }
        }
        if (this.pressed.down && this.body.blocked.down) {
            const downLeftTile = this.level.groundLayer.getTileAtWorldXY(this.body.x, this.body.y + config.tileSize + 1);
            const downRightTile = this.level.groundLayer.getTileAtWorldXY(this.body.x + config.tileSize - 1, this.body.y + config.tileSize + 1);

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
        ) {
            // update tile under player
            const tile = this.level.groundLayer.getTileAtWorldXY(
                this.body.center.x, 
                this.body.center.y
            );
            this.setData('tile', tile);
        }
    }

    _updateAddBomb() {
        const tileUnderPlayer = this.getTile();
        
        // don't add bombs to other tiles when player moves with pressed A
        if (! this.pressed.placeBomb || this.keyADownLastState == this.pressed.placeBomb) {
            return;
        }

        // don't add bomb if there is alredy one
        if (tileUnderPlayer.getData('bomb')) {
            return;
        }

        // add a bomb
        const bomb = new Bomb(
            this,
            tileUnderPlayer.pixelX + config.tileSize/2,
            tileUnderPlayer.pixelY + config.tileSize/2,
            this.level
        );

        this.keyADownLastState = this.pressed.placeBomb;
    }

    getTile() {
        return this.getData('tile');
    }

    _addAnims() {
        
        if (Player.#animsLoaded) {
            return;
        }
        Player.#animsLoaded = true;

        const anims = this.scene.anims;
        
        if (! anims.exists('man-blue-left-walk')) {
            anims.create({
                key: "man-blue-left-walk",
                frames: [
                    {key: 'atlas', frame: 'man-blue-move-left.png'},
                    {key: 'atlas', frame: 'man-blue-move-left-anim-1.png'},
                    {key: 'atlas', frame: 'man-blue-move-left.png'},
                    {key: 'atlas', frame: 'man-blue-move-left-anim-2.png'},
                ],
                frameRate: 8,
                repeat: -1,
            });
        }

        
        anims.create({
            key: "man-blue-right-walk",
            frames: [
                {key: 'atlas', frame: 'man-blue-move-right.png'},
                {key: 'atlas', frame: 'man-blue-move-right-anim-1.png'},
                {key: 'atlas', frame: 'man-blue-move-right.png'},
                {key: 'atlas', frame: 'man-blue-move-right-anim-2.png'},
            ],
            frameRate: 8,
            repeat: -1
        });
        anims.create({
            key: "man-blue-up-walk",
            frames: [
                {key: 'atlas', frame: 'man-blue-move-up.png'},
                {key: 'atlas', frame: 'man-blue-move-up-anim-1.png'},
                {key: 'atlas', frame: 'man-blue-move-up.png'},
                {key: 'atlas', frame: 'man-blue-move-up-anim-2.png'},
            ],
            frameRate: 8,
            repeat: -1
        });
        anims.create({
            key: "man-blue-down-walk",
            frames: [
                {key: 'atlas', frame: 'man-blue-move-down.png'},
                {key: 'atlas', frame: 'man-blue-move-down-anim-1.png'},
                {key: 'atlas', frame: 'man-blue-move-down.png'},
                {key: 'atlas', frame: 'man-blue-move-down-anim-2.png'},
            ],
            frameRate: 8,
            repeat: -1
        });
    }

}
