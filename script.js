// Wersja 7.1
window.addEventListener('load', function() {
    // --- GŁÓWNE ZMIENNE ---
    const version = '7.1';
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startScreen = document.getElementById('startScreen');
    const startButton = document.getElementById('startButton');
    const gameContainer = document.getElementById('gameContainer');
    const versionDisplay = document.getElementById('version-display');
    versionDisplay.innerText = `v${version}`;

    // --- TWORZENIE UI ---
    // (Ten kod jest poprawny, więc został zwinięty dla czytelności)
    const gameUiElements = document.createElement('div');
    gameUiElements.style.display = 'none';
    const uiContainer = document.createElement('div');
    uiContainer.style.position = 'absolute'; uiContainer.style.left = '0'; uiContainer.style.top = '0'; uiContainer.style.width = '100%'; uiContainer.style.display = 'flex'; uiContainer.style.justifyContent = 'space-between'; uiContainer.style.padding = '10px 20px'; uiContainer.style.color = 'white'; uiContainer.style.fontFamily = 'Segoe UI, Tahoma, sans-serif'; uiContainer.style.fontSize = '20px'; uiContainer.style.textShadow = '2px 2px 4px #000'; uiContainer.style.pointerEvents = 'none';
    const scoreEl = document.createElement('div');
    const levelEl = document.createElement('div');
    const livesEl = document.createElement('div');
    uiContainer.appendChild(scoreEl); uiContainer.appendChild(levelEl); uiContainer.appendChild(livesEl);
    const superShotBtn = document.createElement('button');
    superShotBtn.innerText = 'SUPER STRZAŁ'; superShotBtn.style.position = 'absolute'; superShotBtn.style.left = '50%'; superShotBtn.style.transform = 'translateX(-50%)'; superShotBtn.style.bottom = '20px'; superShotBtn.style.padding = '10px 20px'; superShotBtn.style.fontSize = '1em'; superShotBtn.style.backgroundColor = '#ff4500'; superShotBtn.style.color = 'white'; superShotBtn.style.border = '2px solid #ff8c00'; superShotBtn.style.borderRadius = '5px'; superShotBtn.style.cursor = 'pointer'; superShotBtn.style.pointerEvents = 'auto';
    const gameOverScreen = document.createElement('div');
    gameOverScreen.style.position = 'absolute'; gameOverScreen.style.width = '100%'; gameOverScreen.style.height = '100%'; gameOverScreen.style.display = 'none'; gameOverScreen.style.flexDirection = 'column'; gameOverScreen.style.justifyContent = 'center'; gameOverScreen.style.alignItems = 'center'; gameOverScreen.style.backgroundColor = 'rgba(0,0,0,0.75)'; gameOverScreen.style.textAlign = 'center';
    const gameOverTitle = document.createElement('h1');
    gameOverTitle.innerText = 'GAME OVER'; gameOverTitle.style.fontSize = '4em'; gameOverTitle.style.color = '#ff4444';
    const finalScoreText = document.createElement('p');
    finalScoreText.innerText = 'Twój wynik: '; finalScoreText.style.fontSize = '1.5em';
    const finalScoreEl = document.createElement('span');
    finalScoreText.appendChild(finalScoreEl);
    const newGameBtn = document.createElement('button');
    newGameBtn.innerText = 'NOWA GRA'; newGameBtn.style.marginTop = '30px'; newGameBtn.style.padding = '15px 30px'; newGameBtn.style.fontSize = '1.2em'; newGameBtn.style.cursor = 'pointer'; newGameBtn.style.backgroundColor = '#4CAF50'; newGameBtn.style.color = 'white'; newGameBtn.style.border = 'none'; newGameBtn.style.borderRadius = '5px';
    newGameBtn.addEventListener('click', resetGame);
    gameOverScreen.appendChild(gameOverTitle); gameOverScreen.appendChild(finalScoreText); gameOverScreen.appendChild(newGameBtn);
    gameContainer.appendChild(uiContainer);
    gameContainer.appendChild(superShotBtn);
    gameContainer.appendChild(gameOverScreen);


    // --- ZASOBY GRY ---
    const shipImage = new Image();
    const soundPoolSize = 5;
    const shootSounds = [];
    for (let i = 0; i < soundPoolSize; i++) {
        shootSounds.push(new Audio('assets/laser_shoot.mp3'));
    }
    const lifeLostSound = new Audio('assets/craaash.mp3');
    const gameOverSound = new Audio('assets/Ohnoo.mp3');
    const superShotSound = new Audio('assets/bigbomb.mp3');
    const letsGoSound = new Audio('assets/letsgo.mp3');
    const allSounds = [...shootSounds, lifeLostSound, gameOverSound, superShotSound, letsGoSound];
    allSounds.forEach(sound => { sound.volume = 0.4; });
    let currentSoundIndex = 0;
    
    // --- ZMIENNE STANU GRY ---
    let score, lives, missedEnemies, gameOver, animationFrameId, lastTime = 0;
    let player, bullets, enemies;
    let currentLevel, enemyBaseSpeed, enemySpeedMultiplier;
    let baseEnemyInterval, enemySpawnMultiplier, enemySpawnTimer;
    let superShotCharges, maxSuperShotCharges;

    // --- KLASY I LOGIKA GRY ---
    class Player { constructor() { this.width = 50; this.height = 40; this.x = canvas.width / 2 - this.width / 2; this.bottomLimit = 100; this.y = canvas.height - this.height - this.bottomLimit; } draw(context) { context.drawImage(shipImage, this.x, this.y, this.width, this.height); } update(inputX) { if (inputX !== null) { this.x = inputX - this.width / 2; } if (this.x < 0) this.x = 0; if (this.x > canvas.width - this.width) this.x = canvas.width - this.width; } }
    class Bullet { constructor(x, y, color = 'white', speed = 500, angle = 0) { this.x = x; this.y = y; this.width = 5; this.height = 15; this.color = color; this.speedX = Math.sin(angle) * speed; this.speedY = -Math.cos(angle) * speed; this.markedForDeletion = false; } update(deltaTime) { this.x += this.speedX * deltaTime; this.y += this.speedY * deltaTime; if (this.y < 0) this.markedForDeletion = true; } draw(context) { context.fillStyle = this.color; context.fillRect(this.x, this.y, this.width, this.height); } }
    class Enemy { constructor() { this.width = 50; this.height = 45; this.x = Math.random() * (canvas.width - this.width); this.y = -this.height; this.speed = (Math.random() * 100 + enemyBaseSpeed) * enemySpeedMultiplier; this.markedForDeletion = false; } draw(context) { context.drawImage(shipImage, this.x, this.y, this.width, this.height); } update(deltaTime) { this.y += this.speed * deltaTime; if (this.y > canvas.height) { this.markedForDeletion = true; missedEnemies++; } } }
    function resizeGame() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; if (player) { player.x = Math.max(0, Math.min(player.x, canvas.width - player.width)); player.y = canvas.height - player.height - player.bottomLimit; } }
    window.addEventListener('resize', resizeGame);
    const input = { x: canvas.width / 2 };
    function getPointerPos(evt) { const rect = canvas.getBoundingClientRect(); const touch = evt.touches ? evt.touches[0] : evt; return (touch.clientX - rect.left); }
    window.addEventListener('mousemove', e => { if (player) input.x = getPointerPos(e) });
    window.addEventListener('touchmove', e => { if (player) { e.preventDefault(); input.x = getPointerPos(e) }}, { passive: false });
    canvas.addEventListener('click', () => { if (!gameOver && player) shootTriple() });
    newGameBtn.addEventListener('click', resetGame);
    superShotBtn.addEventListener('click', () => { if (!gameOver && player && superShotCharges > 0) { shootSuper(); }});
    function updateSuperShotUI() { superShotBtn.innerText = `SUPER STRZAŁ (${superShotCharges})`; superShotBtn.disabled = superShotCharges <= 0; }
    function playShootSound() { const sound = shootSounds[currentSoundIndex]; sound.currentTime = 0; sound.play(); currentSoundIndex = (currentSoundIndex + 1) % soundPoolSize; }
    function shootTriple() { playShootSound(); const bulletX = player.x + player.width / 2 - 2.5; if (currentLevel < 3) { setTimeout(() => { if (!gameOver) bullets.push(new Bullet(bulletX, player.y)) }, 0); setTimeout(() => { if (!gameOver) bullets.push(new Bullet(bulletX, player.y)) }, 100); setTimeout(() => { if (!gameOver) bullets.push(new Bullet(bulletX, player.y)) }, 200); } else { const spreadAngle = 0.15; bullets.push(new Bullet(bulletX, player.y, 'white', 500, 0)); bullets.push(new Bullet(bulletX, player.y, 'white', 500, -spreadAngle)); bullets.push(new Bullet(bulletX, player.y, 'white', 500, spreadAngle)); } }
    function shootSuper() { superShotSound.currentTime = 0; superShotSound.play(); superShotCharges--; updateSuperShotUI(); const bulletCount = 30; for (let i = 0; i < bulletCount; i++) { const angle = (Math.PI * 2 / bulletCount) * i; bullets.push(new Bullet(player.x + player.width / 2, player.y + player.height / 2, 'red', 300, angle)); } }
    function handleGameElements(deltaTime) { const currentEnemyInterval = baseEnemyInterval / enemySpawnMultiplier; if (enemySpawnTimer > currentEnemyInterval) { enemies.push(new Enemy()); enemySpawnTimer = 0; } else { enemySpawnTimer += deltaTime * 1000; } bullets.forEach(bullet => bullet.update(deltaTime)); enemies.forEach(enemy => enemy.update(deltaTime)); for (let i = bullets.length - 1; i >= 0; i--) { for (let j = enemies.length - 1; j >= 0; j--) { if (bullets[i] && enemies[j] && checkCollision(bullets[i], enemies[j])) { bullets[i].markedForDeletion = true; enemies[j].markedForDeletion = true; score += 10; } } } bullets = bullets.filter(bullet => !bullet.markedForDeletion); enemies = enemies.filter(enemy => !enemy.markedForDeletion); bullets.forEach(bullet => bullet.draw(ctx)); enemies.forEach(enemy => enemy.draw(ctx)); }
    function checkCollision(rect1, rect2) { return (rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y); }
    function checkGameState() { if (missedEnemies >= 3) { lives--; missedEnemies = 0; if (lives > 0) { lifeLostSound.currentTime = 0; lifeLostSound.play(); } } if (lives <= 0 && !gameOver) { gameOver = true; } }
    function updateUI() { scoreEl.innerHTML = `WYNIK: ${score}`; levelEl.innerHTML = `POZIOM: ${currentLevel}`; livesEl.innerHTML = `ŻYCIA: ${lives}`; updateSuperShotUI(); }
    function showLevelUpMessage(level) { const levelUpEl = document.createElement('div'); levelUpEl.innerText = `LEVEL ${level}`; levelUpEl.style.position = 'absolute'; levelUpEl.style.left = '50%'; levelUpEl.style.top = '50%'; levelUpEl.style.transform = 'translate(-50%, -50%)'; levelUpEl.style.color = '#6c6cff'; levelUpEl.style.fontSize = '5em'; levelUpEl.style.textShadow = '3px 3px 6px #000'; levelUpEl.style.opacity = '1'; levelUpEl.style.transition = 'opacity 1s ease-out'; levelUpEl.style.userSelect = 'none'; levelUpEl.style.webkitUserSelect = 'none'; document.body.appendChild(levelUpEl); setTimeout(() => { levelUpEl.style.opacity = '0'; setTimeout(() => { document.body.removeChild(levelUpEl); }, 1000); }, 1500); }
    function levelUp(newLevel) { currentLevel = newLevel; showLevelUpMessage(currentLevel); enemySpeedMultiplier *= 1.2; enemySpawnMultiplier *= 1.2; if (currentLevel === 3) { maxSuperShotCharges = 3; } superShotCharges = maxSuperShotCharges; }
    function checkLevelUp() { if (currentLevel === 1 && score >= 200) { levelUp(2); } else if (currentLevel === 2 && score >= 500) { levelUp(3); } }
    function animate(timestamp) { if (!lastTime) lastTime = timestamp; const deltaTime = (timestamp - lastTime) / 1000; lastTime = timestamp; ctx.clearRect(0, 0, canvas.width, canvas.height); if (player) { player.update(input.x); player.draw(ctx); } handleGameElements(deltaTime); checkGameState(); updateUI(); checkLevelUp(); if (gameOver) { if (gameOverScreen.style.display !== 'flex') { gameOverSound.currentTime = 0; gameOverSound.play(); setTimeout(() => { gameOverScreen.style.display = 'flex'; finalScoreEl.innerText = score; }, 500); } } else { animationFrameId = requestAnimationFrame(animate); } }
    function resetGame() { if (animationFrameId) cancelAnimationFrame(animationFrameId); score = 0; lives = 3; missedEnemies = 0; gameOver = false; bullets = []; enemies = []; currentLevel = 1; enemyBaseSpeed = 100; enemySpeedMultiplier = 1.0; baseEnemyInterval = 1000; enemySpawnMultiplier = 1.0; enemySpawnTimer = 0; maxSuperShotCharges = 2; superShotCharges = maxSuperShotCharges; gameOverScreen.style.display = 'none'; resizeGame(); player = new Player(); input.x = canvas.width / 2; lastTime = 0; updateUI(); animate(0); }

    // --- ZMIANA: OSTATECZNA, NAJPROSTSZA ARCHITEKTURA STARTOWA ---

    // Funkcja wywoływana TYLKO po kliknięciu "Start"
    function initGame() {
        startButton.removeEventListener('click', initGame);
        
        // Spróbuj odtworzyć i zatrzymać jeden dźwięk, aby odblokować audio
        // To jest nasza jedyna wrażliwa operacja
        const unlockPromise = letsGoSound.play();
        if (unlockPromise !== undefined) {
            unlockPromise.then(() => {
                letsGoSound.pause();
                letsGoSound.currentTime = 0;
                console.log("Audio odblokowane pomyślnie.");
            }).catch(error => {
                console.warn("Automatyczne odtwarzanie zablokowane, ale to OK.", error);
            });
        }

        // Uruchom grę natychmiast
        startScreen.style.display = 'none';
        gameContainer.style.display = 'block';
        resetGame();
    }
    
    // Ładuje tylko obrazek, bo dźwięki <audio> ładują się same w tle
    function loadInitialAssets() {
        startButton.disabled = true;
        startButton.innerText = 'ŁADOWANIE...';

        shipImage.onload = () => {
            startButton.disabled = false;
            startButton.innerText = 'START';
        };
        shipImage.onerror = () => {
            startButton.innerText = 'BŁĄD';
            alert('Nie udało się załadować grafiki. Odśwież stronę.');
        };
        shipImage.src = 'assets/ship.png';
    }

    // --- PUNKT WEJŚCIA APLIKACJI ---
    loadInitialAssets();
    startButton.addEventListener('click', initGame);
});