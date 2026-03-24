(function() {
    // Canvas setup
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    let W = 800, H = 550;
    canvas.width = W;
    canvas.height = H;
    
    // Game state
    let gameRunning = false;
    let gameLoopId = null;
    
    // Player
    let playerX = W / 2;
    const playerWidth = 40;
    const playerHeight = 32;
    const playerY = H - 70;
    
    // Objects
    let fallingObjects = [];
    
    // Collection goals
    const goals = {
        bag: { name: "🎒 School Bag", target: 8, current: 0, emoji: "🎒" },
        flower: { name: "🌼 Flower", target: 6, current: 0, emoji: "🌼" },
        toy: { name: "🧸 Toy", target: 5, current: 0, emoji: "🧸" },
        book: { name: "📖 Book", target: 4, current: 0, emoji: "📖" }
    };
    
    // Good object types (with point values)
    const goodTypes = [
        { id: "bag", emoji: "🎒", color: "#d4a373", value: 15 },
        { id: "flower", emoji: "🌼", color: "#e9c46a", value: 15 },
        { id: "toy", emoji: "🧸", color: "#e76f51", value: 15 },
        { id: "book", emoji: "📖", color: "#2a9d8f", value: 15 }
    ];
    
    // Bad object types
    const badTypes = [
        { emoji: "💣", name: "Bomb", color: "#6c584c", penalty: 20 },
        { emoji: "🔫", name: "Gun", color: "#5e503f", penalty: 20 },
        { emoji: "🪖", name: "Helmet", color: "#8b6b4d", penalty: 20 }
    ];
    
    // Hope meter
    let hope = 100;
    const maxHope = 100;
    
    // Timer
    let timeLeft = 60; // seconds
    
    // Game status
    let gameWin = false;
    let messageQueue = [];
    let messageTimer = null;
    
    // Animation frame counter for falling objects
    let frameCounter = 0;
    let spawnDelay = 28; // frames between spawns
    
    // Special effects
    let hearts = [];
    let screenFlash = 0;
    
    // Touch/mouse tracking
    let isDragging = false;
    
    // DOM elements
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const winScreen = document.getElementById('winScreen');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const gameOverTitle = document.getElementById('gameOverTitle');
    const gameOverMessage = document.getElementById('gameOverMessage');
    
    // Helper functions
    function showMessage(msg, isGood = true) {
        messageQueue.push({ text: msg, isGood, life: 60 });
    }
    
    function updateUI() {
        // UI is drawn in canvas, but we update DOM for summaries
    }
    
    function checkAllCollectionsComplete() {
        let allComplete = true;
        for (let key in goals) {
            if (goals[key].current < goals[key].target) {
                allComplete = false;
                break;
            }
        }
        return allComplete;
    }
    
    function addHeart(x, y) {
        hearts.push({ x: x, y: y, life: 30 });
    }
    
    function flashScreen() {
        screenFlash = 10;
    }
    
    // Game over logic
    function endGame(isWin, reason = "") {
        if (!gameRunning) return;
        gameRunning = false;
        
        if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
            gameLoopId = null;
        }
        
        if (isWin) {
            gameWin = true;
            // Show win screen with summary
            const winSummary = document.getElementById('winCollectionsSummary');
            winSummary.innerHTML = generateSummaryHTML();
            winScreen.style.display = 'flex';
        } else {
            // Show game over screen
            if (reason === "hope") {
                gameOverTitle.innerHTML = "💔 HOPE FADED 💔";
                gameOverMessage.innerHTML = "The weight of war became too heavy...";
            } else if (reason === "time") {
                gameOverTitle.innerHTML = "⏱️ TIME RAN OUT ⏱️";
                gameOverMessage.innerHTML = "The journey was cut short...";
            } else {
                gameOverTitle.innerHTML = "💔 JOURNEY ENDED 💔";
                gameOverMessage.innerHTML = reason || "The child couldn't continue...";
            }
            
            const summaryDiv = document.getElementById('collectionsSummary');
            summaryDiv.innerHTML = generateSummaryHTML();
            gameOverScreen.style.display = 'flex';
        }
    }
    
    function generateSummaryHTML() {
        let html = '<p>📋 Collection Progress:</p>';
        for (let key in goals) {
            const g = goals[key];
            const percent = Math.floor((g.current / g.target) * 100);
            html += `<p>${g.emoji} ${g.name}: ${g.current}/${g.target} (${percent}%)</p>`;
        }
        html += `<p>❤️ Hope Remaining: ${Math.max(0, hope)}%</p>`;
        return html;
    }
    
    // Spawn objects
    function spawnObject() {
        const isGood = Math.random() < 0.6; // 60% chance good, 40% bad
        
        let object;
        if (isGood) {
            const goodType = goodTypes[Math.floor(Math.random() * goodTypes.length)];
            object = {
                x: Math.random() * (W - 40) + 20,
                y: -20,
                type: "good",
                subtype: goodType.id,
                emoji: goodType.emoji,
                value: goodType.value,
                width: 28,
                height: 28,
                speed: 2.2 + Math.random() * 1.2
            };
        } else {
            const badType = badTypes[Math.floor(Math.random() * badTypes.length)];
            object = {
                x: Math.random() * (W - 40) + 20,
                y: -20,
                type: "bad",
                emoji: badType.emoji,
                penalty: badType.penalty,
                width: 28,
                height: 28,
                speed: 2.2 + Math.random() * 1.2
            };
        }
        fallingObjects.push(object);
    }
    
    // Check collection
    function checkCollections() {
        const playerLeft = playerX - playerWidth/2;
        const playerRight = playerX + playerWidth/2;
        
        for (let i = 0; i < fallingObjects.length; i++) {
            const obj = fallingObjects[i];
            const objLeft = obj.x - obj.width/2;
            const objRight = obj.x + obj.width/2;
            const objBottom = obj.y + obj.height/2;
            
            // Collision detection
            if (objBottom >= playerY && obj.y <= playerY + playerHeight &&
                objRight > playerLeft && objLeft < playerRight) {
                
                if (obj.type === "good") {
                    // Check if this item type is already completed
                    if (goals[obj.subtype].current < goals[obj.subtype].target) {
                        goals[obj.subtype].current++;
                        hope = Math.min(maxHope, hope + obj.value);
                        showMessage(`+${obj.value} ❤️ ${goals[obj.subtype].emoji}`, true);
                        addHeart(obj.x, obj.y);
                        
                        // Add bonus time
                        timeLeft = Math.min(90, timeLeft + 2);
                        
                        // Check if completed this type
                        if (goals[obj.subtype].current === goals[obj.subtype].target) {
                            showMessage(`✨ Completed: ${goals[obj.subtype].name}! ✨`, true);
                            // Visual effect - flash
                            flashScreen();
                        }
                    } else {
                        // Already completed, just give hope but no progress
                        hope = Math.min(maxHope, hope + 5);
                        showMessage(`+5 ❤️ (already collected)`, true);
                        addHeart(obj.x, obj.y);
                        timeLeft = Math.min(90, timeLeft + 1);
                    }
                    
                    fallingObjects.splice(i, 1);
                    i--;
                    
                    // Check win condition
                    if (checkAllCollectionsComplete() && hope > 0 && gameRunning) {
                        endGame(true);
                        return;
                    }
                } 
                else if (obj.type === "bad") {
                    hope -= obj.penalty;
                    showMessage(`-${obj.penalty} ❤️ Avoid ${obj.emoji}!`, false);
                    flashScreen();
                    fallingObjects.splice(i, 1);
                    i--;
                    
                    // Time penalty
                    timeLeft = Math.max(0, timeLeft - 3);
                    
                    if (hope <= 0) {
                        endGame(false, "hope");
                        return;
                    }
                    if (timeLeft <= 0) {
                        endGame(false, "time");
                        return;
                    }
                }
            }
        }
    }
    
    // Update game logic
    function updateGame() {
        if (!gameRunning) return;
        
        // Update timer
        if (frameCounter % 60 === 0 && gameRunning) { // roughly every second at 60fps
            timeLeft -= 1;
            if (timeLeft <= 0) {
                endGame(false, "time");
                return;
            }
        }
        
        // Update falling objects
        for (let i = 0; i < fallingObjects.length; i++) {
            fallingObjects[i].y += fallingObjects[i].speed;
            // Remove if off screen
            if (fallingObjects[i].y > H + 50) {
                fallingObjects.splice(i, 1);
                i--;
            }
        }
        
        // Spawn objects
        if (frameCounter % spawnDelay === 0 && gameRunning) {
            spawnObject();
        }
        
        // Check collections
        checkCollections();
        
        // Update hearts effect
        for (let i = 0; i < hearts.length; i++) {
            hearts[i].life--;
            hearts[i].y -= 0.8;
            if (hearts[i].life <= 0) {
                hearts.splice(i, 1);
                i--;
            }
        }
        
        // Update screen flash
        if (screenFlash > 0) screenFlash--;
        
        // Update messages
        for (let i = 0; i < messageQueue.length; i++) {
            messageQueue[i].life--;
            if (messageQueue[i].life <= 0) {
                messageQueue.splice(i, 1);
                i--;
            }
        }
        
        frameCounter++;
    }
    
    // Drawing functions
    function draw() {
        ctx.clearRect(0, 0, W, H);
        
        // Background gradient (somber but hopeful)
        const gradient = ctx.createLinearGradient(0, 0, 0, H);
        gradient.addColorStop(0, "#2d3e3b");
        gradient.addColorStop(1, "#1e2e2c");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);
        
        // Ground/shadows
        ctx.fillStyle = "#4a3b2c";
        ctx.fillRect(0, H - 55, W, 55);
        ctx.fillStyle = "#5e4b38";
        for (let i = 0; i < 15; i++) {
            ctx.fillRect(i * 55, H - 58, 30, 6);
        }
        
        // Draw falling objects
        for (let obj of fallingObjects) {
            ctx.font = `${obj.width + 4}px "Segoe UI Emoji"`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowBlur = 4;
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.fillText(obj.emoji, obj.x, obj.y);
        }
        ctx.shadowBlur = 0;
        
        // Draw player (silhouette child with hope glow)
        ctx.save();
        if (hope > 70) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = "#f3bc7c";
        }
        ctx.fillStyle = "#2c423f";
        ctx.beginPath();
        ctx.ellipse(playerX, playerY - 12, 14, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3e605a";
        ctx.fillRect(playerX - 12, playerY - 8, 24, 18);
        // Face
        ctx.fillStyle = "#f0dbc0";
        ctx.beginPath();
        ctx.arc(playerX - 5, playerY - 18, 2.5, 0, Math.PI * 2);
        ctx.arc(playerX + 5, playerY - 18, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#5c4533";
        ctx.beginPath();
        ctx.arc(playerX, playerY - 12, 4, 0.1, Math.PI - 0.1);
        ctx.fill();
        // Hope aura
        if (hope > 50) {
            ctx.beginPath();
            ctx.ellipse(playerX, playerY - 12, 22, 26, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(243, 188, 124, 0.15)";
            ctx.fill();
        }
        ctx.restore();
        
        // Draw hearts effect
        for (let heart of hearts) {
            ctx.font = "18px 'Segoe UI Emoji'";
            ctx.textAlign = "center";
            ctx.fillStyle = `rgba(255, 120, 120, ${heart.life / 30})`;
            ctx.fillText("❤️", heart.x, heart.y);
        }
        
        // UI Panel - Hope Meter
        ctx.fillStyle = "#2e2a24";
        ctx.fillRect(15, 15, 210, 22);
        const hopePercent = hope / maxHope;
        const hopeGradient = ctx.createLinearGradient(15, 15, 15 + 210 * hopePercent, 15);
        hopeGradient.addColorStop(0, "#d95b5b");
        hopeGradient.addColorStop(1, "#e0ac6c");
        ctx.fillStyle = hopeGradient;
        ctx.fillRect(15, 15, 210 * hopePercent, 22);
        ctx.strokeStyle = "#ecc48b";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(15, 15, 210, 22);
        ctx.fillStyle = "#f7e5c2";
        ctx.font = "bold 12px monospace";
        ctx.fillText("❤️ HOPE", 20, 33);
        
        // Timer
        ctx.fillStyle = "#f7e5c2";
        ctx.font = "bold 16px monospace";
        ctx.fillText(`⏱️ ${Math.floor(timeLeft)}s`, W - 85, 34);
        
        // Collections progress
        ctx.font = "12px monospace";
        ctx.fillStyle = "#cfc5aa";
        ctx.fillText("COLLECTIONS:", 15, 65);
        
        let yOffset = 85;
        let allComplete = true;
        for (let key in goals) {
            const g = goals[key];
            const isComplete = g.current >= g.target;
            if (!isComplete) allComplete = false;
            ctx.fillStyle = isComplete ? "#8fc97f" : "#e6d5b3";
            ctx.font = "11px monospace";
            ctx.fillText(`${g.emoji} ${g.current}/${g.target}`, 20, yOffset);
            yOffset += 20;
        }
        
        // Special message when all complete
        if (allComplete && gameRunning) {
            ctx.font = "bold 14px monospace";
            ctx.fillStyle = "#f3bc7c";
            ctx.fillText("✨ All items collected! ✨", W/2 - 100, 45);
        }
        
        // Floating messages
        for (let i = 0; i < messageQueue.length; i++) {
            const msg = messageQueue[i];
            ctx.font = "bold 14px monospace";
            ctx.fillStyle = msg.isGood ? "#cbea9e" : "#ffb47b";
            ctx.shadowBlur = 3;
            ctx.fillText(msg.text, W/2 - 70, H - 100 - i * 22);
        }
        ctx.shadowBlur = 0;
        
        // Screen flash effect
        if (screenFlash > 0) {
            ctx.fillStyle = `rgba(255, 200, 150, ${screenFlash / 15})`;
            ctx.fillRect(0, 0, W, H);
        }
    }
    
    // Animation loop
    function animate() {
        if (gameRunning) {
            updateGame();
        }
        draw();
        gameLoopId = requestAnimationFrame(animate);
    }
    
    // Mouse/Touch tracking
    function handleMove(clientX) {
        if (!gameRunning) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        let canvasX = (clientX - rect.left) * scaleX;
        canvasX = Math.min(Math.max(canvasX, playerWidth/2 + 5), W - playerWidth/2 - 5);
        playerX = canvasX;
    }
    
    // Event listeners for mouse and touch
    function setupControls() {
        canvas.addEventListener('mousemove', (e) => {
            if (e.buttons === 1 || isDragging) {
                handleMove(e.clientX);
            }
        });
        
        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            handleMove(e.clientX);
        });
        
        window.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleMove(touch.clientX);
        });
        
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleMove(touch.clientX);
        });
    }
    
    // Reset game
    function resetGame() {
        gameRunning = false;
        
        // Reset goals
        for (let key in goals) {
            goals[key].current = 0;
        }
        
        hope = 100;
        timeLeft = 60;
        fallingObjects = [];
        hearts = [];
        messageQueue = [];
        frameCounter = 0;
        playerX = W / 2;
        screenFlash = 0;
        gameWin = false;
        
        if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
        }
    }
    
    // Start game
    function startGame() {
        resetGame();
        gameRunning = true;
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        winScreen.style.display = 'none';
        
        if (gameLoopId) {
            cancelAnimationFrame(gameLoopId);
        }
        animate();
    }
    
    // Initialize
    function init() {
        setupControls();
        
        startBtn.addEventListener('click', startGame);
        restartBtn.addEventListener('click', startGame);
        playAgainBtn.addEventListener('click', startGame);
        
        // Initial draw
        draw();
    }
    
    init();
})();
