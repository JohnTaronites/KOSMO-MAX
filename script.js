// 📂 script.js

window.addEventListener('load', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // --- UI i DOM ---
    // ... (bez zmian) ...

    // --- ZASOBY GRY ---
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

    // --- ZMIENNE STANU GRY ---
    // ... (bez zmian) ...

    // --- KLASY ---
    // ... (bez zmian) ...

    // --- LOGIKA GRY ---
    // ... (bez zmian) ...

    function resetGame() {
        ensureAudioContext(); // ✅ Wymuszenie działania dźwięku przy każdej nowej grze

        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        score = 0; lives = 3; missedEnemies = 0; gameOver = false;
        bullets = []; enemies = [];
        currentLevel = 1; enemyBaseSpeed = 100; enemySpeedMultiplier = 1.0;
        baseEnemyInterval = 1000; enemySpawnMultiplier = 1.0; enemySpawnTimer = 0;
        maxSuperShotCharges = 2; superShotCharges = maxSuperShotCharges;
        gameOverScreen.style.display = 'none';
        resizeGame();
        player = new Player();
        input.x = canvas.width / 2;
        lastTime = 0;
        updateUI();
        animate(0);
    }

    // --- START GRY + AUDIO ---
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

        if ('audioSession' in navigator) {
            try {
                navigator.audioSession.type = 'playback';
            } catch (error) {
                console.warn("Nie udało się ustawić typu sesji audio:", error);
            }
        }

        const soundUrls = {
            shoot: 'assets/laser_shoot.wav',
            lifeLost: 'assets/craaash.wav',
            gameOver: 'assets/Ohnoo.wav',
            superShot: 'assets/bigbomb.wav' 
        };

        const loadPromises = Object.entries(soundUrls).map(async ([name, url]) => {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                soundBuffers[name] = audioBuffer;
            } catch (error) {
                console.error(`Błąd ładowania dźwięku ${name}:`, error);
                throw new Error(`Nie udało się załadować ${name}`);
            }
        });

        try {
            await Promise.all(loadPromises);
            startScreen.style.display = 'none';
            resetGame();
        } catch (error) {
            startScreen.innerHTML = '<h1>Błąd ładowania dźwięku.</h1><p>Upewnij się, że pliki znajdują się w folderze "assets".</p>';
        }
    }

    function onImageLoaded() {
        startScreen.style.display = 'flex';
        window.addEventListener('click', unlockAudioAndStartGame);
        window.addEventListener('touchstart', unlockAudioAndStartGame);
    }

    function showInitialLoading() {
        ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white'; ctx.font = "30px 'Segoe UI'";
        ctx.textAlign = 'center'; ctx.fillText('ŁADOWANIE GRAFIKI...', canvas.width / 2, canvas.height / 2);
    }

    showInitialLoading();

    shipImage.onload = onImageLoaded;
    shipImage.onerror = () => alert("BŁĄD: Nie można załadować grafiki.");
    shipImage.src = 'assets/ship.png';

    if (shipImage.complete) {
        onImageLoaded();
    }
});
