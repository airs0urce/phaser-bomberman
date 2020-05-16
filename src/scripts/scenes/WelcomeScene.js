let groundLayer;

export class WelcomeScene extends Phaser.Scene {
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
        this.scene.start('Map1');

        this.add.text(
                this.cameras.main.centerX,
                0, //this.cameras.main.centerY - 100,
                'Bomberman', {
                    font: `24px Arial`,
                    fill: '#fff'
                })
            .setOrigin(undefined, 0);

        this.add.text(
                this.cameras.main.centerX,
                this.cameras.main.centerY,
                'Click anywhere to start', {
                    font: `20px Arial`,
                    fill: '#fff'
                })
            .setOrigin(undefined, 0);

        this.input.once('pointerdown', () => {
            this.scene.start('Map1');
        });
    }
}