const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const music = document.getElementById("backgroundMusic"); // Referencia al audio


// Escala para pixel art
const pixelScale = 4;

// Variables del auto
let player = {
    x: 50, // Posición fija
    y: 368,
    width: 24,
    height: 12,
    speed: 1.5, // Velocidad inicial más baja para un juego relajante
    baseSpeed: 1.5,
    boostSpeed: 3, // Boost reducido para mantener la calma
    boostTimer: 0,
    dy: 0, // Velocidad vertical para salto
    gravity: 0.5,
    jumpPower: -8,
    jumpCooldown: 0,
    frame: 0,
    frameTimer: 0,
    maxFrames: 2
};

// Variables del bucle temporal
let timer = 10;
const startX = 50;
const groundY = 380;

// Variables del fondo (velocidades reducidas para un efecto relajante)
let cityOffsetBack = 0;
let cityOffsetMid = 0;
let cityOffsetFront = 0;
const citySpeedBack = 0.002;  // Muy lento para el fondo lejano
const citySpeedMid = 0.005;   // Lento para el fondo medio
const citySpeedFront = 0.008; // Lento para el primer plano
let lights = [];
let stars = [];

// Elementos del primer plano
let foregroundElements = [];
let smokeParticles = [];
let weatherParticles = []; // Partículas climáticas

// Tipos de paisajes
const landscapes = ["city", "forest", "desert", "village"];
let currentLandscape = "city";
let landscapeTimer = 0;
const landscapeDuration = 20; // Duración de cada paisaje en segundos

// Variables para el sol y la luna
let dayTime = 0;
const dayDuration = 60;

// Controles para PC
document.addEventListener("keydown", (event) => {
    switch (event.key) {
        case " ":
            if (player.boostTimer <= 0) {
                player.speed = player.boostSpeed;
                player.boostTimer = 0.5;
            }
            break;
        case "ArrowRight":
            if (player.baseSpeed < 5) player.baseSpeed += 0.5; // Incremento más suave
            if (player.boostTimer <= 0) player.speed = player.baseSpeed;
            break;
        case "ArrowLeft":
            if (player.baseSpeed > 1) player.baseSpeed -= 0.5; // Decremento más suave
            if (player.boostTimer <= 0) player.speed = player.baseSpeed;
            break;
        case "ArrowUp":
            if (player.jumpCooldown <= 0 && player.y + player.height * pixelScale >= groundY) {
                player.dy = player.jumpPower;
                player.jumpCooldown = 0.5;
            }
            break;
    }
});

// Controles táctiles para Android
const boostButton = document.getElementById("boostButton");
const speedUpButton = document.getElementById("speedUpButton");
const speedDownButton = document.getElementById("speedDownButton");
const jumpButton = document.getElementById("jumpButton");

boostButton.addEventListener("touchstart", () => {
    if (player.boostTimer <= 0) {
        player.speed = player.boostSpeed;
        player.boostTimer = 0.5;
        boostButton.style.backgroundColor = "#555";
    }
});
speedUpButton.addEventListener("touchstart", () => {
    if (player.baseSpeed < 5) player.baseSpeed += 0.5;
    if (player.boostTimer <= 0) player.speed = player.baseSpeed;
});
speedDownButton.addEventListener("touchstart", () => {
    if (player.baseSpeed > 1) player.baseSpeed -= 0.5;
    if (player.boostTimer <= 0) player.speed = player.baseSpeed;
});
jumpButton.addEventListener("touchstart", () => {
    if (player.jumpCooldown <= 0 && player.y + player.height * pixelScale >= groundY) {
        player.dy = player.jumpPower;
        player.jumpCooldown = 0.5;
        jumpButton.style.backgroundColor = "#555";
    }
});

