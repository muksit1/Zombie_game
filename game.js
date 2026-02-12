const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const healthEl = document.getElementById("health");
const waveEl = document.getElementById("wave");
const messageEl = document.getElementById("message");

let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

const player = {
    x: width / 2,
    y: height / 2,
    radius: 16,
    speed: 4.2
};

const state = {
    bullets: [],
    zombies: [],
    keys: {},
    mouse: { x: width / 2, y: height / 2 },
    score: 0,
    health: 100,
    wave: 1,
    gameOver: false,
    spawnTimer: 0
};

const BULLET_SPEED = 9;
const BULLET_RADIUS = 4;
const ZOMBIE_BASE_SPEED = 0.9;
const ZOMBIE_RADIUS = 18;
const CONTACT_DAMAGE = 0.25;

function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    player.x = Math.min(Math.max(player.x, player.radius), width - player.radius);
    player.y = Math.min(Math.max(player.y, player.radius), height - player.radius);
}

function randomEdgeSpawn() {
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) return { x: Math.random() * width, y: -30 };
    if (edge === 1) return { x: width + 30, y: Math.random() * height };
    if (edge === 2) return { x: Math.random() * width, y: height + 30 };
    return { x: -30, y: Math.random() * height };
}

function spawnZombie() {
    const spawn = randomEdgeSpawn();
    state.zombies.push({
        x: spawn.x,
        y: spawn.y,
        radius: ZOMBIE_RADIUS,
        speed: ZOMBIE_BASE_SPEED + Math.random() * 0.7 + state.wave * 0.12,
        health: 1 + Math.floor(state.wave / 3)
    });
}

function shoot(targetX, targetY) {
    if (state.gameOver) return;

    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const len = Math.hypot(dx, dy) || 1;

    state.bullets.push({
        x: player.x,
        y: player.y,
        vx: (dx / len) * BULLET_SPEED,
        vy: (dy / len) * BULLET_SPEED,
        radius: BULLET_RADIUS
    });
}

function updatePlayer() {
    let vx = 0;
    let vy = 0;
    if (state.keys["w"] || state.keys["arrowup"]) vy -= 1;
    if (state.keys["s"] || state.keys["arrowdown"]) vy += 1;
    if (state.keys["a"] || state.keys["arrowleft"]) vx -= 1;
    if (state.keys["d"] || state.keys["arrowright"]) vx += 1;

    const len = Math.hypot(vx, vy) || 1;
    player.x += (vx / len) * player.speed * (vx || vy ? 1 : 0);
    player.y += (vy / len) * player.speed * (vx || vy ? 1 : 0);

    player.x = Math.min(Math.max(player.x, player.radius), width - player.radius);
    player.y = Math.min(Math.max(player.y, player.radius), height - player.radius);
}

function updateBullets() {
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
        const b = state.bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        if (b.x < -20 || b.y < -20 || b.x > width + 20 || b.y > height + 20) {
            state.bullets.splice(i, 1);
        }
    }
}

function updateZombies() {
    for (let i = state.zombies.length - 1; i >= 0; i -= 1) {
        const z = state.zombies[i];
        const dx = player.x - z.x;
        const dy = player.y - z.y;
        const len = Math.hypot(dx, dy) || 1;
        z.x += (dx / len) * z.speed;
        z.y += (dy / len) * z.speed;

        if (len < z.radius + player.radius) {
            state.health = Math.max(0, state.health - CONTACT_DAMAGE);
            if (state.health <= 0) {
                state.gameOver = true;
                messageEl.classList.remove("hidden");
            }
        }
    }
}

function handleCollisions() {
    for (let zi = state.zombies.length - 1; zi >= 0; zi -= 1) {
        const z = state.zombies[zi];
        for (let bi = state.bullets.length - 1; bi >= 0; bi -= 1) {
            const b = state.bullets[bi];
            const d = Math.hypot(z.x - b.x, z.y - b.y);
            if (d < z.radius + b.radius) {
                state.bullets.splice(bi, 1);
                z.health -= 1;
                if (z.health <= 0) {
                    state.zombies.splice(zi, 1);
                    state.score += 10;
                    break;
                }
            }
        }
    }
}

function updateWave() {
    const nextWave = 1 + Math.floor(state.score / 120);
    if (nextWave !== state.wave) {
        state.wave = nextWave;
    }
}

function updateSpawning() {
    state.spawnTimer -= 1;
    if (state.spawnTimer <= 0) {
        spawnZombie();
        const minDelay = 18;
        const baseDelay = 70 - state.wave * 4;
        state.spawnTimer = Math.max(minDelay, baseDelay);
    }
}

function drawBackground() {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    const gap = 40;
    for (let x = 0; x < width; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y < height; y += gap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

function drawPlayer() {
    const dx = state.mouse.x - player.x;
    const dy = state.mouse.y - player.y;
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(angle);

    ctx.fillStyle = "#6ec1ff";
    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d8f0ff";
    ctx.fillRect(4, -4, 24, 8);
    ctx.restore();
}

function drawBullets() {
    ctx.fillStyle = "#ffd166";
    for (const b of state.bullets) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawZombies() {
    for (const z of state.zombies) {
        ctx.fillStyle = "#6ee56e";
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#183818";
        ctx.beginPath();
        ctx.arc(z.x - 5, z.y - 3, 2.4, 0, Math.PI * 2);
        ctx.arc(z.x + 5, z.y - 3, 2.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawCrosshair() {
    const x = state.mouse.x;
    const y = state.mouse.y;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 1.6;

    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.stroke();
}

function updateHud() {
    scoreEl.textContent = state.score.toString();
    healthEl.textContent = Math.floor(state.health).toString();
    waveEl.textContent = state.wave.toString();
}

function resetGame() {
    state.bullets = [];
    state.zombies = [];
    state.score = 0;
    state.health = 100;
    state.wave = 1;
    state.spawnTimer = 0;
    state.gameOver = false;
    player.x = width / 2;
    player.y = height / 2;
    messageEl.classList.add("hidden");
}

function gameLoop() {
    drawBackground();

    if (!state.gameOver) {
        updatePlayer();
        updateBullets();
        updateZombies();
        handleCollisions();
        updateWave();
        updateSpawning();
    }

    drawBullets();
    drawZombies();
    drawPlayer();
    drawCrosshair();
    updateHud();

    requestAnimationFrame(gameLoop);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", (e) => {
    state.keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === "r" && state.gameOver) {
        resetGame();
    }
});
window.addEventListener("keyup", (e) => {
    state.keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", (e) => {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
});
canvas.addEventListener("click", (e) => {
    shoot(e.clientX, e.clientY);
});

resetGame();
gameLoop();
