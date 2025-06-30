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

    // --- ZASOBY GRY ---
    const shipImage = new Image();

    // Dźwięki
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

    let score, lives, missedEnemies, gameOver;
    let player, bullets, enemies, enemyTimer;
    
    let superShotCooldown, cooldownInterval, animationFrameId;
    
    // --- KLASY OBIEKTÓW ---
    class Player {
        constructor() {
            this.width = 60; this.height = 50;
            this.x = (canvas.width - this.width) / 2;
            this.y = canvas.height - this.height - 20;
        }
        draw() { ctx.drawImage(shipImage, this.x, this.y, this.width, this.height); }
        update(inputX) {
            if (inputX !== null) { this.x = inputX - this.width / 2; }
            if (this.x < 0) this.x = 0;
            if (this.x > canvas.width - this.width) this.x = canvas.width - this.width;
        }
    }
    class Bullet {
        constructor(x, y, color = 'white', speed = -10, angle = 0) {
            this.x = x; this.y = y; this.width = 5; this.height = 15;
            this.color = color; this.speedX = Math.sin(angle) * Math.abs(speed);
            this.speedY = Math.cos(angle) * speed;
        }
        update() { this.x += this.speedX; this.y += this.speedY; }
        draw() { ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.width, this.height); }
    }
    class Enemy {
        constructor() {
            this.width = 60; this.height = 50;
            this.x = Math.random() * (canvas.width - this.width);
            this.y = -this.height;
            this.speed = Math.random() * 2 + 1;
        }
        draw() { ctx.drawImage(shipImage, this.x, this.y, this.width, this.height); }
        update() { this.y += this.speed; }
    }

    // --- KONTROLER WEJŚCIA I RESZTA LOGIKI ---
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

    function playShootSound() {
        const sound = shootSounds[currentSoundIndex];
        sound.currentTime = 0;
        sound.play();
        currentSoundIndex = (currentSoundIndex + 1) % soundPoolSize;
    }
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
            bullets.push(new Bullet(player.x + player.width / 2, player.y + player.height / 2, 'red', 5, angle));
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
        for (let i = bullets.length - 1; i >= 0; i--) { bullets[i].update(); bullets[i].draw(); if (bullets[i].y < -20) bullets.splice(i, 1) }
        enemyTimer++;
        if (enemyTimer % 100 === 0) { enemies.push(new Enemy()) }
        for (let i = enemies.length - 1; i >= 0; i--) {
            enemies[i].update(); enemies[i].draw();
            if (enemies[i].y > canvas.height) { enemies.splice(i, 1); missedEnemies++ }
        }
        for (let i = enemies.length - 1; i >= 0; i--) {
            for (let j = bullets.length - 1; j >= 0; j--) {
                const enemy = enemies[i]; const bullet = bullets[j];
                if (enemy && bullet && bullet.x < enemy.x + enemy.width && bullet.x + bullet.width > enemy.x && bullet.y < enemy.y + enemy.height && bullet.y + bullet.height > enemy.y) {
                    enemies.splice(i, 1); bullets.splice(j, 1); score += 10; break;
                }
            }
        }
    }

    // --- ZMIANA 1: Poprawiona funkcja ---
    function checkGameState() {
        if (missedEnemies >= 3) {
            lives--;
            missedEnemies = 0;
            // Dźwięk utraty życia odtwarzany jest ZAWSZE, również przy ostatnim życiu.
            lifeLostSound.play(); 
        }
        // Dopiero potem sprawdzamy, czy to koniec gry.
        if (lives <= 0 && !gameOver) {
            gameOver = true;
        }
    }

    function updateUI() { scoreEl.textContent = score; livesEl.textContent = lives }

    // --- ZMIANA 2: Gówna pętla gry z opóźnionym ekranem Game Over ---
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        player.update(input.x); 
        player.draw();
        handleGameElements();
        checkGameState();
        updateUI();

        // Pętla animacji kontynuuje się, dopóki ekran Game Over nie zostanie aktywowany
        if (gameOver) {
            // Ten blok kodu uruchamia się tylko raz, gdy gra się kończy.
            // Sprawdzamy, czy ekran Game Over nie jest już widoczny.
            if (gameOverScreen.style.display !== 'flex') {
                gameOverSound.play(); // Natychmiast odtwarzamy dźwięk "Ohnoo"
                
                // Czekamy pół sekundy, zanim pokażemy ekran Game Over.
                // Daje to czas na odtworzenie dźwięku i lepszy efekt.
                setTimeout(() => {
                    gameOverScreen.style.display = 'flex';
                    finalScoreEl.textContent = score;
                    clearInterval(cooldownInterval);
                }, 500); // 500ms = 0.5 sekundy opóźnienia
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
    
    showLoading();
    
    shipImage.onload = function() {
        console.log("Grafika załadowana pomyślnie. Start gry!");
        resetGame();
    };
    shipImage.onerror = function() {
        alert("BŁĄD: Nie można załadować grafiki z imgur. Sprawdź link lub połączenie.");
    };
    
    shipImage.src = 'https://i.imgur.com/goYityG.png';
});