// Dibujar sprite pixelado
function drawPixelSprite(x, y, width, height, color, type = "block", frame = 0) {
    if (type === "player") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(x + pixelScale * 2, groundY - pixelScale, width * pixelScale - pixelScale * 4, pixelScale * 2);
    }

    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            let pixelColor = color;
            if (type === "player") {
                if (j >= 2 && j <= 9 && i >= 2 && i <= 21) pixelColor = "white";
                if (j >= 3 && j <= 5 && i >= 5 && i <= 10) pixelColor = "black";
                if (j >= 3 && j <= 5 && i >= 13 && i <= 18) pixelColor = "black";
                if (j === 10 && (i >= 4 && i <= 7 || i >= 16 && i <= 19)) {
                    if (frame === 0 && (i === 5 || i === 17)) pixelColor = "gray";
                    if (frame === 1 && (i === 6 || i === 18)) pixelColor = "gray";
                }
                if (j === 1 && i >= 3 && i <= 20) pixelColor = "gray";
                if ((i === 1 || i === 22) && j >= 3 && j <= 8) pixelColor = "gray";
            }
            if (!pixelColor) continue;
            ctx.fillStyle = pixelColor;
            ctx.fillRect(x + i * pixelScale, y + j * pixelScale, pixelScale, pixelScale);
        }
    }
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width * pixelScale, height * pixelScale);

    if (type === "player" && player.boostTimer > 0) {
        for (let i = 0; i < 2; i++) {
            smokeParticles.push({
                x: x + pixelScale,
                y: y + 8 * pixelScale,
                size: pixelScale / 2,
                dy: -0.5,
                dx: -1 - Math.random() * 0.5,
                life: 0.5
            });
        }
    }
}

// Generar luces para un edificio
function generateLights(buildingX, buildingHeight) {
    const newLights = [];
    for (let i = 0; i < 8; i++) {
        newLights.push({
            x: buildingX + 10 + Math.random() * 130,
            y: groundY - buildingHeight + 20 + Math.random() * (buildingHeight - 40),
            size: Math.random() < 0.7 ? pixelScale : pixelScale * 2,
            color: Math.random() < 0.5 ? "yellow" : (Math.random() < 0.5 ? "orange" : "white"),
            isStreetLight: false
        });
    }
    newLights.push({
        x: buildingX + 50 + Math.random() * 50,
        y: groundY - pixelScale * 2,
        size: pixelScale * 2,
        color: "yellow",
        isStreetLight: true,
        blinkTimer: Math.random() * 2,
        blinkInterval: 0.5 + Math.random() * 1
    });
    return newLights;
}

// Generar estrellas
function generateStars() {
    for (let i = 0; i < 20; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * (groundY - 50),
            size: Math.random() < 0.5 ? pixelScale : pixelScale / 2
        });
    }
}

// Generar elementos del primer plano
function spawnForegroundElement() {
    if (Math.random() < 0.03) {
        const type = Math.random();
        foregroundElements.push({
            x: canvas.width,
            y: groundY - pixelScale,
            type: type < 0.33 ? "pole" : (type < 0.66 ? "puddle" : "sewer"),
            width: type < 0.66 ? 4 : 6,
            height: type < 0.33 ? (Math.random() < 0.5 ? 8 : 10) : 1
        });
    }
}

// Generar partículas de humo desde alcantarillas
function spawnSmokeParticles(sewer) {
    if (Math.random() < 0.5) {
        smokeParticles.push({
            x: sewer.x + pixelScale * 2,
            y: sewer.y,
            size: pixelScale / 2,
            dy: -1 - Math.random() * 1,
            dx: (Math.random() - 0.5) * 0.5,
            life: 1
        });
    }
}

// Generar partículas climáticas
function spawnWeatherParticles() {
    if (weatherParticles.length < 100) { // Limitar a 100 partículas
        let particle;
        switch (currentLandscape) {
            case "city": // Niebla
                particle = {
                    x: Math.random() * canvas.width,
                    y: Math.random() * groundY,
                    size: 50 + Math.random() * 50,
                    dx: 0.1 + Math.random() * 0.2,
                    dy: 0,
                    life: 5 + Math.random() * 5,
                    color: "rgba(200, 200, 200, 0.1)"
                };
                break;
            case "forest": // Lluvia
                particle = {
                    x: Math.random() * canvas.width,
                    y: 0,
                    size: 2,
                    dx: 0,
                    dy: 3 + Math.random() * 2,
                    life: 2,
                    color: "#00f"
                };
                break;
            case "desert": // Tormenta de arena
                particle = {
                    x: canvas.width,
                    y: groundY - 50 + Math.random() * 50,
                    size: 3,
                    dx: -1 - Math.random() * 2,
                    dy: 0,
                    life: 2,
                    color: "#8b4513"
                };
                break;
            case "village": // Nieve
                particle = {
                    x: Math.random() * canvas.width,
                    y: 0,
                    size: 2,
                    dx: (Math.random() - 0.5) * 0.5,
                    dy: 1 + Math.random() * 1,
                    life: 2,
                    color: "#fff"
                };
                break;
        }
        if (particle) weatherParticles.push(particle);
    }
}

