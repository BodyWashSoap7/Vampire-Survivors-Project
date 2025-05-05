// Get the canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game dimensions and scaling
const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
let CANVAS_WIDTH = BASE_WIDTH;
let CANVAS_HEIGHT = BASE_HEIGHT;
const CHUNK_SIZE = 500; // Size of each chunk in pixels

// Store game objects
let chunks = {}; // Store generated chunks
let terrain = []; // Store terrain features like trees
let bullets = [];
let enemies = [];
let jewels = [];
let keys = {};
let score = 0;

// Game state
const GAME_STATE = {
    START_SCREEN: 0,
    SETTINGS: 1,
    PLAYING: 2,
    GAME_OVER: 3,
    PAUSED: 4
};

let currentGameState = GAME_STATE.START_SCREEN;
let previousGameState = null; // 일시정지 전 상태를 저장하기 위한 변수

// Available player colors and settings
const playerColors = ['white', 'cyan', 'lime', 'yellow', 'orange', 'pink'];
let currentColorIndex = 0;
let selectedMenuOption = 0; // 0 = Start Game, 1 = Settings

// Player object
const player = {
    x: 0,
    y: 0,
    size: 15,
    speed: 3,
    health: 100,
    maxHealth: 100,
    level: 1,
    exp: 0,
    nextLevelExp: 100,
    prevLevelExp: 0,
    weapons: [],
    color: playerColors[0] // Default color
};

// Get HUD elements
const healthElement = document.getElementById('health');
const levelElement = document.getElementById('level');
const scoreElement = document.getElementById('score');
const expElement = document.getElementById('exp');

// Handle window resizing
function resizeCanvas() {
    // Calculate the available window space
    let availableWidth = window.innerWidth - 40; // Account for margins
    let availableHeight = window.innerHeight - 150; // Account for headers and HUD

    // Maintain aspect ratio
    const ratio = BASE_WIDTH / BASE_HEIGHT;
    
    if (availableHeight < availableWidth / ratio) {
        CANVAS_WIDTH = availableHeight * ratio;
        CANVAS_HEIGHT = availableHeight;
    } else {
        CANVAS_WIDTH = availableWidth;
        CANVAS_HEIGHT = availableWidth / ratio;
    }

    // Set the canvas display size (CSS)
    canvas.style.width = CANVAS_WIDTH + 'px';
    canvas.style.height = CANVAS_HEIGHT + 'px';
    
    // Keep the drawing buffer size the same for consistency
    canvas.width = BASE_WIDTH;
    canvas.height = BASE_HEIGHT;
    
    // Reset font after resize
    ctx.font = '16px Arial';
    
    // Disable image smoothing for pixel art
    ctx.imageSmoothingEnabled = false;
}

// Call resize initially and add event listener
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Event Listeners for Key Presses
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // Handle menu navigation with arrow keys
    if (currentGameState === GAME_STATE.START_SCREEN) {
        if (e.key === 'ArrowUp') {
            selectedMenuOption = 0; // Start Game
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            selectedMenuOption = 1; // Settings
            e.preventDefault();
        } else if (e.key === 'Enter') {
            if (selectedMenuOption === 0) {
                // Start the game
                currentGameState = GAME_STATE.PLAYING;
            } else if (selectedMenuOption === 1) {
                // Go to settings
                currentGameState = GAME_STATE.SETTINGS;
            }
            e.preventDefault();
        }
    } 
    // Handle settings navigation
    else if (currentGameState === GAME_STATE.SETTINGS) {
        if (e.key === 'ArrowLeft') {
            currentColorIndex = (currentColorIndex - 1 + playerColors.length) % playerColors.length;
            player.color = playerColors[currentColorIndex];
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            currentColorIndex = (currentColorIndex + 1) % playerColors.length;
            player.color = playerColors[currentColorIndex];
            e.preventDefault();
        } else if (e.key === 'Enter' || e.key === 'Escape') {
            // Return to start screen
            currentGameState = GAME_STATE.START_SCREEN;
            e.preventDefault();
        }
    }
    // 게임 중 ESC 키를 눌렀을 때 일시정지 처리
    if (e.key === 'Escape') {
        if (currentGameState === GAME_STATE.PLAYING) {
            pauseGame();
        } else if (currentGameState === GAME_STATE.PAUSED) {
            resumeGame();
        } else if (currentGameState === GAME_STATE.SETTINGS) {
            // 설정 화면에서는 시작 화면으로 돌아가기
            currentGameState = GAME_STATE.START_SCREEN;
        }
        e.preventDefault();
    }
    // 일시정지 상태에서 키 처리
    else if (currentGameState === GAME_STATE.PAUSED) {
        if (e.key === 'Enter') {
            resumeGame();
            e.preventDefault();
        }
    }
    // Handle game over screen
    else if (currentGameState === GAME_STATE.GAME_OVER) {
        if (e.key === 'Enter') {
            restartGame();
            e.preventDefault();
        }
    }
    
    // Prevent default scrolling behavior for game controls
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter', 'Escape'].includes(e.key)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 창이 비활성화될 때 게임 일시정지
// 창이 다시 활성화될 때 자동으로 게임 재개는 하지 않음 (사용자가 직접 ESC나 Enter 누르도록)
window.addEventListener('blur', () => {
    if (currentGameState === GAME_STATE.PLAYING) {
        pauseGame();
    }
});

