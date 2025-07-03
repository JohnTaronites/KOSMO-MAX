const PLAYER_W = 50, PLAYER_H = 40;
const ENEMY_W = 50, ENEMY_H = 45;
const BULLET_W = 5, BULLET_H = 15;
const PLAYER_SPEED = 400;
const BULLET_SPEED = 600;
const ENEMY_SPEED_START = 100;
const ENEMY_SPEED_MULT = 1.2;
const BASE_ENEMY_INTERVAL = 1000;
const ENEMY_SPAWN_MULT = 1.2;
const SUPER_SHOT_COUNT = 30;

class StartScene extends Phaser.Scene {
    constructor() { super({key: 'StartScene'}); }
    preload() {
        this.load.image('ship', 'assets/ship.png');
        // Tekstury dla pocisków (białe i czerwone)
        this.textures.generate('bullet_white', { data: ['  1  ', '  1  ', '  1  ', '  1  ', '  1  ', '  1  ', '11111'], pixelWidth: 1, palette: { 1: '#fff' } });
        this.textures.generate('bullet_red',   { data: ['  2  ', '  2  ', '  2  ', '  2  ', '  2  ', '  2  ', '22222'], pixelWidth: 1, palette: { 2: '#f44' } });

        this.load.audio('shoot', 'assets/laser_shoot.mp3');
        this.load.audio('craaash', 'assets/craaash.mp3');
        this.load.audio('bigbomb', 'assets/bigbomb.mp3');
        this.load.audio('letsgo', 'assets/letsgo.mp3');
        this.load.audio('ohnoo', 'assets/ohnoo.mp3');
    }
    create() {
        this.cameras.main.setBackgroundColor('#141c2c');
        this.add.text(this.scale.width/2, 160, 'KOSMO-MAX', {font: '60px Segoe UI', fill:'#fff', stroke:'#000', strokeThickness:8})
            .setOrigin(0.5);
        this.add.text(this.scale.width/2, 250, 'Sterowanie:\n- Kliknij/tapnij w oknie by strzelać\n- Przesuwaj palcem lub myszką, by sterować\n- Klawiatura: ← → oraz spacja\n\nCel: trafiaj wrogów, unikaj utraty żyć!', 
            { font: '24px Segoe UI', fill: '#fff', align:'center' }).setOrigin(0.5);

        const btn = this.add.text(this.scale.width/2, 420, 'START [KLIKNIJ/LUB TAPNIJ]', 
            {font: '32px Segoe UI', fill:'#fff', backgroundColor:'#4CAF50', padding:{x:30, y:12}})
            .setOrigin(0.5)
            .setInteractive();

        btn.on('pointerdown', () => {
            this.sound.unlock();
            this.scene.start('KosmoMaxScene');
        });

        this.scale.on('resize', this.resize, this);
    }
    resize(gameSize) {
        this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    }
}

class KosmoMaxScene extends Phaser.Scene {
    constructor() {
        super({ key: 'KosmoMaxScene' });
    }

    create() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.missedEnemies = 0;
        this.enemyBaseSpeed = ENEMY_SPEED_START;
        this.enemySpeedMultiplier = 1.0;
        this.enemyInterval = BASE_ENEMY_INTERVAL;
        this.enemySpawnMultiplier = 1.0;
        this.enemySpawnTimer = 0;
        this.superShotCharges = 2;
        this.maxSuperShotCharges = 2;
        this.gameOver = false;

        // Dynamiczne rozmiary
        let width = this.scale.width, height = this.scale.height;

        // --- PLAYER ---
        this.player = this.physics.add.image(width/2, height-80, 'ship')
            .setDisplaySize(PLAYER_W, PLAYER_H)
            .setCollideWorldBounds(true)
            .setImmovable(true)
            .setDepth(1);

