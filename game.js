const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 500,
    backgroundColor: '#fff',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 }, // Ajusta la gravedad si es necesario
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    // Añadir cámara al config
    camera: {
        roundPixels: true // Opcional: para evitar el desenfoque de píxeles
    }
}

new Phaser.Game(config);

function preload() {
    // Carga el atlas y la imagen del suelo
    this.load.atlas('player', './assets/spritesheet.webp', './assets/atlas.json');
    this.load.image('ground', './assets/ground.webp');
    this.load.image('background', './assets/bg.webp'); // Fondo principal
}

function create() {
    // Ajustar la posición inicial del jugador
    this.player = this.physics.add.sprite(48, this.sys.game.config.height - this.textures.get('ground').getSourceImage().height - 16, 'player');
    this.player.setOrigin(0.5, 1); // Ajusta el origen para que los pies estén en el suelo
    this.player.setScale(0.5);
    this.player.setCollideWorldBounds(true);

    // Configurar el tamaño del mundo
    const worldWidth = 3200; // Ancho del mundo
    const worldHeight = this.sys.game.config.height; // Altura del mundo

    // Crear el fondo
    this.bg1 = this.add.tileSprite(0, 0, worldWidth, worldHeight, 'background');
    this.bg1.setOrigin(0, 0);
    this.bg1.setDepth(-1); // Asegúrate de que el fondo esté detrás del jugador

    // Crear el suelo usando un StaticGroup
    const groundWidth = worldWidth;
    const groundTextureWidth = this.textures.get('ground').getSourceImage().width; // Ancho de la textura del suelo
    const groundTextureHeight = this.textures.get('ground').getSourceImage().height;

    this.ground = this.physics.add.staticGroup(); // Usa staticGroup para objetos estáticos
    this.ground.create(0, worldHeight - groundTextureHeight, 'ground')
        .setOrigin(0, 0) // Alinea el suelo en la parte inferior
        .setScale(groundWidth / groundTextureWidth, 1) // Ajusta la escala horizontal
        .refreshBody(); // Actualiza el cuerpo del suelo

    // Añadir collider entre el jugador y el suelo
    this.physics.add.collider(this.player, this.ground);

    // Configura la cámara para seguir al jugador dentro del mundo
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight); // Ajusta el tamaño del mundo
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08); // Sigue al jugador con suavidad

    // Inicializa las banderas `onGround`, `canJump`, `isJumping`, `initialDirection` y `isAttacking`
    this.onGround = true;
    this.canJump = true;
    this.isJumping = false;
    this.initialDirection = null;
    this.canAttack = true;
    this.isAttacking = false;

    // Configuración del evento cuando la animación de salto ha terminado
    this.anims.on('animationcomplete', (anim, _frame, _sprite) => {
        if (anim.key === 'jump') {
            if (this.player.body.touching.down) {
                this.canJump = true; // Permitir el salto nuevamente
                this.canAttack = true;
                this.isJumping = false; // Indicar que el salto ha terminado
                this.player.anims.play(this.keys.left.isDown || this.keys.right.isDown ? 'run' : 'idle', true);
            }
        }

        if (anim.key === 'attack') {
            this.isAttacking = false; // Permitir que el jugador vuelva a moverse
            this.player.anims.play(this.keys.left.isDown || this.keys.right.isDown ? 'run' : 'idle', true);
        }
    });

    // Asegurarse de que el jugador comienza en el suelo
    this.player.setVelocityY(0);
    this.onGround = true;

    // Crear animaciones usando el atlas
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

    // Añadir control de teclas
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        attack: Phaser.Input.Keyboard.KeyCodes.SPACE // Barra espaciadora para atacar
    });
}