// 일시정지 기능 추가
function pauseGame() {
    if (currentGameState === GAME_STATE.PLAYING) {
        previousGameState = currentGameState;
        currentGameState = GAME_STATE.PAUSED;
    }
}

// 게임 재개 기능 추가
function resumeGame() {
    if (currentGameState === GAME_STATE.PAUSED && previousGameState !== null) {
        currentGameState = previousGameState;
    }
}

// 일시정지 화면 그리기 함수 추가
function drawPauseScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#66fcf1';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 50);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.fillText('ESC or ENTER', canvas.width / 2, canvas.height / 2 + 50);
}

// Removed mouse event listeners to only use keyboard controls
// Instead, add automatic aiming toward the nearest enemy
function updatePlayerAim() {
    let nearestEnemy = findNearestEnemy();
    
    if (nearestEnemy) {
        const dx = nearestEnemy.x - player.x;
        const dy = nearestEnemy.y - player.y;
        player.aimAngle = Math.atan2(dy, dx);
    } else {
        // Default aim direction (right)
        player.aimAngle = 0;
    }
}

function findNearestEnemy() {
    let nearestEnemy = null;
    let minDistance = Infinity;
    
    enemies.forEach((enemy) => {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance < minDistance) {
            minDistance = distance;
            nearestEnemy = enemy;
        }
    });
    
    return nearestEnemy;
}

// Auto-fire at the nearest enemy
function autoFireAtNearestEnemy() {
    const nearestEnemy = findNearestEnemy();
    
    if (nearestEnemy) {
        // Add auto-firing cooldown to control fire rate
        const now = Date.now();
        if (!player.lastFireTime || now - player.lastFireTime >= 500) { // Fire every 500ms
            fireWeapon();
            player.lastFireTime = now;
        }
    }
}

// Game Loop
let lastGameState = null;
let lastFrameTime = 0;
const TARGET_FPS = 120;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

// Game Loop 수정
function gameLoop(timestamp) {
    // Calculate delta time and limit frame rate
    if (!lastFrameTime) lastFrameTime = timestamp;
    const deltaTime = timestamp - lastFrameTime;
    
    // Only update if enough time has passed (frame rate limiting)
    if (deltaTime >= FRAME_INTERVAL) {
        lastFrameTime = timestamp;
        
        // Only update HUD display when game state changes to avoid unnecessary DOM operations
        if (currentGameState !== lastGameState) {
            if (currentGameState === GAME_STATE.PLAYING) {
                document.getElementById('hud').style.display = 'flex';
            } else if (currentGameState !== GAME_STATE.PAUSED) {
                // 일시정지 상태에서는 HUD를 계속 표시
                document.getElementById('hud').style.display = 'none';
            }
            lastGameState = currentGameState;
        }
        
        // Update game based on state
        if (currentGameState === GAME_STATE.PLAYING) {
            update();
            draw();
            if (player.health <= 0) {
                currentGameState = GAME_STATE.GAME_OVER;
            }
        } else if (currentGameState === GAME_STATE.START_SCREEN) {
            drawStartScreen();
        } else if (currentGameState === GAME_STATE.SETTINGS) {
            drawSettingsScreen();
        } else if (currentGameState === GAME_STATE.GAME_OVER) {
            drawGameOverScreen();
        } else if (currentGameState === GAME_STATE.PAUSED) {
            // 배경 그리기 (플레이어가 어디에 있는지 볼 수 있게)
            draw();
            // 그 위에 일시정지 화면 그리기
            drawPauseScreen();
        }
    }
    
    requestAnimationFrame(gameLoop);
}

