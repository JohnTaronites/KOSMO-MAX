window.addEventListener('load', function() {
    console.log("Skrypt testowy został uruchomiony.");

    const canvas = document.getElementById('gameCanvas');
    
    // Sprawdzenie, czy element canvas został znaleziony
    if (!canvas) {
        alert("BŁĄD KRYTYCZNY: Nie znaleziono elementu <canvas> o ID 'gameCanvas'!");
        return;
    }

    const ctx = canvas.getContext('2d');

    // Sprawdzenie, czy kontekst 2D został uzyskany
    if (!ctx) {
        alert("BŁĄD KRYTYCZNY: Nie można uzyskać kontekstu 2D z canvas!");
        return;
    }

    canvas.width = 800;
    canvas.height = 600;

    console.log("Próba rysowania żółtego kwadratu.");

    // Ustawienie koloru wypełnienia
    ctx.fillStyle = 'yellow';
    
    // Narysowanie prostokąta na środku ekranu
    // (x, y, szerokość, wysokość)
    ctx.fillRect(350, 250, 100, 100);

    console.log("Rysowanie zakończone.");
});
