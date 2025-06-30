window.addEventListener('load', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // --- ELEMENTY UI (bez zmian) ---
    const gameContainer = document.body;
    const uiContainer = document.createElement('div');
    uiContainer.style.position = 'absolute'; uiContainer.style.left = '10px'; uiContainer.style.top = '10px'; uiContainer.style.color = 'white'; uiContainer.style.fontFamily = 'Segoe UI, Tahoma, sans-serif'; uiContainer.style.fontSize = '20px'; uiContainer.style.textShadow = '2px 2px 4px #000'; uiContainer.style.pointerEvents = 'none';
    const scoreEl = document.createElement('div');
    const livesEl = document.createElement('div');
    uiContainer.appendChild(scoreEl); uiContainer.appendChild(livesEl);
    const superShotBtn = document.createElement('button');
    superShotBtn.innerText = 'SUPER STRZAŁ'; superShotBtn.style.position = 'absolute'; superShotBtn.style.left = '50%'; superShotBtn.style.transform = 'translateX(-50%)'; superShotBtn.style.bottom = '20px'; superShotBtn.style.padding = '10px 20px'; superShotBtn.style.fontSize = '1em'; superShotBtn.style.backgroundColor = '#ff4500'; superShotBtn.style.color = 'white'; superShotBtn.style.border = '2px solid #ff8c00'; superShotBtn.style.borderRadius = '5px'; superShotBtn.style.cursor = 'pointer';
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
    const startScreen = document.createElement('div');
    startScreen.style.position = 'absolute'; startScreen.style.width = '100%'; startScreen.style.height = '100%'; startScreen.style.display = 'flex'; startScreen.style.flexDirection = 'column'; startScreen.style.justifyContent = 'center'; startScreen.style.alignItems = 'center'; startScreen.style.backgroundColor = 'rgba(0,0,0,0.85)'; startScreen.style.color = 'white'; startScreen.style.fontFamily = 'Segoe UI, Tahoma, sans-serif'; startScreen.style.fontSize = '24px'; startScreen.style.textAlign = 'center'; startScreen.style.cursor = 'pointer';
    startScreen.innerHTML = '<h1>KOSMICZNA STRZELANKA</h1><p style="margin-top: 20px;">Kliknij lub dotknij ekranu, aby rozpocząć!</p>';
    gameContainer.appendChild(uiContainer); gameContainer.appendChild(superShotBtn); gameContainer.appendChild(gameOverScreen); gameContainer.appendChild(startScreen);

    // --- ZASOBY GRY ---
    const shipImage = new Image();
    
    let audioContext;
    let soundBuffers = {}; // Użyjemy obiektu do przechowywania buforów dźwięku

    function playSound(name) {
        const buffer = soundBuffers[name];
        if (!audioContext || !buffer || audioContext.state !== 'running') return;
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
    }
    
    // ... reszta zmiennych gry
    let score, lives, missedEnemies, gameOver;
    let player, bullets, enemies;
    let enemyTimer, enemyInterval = 1000;
    let superShotCooldown, cooldownInterval, animationFrameId;
    let lastTime = 0;

    // --- KLASY I LOGIKA GRY (bez zmian) ---
    class Player { constructor() { this.width = 50; this.height = 40; this.x = canvas.width / 2 - this.width / 2; this.bottomLimit = 100; this.y = canvas.height - this.height - this.bottomLimit; } draw(context) { context.drawImage(shipImage, this.x, this.y, this.width, this.height); } update(inputX) { if (inputX !== null) { this.x = inputX - this.width / 2; } if (this.x < 0) this.x = 0; if (this.x > canvas.width - this.width) this.x = canvas.width - this.width; } }
    class Bullet { constructor(x, y, color = 'white', speed = 500, angle = 0) { this.x = x; this.y = y; this.width = 5; this.height = 15; this.color = color; this.speedX = Math.sin(angle) * speed; this.speedY = -Math.cos(angle) * speed; this.markedForDeletion = false; } update(deltaTime) { this.x += this.speedX * deltaTime; this.y += this.speedY * deltaTime; if (this.y < 0) this.markedForDeletion = true; } draw(context) { context.fillStyle = this.color; context.fillRect(this.x, this.y, this.width, this.height); } }
    class Enemy { constructor() { this.width = 50; this.height = 45; this.x = Math.random() * (canvas.width - this.width); this.y = -this.height; this.speed = Math.random() * 100 + 100; this.markedForDeletion = false; } draw(context) { context.drawImage(shipImage, this.x, this.y, this.width, this.height); } update(deltaTime) { this.y += this.speed * deltaTime; if (this.y > canvas.height) { this.markedForDeletion = true; missedEnemies++; } } }
    function resizeGame() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; if (player) { player.x = Math.max(0, Math.min(player.x, canvas.width - player.width)); player.y = canvas.height - player.height - player.bottomLimit; } }
    window.addEventListener('resize', resizeGame);
    const input = { x: canvas.width / 2 };
    function getPointerPos(evt) { const rect = canvas.getBoundingClientRect(); const touch = evt.touches ? evt.touches[0] : evt; return (touch.clientX - rect.left); }
    window.addEventListener('mousemove', e => { if (player) input.x = getPointerPos(e) });
    window.addEventListener('touchmove', e => { if (player) { e.preventDefault(); input.x = getPointerPos(e) }}, { passive: false });
    canvas.addEventListener('click', () => { if (!gameOver && player) shootTriple() });
    superShotBtn.addEventListener('click', () => { if (!gameOver && superShotCooldown <= 0) { shootSuper(); startSuperShotCooldown(30000) }});
    newGameBtn.addEventListener('click', resetGame);
    
    function shootTriple() { playSound('shoot'); const bulletX = player.x + player.width / 2 - 2.5; setTimeout(() => { if (!gameOver) bullets.push(new Bullet(bulletX, player.y)) }, 0); setTimeout(() => { if (!gameOver) bullets.push(new Bullet(bulletX, player.y)) }, 100); setTimeout(() => { if (!gameOver) bullets.push(new Bullet(bulletX, player.y)) }, 200); }
    function shootSuper() { playSound('superShot'); const bulletCount = 30; for (let i = 0; i < bulletCount; i++) { const angle = (Math.PI * 2 / bulletCount) * i; bullets.push(new Bullet(player.x + player.width / 2, player.y + player.height / 2, 'red', 300, angle)); } }
    function startSuperShotCooldown(duration) { superShotCooldown = duration; superShotBtn.disabled = true; if (cooldownInterval) clearInterval(cooldownInterval); cooldownInterval = setInterval(() => { superShotCooldown -= 1000; if (superShotCooldown <= 0) { superShotBtn.disabled = false; superShotBtn.innerText = "SUPER STRZAŁ"; clearInterval(cooldownInterval); } else { superShotBtn.innerText = `GOTOWY ZA ${superShotCooldown / 1000}s`; } }, 1000); }
    function handleGameElements(deltaTime) { if (enemyTimer > enemyInterval) { enemies.push(new Enemy()); enemyTimer = 0; } else { enemyTimer += deltaTime * 1000; } [...bullets, ...enemies].forEach(obj => obj.update(deltaTime)); [...bullets, ...enemies].forEach(obj => obj.draw(ctx)); bullets.forEach(bullet => { enemies.forEach(enemy => { if (!bullet.markedForDeletion && !enemy.markedForDeletion && checkCollision(bullet, enemy)) { enemy.markedForDeletion = true; bullet.markedForDeletion = true; score += 10; } }); }); bullets = bullets.filter(bullet => !bullet.markedForDeletion); enemies = enemies.filter(enemy => !enemy.markedForDeletion); }
    function checkCollision(rect1, rect2) { return (rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y); }
    function checkGameState() { if (missedEnemies >= 3) { lives--; missedEnemies = 0; if (lives > 0) { playSound('lifeLost'); } } if (lives <= 0 && !gameOver) { gameOver = true; } }
    function updateUI() { scoreEl.innerHTML = `WYNIK: ${score}`; livesEl.innerHTML = `ŻYCIA: ${lives}`; }
    function animate(timestamp) { if (!lastTime) lastTime = timestamp; const deltaTime = (timestamp - lastTime) / 1000; lastTime = timestamp; ctx.clearRect(0, 0, canvas.width, canvas.height); player.update(input.x); player.draw(ctx); handleGameElements(deltaTime); checkGameState(); updateUI(); if (gameOver) { if (gameOverScreen.style.display !== 'flex') { playSound('gameOver'); setTimeout(() => { gameOverScreen.style.display = 'flex'; finalScoreEl.innerText = score; clearInterval(cooldownInterval); }, 500); } } else { animationFrameId = requestAnimationFrame(animate); } }
    function resetGame() { if (animationFrameId) cancelAnimationFrame(animationFrameId); if (cooldownInterval) clearInterval(cooldownInterval); score = 0; lives = 3; missedEnemies = 0; gameOver = false; bullets = []; enemies = []; enemyTimer = 0; gameOverScreen.style.display = 'none'; resizeGame(); player = new Player(); input.x = canvas.width / 2; startSuperShotCooldown(5000); lastTime = 0; animate(0); }

    // --- ZMIANA: NOWA, OSTATECZNA LOGIKA STARTOWA ---
    function unlockAudioAndStartGame() {
        startScreen.removeEventListener('click', unlockAudioAndStartGame);
        startScreen.removeEventListener('touchstart', unlockAudioAndStartGame);

        // 1. Stwórz AudioContext
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioContext stworzony. Stan:', audioContext.state);
        }
        
        // 2. "Oszukaj" przeglądarkę, odtwarzając pusty dźwięk NATYCHMIAST po kliknięciu
        // To jest kluczowy krok dla najbardziej restrykcyjnych przeglądarek mobilnych
        const dummyBuffer = audioContext.createBuffer(1, 1, 22050);
        const dummySource = audioContext.createBufferSource();
        dummySource.buffer = dummyBuffer;
        dummySource.connect(audioContext.destination);
        dummySource.start();
        console.log('Odtworzono pusty dźwięk w celu odblokowania. Stan kontekstu:', audioContext.state);

        // 3. Po odblokowaniu, kontynuuj z właściwym ładowaniem
        startScreen.innerHTML = '<h1>ŁADOWANIE DŹWIĘKÓW...</h1>';
        startScreen.style.cursor = 'default';

        const soundUrls = {
            shoot: 'https://johntaronites.github.io/Shooter_AI/laser_shoot.wav',
            lifeLost: 'https://johntaronites.github.io/Shooter_AI/craaash.wav',
            gameOver: 'https://johntaronites.github.io/KOSMO-MAX/Ohnoo.wav',
            superShot: 'https://johntaronites.github.io/KOSMO-MAX/bigbomb.wav'
        };

        const loadPromises = Object.entries(soundUrls).map(async ([name, url]) => {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                soundBuffers[name] = audioBuffer;
            } catch (error) {
                console.error(`Błąd ładowania dźwięku ${name}:`, error);
                // Rzuć błąd dalej, aby Promise.all go złapał
                throw new Error(`Nie udało się załadować ${name}`);
            }
        });

        Promise.all(loadPromises).then(() => {
            console.log('Wszystkie dźwięki załadowane.');
            startScreen.style.display = 'none';
            resetGame();
        }).catch(error => {
            startScreen.innerHTML = '<h1>Błąd ładowania dźwięku.</h1><p>Spróbuj odświeżyć stronę.</p>';
            console.error(error);
        });
    }

    function showInitialLoading() {
        ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white'; ctx.font = "30px 'Segoe UI'";
        ctx.textAlign = 'center'; ctx.fillText('ŁADOWANIE GRAFIKI...', canvas.width / 2, canvas.height / 2);
    }
    
    showInitialLoading();
    
    shipImage.onload = () => {
        startScreen.addEventListener('click', unlockAudioAndStartGame);
        startScreen.addEventListener('touchstart', unlockAudioAndStartGame);
    };
    shipImage.onerror = () => alert("BŁĄD: Nie można załadować grafiki.");
    
    shipImage.src = 'https://i.imgur.com/goYityG.png';
});
