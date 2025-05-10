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
    PAUSED: 4,
    LOADING: 5,
    CONFIRM_DIALOG: 6
};

let currentGameState = GAME_STATE.START_SCREEN;
let previousGameState = null; // 일시정지 전 상태를 저장하기 위한 변수
let loadingStartTime = 0; // 로딩 시작 시간
let loadingMinDuration = 500; // 최소 로딩 시간 (0.5초)
let chunksLoaded = false; // 청크 로딩 완료 여부


// Start menu options
let selectedMenuOption = 0; // 0 = Start Game, 1 = Settings

// Pause menu options
let selectedPauseOption = 0; // 0 = Resume Game, 1 = To the Start Menu
let selectedConfirmOption = 0; // 0 = 예, 1 = 아니오
let confirmDialogType = ""; // 어떤 확인 대화상자인지 구분

// Player object
// 플레이어 객체 수정 - 색상 대신 캐릭터 타입 사용
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
    characterType: 1, // 기본 캐릭터 (1, 2, 3 중 하나)
    image: null     // 이미지 객체는 선택에 따라 할당됨
};

// 플레이어 캐릭터 이미지 배열 생성 (색상 배열 대체)
const playerImages = [
    { name: '캐릭터 1', image: new Image() },
    { name: '캐릭터 2', image: new Image() },
    { name: '캐릭터 3', image: new Image() }
];

// 선택된 캐릭터 인덱스 (0, 1, 2 중 하나)
let currentCharacterIndex = 0;

// 이미지 리소스 로딩 - 3개의 캐릭터 이미지 로드
function loadCharacterImages() {
    playerImages[0].image.src = 'player1.png';
    playerImages[1].image.src = 'player2.png';
    playerImages[2].image.src = 'player3.png';
    
    // 첫 번째 캐릭터로 기본 설정
    player.image = playerImages[0].image;
    
    // 이미지 로드 확인용 로그
    playerImages.forEach((character, index) => {
        character.image.onload = function() {
            console.log(`캐릭터 ${index + 1} 이미지 로드 완료`);
        };
    });
}

// 게임 초기화 시 이미지 로딩 호출
loadCharacterImages();

// 적 스폰 관련 변수 추가
const MAX_ENEMIES = 50; // 최대 적 수
const MIN_SPAWN_DISTANCE = 550; // 최소 스폰 거리
const MAX_SPAWN_DISTANCE = 650; // 최대 스폰 거리
const ENEMY_SPAWN_INTERVAL = 1000; // 적 스폰 간격 (1초)
let lastEnemySpawnTime = 0; // 마지막 적 스폰 시간

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