// Draw Start Screen
function drawStartScreen() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Title
    ctx.fillStyle = '#55AAFF';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('뱀파이어 서바이벌', canvas.width / 2, canvas.height / 3);
    
    // Menu options
    ctx.font = '24px Arial';
    
    // Start Game option
    if (selectedMenuOption === 0) {
        ctx.fillStyle = '#FFFF00'; // Highlighted color
        // Draw arrow indicator
        drawArrow(canvas.width / 2 - 80, canvas.height / 2 - 8);
    } else {
        ctx.fillStyle = '#FFFFFF';
    }
    ctx.fillText('시작', canvas.width / 2, canvas.height / 2);
    
    // Settings option
    if (selectedMenuOption === 1) {
        ctx.fillStyle = '#FFFF00'; // Highlighted color
        // Draw arrow indicator
        drawArrow(canvas.width / 2 - 80, canvas.height / 2 + 42);
    } else {
        ctx.fillStyle = '#FFFFFF';
    }
    ctx.fillText('설정', canvas.width / 2, canvas.height / 2 + 50);
    
    // Instructions
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '16px Arial';
    ctx.fillText('방향키로 선택하고 Enter를 눌러 확인하세요', canvas.width / 2, canvas.height * 3/4);
}

// Draw Settings Screen
function drawSettingsScreen() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Title
    ctx.fillStyle = '#55AAFF';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('캐릭터 설정', canvas.width / 2, canvas.height / 3);
    
    // Color selection
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.fillText('캐릭터 색상:', canvas.width / 2, canvas.height / 2 - 50);
    
    // Draw color options
    const colorBoxSize = 30;
    const totalWidth = playerColors.length * (colorBoxSize + 10) - 10;
    let startX = (canvas.width - totalWidth) / 2;
    
    for (let i = 0; i < playerColors.length; i++) {
        // Draw color box
        ctx.fillStyle = playerColors[i];
        ctx.fillRect(startX, canvas.height / 2 - 10, colorBoxSize, colorBoxSize);
        
        // Draw selection indicator
        if (i === currentColorIndex) {
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 3;
            ctx.strokeRect(startX - 3, canvas.height / 2 - 13, colorBoxSize + 6, colorBoxSize + 6);
        }
        
        startX += colorBoxSize + 10;
    }
    
    // Preview character
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2 + 70, player.size * 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Instructions
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '16px Arial';
    ctx.fillText('좌우 방향키로 색상을 선택하고 Enter를 눌러 저장하세요', canvas.width / 2, canvas.height * 3/4);
    ctx.fillText('Enter 또는 Escape를 눌러 메인 메뉴로 돌아가세요', canvas.width / 2, canvas.height * 3/4 + 30);
}

// Update Game State
// Cache previous values to avoid unnecessary DOM updates
let lastHealth = player.health;
let lastLevel = player.level;
let lastScore = score;
let lastExp = player.exp;

