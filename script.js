window.addEventListener('load', function() {
    // --- USTAWIENIA I ZMIENNE ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 600;

    // UI Elements...
    const scoreEl = document.getElementById('score');
    const livesEl = document.getElementById('lives');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const finalScoreEl = document.getElementById('finalScore');
    const newGameBtn = document.getElementById('newGameBtn');
    const superShotBtn = document.getElementById('superShotBtn');

    // Zasoby
    const shipImage = new Image();
    const soundPoolSize = 5;
    const shootSounds = [];
    for (let i = 0; i < soundPoolSize; i++) {
        const sound = new Audio('https://johntaronites.github.io/Shooter_AI/laser_shoot.wav');
        sound.volume = 0.3;
        shootSounds.push(sound);
    }
    let currentSoundIndex = 0;
    const lifeLostSound = new Audio('https://johntaronites.github.io/Shooter_AI/craaash.wav');
    lifeLostSound.volume = 0.5;
    const gameOverSound = new Audio('https://johntaronites.github.io/KOSMO-MAX/Ohnoo.wav');
    const superShotSound = new Audio('https://johntaronites.github.io/KOSMO-MAX/bigbomb.wav');

    // Zmienne stanu gry...
    let score, lives, missedEnemies, gameOver;
    let player, bullets, enemies;
    let enemyTimer, enemyInterval = 100; // Czas do pojawienia sie wroga
    
    let superShotCooldown, cooldownInterval, animationFrameId;

    // ZMIANA: Zmienne dla Delta Time
    let lastTime = 0;
    
    // --- KLASY OBIEKTÓW ---
    class Player {
        constructor() {
            this.width = 60; this.height = 50;
            this.x = (canvas.width - this.width) / 2;
            this.y = canvas.height - this.height - 20;
        }
        draw(context) {
            context.drawImage(shipImage, this.x, this.y, this.width, this.height);
        }
        update(inputX) {
            if (inputX !== null) { this.x = inputX - this.width / 2; }
            if (this.x < 0) this.x = 0;
            if (this.x > canvas.width - this.width) this.x = canvas.width - this.width;
        }
    }

    class Bullet {
        constructor(x, y, color = 'white', speed = 500, angle = 0) { // Prędkość w pikselach na sekundę
            this.x = x; this.y = y; this.width = 5; this.height = 15;
            this.color = color;
            this.speedX = Math.sin(angle) * speed;
            this.speedY = -Math.cos(angle) * speed; // Minus, bo Y rośnie w dół
        }
        update(deltaTime) { // ZMIANA: Przyjmuje deltaTime
            this.x += this.speedX * deltaTime;
            this.y += this.speedY * deltaTime;
        }
        draw(context) { context.fillStyle = this.color; context.fillRect(this.x, this.y, this.width, this.height); }
    }

    class Enemy {
        constructor() {
            this.width = 60; this.height = 50;
            this.x = Math.random() * (canvas.width - this.width);
            this.y = -this.height;
            this.speed = Math.random() * 100 + 100; // Prędkość w pikselach na sekundę
            this.markedForDeletion = false;
        }
        draw(context) {
            context.drawImage(shipImage, this.x, this.y, this.width, this.height);
        }
        update(deltaTime) { // ZMIANA: Przyjmuje deltaTime
            this.y += this.speed * deltaTime;
            if (this.y > canvas.height) {
                this.markedForDeletion = true;
                missedEnemies++;
            }
        }
    }

    // --- LOGIKA GRY ---
    
    // Input Handler...
    const input = { x: canvas.width / 2 };
    function getPointerPos(evt) {
        const rect = canvas.getBoundingClientRect();
        const touch = evt.touches ? evt.touches[0] : evt;
        return (touch.clientX - rect.left) / rect.width * canvas.width;
    }
    window.addEventListener('mousemove', e => { if (player) input.x = getPointerPos(e) });
    window.addEventListener('touchmove', e => { if (player) { e.preventDefault(); input.x = getPointerPos(e) }}, { passive: false });
    canvas.addEventListener('click', () => { if (!gameOver && player) shootTriple() });
    superShotBtn.addEventListener('click', () => { if (!gameOver && superShotCooldown <= 0) { shootSuper(); startSuperShotCooldown(30000) }});
    newGameBtn.addEventListener('click', resetGame);

    // Funkcje dźwiękowe...
    function playShootSound() {
        const sound = shootSounds[currentSoundIndex];
        sound.currentTime = 0;
        sound.play();
        currentSoundIndex = (currentSoundIndex + 1) % soundPoolSize;
    }

    // Funkcje strzelania...
    function shootTriple() {
        playShootSound();
        const bulletX = player.x + player.width / 2 - 2.5;
        setTimeout(() => { if (!gameOver) bullets.push(new Bullet(bulletX, player.y)) }, 0);
        setTimeout(() => { if (!gameOver) bullets.push(new Bullet(bulletX, player.y)) }, 100);
        setTimeout(() => { if (!gameOver) bullets.push(new Bullet(bulletX, player.y)) }, 200);
    }
    function shootSuper() {
        superShotSound.currentTime = 0;
        superShotSound.play();
        const bulletCount = 30;
        for (let i = 0; i < bulletCount; i++) {
            const angle = (Math.PI * 2 / bulletCount) * i;
            bullets.push(new Bullet(player.x + player.width / 2, player.y + player.height / 2, 'red', 300, angle));
        }
    }

    // Cooldown...
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

    // Funkcje zarządzające elementami gry...
    function handleGameElements(deltaTime) {
        // Wrogowie
        if (enemyTimer > enemyInterval) {
            enemies.push(new Enemy());
            enemyTimer = 0;
        } else {
            enemyTimer += deltaTime * 1000; // deltaTime jest w sekundach, my chcemy ms
        }
        enemies.forEach(enemy => { enemy.update(deltaTime); enemy.draw(ctx); });
        
        // Pociski
        bullets.forEach(bullet => { bullet.update(deltaTime); bullet.draw(ctx); });
        
        // Kolizje
        bullets.forEach(bullet => {
            enemies.forEach(enemy => {
                if (!bullet.markedForDeletion && !enemy.markedForDeletion && checkCollision(bullet, enemy)) {
                    enemy.markedForDeletion = true;
                    bullet.markedForDeletion = true;
                    score += 10;
                }
            });
        });

        // Usuwanie oznaczonych elementów
        bullets = bullets.filter(bullet => !bullet.markedForDeletion && bullet.y > 0);
        enemies = enemies.filter(enemy => !enemy.markedForDeletion);
    }
    function checkCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    // Stan gry...
    function checkGameState() {
        if (missedEnemies >= 3) {
            lives--;
            missedEnemies = 0;
            lifeLostSound.play(); 
        }
        if (lives <= 0 && !gameOver) {
            gameOver = true;
        }
    }
    function updateUI() { scoreEl.textContent = score; livesEl.textContent = lives }

    // --- PĘTLA GŁÓWNA GRY ---
    function animate(timestamp) { // ZMIANA: Przyjmuje timestamp
        const deltaTime = (timestamp - lastTime) / 1000; // Czas w sekundach
        lastTime = timestamp;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        player.update(input.x); 
        player.draw(ctx);
        
        handleGameElements(deltaTime);
        checkGameState();
        updateUI();

        if (gameOver) {
            if (gameOverScreen.style.display !== 'flex') {
                gameOverSound.play();
                setTimeout(() => {
                    gameOverScreen.style.display = 'flex';
                    finalScoreEl.textContent = score;
                    clearInterval(cooldownInterval);
                }, 500);
            }
        } else {
            animationFrameId = requestAnimationFrame(animate);
        }
    }

    function resetGame() {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (cooldownInterval) clearInterval(cooldownInterval);
        score = 0; lives = 3; missedEnemies = 0; gameOver = false;
        bullets = []; enemies = []; enemyTimer = 0;
        player = new Player();
        input.x = canvas.width / 2;
        gameOverScreen.style.display = 'none';
        startSuperShotCooldown(5000);
        updateUI();
        lastTime = 0; // Zresetuj czas dla deltaTime
        animate(0); // Rozpocznij pętlę
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
    
    showLoading();
    
    shipImage.onload = function() {
        resetGame();
    };
    shipImage.onerror = function() {
        alert("BŁĄD: Nie można załadować grafiki z imgur.");
    };
    
    shipImage.src = 'https://i.imgur.com/goYityG.png';
});