// 키보드 이벤트 핸들러
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // 디버깅을 위한 콘솔 로그 추가
    console.log('키 입력:', e.key, '현재 게임 상태:', currentGameState);
    
    // 시작 화면 메뉴 네비게이션
    if (currentGameState === GAME_STATE.START_SCREEN) {
        if (e.key === 'ArrowUp') {
            selectedMenuOption = 0; // 게임 시작
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            selectedMenuOption = 1; // 설정
            e.preventDefault();
        } else if (e.key === 'Enter') {
            if (selectedMenuOption === 0) {
                // 로딩 화면으로 게임 시작
                startGame();
            } else if (selectedMenuOption === 1) {
                // 설정 화면으로 이동
                currentGameState = GAME_STATE.SETTINGS;
            }
            e.preventDefault();
        }
    } 
    // 설정 화면 네비게이션
    else if (currentGameState === GAME_STATE.SETTINGS) {
        if (e.key === 'ArrowLeft') {
            // 이전 캐릭터로
            currentCharacterIndex = (currentCharacterIndex - 1 + playerImages.length) % playerImages.length;
            player.characterType = currentCharacterIndex + 1; // 1, 2, 3 값 저장
            player.image = playerImages[currentCharacterIndex].image;
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            // 다음 캐릭터로
            currentCharacterIndex = (currentCharacterIndex + 1) % playerImages.length;
            player.characterType = currentCharacterIndex + 1; // 1, 2, 3 값 저장
            player.image = playerImages[currentCharacterIndex].image;
            e.preventDefault();
        } else if (e.key === 'Enter' || e.key === 'Escape') {
            // 시작 화면으로 돌아가기
            currentGameState = GAME_STATE.START_SCREEN;
            e.preventDefault();
        }
    }
    // 일시정지 화면 네비게이션 추가
    else if (currentGameState === GAME_STATE.PAUSED) {
        if (e.key === 'ArrowUp') {
            selectedPauseOption = 0;
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            selectedPauseOption = 1;
            e.preventDefault();
        } else if (e.key === 'Enter') {
            if (selectedPauseOption === 0) {
                // 게임 재개
                resumeGame();
            } else if (selectedPauseOption === 1) {
                // 메인 메뉴 선택 시 확인 대화상자 표시
                currentGameState = GAME_STATE.CONFIRM_DIALOG;
                confirmDialogType = "exit_to_menu";
                selectedConfirmOption = 1; // 기본값은 "취소" 선택
            }
            e.preventDefault();
        }
    }
    // 확인 대화상자 네비게이션 추가
    else if (currentGameState === GAME_STATE.CONFIRM_DIALOG) {
        if (e.key === 'ArrowLeft') {
            selectedConfirmOption = 0; // 예
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            selectedConfirmOption = 1; // 아니오
            e.preventDefault();
        } else if (e.key === 'Enter') {
            if (confirmDialogType === "exit_to_menu") {
                if (selectedConfirmOption === 0) {
                    // 시작 화면으로 돌아가기
                    currentGameState = GAME_STATE.START_SCREEN;
                } else {
                    // 일시정지 화면으로 돌아가기
                    currentGameState = GAME_STATE.PAUSED;
                }
            }
            e.preventDefault();
        } else if (e.key === 'Escape') {
            // ESC 누르면 일시정지 화면으로 돌아가기
            currentGameState = GAME_STATE.PAUSED;
            e.preventDefault();
        }
    }
    // ESC 키 이벤트 처리 (이전과 동일)
    if (e.key === 'Escape') {
        if (currentGameState === GAME_STATE.PLAYING) {
            pauseGame();
        } else if (currentGameState === GAME_STATE.PAUSED) {
            resumeGame();
        } else if (currentGameState === GAME_STATE.SETTINGS) {
            currentGameState = GAME_STATE.START_SCREEN;
        }
        e.preventDefault();
    }
    // 게임 오버 화면에서 키 처리 (이전과 동일)
    else if (currentGameState === GAME_STATE.GAME_OVER) {
        if (e.key === 'Enter') {
            restartGame();
            e.preventDefault();
        }
    }
    
    // 스크롤 방지 (이전과 동일)
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
// 게임이 일시 정지될 때 selectedPauseOption 초기화 추가
function pauseGame() {
    if (currentGameState === GAME_STATE.PLAYING) {
        previousGameState = currentGameState;
        currentGameState = GAME_STATE.PAUSED;
        selectedPauseOption = 0; // 일시정지 시 첫 번째 옵션 선택
    }
}

// 게임 재개 기능 추가
function resumeGame() {
    if (currentGameState === GAME_STATE.PAUSED && previousGameState !== null) {
        currentGameState = previousGameState;
    }
}

function drawPauseScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#66fcf1';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 80);
    
    // 메뉴 옵션 그리기
    ctx.font = '24px Arial';
    
    // Resume Game 옵션
    if (selectedPauseOption === 0) {
        ctx.fillStyle = '#FFFF00'; // 선택된 항목 색상
        // 화살표 인디케이터 그리기
        drawArrow(canvas.width / 2 - 100, canvas.height / 2 - 8);
    } else {
        ctx.fillStyle = '#FFFFFF';
    }
    ctx.fillText('RESUME', canvas.width / 2, canvas.height / 2);
    
    // Back to Main Menu 옵션
    if (selectedPauseOption === 1) {
        ctx.fillStyle = '#FFFF00'; // 선택된 항목 색상
        // 화살표 인디케이터 그리기
        drawArrow(canvas.width / 2 - 100, canvas.height / 2 + 42);
    } else {
        ctx.fillStyle = '#FFFFFF';
    }
    ctx.fillText('MAIN MENU', canvas.width / 2, canvas.height / 2 + 50);
    
    // 안내 메시지
    /*
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '16px Arial';
    ctx.fillText('방향키로 선택하고 Enter를 눌러 확인하세요', canvas.width / 2, canvas.height / 2 + 100);
    */
}

