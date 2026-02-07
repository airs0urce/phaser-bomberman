let groundLayer;

module.exports = class WelcomeScene extends Phaser.Scene {
    constructor() {
        super('Welcome');
    }

    preload() {
        this.load.spritesheet('tileset-ground', 'src/assets/images/ground.png', {
            frameWidth: 16,
            frameHeight: 16
        });
    }

    create() {
        this.scene.start('LevelSelect');
    }
}