// Actualizar partículas climáticas
function updateWeatherParticles() {
    for (let i = weatherParticles.length - 1; i >= 0; i--) {
        let particle = weatherParticles[i];
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.life -= 1 / 60;

        if (particle.life <= 0 || particle.y > canvas.height || particle.x < 0 || particle.x > canvas.width) {
            weatherParticles.splice(i, 1);
        }
    }
}

// Dibujar partículas climáticas
function drawWeatherParticles() {
    weatherParticles.forEach(particle => {
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    });
}

// Dibujar fondo de ciudad con niebla
function drawCityBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, groundY);
    gradient.addColorStop(0, "#0a0a1a");
    gradient.addColorStop(0.5, "#1a2a3a");
    gradient.addColorStop(1, "#2a3a4a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, groundY);

    ctx.fillStyle = "white";
    stars.forEach(star => {
        star.x -= player.speed * 0.1;
        if (star.x < 0) star.x += canvas.width;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    ctx.fillStyle = "#1a1a1a";
    for (let x = -cityOffsetBack % 300; x < canvas.width + 300; x += 300) {
        const height = 50 + Math.random() * 50;
        ctx.fillRect(x, groundY - height, 200, height);
    }

    for (let x = -cityOffsetMid % 200; x < canvas.width + 200; x += 200) {
        const height = 100 + Math.random() * 100;
        ctx.fillStyle = "#2a2a2a";
        ctx.fillRect(x, groundY - height, 150, height);

        if (!lights.some(light => light.x >= x && light.x < x + 150)) {
            lights = lights.concat(generateLights(x, height));
        }
    }

    ctx.fillStyle = "#444444";
    ctx.fillRect(0, groundY - pixelScale * 4, canvas.width, pixelScale * 4);

    for (let i = lights.length - 1; i >= 0; i--) {
        let light = lights[i];
        light.x -= player.speed * citySpeedMid;
        if (light.isStreetLight) {
            light.blinkTimer -= 1 / 60;
            if (light.blinkTimer <= 0) {
                light.blinkTimer = light.blinkInterval;
            }
            if (light.blinkTimer > light.blinkInterval / 2) {
                ctx.fillStyle = light.color;
                ctx.fillRect(light.x, light.y, light.size, light.size);
            }
        } else {
            ctx.fillStyle = light.color;
            ctx.fillRect(light.x, light.y, light.size, light.size);
        }
        if (light.x + light.size < 0) {
            lights.splice(i, 1);
        }
    }

    cityOffsetBack += player.speed * citySpeedBack;
    cityOffsetMid += player.speed * citySpeedMid;
    cityOffsetFront += player.speed * citySpeedFront;

    // Dibujar niebla
    drawWeatherParticles();
}

// Dibujar fondo de bosque con lluvia
function drawForestBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, groundY);
    gradient.addColorStop(0, "#0a1a0a");
    gradient.addColorStop(0.5, "#1a3a1a");
    gradient.addColorStop(1, "#2a4a2a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, groundY);

    ctx.fillStyle = "white";
    stars.forEach(star => {
        star.x -= player.speed * 0.1;
        if (star.x < 0) star.x += canvas.width;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    ctx.fillStyle = "#1a1a1a";
    for (let x = -cityOffsetBack % 300; x < canvas.width + 300; x += 300) {
        const height = 50 + Math.random() * 50;
        ctx.fillRect(x, groundY - height, 200, height);
    }

    for (let x = -cityOffsetMid % 200; x < canvas.width + 200; x += 200) {
        const height = 100 + Math.random() * 100;
        ctx.fillStyle = "#2a2a2a";
        ctx.fillRect(x, groundY - height, 150, height);

        if (!lights.some(light => light.x >= x && light.x < x + 150)) {
            lights = lights.concat(generateLights(x, height));
        }
    }

    for (let x = -cityOffsetFront % 250; x < canvas.width + 250; x += 250) {
        const height = 150 + Math.random() * 100;
        const width = 180;
        const buildingY = groundY - height;
        ctx.fillStyle = "#1a3a1a";
        ctx.fillRect(x, buildingY, width, height);
        ctx.fillStyle = "#654321";
        ctx.fillRect(x + width / 2 - 10, buildingY, 20, height);
    }

    for (let i = lights.length - 1; i >= 0; i--) {
        let light = lights[i];
        light.x -= player.speed * citySpeedMid;
        if (light.isStreetLight) {
            light.blinkTimer -= 1 / 60;
            if (light.blinkTimer <= 0) {
                light.blinkTimer = light.blinkInterval;
            }
            if (light.blinkTimer > light.blinkInterval / 2) {
                ctx.fillStyle = light.color;
                ctx.fillRect(light.x, light.y, light.size, light.size);
            }
        } else {
            ctx.fillStyle = light.color;
            ctx.fillRect(light.x, light.y, light.size, light.size);
        }
        if (light.x + light.size < 0) {
            lights.splice(i, 1);
        }
    }

    cityOffsetBack += player.speed * citySpeedBack;
    cityOffsetMid += player.speed * citySpeedMid;
    cityOffsetFront += player.speed * citySpeedFront;

    // Dibujar lluvia
    drawWeatherParticles();
}

// Dibujar fondo de desierto con tormenta de arena
function drawDesertBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, groundY);
    gradient.addColorStop(0, "#f4a460");
    gradient.addColorStop(0.5, "#d2b48c");
    gradient.addColorStop(1, "#8b4513");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, groundY);

    ctx.fillStyle = "white";
    stars.forEach(star => {
        star.x -= player.speed * 0.1;
        if (star.x < 0) star.x += canvas.width;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    ctx.fillStyle = "#8b4513";
    for (let x = -cityOffsetBack % 300; x < canvas.width + 300; x += 300) {
        const height = 50 + Math.random() * 50;
        ctx.fillRect(x, groundY - height, 200, height);
    }

    for (let x = -cityOffsetMid % 200; x < canvas.width + 200; x += 200) {
        const height = 100 + Math.random() * 100;
        ctx.fillStyle = "#a0522d";
        ctx.fillRect(x, groundY - height, 150, height);

        if (!lights.some(light => light.x >= x && light.x < x + 150)) {
            lights = lights.concat(generateLights(x, height));
        }
    }

    for (let x = -cityOffsetFront % 250; x < canvas.width + 250; x += 250) {
        const height = 150 + Math.random() * 100;
        const width = 180;
        const buildingY = groundY - height;
        ctx.fillStyle = "#cd853f";
        ctx.fillRect(x, buildingY, width, height);
    }

    for (let i = lights.length - 1; i >= 0; i--) {
        let light = lights[i];
        light.x -= player.speed * citySpeedMid;
        if (light.isStreetLight) {
            light.blinkTimer -= 1 / 60;
            if (light.blinkTimer <= 0) {
                light.blinkTimer = light.blinkInterval;
            }
            if (light.blinkTimer > light.blinkInterval / 2) {
                ctx.fillStyle = light.color;
                ctx.fillRect(light.x, light.y, light.size, light.size);
            }
        } else {
            ctx.fillStyle = light.color;
            ctx.fillRect(light.x, light.y, light.size, light.size);
        }
        if (light.x + light.size < 0) {
            lights.splice(i, 1);
        }
    }

    cityOffsetBack += player.speed * citySpeedBack;
    cityOffsetMid += player.speed * citySpeedMid;
    cityOffsetFront += player.speed * citySpeedFront;

    // Dibujar tormenta de arena
    drawWeatherParticles();
}

// Dibujar fondo de pueblo con nieve
function drawVillageBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, groundY);
    gradient.addColorStop(0, "#1a0a0a");
    gradient.addColorStop(0.5, "#2a1a1a");
    gradient.addColorStop(1, "#3a2a2a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, groundY);

    ctx.fillStyle = "white";
    stars.forEach(star => {
        star.x -= player.speed * 0.1;
        if (star.x < 0) star.x += canvas.width;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    ctx.fillStyle = "#1a1a1a";
    for (let x = -cityOffsetBack % 300; x < canvas.width + 300; x += 300) {
        const height = 50 + Math.random() * 50;
        ctx.fillRect(x, groundY - height, 200, height);
    }

    for (let x = -cityOffsetMid % 200; x < canvas.width + 200; x += 200) {
        const height = 100 + Math.random() * 100;
        ctx.fillStyle = "#2a2a2a";
        ctx.fillRect(x, groundY - height, 150, height);

        if (!lights.some(light => light.x >= x && light.x < x + 150)) {
            lights = lights.concat(generateLights(x, height));
        }
    }

    for (let x = -cityOffsetFront % 250; x < canvas.width + 250; x += 250) {
        const height = 100 + Math.random() * 50;
        const width = 120;
        const buildingY = groundY - height;
        ctx.fillStyle = "#654321";
        ctx.fillRect(x, buildingY, width, height);
        ctx.fillStyle = "#8b4513";
        ctx.beginPath();
        ctx.moveTo(x, buildingY);
        ctx.lineTo(x + width / 2, buildingY - 30);
        ctx.lineTo(x + width, buildingY);
        ctx.closePath();
        ctx.fill();
    }

    for (let i = lights.length - 1; i >= 0; i--) {
        let light = lights[i];
        light.x -= player.speed * citySpeedMid;
        if (light.isStreetLight) {
            light.blinkTimer -= 1 / 60;
            if (light.blinkTimer <= 0) {
                light.blinkTimer = light.blinkInterval;
            }
            if (light.blinkTimer > light.blinkInterval / 2) {
                ctx.fillStyle = light.color;
                ctx.fillRect(light.x, light.y, light.size, light.size);
            }
        } else {
            ctx.fillStyle = light.color;
            ctx.fillRect(light.x, light.y, light.size, light.size);
        }
        if (light.x + light.size < 0) {
            lights.splice(i, 1);
        }
    }

    cityOffsetBack += player.speed * citySpeedBack;
    cityOffsetMid += player.speed * citySpeedMid;
    cityOffsetFront += player.speed * citySpeedFront;

    // Dibujar nieve
    drawWeatherParticles();
}

// Dibujar suelo pixelado y partículas
function drawPixelGround() {
    ctx.fillStyle = "#333333";
    for (let x = 0; x < canvas.width; x += pixelScale) {
        for (let y = groundY; y < canvas.height; y += pixelScale) {
            if (y === groundY && Math.random() < 0.2) ctx.fillStyle = "#555555";
            ctx.fillRect(x, y, pixelScale, pixelScale);
            ctx.fillStyle = "#333333";
        }
    }

    for (let i = foregroundElements.length - 1; i >= 0; i--) {
        let element = foregroundElements[i];
        element.x -= player.speed;

        if (element.type === "pole") {
            ctx.fillStyle = "#666666";
            ctx.fillRect(element.x, element.y - (element.height - 1) * pixelScale, element.width * pixelScale, element.height * pixelScale);
            ctx.fillStyle = "yellow";
            ctx.fillRect(element.x + pixelScale, element.y - (element.height + 1) * pixelScale, pixelScale * 2, pixelScale * 2);
        } else if (element.type === "puddle") {
            ctx.fillStyle = "#1a2a3a";
            ctx.fillRect(element.x, element.y, element.width * pixelScale * 2, pixelScale);
        } else if (element.type === "sewer") {
            ctx.fillStyle = "#444444";
            ctx.fillRect(element.x, element.y, element.width * pixelScale, pixelScale);
            spawnSmokeParticles(element);
        }

        if (element.x + element.width * pixelScale < 0) {
            foregroundElements.splice(i, 1);
        }
    }

    for (let i = smokeParticles.length - 1; i >= 0; i--) {
        let particle = smokeParticles[i];
        particle.x += particle.dx - player.speed;
        particle.y += particle.dy;
        particle.life -= 1 / 60;

        if (particle.x > player.x && particle.x < player.x + player.width * pixelScale &&
            particle.y > player.y && particle.y < player.y + player.height * pixelScale) {
            particle.dx += 0.5;
        }

        ctx.fillStyle = `rgba(150, 150, 150, ${particle.life})`;
        ctx.fillRect(particle.x, particle.y, particle.size, particle.size);

        if (particle.life <= 0 || particle.y < 0) {
            smokeParticles.splice(i, 1);
        }
    }

    if (player.boostTimer > 0) {
        boostButton.style.backgroundColor = "#555";
    } else {
        boostButton.style.backgroundColor = "#333";
    }
    if (player.jumpCooldown > 0) {
        jumpButton.style.backgroundColor = "#555";
    } else {
        jumpButton.style.backgroundColor = "#333";
    }
}

// Función principal del juego
function update() {
    if (!gameActive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Cambiar paisaje cada cierto tiempo
    landscapeTimer -= 1 / 60;
    if (landscapeTimer <= 0) {
        currentLandscape = landscapes[Math.floor(Math.random() * landscapes.length)];
        landscapeTimer = landscapeDuration;
        weatherParticles = []; // Reiniciar partículas climáticas al cambiar de paisaje
    }

    // Actualizar el tiempo del día
    dayTime += 1 / 60;
    if (dayTime >= dayDuration) {
        dayTime = 0;
    }

    // Generar y actualizar partículas climáticas
    spawnWeatherParticles();
    updateWeatherParticles();

    // Dibujar el fondo según el paisaje actual
    switch (currentLandscape) {
        case "city":
            drawCityBackground();
            break;
        case "forest":
            drawForestBackground();
            break;
        case "desert":
            drawDesertBackground();
            break;
        case "village":
            drawVillageBackground();
            break;
    }

    player.dy += player.gravity;
    player.y += player.dy;
    if (player.y + player.height * pixelScale > groundY) {
        player.y = groundY - player.height * pixelScale;
        player.dy = 0;
    }

    if (player.boostTimer > 0) {
        player.boostTimer -= 1 / 60;
        if (player.boostTimer <= 0) {
            player.speed = player.baseSpeed;
        }
    }

    player.jumpCooldown -= 1 / 60;

    player.frameTimer += 1 / 60;
    if (player.frameTimer >= 0.1) {
        player.frame = (player.frame + 1) % player.maxFrames;
        player.frameTimer = 0;
    }

    timer -= 1 / 60;
    if (timer <= 0) {
        timer = 10;
    }

    spawnForegroundElement();
    drawPixelGround();

    drawPixelSprite(player.x, player.y, player.width, player.height, "white", "player", player.frame);

    // Mostrar información en pantalla
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText(`Tiempo: ${Math.ceil(timer)}`, 10, 30);
    ctx.fillText(`Velocidad: ${player.baseSpeed}`, 10, 50);
    ctx.fillText(`Paisaje: ${currentLandscape}`, 10, 70);

    requestAnimationFrame(update);
}

function endGame() {
    gameActive = false;
    gameOverScreen.style.display = "block";
    finalScore.textContent = `Puntuación final: ${Math.floor(score)}`;
    music.pause(); // Pausar música en Game Over
}

// Reiniciar el bucle
function resetLoop() {
    player.x = startX;
    player.y = groundY - player.height * pixelScale;
    player.speed = player.baseSpeed;
    player.boostTimer = 0;
    player.dy = 0;
    player.jumpCooldown = 0;
    timer = 10;
    foregroundElements = [];
    smokeParticles = [];
    weatherParticles = []; // Reiniciar partículas climáticas
    currentLandscape = "city";
    landscapeTimer = landscapeDuration;
    dayTime = 0;
    music.currentTime = 0; // Reiniciar música al principio
}

// Generar estrellas al inicio
generateStars();

// Iniciar el juego
const menu = document.getElementById("menu");
const gameOverScreen = document.getElementById("gameOver");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const finalScore = document.getElementById("finalScore");

let gameActive = false;

startButton.addEventListener("click", () => {
    menu.style.display = "none";
    gameOverScreen.style.display = "none";
    gameActive = true;
    resetLoop();
    music.play(); // Reproducir música al empezar
    update();
});

restartButton.addEventListener("click", () => {
    gameOverScreen.style.display = "none";
    gameActive = true;
    resetLoop();
    music.play(); // Reproducir música al reiniciar
    update();
});