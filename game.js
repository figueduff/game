const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#fff',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    camera: {
        roundPixels: true
    }
}

new Phaser.Game(config);

function preload() {
    this.load.atlas('player', './assets/spritesheet.webp', './assets/atlas.json');
    this.load.image('ground', './assets/ground.webp');
    this.load.image('background', './assets/bg.webp');
    let url = 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexvirtualjoystickplugin.min.js';
    this.load.plugin('rexvirtualjoystickplugin', url, true);
}

function create() {
    const groundTextureHeight = this.textures.get('ground').getSourceImage().height;

    this.player = this.physics.add.sprite(60, this.sys.game.config.height - groundTextureHeight - 5, 'player');
    this.player.setOrigin(0.5, 1); // Ajusta el origen para que los pies estén en el suelo
    this.player.setScale(0.5);
    this.player.setCollideWorldBounds(true);

    const worldWidth = 1300;
    const worldHeight = this.sys.game.config.height;

    this.bg1 = this.add.tileSprite(0, 0, worldWidth, worldHeight, 'background');
    this.bg1.setOrigin(0, 0);
    this.bg1.setDepth(-1);

    const groundWidth = worldWidth;
    const groundTextureWidth = this.textures.get('ground').getSourceImage().width;

    this.ground = this.physics.add.staticGroup();
    this.ground.create(0, worldHeight - groundTextureHeight, 'ground')
        .setOrigin(0, 0)
        .setScale(groundWidth / groundTextureWidth, 1)
        .refreshBody();

    this.physics.add.collider(this.player, this.ground);

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.onGround = true;
    this.canJump = true;
    this.isJumping = false;
    this.initialDirection = null;
    this.canAttack = true;
    this.isAttacking = false;

    this.anims.on('animationcomplete', (anim, _frame, _sprite) => {
        if (anim.key === 'jump') {
            if (this.player.body.touching.down) {
                this.canJump = true;
                this.canAttack = true;
                this.isJumping = false;
                this.player.anims.play(this.keys.left.isDown || this.keys.right.isDown ? 'run' : 'idle', true);
            }
        }

        if (anim.key === 'attack') {
            this.isAttacking = false;
            this.player.anims.play(this.keys.left.isDown || this.keys.right.isDown ? 'run' : 'idle', true);
        }
    });

    this.player.setVelocityY(0);
    this.onGround = true;

    this.anims.create({
        key: 'jump',
        frames: this.anims.generateFrameNames('player', { prefix: 'Jump__', start: 0, end: 9 }),
        frameRate: 10,
        repeat: 0
    });

    this.anims.create({
        key: 'run',
        frames: this.anims.generateFrameNames('player', { prefix: 'Run__', start: 0, end: 9 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'idle',
        frames: this.anims.generateFrameNames('player', { prefix: 'Idle__', start: 0, end: 9 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'attack',
        frames: this.anims.generateFrameNames('player', { prefix: 'Attack__', start: 0, end: 9 }),
        frameRate: 10,
        repeat: -1,
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        attack: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    //agregar joystick
    this.joyStick = this.plugins.get('rexvirtualjoystickplugin')
        .add(this, {
            x: 50,
            y: this.sys.game.config.height - 60,
            radius: 20,
            base: this.add.circle(0, 0, 25, 0x888888),
            thumb: this.add.circle(0, 0, 15, 0xcccccc),
        })

    this.joystickCursors = this.joyStick.createCursorKeys()

}

function update() {
    const player = this.player;

    this.onGround = player.body.touching.down;

    this.bg1.tilePositionX += player.body.velocity.x * 0.005;

    if (this.bg1.tilePositionX >= this.sys.game.config.width) {
        this.bg1.tilePositionX = 0;
    }

    if ((this.keys.attack.isDown)&& !this.isAttacking && this.canAttack) {
        player.anims.play('attack', true);
        this.isAttacking = true;
        player.setVelocityX(0);
    }

    if ((this.keys.up.isDown || this.joystickCursors.up.isDown) && this.canJump) {
        player.anims.play('jump', true);
        player.setVelocityY(-300);
        this.canJump = false;
        this.isJumping = true;
        this.canAttack = false;

        if (this.keys.right.isDown || this.joystickCursors.right.isDown) {
            player.setVelocityX(160);
            player.flipX = false;
            this.initialDirection = 'right';
        } else if (this.keys.left.isDown || this.joystickCursors.left.isDown) {
            player.setVelocityX(-160);
            player.flipX = true;
            this.initialDirection = 'left';
        } else {
            player.setVelocityX(0);
            this.initialDirection = null;
        }
    } else if (this.isJumping) {
        if (this.initialDirection === 'right') {
            player.setVelocityX(160);
        } else if (this.initialDirection === 'left') {
            player.setVelocityX(-160);
        }

        if (this.keys.right.isDown || this.joystickCursors.right.isDown) {
            player.flipX = false;
        } else if (this.keys.left.isDown) {
            player.flipX = true;
        }
    } else {
        if (this.keys.right.isDown || this.joystickCursors.right.isDown) {
            player.anims.play('run', true);
            player.flipX = false;
            this.canAttack = true;
            player.setVelocityX(160);

            if ((this.keys.up.isDown || this.joystickCursors.up.isDown) && this.canJump && this.onGround) {
                player.anims.play('jump', true);
                player.setVelocityY(-300);
                this.canJump = false;
                this.isJumping = true;
                this.canAttack = false;
                this.initialDirection = 'right';
            }
        } else if (this.keys.left.isDown || this.joystickCursors.left.isDown) {
            player.anims.play('run', true);
            player.flipX = true;
            this.canAttack = true;
            player.setVelocityX(-160);

            if ((this.keys.up.isDown || this.joystickCursors.up.isDown) && this.canJump && this.onGround) {
                player.anims.play('jump', true);
                player.setVelocityY(-300);
                this.canJump = false;
                this.isJumping = true;
                this.canAttack = false;
                this.initialDirection = 'left';
            }
        } else {
            player.setVelocityX(0);
            player.anims.play('idle', true);

            if ((this.keys.up.isDown || this.joystickCursors.up.isDown) && this.canJump && this.onGround) {
                player.anims.play('jump', true);
                player.setVelocityY(-300);
                this.canJump = false;
                this.isJumping = true;
                this.canAttack = false;
                this.initialDirection = null;
            }
        }

        if (this.keys.attack.isDown) {
            player.anims.play('attack', true);
            this.isAttacking = true;
            player.setVelocityX(0);
        }
    }

    if (player.body.touching.down) {
        this.onGround = true;
        this.canAttack = true;
        this.canJump = true;
        this.isJumping = false;
        this.initialDirection = null;
    } else {
        this.onGround = false;
    }
}