// 확인 대화상자 그리기 함수
function drawConfirmDialog() {
    // 배경 그리기 (반투명 검은색)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 대화상자 배경 그리기
    ctx.fillStyle = 'rgba(50, 50, 50, 0.9)';
    const dialogWidth = 500;
    const dialogHeight = 200;
    const dialogX = (canvas.width - dialogWidth) / 2;
    const dialogY = (canvas.height - dialogHeight) / 2;
    
    ctx.fillRect(dialogX, dialogY, dialogWidth, dialogHeight);
    
    // 테두리 그리기
    ctx.strokeStyle = '#66fcf1';
    ctx.lineWidth = 2;
    ctx.strokeRect(dialogX, dialogY, dialogWidth, dialogHeight);
    
    // 메시지 그리기
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    
    if (confirmDialogType === "exit_to_menu") {
        ctx.fillText('게임을 포기하고 나가겠습니까?', canvas.width / 2, dialogY + 70);
    }
    
    // 버튼 그리기
    const buttonY = dialogY + 130;
    const buttonSpacing = 150;
    
    // 예 버튼
    ctx.fillStyle = selectedConfirmOption === 0 ? '#FFFF00' : '#FFFFFF';
    ctx.fillText('확인', canvas.width / 2 - buttonSpacing / 2, buttonY);
    
    // 아니오 버튼
    ctx.fillStyle = selectedConfirmOption === 1 ? '#FFFF00' : '#FFFFFF';
    ctx.fillText('취소', canvas.width / 2 + buttonSpacing / 2, buttonY);
    
    // 화살표 인디케이터 그리기
    if (selectedConfirmOption === 0) {
        drawArrow(canvas.width / 2 - buttonSpacing / 2 - 30, buttonY - 8);
    } else {
        drawArrow(canvas.width / 2 + buttonSpacing / 2 - 30, buttonY - 8);
    }
}

// 로딩 화면 그리기 함수
function drawLoadingScreen() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 로딩 텍스트
    ctx.fillStyle = '#66fcf1';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('LOADING...', canvas.width / 2, canvas.height / 2 - 20);
    
    // 로딩 바 배경
    ctx.fillStyle = '#333';
    ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 + 20, 200, 20);
    
    // 로딩 진행 표시 (시간 기반으로 애니메이션)
    const elapsedTime = Date.now() - loadingStartTime;
    const progress = Math.min(elapsedTime / loadingMinDuration, 1);
    
    ctx.fillStyle = '#66fcf1';
    ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 + 20, 200 * progress, 20);
}