function update() {
    // Move Player
    let playerMoved = false;
    if (keys['ArrowUp']) { player.y -= player.speed; playerMoved = true; }
    if (keys['ArrowDown']) { player.y += player.speed; playerMoved = true; }
    if (keys['ArrowLeft']) { player.x -= player.speed; playerMoved = true; }
    if (keys['ArrowRight']) { player.x += player.speed; playerMoved = true; }
    
    // Only update player aim and generate chunks if player has moved
    if (playerMoved) {
        // Update player aim toward nearest enemy
        updatePlayerAim();
        
        // Generate chunks around the player
        generateChunksAroundPlayer();
    }
    
    // Auto-fire at the nearest enemy (no spacebar needed)
    autoFireAtNearestEnemy();

    // Update Weapons
    player.weapons.forEach((weapon) => weapon.update());

    // Update Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();

        // Remove bullets that are off-screen or used
        if (bullets[i].used || bullets[i].outOfBounds()) {
            bullets.splice(i, 1);
        }
    }

    const activeRadius = CHUNK_SIZE * 1.5;

    // Update Enemies - only process enemies within active radius
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (isWithinDistance(enemy, player, activeRadius)) {
            enemy.update();

            // Check Collision with Player
            if (detectCollision(player, enemy)) {
                player.health -= enemy.attackStrength;
                enemies.splice(i, 1);
                
                // Player health changed, update will happen at end of function
            }
        }
    }

    // Update Jewels - only process jewels within active radius
    for (let i = jewels.length - 1; i >= 0; i--) {
        const jewel = jewels[i];
        if (isWithinDistance(jewel, player, activeRadius)) {
            // Move Jewel towards Player if close
            jewel.update();

            // Check collision with player
            if (detectCollision(player, jewel)) {
                jewel.collect();
                jewels.splice(i, 1);
            }
        }
    }

    // Update HUD elements only when values change
    if (lastHealth !== player.health) {
        healthElement.textContent = `Health: ${player.health}`;
        lastHealth = player.health;
    }
    
    if (lastLevel !== player.level) {
        levelElement.textContent = `Level: ${player.level}`;
        lastLevel = player.level;
    }
    
    if (lastScore !== score) {
        scoreElement.textContent = `Score: ${score}`;
        lastScore = score;
    }
    
    if (lastExp !== player.exp) {
        expElement.textContent = `EXP: ${player.exp} / ${player.nextLevelExp}`;
        lastExp = player.exp;
    }
}

// Draw Game Objects
function draw() {
    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate camera offset to center the player
    const offsetX = canvas.width / 2 - player.x;
    const offsetY = canvas.height / 2 - player.y;

    // Draw Background
    drawBackground(offsetX, offsetY);

    // Draw Terrain
    terrain.forEach((feature) => {
        feature.draw(offsetX, offsetY);
    });

    // Draw Jewels
    jewels.forEach((jewel) => {
        jewel.draw(offsetX, offsetY);
    });

    // Draw Enemies
    enemies.forEach((enemy) => {
        enemy.draw(offsetX, offsetY);
    });

    // Draw Bullets
    bullets.forEach((bullet) => {
        bullet.draw(offsetX, offsetY);
    });

    // Draw Player at the center of the canvas with selected color
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, player.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw player direction indicator
    if (player.aimAngle !== undefined) {
        const indicatorLength = player.size * 1.2;
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, canvas.height / 2);
        ctx.lineTo(
            canvas.width / 2 + Math.cos(player.aimAngle) * indicatorLength,
            canvas.height / 2 + Math.sin(player.aimAngle) * indicatorLength
        );
        ctx.stroke();
    }

    /*
    // Draw controls help
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('방향키: 이동, 스페이스바: 발사', 10, canvas.height - 10);
    */
}

function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#FF5555';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('게임 오버', canvas.width / 2, canvas.height / 2 - 50);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.fillText(`최종 점수: ${score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText('Enter를 눌러 다시 시작하세요', canvas.width / 2, canvas.height / 2 + 50);
}

// Helper Functions
function getChunkCoord(x, y) {
    return {
        x: Math.floor(x / CHUNK_SIZE),
        y: Math.floor(y / CHUNK_SIZE),
    };
}

function generateChunksAroundPlayer() {
    const chunkCoords = getChunkCoord(player.x, player.y);
    const renderDistance = 5; // How many chunks around the player to generate

    const activeChunks = {};

    for (let dx = -renderDistance; dx <= renderDistance; dx++) {
        for (let dy = -renderDistance; dy <= renderDistance; dy++) {
            const chunkX = chunkCoords.x + dx;
            const chunkY = chunkCoords.y + dy;
            const chunkKey = `${chunkX},${chunkY}`;

            if (!chunks[chunkKey]) {
                generateChunk(chunkX, chunkY);
            }
            activeChunks[chunkKey] = true;
        }
    }

    // Unload chunks that are no longer active
    for (const chunkKey in chunks) {
        if (!activeChunks[chunkKey]) {
            unloadChunk(chunkKey);
        }
    }
}

