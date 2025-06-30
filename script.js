window.addEventListener('load', function() {
    // --- USTAWIENIA I ZMIENNE ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 800;
    canvas.height = 600;

    const scoreEl = document.getElementById('score');
    const livesEl = document.getElementById('lives');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const finalScoreEl = document.getElementById('finalScore');
    const newGameBtn = document.getElementById('newGameBtn');
    const superShotBtn = document.getElementById('superShotBtn');

    // --- Usunięto ładowanie obrazków, dźwięki zostają ---
    const shootSound = new Audio('https://johntaronites.github.io/Shooter_AI/laser_shoot.wav');
    const lifeLostSound = new Audio('https://johntaronites.github.io/Shooter_AI/craaash.wav');
    shootSound.volume = 0.3;
    lifeLostSound.volume = 0.5;

    let score, lives, missedEnemies, gameOver;
    let player, bullets, enemies, enemyTimer;
    
    let superShotCooldown;
    let cooldownInterval;
    let animationFrameId;
    
    // --- KLASY OBIEKTÓW ---
    class Player {
        constructor() {
            this.width = 50;
            this.height = 50;
            this.x = (canvas.width - this.width) / 2;
            this.y = canvas.height - this.height - 20;
        }
        draw() {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y); // Górny wierzchołek
            ctx.lineTo(this.x - this.width / 2, this.y + this.height); // Lewy dolny
            ctx.lineTo(this.x + this.width / 2, this.y + this.height); // Prawy dolny
            ctx.closePath();
            ctx.fillStyle = 'white';
            ctx.fill();
        }
        update(inputX) {
            if (inputX !== null) {
                // Pozycja myszy/palca celuje w środek trójkąta
                this.x = inputX;
            }
            if (this.x - this.width / 2 < 0) this.x = this.width / 2;
            if (this.x + this.width / 2 > canvas.width) this.x = canvas.width - this.width / 2;
        }
    }

    class Bullet {
        constructor(x, y, color = 'white', speed = -10, angle = 0) {
            this.x = x;
            this.y = y;
            this.width = 5;
            this.height = 15;
            this.color = color;
            this.speedX = Math.sin(angle) * Math.abs(speed);
            this.speedY = Math.cos(angle) * speed;
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
        }
        draw() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    class Enemy {
        constructor() {
            this.width = 50;
            this.height = 50;
            this.x = Math.random() * (canvas.width - this.width) + this.width / 2;
            this.y = -this.height;
            this.speed = Math.random() * 2 + 1;
        }
        draw() {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + this.height); // Dolny wierzchołek
            ctx.lineTo(this.x - this.width / 2, this.y); // Lewy górny
            ctx.lineTo(this.x + this.width / 2, this.y); // Prawy górny
            ctx.closePath();
            ctx.fillStyle = '#ff4d4d'; // Czerwony kolor dla wrogów
            ctx.fill();
        }
        update() {
            this.y += this.speed;
        }
    }

    // --- KONTROLER WEJŚCIA ---
    const input = { x: canvas.width / 2 };
    
    function getPointerPos(evt) {
        const rect = canvas.getBoundingClientRect();
        const touch = evt.touches ? evt.touches[0] : evt;
        return (touch.clientX - rect.left) / rect.width * canvas.width;
    }
    
    window.addEventListener('mousemove', e => {
        if (player) input.x = getPointerPos(e);
    });
    
    window.addEventListener('touchmove', e => {
        if (player) {
            e.preventDefault();
            input.x = getPointerPos(e);
        }
    }, { passive: false });

    canvas.addEventListener('click', () => {
        if (!gameOver && player) shootTriple();
    });

    superShotBtn.addEventListener('click', () => {
        if (!gameOver && superShotCooldown <= 0) {
            shootSuper();
            startSuperShotCooldown(30000);
        }
    });
    
    newGameBtn.addEventListener('click', resetGame);

    // --- GŁÓWNE FUNKCJE GRY ---
    function shootTriple() {
        shootSound.currentTime = 0;
        shootSound.play();
        const bulletX = player.x - 2.5; // Strzał ze środka
        setTimeout(() => { if (!gameOver) bullets.push(new Bullet(bulletX, player.y)) }, 0);
        setTimeout(() => { if (!gameOver) bullets.push(new Bullet(bulletX, player.y)) }, 100);
        setTimeout(() => { if (!gameOver) bullets.push(new Bullet(bulletX, player.y)) }, 200);
    }

    function shootSuper() {
        const bulletCount = 30;
        for (let i = 0; i < bulletCount; i++) {
            const angle = (Math.PI * 2 / bulletCount) * i;
            bullets.push(new Bullet(player.x, player.y + player.height / 2, 'red', 5, angle));
        }
    }

    function startSuperShotCooldown(duration) {
        superShotCooldown = duration;
        superShotBtn.disabled = true;
        if (cooldownInterval) clearInterval(cooldownInterval);
        cooldownInterval = setInterval(() => {
            superShotCooldown -= 1000;
            if (superShotCooldown <= 0) {
                superShotBtn.disabled = false;
                superShotBtn.innerText = "SUPER STRZAŁ";
                clearInterval(cooldownInterval);
            } else {
                superShotBtn.innerText = `GOTOWY ZA ${superShotCooldown / 1000}s`;
            }
        }, 1000);
    }

    function handleGameElements() {
        for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].update();
            bullets[i].draw();
            if (bullets[i].y < -20) bullets.splice(i, 1);
        }
        enemyTimer++;
        if (enemyTimer % 100 === 0) {
            enemies.push(new Enemy());
        }
        for (let i = enemies.length - 1; i >= 0; i--) {
            enemies[i].update();
            enemies[i].draw();
            if (enemies[i].y > canvas.height) {
                enemies.splice(i, 1);
                missedEnemies++;
            }
        }
        for (let i = enemies.length - 1; i >= 0; i--) {
            for (let j = bullets.length - 1; j >= 0; j--) {
                const enemy = enemies[i];
                const bullet = bullets[j];
                if (enemy && bullet &&
                    bullet.x < enemy.x + enemy.width / 2 &&
                    bullet.x + bullet.width > enemy.x - enemy.width / 2 &&
                    bullet.y < enemy.y + enemy.height &&
                    bullet.y + bullet.height > enemy.y) {
                    enemies.splice(i, 1);
                    bullets.splice(j, 1);
                    score += 10;
                    break;
                }
            }
        }
    }

    function checkGameState() {
        if (missedEnemies >= 3) {
            lives--;
            missedEnemies = 0;
            if (lives > 0) lifeLostSound.play();
        }
        if (lives <= 0) gameOver = true;
    }

    function updateUI() {
        scoreEl.textContent = score;
        livesEl.textContent = lives;
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        player.update(input.x);
        player.draw();

        handleGameElements();
        checkGameState();
        updateUI();

        if (gameOver) {
            gameOverScreen.style.display = 'flex';
            finalScoreEl.textContent = score;
            clearInterval(cooldownInterval);
        } else {
            animationFrameId = requestAnimationFrame(animate);
        }
    }

    function resetGame() {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (cooldownInterval) clearInterval(cooldownInterval);

        score = 0;
        lives = 3;
        missedEnemies = 0;
        gameOver = false;
        
        bullets = [];
        enemies = [];
        enemyTimer = 0;
        player = new Player();
        input.x = canvas.width / 2;

        gameOverScreen.style.display = 'none';
        
        startSuperShotCooldown(5000);
        updateUI();
        animate();
    }

    // --- START APLIKACJI ---
    // Nie potrzebujemy już ekranu ładowania, gra startuje od razu.
    resetGame();
});