// startGame 함수 수정 - 로딩 상태로 전환
function startGame() {
    // 로딩 상태로 변경
    currentGameState = GAME_STATE.LOADING;
    loadingStartTime = Date.now();
    chunksLoaded = false;
    
    // 게임 초기화
    resetGame();
    
    // 비동기적으로 청크 생성
    setTimeout(() => {
        // 플레이어 주변 청크 생성
        generateChunksAroundPlayer();
        chunksLoaded = true;
    }, 10); // 약간의 딜레이를 주어 UI 스레드가 로딩 화면을 그릴 수 있게 함
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
    let minDistance = 250;
    
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

// Game Loop 수정 - 로딩 상태 처리 추가
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
            } else if (currentGameState !== GAME_STATE.PAUSED && currentGameState !== GAME_STATE.LOADING) {
                // 일시정지 상태와 로딩 상태에서는 HUD를 계속 표시
                document.getElementById('hud').style.display = 'none';
            }
            lastGameState = currentGameState;
        }
        
        // 로딩 상태 처리
        if (currentGameState === GAME_STATE.LOADING) {
            drawLoadingScreen();
            
            // 청크 로딩이 완료되고 최소 로딩 시간이 지났는지 확인
            const elapsedTime = Date.now() - loadingStartTime;
            if (chunksLoaded && elapsedTime >= loadingMinDuration) {
                // 로딩 완료, 게임 플레이 상태로 전환
                currentGameState = GAME_STATE.PLAYING;
            }
        }
        // Update game based on state
        else if (currentGameState === GAME_STATE.PLAYING) {
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
        } else if (currentGameState === GAME_STATE.CONFIRM_DIALOG) {
            // 게임 화면 그리기
            draw();
            // 일시정지 화면 그리기
            drawPauseScreen();
            // 확인 대화상자 그리기
            drawConfirmDialog();
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
    ctx.fillText('뱀파이어 서바이벌', canvas.width / 2, canvas.height / 3 + 50);
    
    // Draw selected character preview
    const previewSize = player.size * 3;
    const previewX = canvas.width / 2;
    const previewY = canvas.height / 3 + 70;
    
    // Draw character preview
    if (player.image && player.image.complete) {
        ctx.drawImage(
            player.image,
            previewX - previewSize * 2,
            previewY - previewSize * 2 - 150,
            previewSize * 4,
            previewSize * 4
        );
    } else {
        // Fallback if image not loaded
        ctx.fillStyle = '#AAAAAA';
        ctx.beginPath();
        ctx.arc(previewX, previewY, previewSize, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Menu options
    ctx.font = '24px Arial';
    
    // Start Game option
    if (selectedMenuOption === 0) {
        ctx.fillStyle = '#FFFF00'; // Highlighted color
        // Draw arrow indicator
        drawArrow(canvas.width / 2 - 80, canvas.height / 2 + 42);
    } else {
        ctx.fillStyle = '#FFFFFF';
    }
    ctx.fillText('시작', canvas.width / 2, canvas.height / 2 + 50);
    
    // Settings option
    if (selectedMenuOption === 1) {
        ctx.fillStyle = '#FFFF00'; // Highlighted color
        // Draw arrow indicator
        drawArrow(canvas.width / 2 - 80, canvas.height / 2 + 92);
    } else {
        ctx.fillStyle = '#FFFFFF';
    }
    ctx.fillText('설정', canvas.width / 2, canvas.height / 2 + 100);
    
    // Instructions
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '16px Arial';
    //ctx.fillText('좌우 방향키로 캐릭터를 선택하세요', canvas.width / 2, canvas.height * 3/4 + 20);
    ctx.fillText('방향키로 조작', canvas.width / 2, canvas.height * 3/4 + 50);
    ctx.fillText('Enter로 선택', canvas.width / 2, canvas.height * 3/4 + 80);
    //ctx.fillText('ESC: 취소', canvas.width / 2, canvas.height * 3/4 + 80);
}

// 설정 화면 그리기 함수 수정 - 색상 선택에서 캐릭터 선택으로 변경
function drawSettingsScreen() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 제목
    ctx.fillStyle = '#55AAFF';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('캐릭터 선택', canvas.width / 2, canvas.height / 3);
    
    // 캐릭터 선택 텍스트
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px Arial';
    ctx.fillText('캐릭터:', canvas.width / 2, canvas.height / 2 - 70);
    
    // 현재 선택된 캐릭터 이름 표시
    ctx.fillStyle = '#FFFF00';
    ctx.fillText(playerImages[currentCharacterIndex].name, canvas.width / 2, canvas.height / 2 - 30);
    
    // 좌우 화살표 그리기
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '32px Arial';
    ctx.fillText('◀', canvas.width / 2 - 120, canvas.height / 2 + 70);
    ctx.fillText('▶', canvas.width / 2 + 120, canvas.height / 2 + 70);
    
    // 캐릭터 이미지 미리보기
    const previewSize = player.size * 4;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 50;
    
    // 현재 선택된 캐릭터 이미지 그리기
    if (playerImages[currentCharacterIndex].image.complete) {
        ctx.drawImage(
            playerImages[currentCharacterIndex].image,
            centerX - previewSize,
            centerY - previewSize,
            previewSize * 2,
            previewSize * 2
        );
    } else {
        // 이미지가 로드되지 않은 경우 대체 표시
        ctx.fillStyle = '#AAAAAA';
        ctx.beginPath();
        ctx.arc(centerX, centerY, previewSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('로딩 중...', centerX, centerY);
    }
    
    // 안내 메시지
    ctx.fillStyle = '#AAAAAA';
    ctx.font = '16px Arial';
    ctx.fillText('Enter를 눌러 캐릭터 선택', canvas.width / 2, canvas.height * 3/4 + 20);
    ctx.fillText('ESC를 눌러 취소', canvas.width / 2, canvas.height * 3/4 + 50);
}

// Update Game State
// Cache previous values to avoid unnecessary DOM updates
let lastHealth = player.health;
let lastLevel = player.level;
let lastScore = score;
let lastExp = player.exp;

// update 함수를 수정합니다 - 플레이어 움직임과 상관없이 항상 자동 조준 업데이트
function update() {
    // Move Player
    let playerMoved = false;
    if (keys['ArrowUp']) { player.y -= player.speed; playerMoved = true; }
    if (keys['ArrowDown']) { player.y += player.speed; playerMoved = true; }
    if (keys['ArrowLeft']) { player.x -= player.speed; playerMoved = true; }
    if (keys['ArrowRight']) { player.x += player.speed; playerMoved = true; }
    
    // 플레이어가 움직였을 때만 청크를 생성
    if (playerMoved) {
        // Generate chunks around the player
        generateChunksAroundPlayer();
    }
    // 적 스폰 로직 실행
    spawnEnemyAroundPlayer();
    
    // 플레이어 움직임과 상관없이 항상 가장 가까운 적을 조준
    updatePlayerAim();
    
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
    
    // 화면 밖으로 너무 멀리 벗어난 적은 제거 (최적화)
    const despawnDistance = MAX_SPAWN_DISTANCE * 2; // 스폰 거리의 2배 이상 떨어지면 제거
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distanceSquared = dx * dx + dy * dy;
        
        if (distanceSquared > despawnDistance * despawnDistance) {
            enemies.splice(i, 1);
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

    // 플레이어 그리기 (색상 적용 대신 선택된 캐릭터 이미지 사용)
    if (player.image && player.image.complete) {
        // 이미지가 로드된 경우 이미지 그리기
        const playerSize = player.size * 2; // 이미지 크기 조정
        
        // 상태 저장
        ctx.save();
        
        // 투명도를 유지하며 이미지 그리기
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(
            player.image,
            canvas.width / 2 - playerSize,
            canvas.height / 2 - playerSize,
            playerSize * 2,
            playerSize * 2
        );
        
        // 상태 복원
        ctx.restore();
    } else {
        // 이미지가 로드되지 않은 경우 기존 원 그리기 (대체용)
        ctx.fillStyle = 'white'; // 기본 흰색 사용
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, player.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // 플레이어 방향 표시기 그리기 (이전과 동일)
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

// generateChunk 함수 수정
function generateChunk(chunkX, chunkY) {
    const chunk = {
        items: [],
        terrain: [],
    };

    // 적은 더 이상 청크 생성 시 스폰되지 않음
    // 대신 spawnEnemyAroundPlayer 함수를 통해 지속적으로 생성됨

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

// unloadChunk 함수 수정 - enemies 관련 부분 제거
function unloadChunk(chunkKey) {
    const chunk = chunks[chunkKey];
    if (chunk) {
        // 청크 언로드 시 적은 제거하지 않음 (플레이어 중심으로 관리하기 때문)

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

// 플레이어 주변에 적을 스폰하는 함수
function spawnEnemyAroundPlayer() {
    // 최대 적 수를 초과하지 않았는지 확인
    if (enemies.length >= MAX_ENEMIES) {
        return;
    }
    
    // 스폰 간격 확인
    const currentTime = Date.now();
    if (currentTime - lastEnemySpawnTime < ENEMY_SPAWN_INTERVAL) {
        return;
    }
    
    // 플레이어 주변 랜덤 위치 계산 (550~650 거리)
    const spawnDistance = MIN_SPAWN_DISTANCE + Math.random() * (MAX_SPAWN_DISTANCE - MIN_SPAWN_DISTANCE);
    const spawnAngle = Math.random() * Math.PI * 2; // 0~360도 랜덤 각도
    
    const spawnX = player.x + Math.cos(spawnAngle) * spawnDistance;
    const spawnY = player.y + Math.sin(spawnAngle) * spawnDistance;
    
    // 적 생성 (레벨에 따라 강해지도록 설정)
    const enemySize = 20;
    const enemySpeed = 1 + Math.random() * 0.5 + (player.level - 1) * 0.1; // 레벨에 따라 속도 증가
    const enemyHealth = 5 + Math.floor((player.level - 1) * 1.5); // 레벨에 따라 체력 증가
    const enemyAttack = 10 + Math.floor((player.level - 1) * 0.5); // 레벨에 따라 공격력 증가
    
    // 새 적 객체 생성
    const enemy = new Enemy(spawnX, spawnY, enemySize, enemySpeed, enemyHealth, enemyAttack);
    enemies.push(enemy);
    
    // 마지막 스폰 시간 업데이트
    lastEnemySpawnTime = currentTime;
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

// resetGame 함수 수정 - 색상 대신 캐릭터 타입 유지
function resetGame() {
    player.x = 0;
    player.y = 0;
    player.health = player.maxHealth;
    player.level = 1;
    player.exp = 0;
    player.nextLevelExp = 100;
    player.prevLevelExp = 0;
    player.weapons = [new BasicWeapon()];
    // characterType과 image는 그대로 유지 (캐릭터 선택 유지)
    bullets = [];
    enemies = [];
    jewels = [];
    terrain = [];
    chunks = {};
    score = 0;

    // HUD 업데이트
    healthElement.textContent = `Health: ${player.health}`;
    levelElement.textContent = `Level: ${player.level}`;
    scoreElement.textContent = `Score: ${score}`;
    expElement.textContent = `EXP: ${player.exp} / ${player.nextLevelExp}`;
    
    // 게임 상태 변경은 호출하는 함수에서 처리
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
