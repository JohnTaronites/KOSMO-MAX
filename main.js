// KOSMO-MAX w Phaser 3 (wersja uproszczona, z zachowaniem głównych mechanik)

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

const PLAYER_SPEED = 400;
const BULLET_SPEED = 600;
const ENEMY_SPEED_START = 100;
const ENEMY_SPEED_MULT = 1.2;
const BASE_ENEMY_INTERVAL = 1000;
const ENEMY_SPAWN_MULT = 1.2;

const SUPER_SHOT_COUNT = 30;

class KosmoMaxScene extends Phaser.Scene {
    constructor() {
        super({ key: 'KosmoMaxScene' });
    }

    preload() {
        // Obrazki
        this.load.image('ship', 'assets/ship.png');
        this.load.image('enemy', 'assets/enemy.png');

        // Dźwięki
        this.load.audio('shoot', 'assets/laser_shoot.mp3');
        this.load.audio('craaash', 'assets/craaash.mp3');
        this.load.audio('bigbomb', 'assets/bigbomb.mp3');
        this.load.audio('letsgo', 'assets/letsgo.mp3');
        this.load.audio('ohnoo', 'assets/Ohnoo.mp3');
    }

    create() {
        // --- ZMIENNE STANU GRY ---
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

        // --- STATEK ---
        this.player = this.physics.add.image(GAME_WIDTH/2, GAME_HEIGHT-80, 'ship')
            .setCollideWorldBounds(true)
            .setImmovable(true)
            .setDepth(1);

        // --- BULLET GROUP ---
        this.bullets = this.physics.add.group();

        // --- ENEMY GROUP ---
        this.enemies = this.physics.add.group();

        // --- UI ---
        this.scoreText = this.add.text(15, 10, 'WYNIK: 0', { font: '24px Segoe UI', fill: '#fff', stroke: '#000', strokeThickness: 4 });
        this.levelText = this.add.text(300, 10, 'POZIOM: 1', { font: '24px Segoe UI', fill: '#fff', stroke: '#000', strokeThickness: 4 });
        this.livesText = this.add.text(650, 10, 'ŻYCIA: 3', { font: '24px Segoe UI', fill: '#fff', stroke: '#000', strokeThickness: 4 });

        this.superBtn = this.add.text(GAME_WIDTH/2, GAME_HEIGHT-40, 'SUPER STRZAŁ (2)', { font: '28px Segoe UI', fill: '#FFF', backgroundColor: '#ff4500', padding: { x: 20, y: 6 } })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.shootSuper());

        // --- GAME OVER SCREEN ---
        this.gameOverScreen = this.add.container(GAME_WIDTH/2, GAME_HEIGHT/2).setVisible(false);
        const goBg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8).setOrigin(0.5);
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

        // --- Sterowanie ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.input.on('pointermove', pointer => {
            this.player.x = Phaser.Math.Clamp(pointer.x, this.player.width/2, GAME_WIDTH-this.player.width/2);
        });
        this.input.on('pointerdown', pointer => {
            if (!this.gameOver) this.shootTriple();
        });

        // --- Start gry (unlock dźwięków na mobile) ---
        this.letsgoSound.play();

        // --- Kolizje ---
        this.physics.add.overlap(this.bullets, this.enemies, this.bulletHitsEnemy, null, this);

        // --- Start ---
        this.time.addEvent({ delay: 800, callback: ()=>this.spawnEnemy(), loop: false }); // pierwsza fala
    }

    update(time, delta) {
        if (this.gameOver) return;

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
            if (enemy.y > GAME_HEIGHT + 40) {
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
            bullet.y -= bullet.speed * (delta/1000);
            if (bullet.y < -20) bullet.destroy();
        });
    }

    // --- LOGIKA GRY ---
    shootTriple() {
        this.shootSound.play();
        const x = this.player.x;
        const y = this.player.y - 32;
        if (this.level < 3) {
            this.time.addEvent({ delay: 0, callback: ()=>this.spawnBullet(x, y, 0), loop: false });
            this.time.addEvent({ delay: 100, callback: ()=>this.spawnBullet(x, y, 0), loop: false });
            this.time.addEvent({ delay: 200, callback: ()=>this.spawnBullet(x, y, 0), loop: false });
        } else {
            const spread = 0.15;
            this.spawnBullet(x, y, 0);
            this.spawnBullet(x, y, -spread);
            this.spawnBullet(x, y, spread);
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
        const bullet = this.bullets.create(x, y, null);
        bullet.displayWidth = 8; bullet.displayHeight = 20;
        bullet.setTint(color==='red'?0xff2222:0xffffff);
        bullet.speed = speed;
        bullet.velX = Math.sin(angle) * speed;
        bullet.velY = -Math.cos(angle) * speed;
        bullet.update = function() {
            this.x += this.velX * (1/60);
            this.y += this.velY * (1/60);
        };
    }

    spawnEnemy() {
        const x = Phaser.Math.Between(40, GAME_WIDTH-40);
        const enemy = this.enemies.create(x, -40, 'enemy');
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

        // Efekt LEVEL UP
        const msg = this.add.text(GAME_WIDTH/2, GAME_HEIGHT/2, `LEVEL ${level}`, { font: '80px Segoe UI', fill: '#6c6cff', stroke: '#000', strokeThickness: 10 })
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

        // Usuwanie obiektów
        this.bullets.clear(true, true);
        this.enemies.clear(true, true);
        this.player.x = GAME_WIDTH/2;

        this.updateUI();
        this.gameOverScreen.setVisible(false);

        this.letsgoSound.play();
    }
}

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#141c2c',
    physics: { default: 'arcade' },
    scene: [KosmoMaxScene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};

const game = new Phaser.Game(config);