function update() {
    const player = this.player;
    
    // Actualiza la bandera `onGround` si el jugador está tocando el suelo
    this.onGround = player.body.touching.down;

    // Ajustar el fondo
    this.bg1.tilePositionX += player.body.velocity.x * 0.005; 
    
    // Ajustar el segundo fondo cuando el primero se ha movido fuera de vista
    if (this.bg1.tilePositionX >= this.sys.game.config.width) {
        this.bg1.tilePositionX = 0;
    }

    if (this.keys.attack.isDown && !this.isAttacking && this.canAttack) {
        player.anims.play('attack', true);
        this.isAttacking = true; // Indicar que el jugador está atacando
        player.setVelocityX(0); // Detener el movimiento horizontal durante el ataque
    }

    // Salto
    if (this.keys.up.isDown && this.canJump) {
        player.anims.play('jump', true);
        player.setVelocityY(-300);
        this.canJump = false; // Deshabilitar el salto hasta que la animación termine
        this.isJumping = true; // Indicar que el jugador está saltando
        this.canAttack = false;

        // Mantener la dirección durante el salto si se presiona una tecla de dirección
        if (this.keys.right.isDown) {
            player.setVelocityX(160);
            player.flipX = false;
            this.initialDirection = 'right';
        } else if (this.keys.left.isDown) {
            player.setVelocityX(-160);
            player.flipX = true;
            this.initialDirection = 'left';
        } else {
            player.setVelocityX(0); // No moverse horizontalmente si no se presiona una tecla de dirección
            this.initialDirection = null;
        }
    } else if (this.isJumping) {
        // Si está en el aire, mantener la dirección inicial del salto
        if (this.initialDirection === 'right') {
            player.setVelocityX(160);
        } else if (this.initialDirection === 'left') {
            player.setVelocityX(-160);
        }

        // Permitir flip sin cambiar la velocidad horizontal
        if (this.keys.right.isDown) {
            player.flipX = false;
        } else if (this.keys.left.isDown) {
            player.flipX = true;
        }
    } else {
        if (this.keys.right.isDown) {
            player.anims.play('run', true);
            player.flipX = false;
            this.canAttack = true;
            player.setVelocityX(160); // Movimiento hacia la derecha

            // Saltar mientras se está moviendo
            if (this.keys.up.isDown && this.canJump && this.onGround) {
                player.anims.play('jump', true);
                player.setVelocityY(-300);
                this.canJump = false; // Deshabilitar el salto hasta que la animación termine
                this.isJumping = true; // Indicar que el jugador está saltando
                this.canAttack = false;
                this.initialDirection = 'right';
            }
        } else if (this.keys.left.isDown) {
            player.anims.play('run', true);
            player.flipX = true;
            this.canAttack = true;
            player.setVelocityX(-160); // Movimiento hacia la izquierda

            // Saltar mientras se está moviendo
            if (this.keys.up.isDown && this.canJump && this.onGround) {
                player.anims.play('jump', true);
                player.setVelocityY(-300);
                this.canJump = false; // Deshabilitar el salto hasta que la animación termine
                this.isJumping = true; // Indicar que el jugador está saltando
                this.canAttack = false;
                this.initialDirection = 'left';
            }
        } else {
            player.setVelocityX(0); // Detener movimiento horizontal si no se presionan teclas
            player.anims.play('idle', true); // Reproduce la animación de idle

            // Saltar sin moverse horizontalmente
            if (this.keys.up.isDown && this.canJump && this.onGround) {
                player.anims.play('jump', true);
                player.setVelocityY(-300);
                this.canJump = false; // Deshabilitar el salto hasta que la animación termine
                this.isJumping = true; // Indicar que el jugador está saltando
                this.canAttack = false;
                this.initialDirection = null;
            }
        }

        if (this.keys.attack.isDown) {
            player.anims.play('attack', true);
            this.isAttacking = true; // Indicar que el jugador está atacando
            player.setVelocityX(0); // Detener el movimiento horizontal durante el ataque
        }
    }

    // Actualiza la bandera `onGround` si el jugador ya no está en el suelo
    if (player.body.touching.down) {
        this.onGround = true;
        this.canAttack = true;
        this.canJump = true;
        this.isJumping = false; // Se establece en true cuando el jugador está tocando el suelo
        this.initialDirection = null; // Reiniciar la dirección inicial al tocar el suelo
    } else {
        this.onGround = false; // Se establece en false si el jugador no está tocando el suelo
    }
}