        // --- GROUPS ---
        this.bullets = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            runChildUpdate: false
        });
        this.enemies = this.physics.add.group();

        // --- UI ---
        this.scoreText = this.add.text(15, 10, 'WYNIK: 0', { font: '24px Segoe UI', fill: '#fff', stroke: '#000', strokeThickness: 4 });
        this.levelText = this.add.text(width/2, 10, 'POZIOM: 1', { font: '24px Segoe UI', fill: '#fff', stroke: '#000', strokeThickness: 4 })
            .setOrigin(0.5, 0);
        this.livesText = this.add.text(width-150, 10, 'ŻYCIA: 3', { font: '24px Segoe UI', fill: '#fff', stroke: '#000', strokeThickness: 4 });

        this.superBtn = this.add.text(width/2, height-40, 'SUPER STRZAŁ (2)', { font: '28px Segoe UI', fill: '#FFF', backgroundColor: '#ff4500', padding: { x: 20, y: 6 } })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.shootSuper());

        // --- GAME OVER SCREEN ---
        this.gameOverScreen = this.add.container(width/2, height/2).setVisible(false);
        const goBg = this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0.5);
        const goTitle = this.add.text(0, -60, 'GAME OVER', { font: '60px Segoe UI', fill: '#ff4444', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5);
        this.finalScoreText = this.add.text(0, 20, 'Twój wynik: 0', { font: '32px Segoe UI', fill: '#fff' }).setOrigin(0.5);
        this.newGameBtn = this.add.text(0, 100, 'NOWA GRA', { font: '32px Segoe UI', fill: '#fff', backgroundColor:'#4CAF50', padding:{x:24,y:12}})
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.resetGame());
        this.gameOverScreen.add([goBg, goTitle, this.finalScoreText, this.newGameBtn]);

        // --- DŹWIĘKI ---
        this.shootSound = this.sound.add('shoot', { volume: 0.5 });
        this.craaashSound = this.sound.add('craaash', { volume: 0.5 });
        this.bigbombSound = this.sound.add('bigbomb', { volume: 0.5 });
        this.letsgoSound = this.sound.add('letsgo', { volume: 0.5 });
        this.ohnooSound = this.sound.add('ohnoo', { volume: 0.5 });

        // --- Sterowanie klawiaturą ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.input.keyboard.on('keydown-SPACE', () => { if (!this.gameOver) this.shootTriple(); });

        // --- Sterowanie dotyk/myszka ---
        this.isDragging = false;
        this.input.on('pointerdown', pointer => {
            this.isDragging = true;
            this.player.x = Phaser.Math.Clamp(pointer.x, PLAYER_W/2, this.scale.width - PLAYER_W/2);
        });
        this.input.on('pointerup', () => {
            this.isDragging = false;
        });
        this.input.on('pointermove', pointer => {
            if (this.isDragging) {
                this.player.x = Phaser.Math.Clamp(pointer.x, PLAYER_W/2, this.scale.width - PLAYER_W/2);
            }
        });

        // --- Strzał dotyk/click ---
        this.input.on('gameobjectdown', (pointer, obj) => {
            // superbtn obsługuje się sam, tu nie trzeba
        });
        this.input.on('pointerup', pointer => {
            if (!this.gameOver && pointer.y < this.scale.height - 80) this.shootTriple();
        });

        this.letsgoSound.play();

        // --- Kolizje ---
        this.physics.add.overlap(this.bullets, this.enemies, this.bulletHitsEnemy, null, this);

        // --- Start ---
        this.time.addEvent({ delay: 800, callback: ()=>this.spawnEnemy(), loop: false });

        this.scale.on('resize', this.resize, this);
    }

    update(time, delta) {
        if (this.gameOver) return;

        // Dynamiczne rozmiary
        let width = this.scale.width, height = this.scale.height;

        // Sterowanie klawiaturą
        if (this.cursors.left.isDown) this.player.setVelocityX(-PLAYER_SPEED);
        else if (this.cursors.right.isDown) this.player.setVelocityX(PLAYER_SPEED);
        else this.player.setVelocityX(0);

        // ENEMY SPAWN
        this.enemySpawnTimer += delta;
        const currentInterval = this.enemyInterval / this.enemySpawnMultiplier;
        if (this.enemySpawnTimer > currentInterval) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }

        // ENEMIES MOVE & OUT OF SCREEN
        this.enemies.getChildren().forEach(enemy => {
            enemy.y += enemy.speed * (delta/1000);
            if (enemy.y > height + ENEMY_H) {
                enemy.destroy();
                this.missedEnemies++;
                if (this.missedEnemies >= 3) {
                    this.lives--;
                    this.missedEnemies = 0;
                    if (this.lives > 0) {
                        this.craaashSound.play();
                    }
                    this.updateUI();
                }
                if (this.lives <= 0) this.doGameOver();
            }
        });

        // BULLETS OUT
        this.bullets.getChildren().forEach(bullet => {
            if (bullet.y < -BULLET_H || bullet.y > height + BULLET_H) bullet.destroy();
        });

        // UI pozycje
        this.scoreText.setPosition(15, 10);
        this.levelText.setPosition(this.scale.width/2, 10);
        this.livesText.setPosition(this.scale.width-150, 10);
        this.superBtn.setPosition(this.scale.width/2, this.scale.height-40);
        this.gameOverScreen.setPosition(this.scale.width/2, this.scale.height/2);
    }

    // --- LOGIKA GRY ---
    shootTriple() {
        this.shootSound.play();
        const x = this.player.x;
        const y = this.player.y - PLAYER_H/2;
        if (this.level < 3) {
            this.spawnBullet(x, y, 0, 'white');
            this.time.delayedCall(100, ()=>this.spawnBullet(x, y, 0, 'white'));
            this.time.delayedCall(200, ()=>this.spawnBullet(x, y, 0, 'white'));
        } else {
            const spread = 0.15;
            this.spawnBullet(x, y, 0, 'white');
            this.spawnBullet(x, y, -spread, 'white');
            this.spawnBullet(x, y, spread, 'white');
        }
    }

    shootSuper() {
        if (this.superShotCharges <= 0 || this.gameOver) return;
        this.bigbombSound.play();
        this.superShotCharges--;
        this.updateUI();
        const x = this.player.x;
        const y = this.player.y - 10;
        for (let i=0;i<SUPER_SHOT_COUNT;i++) {
            const angle = (Math.PI*2/SUPER_SHOT_COUNT)*i;
            this.spawnBullet(x, y, angle, 'red', 400);
        }
    }

    spawnBullet(x, y, angle=0, color='white', speed=BULLET_SPEED) {
        const key = color === 'red' ? 'bullet_red' : 'bullet_white';
        const bullet = this.bullets.create(x, y, key)
            .setDisplaySize(BULLET_W, BULLET_H)
            .setDepth(2);
        bullet.body.allowGravity = false;
        bullet.setVelocity(
            Math.sin(angle) * speed,
            -Math.cos(angle) * speed
        );
    }

    spawnEnemy() {
        const x = Phaser.Math.Between(ENEMY_W/2, this.scale.width-ENEMY_W/2);
        const enemy = this.enemies.create(x, -ENEMY_H/2, 'ship')
            .setDisplaySize(ENEMY_W, ENEMY_H);
        enemy.speed = (Phaser.Math.Between(0,100) + this.enemyBaseSpeed) * this.enemySpeedMultiplier;
        enemy.setCollideWorldBounds(false);
    }

    bulletHitsEnemy(bullet, enemy) {
        bullet.destroy();
        enemy.destroy();
        this.score += 10;
        this.updateUI();
        this.checkLevelUp();
    }

    updateUI() {
        this.scoreText.setText('WYNIK: ' + this.score);
        this.levelText.setText('POZIOM: ' + this.level);
        this.livesText.setText('ŻYCIA: ' + this.lives);
        this.superBtn.setText(`SUPER STRZAŁ (${this.superShotCharges})`);
        this.superBtn.setAlpha(this.superShotCharges>0?1:0.5);
    }

    checkLevelUp() {
        if (this.level === 1 && this.score >= 200) this.levelUp(2);
        else if (this.level === 2 && this.score >= 500) this.levelUp(3);
    }

    levelUp(level) {
        this.level = level;
        this.enemySpeedMultiplier *= ENEMY_SPEED_MULT;
        this.enemySpawnMultiplier *= ENEMY_SPAWN_MULT;
        if (level === 3) this.maxSuperShotCharges = 3;
        this.superShotCharges = this.maxSuperShotCharges;
        this.updateUI();

        const msg = this.add.text(this.scale.width/2, this.scale.height/2, `LEVEL ${level}`, { font: '80px Segoe UI', fill: '#6c6cff', stroke: '#000', strokeThickness: 10 })
            .setOrigin(0.5);
        this.tweens.add({ targets: msg, alpha: 0, duration: 1500, onComplete: ()=>msg.destroy() });
    }

    doGameOver() {
        this.gameOver = true;
        this.ohnooSound.play();
        this.finalScoreText.setText('Twój wynik: ' + this.score);
        this.gameOverScreen.setVisible(true);
    }

    resetGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.missedEnemies = 0;
        this.enemyBaseSpeed = ENEMY_SPEED_START;
        this.enemySpeedMultiplier = 1.0;
        this.enemyInterval = BASE_ENEMY_INTERVAL;
        this.enemySpawnMultiplier = 1.0;
        this.enemySpawnTimer = 0;
        this.superShotCharges = 2;
        this.maxSuperShotCharges = 2;
        this.gameOver = false;

        this.bullets.clear(true, true);
        this.enemies.clear(true, true);
        this.player.x = this.scale.width/2;

        this.updateUI();
        this.gameOverScreen.setVisible(false);

        this.letsgoSound.play();
    }

    resize(gameSize) {
        // UI i elementy automatycznie się dostosują w update()
    }
}

const config = {
    type: Phaser.AUTO,
    backgroundColor: '#141c2c',
    parent: 'phaser-container',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: { default: 'arcade' },
    scene: [StartScene, KosmoMaxScene]
};

const game = new Phaser.Game(config);
