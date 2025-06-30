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

    // --- ZASOBY I STANY GRY ---
    const spriteSheet = new Image();
    const shootSound = new Audio('https://johntaronites.github.io/Shooter_AI/laser_shoot.wav');
    const lifeLostSound = new Audio('https://johntaronites.github.io/Shooter_AI/craaash.wav');
    shootSound.volume = 0.3;
    lifeLostSound.volume = 0.5;

    let score, lives, missedEnemies, gameOver;
    let player, bullets, enemies, enemyTimer;
    
    // Zmienne do zarządzania timerami - kluczowe dla naprawy błędu
    let superShotCooldown;
    let cooldownInterval;
    let animationFrameId;

    const playerSprite = { x: 0, y: 0, width: 98, height: 75 };
    const enemySprite = { x: 0, y: 75, width: 98, height: 84 };
    
    // --- KLASY OBIEKTÓW ---
    class Player {
        constructor() {
            this.width = playerSprite.width / 2;
            this.height = playerSprite.height / 2;
            this.x = (canvas.width - this.width) / 2;
            this.y = canvas.height - this.height - 70;
        }
        draw() {
            ctx.drawImage(spriteSheet, playerSprite.x, playerSprite.y, playerSprite.width, playerSprite.height, this.x, this.y, this.width, this.height);
        }
        update(inputX) {
            if (inputX !== null) {
                this.x = inputX - this.width / 2;
            }
            if (this.x < 0) this.x = 0;
            if (this.x > canvas.width - this.width) this.x = canvas.width - this.width;
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
            this.width = enemySprite.width / 2;
            this.height = enemySprite.height / 2;
            this.x = Math.random() * (canvas.width - this.width);
            this.y = -this.height;
            this.speed = Math.random() * 2 + 1;
        }
        update() {
            this.y += this.speed;
        }
        draw() {
            ctx.drawImage(spriteSheet, enemySprite.x, enemySprite.y, enemySprite.width, enemySprite.height, this.x, this.y, this.width, this.height);
        }
    }

    // --- KONTROLER WEJŚCIA ---
    const input = { x: null };
    
    function getPointerPos(evt) {
        const rect = canvas.getBoundingClientRect();
        const touch = evt.touches ? evt.touches[0] : evt;
        return {
            x: (touch.clientX - rect.left) / rect.width * canvas.width
        };
    }
    
    window.addEventListener('mousemove', e => {
        if (player) input.x = getPointerPos(e).x;
    });
    
    window.addEventListener('touchmove', e => {
        if (player) {
            e.preventDefault();
            input.x = getPointerPos(e).x;
        }
    }, { passive: false });

    canvas.addEventListener('click', () => {
        if (!gameOver && player) shootTriple();
    });

    superShotBtn.addEventListener('click', () => {
        if (!gameOver && superShotCooldown <= 0) {
            shootSuper();
            startSuperShotCooldown(30000); // 30 sekund
        }
    });
    
    newGameBtn.addEventListener('click', resetGame);

    // --- GŁÓWNE FUNKCJE GRY ---
    function shootTriple() {
        shootSound.currentTime = 0;
        shootSound.play();
        setTimeout(() => { if (!gameOver) bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y)) }, 0);
        setTimeout(() => { if (!gameOver) bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y)) }, 100);
        setTimeout(() => { if (!gameOver) bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y)) }, 200);
    }

    function shootSuper() {
        const bulletCount = 30;
        for (let i = 0; i < bulletCount; i++) {
            const angle = (Math.PI * 2 / bulletCount) * i;
            bullets.push(new Bullet(player.x + player.width / 2, player.y + player.height / 2, 'red', 5, angle));
        }
    }

    function startSuperShotCooldown(duration) {
        superShotCooldown = duration;
        superShotBtn.disabled = true;

        if (cooldownInterval) clearInterval(cooldownInterval); // Wyczyść stary na wszelki wypadek

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
        // Pociski
        for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].update();
            bullets[i].draw();
            if (bullets[i].y < -20 || bullets[i].y > canvas.height + 20 || bullets[i].x < -20 || bullets[i].x > canvas.width + 20) {
                bullets.splice(i, 1);
            }
        }
        // Przeciwnicy
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
        // Kolizje
        for (let i = enemies.length - 1; i >= 0; i--) {
            for (let j = bullets.length - 1; j >= 0; j--) {
                const enemy = enemies[i];
                const bullet = bullets[j];
                if (enemy && bullet &&
                    bullet.x < enemy.x + enemy.width &&
                    bullet.x + bullet.width > enemy.x &&
                    bullet.y < enemy.y + enemy.height &&
                    bullet.y + bullet.height > enemy.y) {
                    
                    enemies.splice(i, 1);
                    bullets.splice(j, 1);
                    score += 10;
                    break; // Przerwij wewnętrzną pętlę, bo wróg już nie istnieje
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
        if (lives <= 0) {
            gameOver = true;
        }
    }

    function updateUI() {
        scoreEl.textContent = score;
        livesEl.textContent = lives;
    }
    
    // --- PĘTLA GŁÓWNA I ZARZĄDZANIE ---
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
            clearInterval(cooldownInterval); // Zatrzymaj odliczanie na ekranie game over
        } else {
            animationFrameId = requestAnimationFrame(animate);
        }
    }

    function resetGame() {
        // Zawsze czyść timery na starcie nowej gry!
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
        
        startSuperShotCooldown(5000); // Na start dajemy np. 5s cooldownu
        updateUI();
        animate();
    }

    // --- START APLIKACJI ---
    function showLoading() {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = "30px 'Segoe UI'";
        ctx.textAlign = 'center';
        ctx.fillText('ŁADOWANIE...', canvas.width / 2, canvas.height / 2);
    }
    
    showLoading(); // Pokaż ekran ładowania od razu
    
    spriteSheet.onload = function() {
        console.log("Zasoby załadowane. Start gry!");
        resetGame();
    };
    spriteSheet.onerror = function() {
        alert("BŁĄD: Nie można załadować grafiki statków. Sprawdź połączenie z internetem i odśwież stronę.");
    };
    spriteSheet.src = 'https://i.imgur.com/goYityG.png';
});
