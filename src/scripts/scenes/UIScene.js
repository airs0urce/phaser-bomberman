module.exports = class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {    
        this.add.text(
            10,
            4,
            'Score: 0', 
            {
                font: `10px Arial`,
                fill: '#fff'
            })
        .setOrigin(undefined, 0)
        .setDepth(10);


        // this.add.text(
        //         this.cameras.main.centerX,
        //         this.cameras.main.centerY - 16,
        //         'TEst message', 
        //         {
        //             font: `14px Arial`,
        //             color: '#fff',
        //             shadow: {
        //                 offsetX: 3,
        //                 offsetY: 3,
        //                 color: '#000',
        //                 blur: 1,
        //                 stroke: false,
        //                 fill: true
        //             },
        //         })
        //     .setOrigin(undefined, 0)
        //     .setDepth(10);
    }
}