// 📂 script.js

window.addEventListener('load', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // --- UI i DOM ---
    const gameContainer = document.body;

    // EKRANY I PRZYCISKI
    const uiContainer = document.createElement('div');
    uiContainer.style.position = 'absolute';
    uiContainer.style.left = '0';
    uiContainer.style.top = '0';
    uiContainer.style.width = '100%';
    uiContainer.style.display = 'flex';
    uiContainer.style.justifyContent = 'space-between';
    uiContainer.style.padding = '10px 20px';
    uiContainer.style.color = 'white';
    uiContainer.style.fontFamily = 'Segoe UI, Tahoma, sans-serif';
    uiContainer.style.fontSize = '20px';
    uiContainer.style.textShadow = '2px 2px 4px #000';
    uiContainer.style.pointerEvents = 'none';

    const scoreEl = document.createElement('div');
    const levelEl = document.createElement('div');
    const livesEl = document.createElement('div');
    uiContainer.appendChild(scoreEl);
    uiContainer.appendChild(levelEl);
    uiContainer.appendChild(livesEl);

    const superShotBtn = document.createElement('button');
    superShotBtn.innerText = 'SUPER STRZAŁ';
    superShotBtn.style.position = 'absolute';
    superShotBtn.style.left = '50%';
    superShotBtn.style.transform = 'translateX(-50%)';
    superShotBtn.style.bottom = '20px';
    superShotBtn.style.padding = '10px 20px';
    superShotBtn.style.fontSize = '1em';
    superShotBtn.style.backgroundColor = '#ff4500';
    superShotBtn.style.color = 'white';
    superShotBtn.style.border = '2px solid #ff8c00';
    superShotBtn.style.borderRadius = '5px';
    superShotBtn.style.cursor = 'pointer';

    const gameOverScreen = document.createElement('div');
    gameOverScreen.style.position = 'absolute';
    gameOverScreen.style.width = '100%';
    gameOverScreen.style.height = '100%';
    gameOverScreen.style.display = 'none';
    gameOverScreen.style.flexDirection = 'column';
    gameOverScreen.style.justifyContent = 'center';
    gameOverScreen.style.alignItems = 'center';
    gameOverScreen.style.backgroundColor = 'rgba(0,0,0,0.75)';
    gameOverScreen.style.textAlign = 'center';

    const gameOverTitle = document.createElement('h1');
    gameOverTitle.innerText = 'GAME OVER';
    gameOverTitle.style.fontSize = '4em';
    gameOverTitle.style.color = '#ff4444';

    const finalScoreText = document.createElement('p');
    finalScoreText.innerText = 'Twój wynik: ';
    finalScoreText.style.fontSize = '1.5em';
    const finalScoreEl = document.createElement('span');
    finalScoreText.appendChild(finalScoreEl);

    const newGameBtn = document.createElement('button');
    newGameBtn.innerText = 'NOWA GRA';
    newGameBtn.style.marginTop = '30px';
    newGameBtn.style.padding = '15px 30px';
    newGameBtn.style.fontSize = '1.2em';
    newGameBtn.style.cursor = 'pointer';
    newGameBtn.style.backgroundColor = '#4CAF50';
    newGameBtn.style.color = 'white';
    newGameBtn.style.border = 'none';
    newGameBtn.style.borderRadius = '5px';

    gameOverScreen.appendChild(gameOverTitle);
    gameOverScreen.appendChild(finalScoreText);
    gameOverScreen.appendChild(newGameBtn);

    const startScreen = document.createElement('div');
    startScreen.style.position = 'absolute';
    startScreen.style.width = '100%';
    startScreen.style.height = '100%';
    startScreen.style.display = 'none';
    startScreen.style.flexDirection = 'column';
    startScreen.style.justifyContent = 'center';
    startScreen.style.alignItems = 'center';
    startScreen.style.backgroundColor = 'rgba(0,0,0,0.85)';
    startScreen.style.color = 'white';
    startScreen.style.fontFamily = 'Segoe UI, Tahoma, sans-serif';
    startScreen.style.fontSize = '24px';
    startScreen.style.textAlign = 'center';
    startScreen.style.cursor = 'pointer';
    startScreen.innerHTML = '<h1>KOSMICZNA STRZELANKA</h1><p style="margin-top: 20px;">Kliknij lub dotknij ekranu, aby rozpocząć!</p>';

    gameContainer.appendChild(uiContainer);
    gameContainer.appendChild(superShotBtn);
    gameContainer.appendChild(gameOverScreen);
    gameContainer.appendChild(startScreen);

    // --- RESZTA GRY ---
    const shipImage = new Image();
    let audioContext;
    let soundBuffers = {};

    function ensureAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            return audioContext.resume();
        }
        return Promise.resolve();
    }

    function playSound(name) {
        if (!audioContext || !soundBuffers[name] || audioContext.state !== 'running') return;
        const source = audioContext.createBufferSource();
        source.buffer = soundBuffers[name];
        source.connect(audioContext.destination);
        source.start(0);
    }

    // --- ZMIENNE STANU GRY, KLASY, ANIMACJA itd. ---
    // 🔁 WSZYSTKO POZOSTAŁE (klasy Player, Bullet, Enemy, resetGame, animate itd.) 
    // ZOSTAWIAMY BEZ ZMIAN – możesz wkleić dalej z poprzedniej wersji lub poprosić mnie o całość

    // --- START GRY ---
    async function unlockAudioAndStartGame() {
        window.removeEventListener('click', unlockAudioAndStartGame);
        window.removeEventListener('touchstart', unlockAudioAndStartGame);
        startScreen.innerHTML = '<h1>ŁADOWANIE...</h1>';
        startScreen.style.cursor = 'default';

        try {
            await ensureAudioContext();
        } catch (e) {
            console.error("AudioContext nie mógł się aktywować:", e);
        }

        const soundUrls = {
            shoot: 'assets/laser_shoot.wav',
            lifeLost: 'assets/craaash.wav',
            gameOver: 'assets/Ohnoo.wav',
            superShot: 'assets/bigbomb.wav'
        };

        const loadPromises = Object.entries(soundUrls).map(async ([name, url]) => {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            soundBuffers[name] = audioBuffer;
        });

        try {
            await Promise.all(loadPromises);
            startScreen.style.display = 'none';
            resetGame();
        } catch (e) {
            startScreen.innerHTML = '<h1>Błąd ładowania dźwięku.</h1>';
        }
    }

    function onImageLoaded() {
        startScreen.style.display = 'flex';
        window.addEventListener('click', unlockAudioAndStartGame);
        window.addEventListener('touchstart', unlockAudioAndStartGame);
    }

    function showInitialLoading() {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = "30px 'Segoe UI'";
        ctx.textAlign = 'center';
        ctx.fillText('ŁADOWANIE GRAFIKI...', canvas.width / 2, canvas.height / 2);
    }

    showInitialLoading();

    shipImage.onload = onImageLoaded;
    shipImage.onerror = () => alert("BŁĄD: Nie można załadować grafiki.");
    shipImage.src = 'assets/ship.png';

    if (shipImage.complete) {
        onImageLoaded();
    }

    // przypisanie do przycisku NOWA GRA
    newGameBtn.addEventListener('click', resetGame);
    superShotBtn.addEventListener('click', () => {
        if (player && superShotCharges > 0) {
            shootSuper();
        }
    });
});
