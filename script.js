window.addEventListener('load', function() {
    // --- USTAWIENIA I ZMIENNE ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const desiredWidth = 800;
    const desiredHeight = 600;
    canvas.width = desiredWidth;
    canvas.height = desiredHeight;

    const scoreEl = document.getElementById('score');
    const livesEl = document.getElementById('lives');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const finalScoreEl = document.getElementById('finalScore');
    const newGameBtn = document.getElementById('newGameBtn');
    const superShotBtn = document.getElementById('superShotBtn');

    // --- ZMIANA: Lepsza obsługa ładowania zasobów ---
    const spriteSheet = new Image();
    const shootSound = new Audio('https://johntaronites.github.io/Shooter_AI/laser_shoot.wav');
    const lifeLostSound = new Audio('https://johntaronites.github.io/Shooter_AI/craaash.wav');

    let gameReady = false; // Flaga, która zapobiegnie startowi gry przed załadowaniem

    spriteSheet.onload = function() {
        console.log("Obrazek statków załadowany pomyślnie!");
        gameReady = true;
        resetGame(); // Rozpocznij grę dopiero teraz
    };

    spriteSheet.onerror = function() {
        console.error("Nie udało się załadować obrazka statków! Sprawdź link lub połączenie internetowe.");
        alert("BŁĄD: Nie można załadować grafiki statków. Gra nie może zostać uruchomiona.");
    };
    
    // Ustawienie źródła obrazka musi być PO zdefiniowaniu .onload i .onerror
    spriteSheet.src = 'https://i.imgur.com/goYityG.png';
    // --- KONIEC ZMIANY ---

    shootSound.volume = 0.3;
    lifeLostSound.volume = 0.5;

    let score, lives, missedEnemies, gameOver, player, bullets, enemies, enemyTimer, superShotCooldown;

    const playerSprite = { x: 0, y: 0, width: 98, height: 75 };
    const enemySprite = { x: 0, y: 75, width: 98, height: 84 };

    // --- KLASY ---
    class Player {
        constructor() {
            this.width = playerSprite.width / 2;
            this.height = playerSprite.height / 2;
            this.x = (canvas.width - this.width) / 2;
            this.y = canvas.height - this.height - 70;
        }
        draw() {
            // DODANO: Dodatkowe sprawdzenie, czy obrazek jest gotowy do rysowania
            if (spriteSheet.complete && spriteSheet.naturalHeight !== 0) {
                ctx.drawImage(spriteSheet, playerSprite.x, playerSprite.y, playerSprite.width, playerSprite.height, this.x, this.y, this.width, this.height);
            }
        }
        update(input) {
            if (input.x) {
                this.x = input.x - this.width / 2;
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
            // DODANO: Dodatkowe sprawdzenie, czy obrazek jest gotowy do rysowania
            if (spriteSheet.complete && spriteSheet.naturalHeight !== 0) {
                ctx.drawImage(spriteSheet, enemySprite.x, enemySprite.y, enemySprite.width, enemySprite.height, this.x, this.y, this.width, this.height);
            }
        }
    }

    const input = { x: null };

    function getMousePos(evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (evt.clientX - rect.left) / rect.width * canvas.width,
            y: (evt.clientY - rect.top) / rect.height * canvas.height
        };
    }
    
    window.addEventListener('mousemove', e => {
        if (!player) return;
        input.x = getMousePos(e).x;
    });
    
    window.addEventListener('touchmove', e => {
        if (!player) return;
        e.preventDefault();
        input.x = getMousePos(e.touches[0]).x;
    }, { passive: false });

    canvas.addEventListener('click', () => {
        if (gameOver || !gameReady) return;
        shootTriple();
    });

    superShotBtn.addEventListener('click', () => {
        if (gameOver || superShotCooldown > 0 || !gameReady) return;
        shootSuper();
        superShotCooldown = 30000;
        superShotBtn.disabled = true;
        
        let interval = setInterval(() => {
            if (gameOver) { // Zatrzymaj odliczanie jeśli gra się skończy
                 clearInterval(interval);
                 return;
            }
            superShotCooldown -= 1000;
            if (superShotCooldown <= 0) {
                superShotBtn.disabled = false;
                superShotBtn.innerText = "SUPER STRZAŁ";
                clearInterval(interval);
            } else {
                superShotBtn.innerText = `GOTOWY ZA ${superShotCooldown / 1000}s`;
            }
        }, 1000);
    });
    
    newGameBtn.addEventListener('click', resetGame);

    function shootTriple() {
        shootSound.currentTime = 0;
        shootSound.play();
        setTimeout(() => bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y)), 0);
        setTimeout(() => bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y)), 100);
        setTimeout(() => bullets.push(new Bullet(player.x + player.width / 2 - 2.5, player.y)), 200);
    }

    function shootSuper() {
        const bulletCount = 30;
        for (let i = 0; i < bulletCount; i++) {
            const angle = (Math.PI * 2 / bulletCount) * i;
            bullets.push(new Bullet(player.x + player.width / 2, player.y + player.height / 2, 'red', 5, angle));
        }
    }

    function handleEnemies() {
        if (!gameReady) return;
        enemyTimer++;
        if (enemyTimer % 100 === 0) {
            enemies.push(new Enemy());
        }
        enemies.forEach((enemy, index) => {
            enemy.update();
            enemy.draw();
            if (enemy.y > canvas.height) {
                enemies.splice(index, 1);
                missedEnemies++;
            }
        });
    }

    function handleBullets() {
        bullets.forEach((bullet, index) => {
            bullet.update();
            bullet.draw();
            if (bullet.y < 0 || bullet.y > canvas.height || bullet.x < 0 || bullet.x > canvas.width) {
                bullets.splice(index, 1);
            }
        });
    }

    function handleCollisions() {
        enemies.forEach((enemy, enemyIndex) => {
            bullets.forEach((bullet, bulletIndex) => {
                if (bullet.x < enemy.x + enemy.width &&
                    bullet.x + bullet.width > enemy.x &&
                    bullet.y < enemy.y + enemy.height &&
                    bullet.y + bullet.height > enemy.y) {
                    
                    enemies.splice(enemyIndex, 1);
                    bullets.splice(bulletIndex, 1);
                    score += 10;
                }
            });
        });
    }

    function checkGameState() {
        if (missedEnemies >= 3) {
            lives--;
            missedEnemies = 0;
            if (lives > 0) {
                lifeLostSound.play();
            }
        }
        if (lives <= 0) {
            gameOver = true;
        }
    }

    function updateUI() {
        scoreEl.textContent = score;
        livesEl.textContent = lives;
    }
    
    function showGameOver() {
        gameOverScreen.style.display = 'flex';
        finalScoreEl.textContent = score;
    }

    let animationFrameId;
    function animate() {
        if (gameOver) {
            showGameOver();
            // Zatrzymanie poprzedniej pętli animacji, jeśli była
            cancelAnimationFrame(animationFrameId);
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (gameReady) {
            player.update(input);
            player.draw();

            handleBullets();
            handleEnemies();
            handleCollisions();
            
            checkGameState();
            updateUI();
        }

        animationFrameId = requestAnimationFrame(animate);
    }

    function resetGame() {
        if (!gameReady) return; // Nie resetuj, jeśli zasoby nie są gotowe

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        score = 0;
        lives = 3;
        missedEnemies = 0;
        gameOver = false;
        bullets = [];
        enemies = [];
        enemyTimer = 0;
        superShotCooldown = 1; // Ustaw na 1, by odpalić logikę przycisku od razu
        
        player = new Player();
        input.x = canvas.width / 2;

        gameOverScreen.style.display = 'none';
        superShotBtn.disabled = true; // Zaczyna nieaktywny, cooldown go aktywuje
        
        // Uruchomienie logiki cooldownu przycisku od razu
        let interval = setInterval(() => {
            if (gameOver) {
                 clearInterval(interval);
                 return;
            }
            superShotCooldown -= 1000;
             if (superShotCooldown <= 0) {
                superShotBtn.disabled = false;
                superShotBtn.innerText = "SUPER STRZAŁ";
                clearInterval(interval);
            } else {
                superShotBtn.innerText = `GOTOWY ZA ${superShotCooldown / 1000}s`;
            }
        }, 1000);
        superShotCooldown = 5000; // Ustaw realny cooldown na start (np. 5 sekund)
        superShotBtn.innerText = `GOTOWY ZA ${superShotCooldown / 1000}s`;


        updateUI();
        animate();
    }
});