function generateChunk(chunkX, chunkY) {
    const chunk = {
        enemies: [],
        items: [],
        terrain: [],
    };

    const chunkSeed = chunkX * 100000 + chunkY;

    // Generate enemies
    const enemyCount = 5; // Adjust as needed
    for (let i = 0; i < enemyCount; i++) {
        const x = chunkX * CHUNK_SIZE + Math.random() * CHUNK_SIZE;
        const y = chunkY * CHUNK_SIZE + Math.random() * CHUNK_SIZE;
        const enemy = new Enemy(x, y, 20, 1 + Math.random() * 0.5, 5, 10);
        chunk.enemies.push(enemy);
        enemies.push(enemy); // Add to the main enemies array
    }

    // Generate items (jewels)
    const itemCount = 3; // Adjust as needed
    for (let i = 0; i < itemCount; i++) {
        const x = chunkX * CHUNK_SIZE + Math.random() * CHUNK_SIZE;
        const y = chunkY * CHUNK_SIZE + Math.random() * CHUNK_SIZE;
        const jewel = new Jewel(x, y);
        chunk.items.push(jewel);
        jewels.push(jewel); // Add to the main jewels array
    }

    // Generate terrain features (e.g., trees)
    for (let x = 0; x < CHUNK_SIZE; x += 50) {
        for (let y = 0; y < CHUNK_SIZE; y += 50) {
            const worldX = chunkX * CHUNK_SIZE + x;
            const worldY = chunkY * CHUNK_SIZE + y;
            if ((worldX + worldY) % 200 === 0) {
                const tree = new Tree(worldX, worldY);
                chunk.terrain.push(tree);
                terrain.push(tree); // Add to the main terrain array
            }
        }
    }

    // Store the chunk
    const chunkKey = `${chunkX},${chunkY}`;
    chunks[chunkKey] = chunk;
}

function unloadChunk(chunkKey) {
    const chunk = chunks[chunkKey];
    if (chunk) {
        // Remove enemies
        chunk.enemies.forEach((enemy) => {
            const index = enemies.indexOf(enemy);
            if (index !== -1) enemies.splice(index, 1);
        });

        // Remove items
        chunk.items.forEach((item) => {
            const index = jewels.indexOf(item);
            if (index !== -1) jewels.splice(index, 1);
        });

        // Remove terrain features
        chunk.terrain.forEach((feature) => {
            const index = terrain.indexOf(feature);
            if (index !== -1) terrain.splice(index, 1);
        });

        // Remove the chunk
        delete chunks[chunkKey];
    }
}

function detectCollision(obj1, obj2) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.hypot(dx, dy);

    return distance < obj1.size + obj2.size;
}

function isWithinDistance(obj1, obj2, distance) {
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    return dx * dx + dy * dy <= distance * distance;
}

function fireWeapon() {
    // Create a bullet in the direction player is aiming
    if (player.aimAngle !== undefined) {
        bullets.push(
            new Bullet(
                player.x,
                player.y,
                5,
                7,
                player.aimAngle,
                10 // Damage
            )
        );
    }
}

function resetGame() {
    player.x = 0;
    player.y = 0;
    player.health = player.maxHealth;
    player.level = 1;
    player.exp = 0;
    player.nextLevelExp = 100;
    player.prevLevelExp = 0;
    player.weapons = [new BasicWeapon()];
    bullets = [];
    enemies = [];
    jewels = [];
    terrain = [];
    chunks = {};
    score = 0;

    // Update HUD
    healthElement.textContent = `Health: ${player.health}`;
    levelElement.textContent = `Level: ${player.level}`;
    scoreElement.textContent = `Score: ${score}`;
    expElement.textContent = `EXP: ${player.exp} / ${player.nextLevelExp}`;
    
    // Set game state to playing
    currentGameState = GAME_STATE.PLAYING;
}

function restartGame() {
    resetGame();
    currentGameState = GAME_STATE.START_SCREEN;
}

