// Wersja 2.3
window.addEventListener('load', function() {
    // --- GŁÓWNE ZMIENNE I KONFIGURACJA ---
    const version = '2.3';
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startScreen = document.getElementById('startScreen');
    const versionDisplay = document.getElementById('version-display');
    versionDisplay.innerText = `v${version}`;

    // --- TWORZENIE ELEMENTÓW INTERFEJSU (UI) ---
    const gameUiContainer = document.createElement('div');
    gameUiContainer.style.display = 'none';
    gameUiContainer.style.position = 'absolute';
    gameUiContainer.style.top = '0';
    gameUiContainer.style.left = '0';
    gameUiContainer.style.width = '100%';
    gameUiContainer.style.padding = '10px 20px';
    gameUiContainer.style.pointerEvents = 'none';
    
    const topBar = document.createElement('div');
    topBar.style.display = 'flex';
    topBar.style.justifyContent = 'space-between';
    topBar.style.alignItems = 'center';
    
    const statsContainer = document.createElement('div');
    statsContainer.style.color = 'white';
    statsContainer.style.fontFamily = 'Segoe UI, Tahoma, sans-serif';
    statsContainer.style.fontSize = '20px';
    statsContainer.style.textShadow = '2px 2px 4px #000';
    const scoreEl = document.createElement('div');
    const levelEl = document.createElement('div');
    const livesEl = document.createElement('div');
    statsContainer.appendChild(scoreEl);
    statsContainer.appendChild(levelEl);
    statsContainer.appendChild(livesEl);

    const muteBtn = document.createElement('button');
    muteBtn.style.width = '40px'; muteBtn.style.height = '40px'; muteBtn.style.fontSize = '24px';
    muteBtn.style.background = 'rgba(255, 255, 255, 0.2)'; muteBtn.style.border = '1px solid white';
    muteBtn.style.color = 'white'; muteBtn.style.borderRadius = '50%'; muteBtn.style.cursor = 'pointer';
    muteBtn.style.pointerEvents = 'auto';

    topBar.appendChild(statsContainer);
    topBar.appendChild(muteBtn);

    const superShotBtn = document.createElement('button');
    superShotBtn.innerText = 'SUPER STRZAŁ'; superShotBtn.style.position = 'absolute'; superShotBtn.style.left = '50%'; superShotBtn.style.transform = 'translateX(-50%)'; superShotBtn.style.bottom = '20px'; superShotBtn.style.padding = '10px 20px'; superShotBtn.style.fontSize = '1em'; superShotBtn.style.backgroundColor = '#ff4500'; superShotBtn.style.color = 'white'; superShotBtn.style.border = '2px solid #ff8c00'; superShotBtn.style.borderRadius = '5px'; superShotBtn.style.cursor = 'pointer';
    // ZMIANA: Naprawia niedziałający przycisk
    superShotBtn.style.pointerEvents = 'auto';

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
    
    gameOverScreen.appendChild(gameOverTitle); gameOverScreen.appendChild(finalScoreText); gameOverScreen.appendChild(newGameBtn);
    gameUiContainer.appendChild(topBar);
    gameUiContainer.appendChild(superShotBtn);
    document.body.appendChild(gameUiContainer); document.body.appendChild(gameOverScreen);

    // --- ZASOBY I SYSTEM AUDIO ---
    const shipImage = new Image();
    let audioContext;
    let soundBuffers = {}; 
    let audioUnlocked = false;
    let isMuted = true;
    
    // ZMIANA: Cichy dźwięk do odblokowania trybu 'playback'
    const silentUnlockAudio = new Audio("data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQCATWRpYWZpbGUuY29tEEEEAABhAAAHAQAAACw=");
    silentUnlockAudio.loop = true;

    function playSound(name) { if (isMuted) return; const buffer = soundBuffers[name]; if (!audioContext || !buffer || audioContext.state !== 'running') return; const source = audioContext.createBufferSource(); source.buffer = buffer; source.connect(audioContext.destination); source.start(0); }
    
    // --- ZMIENNE STANU GRY ---
    let score, lives, missedEnemies, gameOver, animationFrameId, lastTime = 0;
    let player, bullets, enemies;
    let currentLevel, enemyBaseSpeed, enemySpeedMultiplier;
    let baseEnemyInterval, enemySpawnMultiplier, enemySpawnTimer;
    let superShotCharges, maxSuperShotCharges;

    // --- KLASY I LOGIKA GRY (BEZ ZMIAN) ---
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
    function shootTriple() { playSound('shoot'); const bulletX = player.x + player.width / 2 - 2.5; if (currentLevel < 3) { setTimeout(() => { if (!gameOver) bullets.push(new Bullet(bulletX, player.y)) }, 0); setTimeout(() => { if (!gameOver) bullets.push(new Bullet(bulletX, player.y)) }, 100); setTimeout(() => { if (!gameOver) bullets.push(new Bullet(bulletX, player.y)) }, 200); } else { const spreadAngle = 0.15; bullets.push(new Bullet(bulletX, player.y, 'white', 500, 0)); bullets.push(new Bullet(bulletX, player.y, 'white', 500, -spreadAngle)); bullets.push(new Bullet(bulletX, player.y, 'white', 500, spreadAngle)); } }
    function shootSuper() { playSound('superShot'); superShotCharges--; updateSuperShotUI(); const bulletCount = 30; for (let i = 0; i < bulletCount; i++) { const angle = (Math.PI * 2 / bulletCount) * i; bullets.push(new Bullet(player.x + player.width / 2, player.y + player.height / 2, 'red', 300, angle)); } }
    function handleGameElements(deltaTime) { const currentEnemyInterval = baseEnemyInterval / enemySpawnMultiplier; if (enemySpawnTimer > currentEnemyInterval) { enemies.push(new Enemy()); enemySpawnTimer = 0; } else { enemySpawnTimer += deltaTime * 1000; } bullets.forEach(bullet => bullet.update(deltaTime)); enemies.forEach(enemy => enemy.update(deltaTime)); for (let i = bullets.length - 1; i >= 0; i--) { for (let j = enemies.length - 1; j >= 0; j--) { if (bullets[i] && enemies[j] && checkCollision(bullets[i], enemies[j])) { bullets[i].markedForDeletion = true; enemies[j].markedForDeletion = true; score += 10; } } } bullets = bullets.filter(bullet => !bullet.markedForDeletion); enemies = enemies.filter(enemy => !enemy.markedForDeletion); bullets.forEach(bullet => bullet.draw(ctx)); enemies.forEach(enemy => enemy.draw(ctx)); }
    function checkCollision(rect1, rect2) { return (rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y); }
    function checkGameState() { if (missedEnemies >= 3) { lives--; missedEnemies = 0; if (lives > 0) { playSound('lifeLost'); } } if (lives <= 0 && !gameOver) { gameOver = true; } }
    function updateUI() { scoreEl.innerHTML = `WYNIK: ${score}`; levelEl.innerHTML = `POZIOM: ${currentLevel}`; livesEl.innerHTML = `ŻYCIA: ${lives}`; updateSuperShotUI(); }
    function showLevelUpMessage(level) { const levelUpEl = document.createElement('div'); levelUpEl.innerText = `LEVEL ${level}`; levelUpEl.style.position = 'absolute'; levelUpEl.style.left = '50%'; levelUpEl.style.top = '50%'; levelUpEl.style.transform = 'translate(-50%, -50%)'; levelUpEl.style.color = '#6c6cff'; levelUpEl.style.fontSize = '5em'; levelUpEl.style.textShadow = '3px 3px 6px #000'; levelUpEl.style.opacity = '1'; levelUpEl.style.transition = 'opacity 1s ease-out'; levelUpEl.style.userSelect = 'none'; levelUpEl.style.webkitUserSelect = 'none'; document.body.appendChild(levelUpEl); setTimeout(() => { levelUpEl.style.opacity = '0'; setTimeout(() => { document.body.removeChild(levelUpEl); }, 1000); }, 1500); }
    function levelUp(newLevel) { currentLevel = newLevel; showLevelUpMessage(currentLevel); enemySpeedMultiplier *= 1.2; enemySpawnMultiplier *= 1.2; if (currentLevel === 3) { maxSuperShotCharges = 3; } superShotCharges = maxSuperShotCharges; }
    function checkLevelUp() { if (currentLevel === 1 && score >= 200) { levelUp(2); } else if (currentLevel === 2 && score >= 500) { levelUp(3); } }
    function animate(timestamp) { if (!lastTime) lastTime = timestamp; const deltaTime = (timestamp - lastTime) / 1000; lastTime = timestamp; ctx.clearRect(0, 0, canvas.width, canvas.height); if (player) { player.update(input.x); player.draw(ctx); } handleGameElements(deltaTime); checkGameState(); updateUI(); checkLevelUp(); if (gameOver) { if (gameOverScreen.style.display !== 'flex') { playSound('gameOver'); setTimeout(() => { gameOverScreen.style.display = 'flex'; finalScoreEl.innerText = score; }, 500); } } else { animationFrameId = requestAnimationFrame(animate); } }
    function resetGame() { if (animationFrameId) cancelAnimationFrame(animationFrameId); score = 0; lives = 3; missedEnemies = 0; gameOver = false; bullets = []; enemies = []; currentLevel = 1; enemyBaseSpeed = 100; enemySpeedMultiplier = 1.0; baseEnemyInterval = 1000; enemySpawnMultiplier = 1.0; enemySpawnTimer = 0; maxSuperShotCharges = 2; superShotCharges = maxSuperShotCharges; gameOverScreen.style.display = 'none'; resizeGame(); player = new Player(); input.x = canvas.width / 2; lastTime = 0; updateUI(); animate(0); }

    // --- NOWA, ULEPSZONA LOGIKA STARTOWA ---

    // Aktualizuje wygląd przycisku wyciszenia
    function updateMuteButton() {
        if (isMuted) {
            muteBtn.innerHTML = '🔇';
            muteBtn.style.borderColor = '#888';
        } else {
            muteBtn.innerHTML = '🔊';
            muteBtn.style.borderColor = 'white';
        }
    }

    // Odblokowuje i zarządza dźwiękiem
    function handleAudioUnlock() {
        if (audioUnlocked) {
            isMuted = !isMuted;
            updateMuteButton();
            return;
        }
        
        if (audioContext && audioContext.state === 'running') {
            audioUnlocked = true;
            isMuted = false;
            playSound('letsgo');
            updateMuteButton();
            return;
        }

        // Pierwsze kliknięcie - próba odblokowania
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        audioContext.resume().then(() => {
            console.log("AudioContext wznowiony pomyślnie.");
            if ('audioSession' in navigator) {
                navigator.audioSession.type = 'playback';
            }
            silentUnlockAudio.play().catch(() => {}); // Odtwórz cichy dźwięk w pętli
            
            audioUnlocked = true;
            isMuted = false;
            updateMuteButton();
            playSound('letsgo');

        }).catch(e => {
            console.error("Nie udało się wznowić AudioContext:", e);
            alert("Twoja przeglądarka zablokowała dźwięk. Sprawdź ustawienia strony lub wyłącz tryb cichy.");
        });
    }

    // Uruchamia grę po kliknięciu "Start"
    async function initAndStartGame() {
        startScreen.removeEventListener('click', initAndStartGame);
        startScreen.removeEventListener('touchstart', initAndStartGame);
        
        startScreen.style.display = 'none';
        canvas.style.display = 'block';
        gameUiContainer.style.display = 'block';
        muteBtn.style.display = 'block';
        updateMuteButton();
        resizeGame();

        ctx.fillStyle = 'white';
        ctx.font = "30px 'Segoe UI'";
        ctx.textAlign = 'center';
        ctx.fillText('ŁADOWANIE ZASOBÓW...', canvas.width / 2, canvas.height / 2);

        try {
            const imagePromise = new Promise((resolve, reject) => {
                shipImage.onload = () => resolve();
                shipImage.onerror = () => reject(new Error('Błąd ładowania obrazka.'));
                shipImage.src = 'assets/ship.png';
            });
            
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            const soundUrls = {
                shoot: 'assets/laser_shoot.wav', lifeLost: 'assets/craaash.wav',
                gameOver: 'assets/Ohnoo.wav', superShot: 'assets/bigbomb.wav',
                letsgo: 'assets/letsgo.wav'
            };
            const soundPromises = Object.entries(soundUrls).map(([name, url]) =>
                fetch(url)
                    .then(response => response.arrayBuffer())
                    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
                    .then(audioBuffer => { soundBuffers[name] = audioBuffer; })
            );

            await Promise.all([imagePromise, ...soundPromises]);
            resetGame();
        } catch (error) {
            console.error("Błąd ładowania zasobów:", error);
            ctx.clearRect(0,0,canvas.width, canvas.height);
            ctx.fillText('Błąd ładowania zasobów.', canvas.width / 2, canvas.height / 2);
        }
    }

    // --- PUNKT WEJŚCIA APLIKACJI ---
    startScreen.addEventListener('click', initAndStartGame);
    startScreen.addEventListener('touchstart', initAndStartGame);
    muteBtn.addEventListener('click', handleAudioUnlock);
});