function drawBackground(offsetX, offsetY) {
    const gridSize = 50; // Size of each grid cell
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    const startX = -offsetX % gridSize;
    const startY = -offsetY % gridSize;

    for (let x = startX; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = startY; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Helper function to draw an arrow
function drawArrow(x, y) {
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    // Draw triangle pointing right
    ctx.moveTo(x, y);
    ctx.lineTo(x - 15, y - 8);
    ctx.lineTo(x - 15, y + 8);
    ctx.closePath();
    ctx.fill();
}
// Classes

class Weapon {
    constructor() {
        this.attackSpeed = 1000; // ms
        this.lastAttackTime = Date.now();
    }

    update() {
        const now = Date.now();
        if (now - this.lastAttackTime >= this.attackSpeed) {
            this.fire();
            this.lastAttackTime = now;
        }
    }

    fire() {
        // To be implemented in subclasses
    }
}

class BasicWeapon extends Weapon {
    constructor() {
        super();
        this.attackSpeed = 1000;
    }

    fire() {
        bullets.push(
            new Bullet(
                player.x,
                player.y,
                5,
                7,
                Math.random() * Math.PI * 2, // Random direction
                10 // Damage
            )
        );
    }
}

class Bullet {
    constructor(x, y, size, speed, angle, damage) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.speed = speed;
        this.angle = angle;
        this.damage = damage;
        this.used = false;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Check collision with enemies
        enemies.forEach((enemy) => {
            if (detectCollision(this, enemy)) {
                enemy.takeDamage(this.damage);
                this.used = true;
            }
        });
    }

    draw(offsetX, offsetY) {
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(this.x + offsetX, this.y + offsetY, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    outOfBounds() {
        const maxDistance = 1000; // Max distance bullet can travel from player
        return !isWithinDistance(this, player, maxDistance);
    }
}

class Enemy {
    constructor(x, y, size, speed, health, attackStrength) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.speed = speed;
        this.health = health;
        this.maxHealth = health;
        this.attackStrength = attackStrength;
    }

    update() {
        // Move Enemy Towards Player
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;

        // Remove enemy if health is zero or below
        if (this.health <= 0) {
            this.die();
        }
    }

    draw(offsetX, offsetY) {
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(this.x + offsetX, this.y + offsetY, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw Health Bar
        ctx.fillStyle = 'black';
        ctx.fillRect(
            this.x - this.size + offsetX,
            this.y - this.size - 10 + offsetY,
            this.size * 2,
            5
        );
        ctx.fillStyle = 'green';
        ctx.fillRect(
            this.x - this.size + offsetX,
            this.y - this.size - 10 + offsetY,
            (this.size * 2) * (this.health / this.maxHealth),
            5
        );
    }

    takeDamage(damage) {
        this.health -= damage;
    }

    die() {
        // Drop a jewel
        jewels.push(new Jewel(this.x, this.y));
        score += 10;
        const index = enemies.indexOf(this);
        if (index !== -1) enemies.splice(index, 1);
    }
}

class Jewel {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 8;
        this.collected = false;
    }

    update() {
        // Move towards the player if within attraction radius
        const attractionRadius = 100;
        if (detectCollision(this, { x: player.x, y: player.y, size: attractionRadius })) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.x += Math.cos(angle) * 2;
            this.y += Math.sin(angle) * 2;
        }
    }

    draw(offsetX, offsetY) {
        ctx.fillStyle = 'cyan';
        ctx.beginPath();
        ctx.arc(this.x + offsetX, this.y + offsetY, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    collect() {
        // Increase player's EXP
        const expGained = 20;
        player.exp += expGained;
        score += 5;
        this.checkLevelUp();
    }

    checkLevelUp() {
        if (player.exp >= player.nextLevelExp) {
            player.level += 1;
            player.prevLevelExp = player.nextLevelExp;
            player.nextLevelExp = Math.floor(player.nextLevelExp * 1.5);
            player.health = player.maxHealth; // Restore health on level up
            player.speed += 0.1; // Increase speed
            // Optionally, add new weapons or increase stats
            // For example, add a new weapon at certain levels
            if (player.level === 3) {
                player.weapons.push(new ShotgunWeapon());
            }
        }
    }
}

class Tree {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 20;
    }

    draw(offsetX, offsetY) {
        ctx.fillStyle = 'green';
        ctx.beginPath();
        ctx.arc(this.x + offsetX, this.y + offsetY, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Additional Weapons

class ShotgunWeapon extends Weapon {
    constructor() {
        super();
        this.attackSpeed = 2000;
    }

    fire() {
        const spread = 0.2;
        for (let i = -2; i <= 2; i++) {
            bullets.push(
                new Bullet(
                    player.x,
                    player.y,
                    5,
                    7,
                    Math.random() * Math.PI * 2 + spread * i,
                    8 // Damage
                )
            );
        }
    }
}

// Initialize the game
gameLoop();