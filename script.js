(function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Enable high quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Game dimensions
    let W, H;
    let displayW, displayH;
    
    // Game state
    let gameRunning = false;
    let animationId = null;
    
    // Player
    let playerX;
    let playerWidth = 55;
    let playerHeight = 50;
    let playerY;
    
    // Objects
    let fallingObjects = [];
    
    // UI Area Height
    let uiAreaHeight = 0;
    
    // Collection goals
    const goals = {
        bag: { name: "Bag", target: 12, current: 0, emoji: "🎒", color: "#d4a373" },
        flower: { name: "Flower", target: 10, current: 0, emoji: "🌼", color: "#e9c46a" },
        toy: { name: "Toy", target: 9, current: 0, emoji: "🧸", color: "#e76f51" },
        book: { name: "Book", target: 8, current: 0, emoji: "📖", color: "#2a9d8f" }
    };
    
    // Good object types
    const goodTypes = [
        { id: "bag", emoji: "🎒", value: 12 },
        { id: "flower", emoji: "🌼", value: 12 },
        { id: "toy", emoji: "🧸", value: 12 },
        { id: "book", emoji: "📖", value: 12 }
    ];
    
    // Bad object types
    const badTypes = [
        { emoji: "💣", penalty: 18 },
        { emoji: "🔫", penalty: 18 },
        { emoji: "🪖", penalty: 18 }
    ];
    
    // Hope meter
    let hope = 100;
    const maxHope = 100;
    
    // Timer
    let timeLeft = 50;
    
    // Game status
    let messageQueue = [];
    
    // Animation
    let frameCounter = 0;
    let spawnDelay = 22;
    
    // Effects
    let hearts = [];
    let screenFlash = 0;
    let isDragging = false;
    
    // Background animation
    let cloudOffset = 0;
    
    // DOM elements
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const winScreen = document.getElementById('winScreen');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const gameOverTitle = document.getElementById('gameOverTitle');
    const gameOverMessage = document.getElementById('gameOverMessage');
    
    function resizeCanvas() {
        const maxWidth = Math.min(window.innerWidth - 30, 1000);
        const maxHeight = Math.min(window.innerHeight * 0.85, 750);
        
        displayW = maxWidth;
        displayH = maxHeight;
        
        canvas.style.width = `${displayW}px`;
        canvas.style.height = `${displayH}px`;
        
        const dpr = window.devicePixelRatio || 1;
        W = displayW * dpr;
        H = displayH * dpr;
        
        canvas.width = W;
        canvas.height = H;
        
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        playerWidth = Math.min(55, displayW * 0.07);
        playerHeight = Math.min(50, displayH * 0.07);
        playerY = displayH - playerHeight - 12;
        playerX = displayW / 2;
        
        draw();
    }
    
    function showMessage(msg, isGood = true) {
        messageQueue.push({ text: msg, isGood, life: 50 });
    }
    
    function checkAllCollectionsComplete() {
        for (let key in goals) {
            if (goals[key].current < goals[key].target) return false;
        }
        return true;
    }
    
    function addHeart(x, y) {
        hearts.push({ x: x, y: y, life: 30 });
    }
    
    function flashScreen() {
        screenFlash = 10;
    }
    
    function endGame(isWin, reason = "") {
        if (!gameRunning) return;
        gameRunning = false;
        
        if (isWin) {
            const winSummary = document.getElementById('winCollectionsSummary');
            winSummary.innerHTML = generateSummaryHTML();
            winScreen.style.display = 'flex';
        } else {
            if (reason === "hope") {
                gameOverTitle.innerHTML = "💔 HOPE FADED 💔";
                gameOverMessage.innerHTML = "The weight of war became too heavy...";
            } else if (reason === "time") {
                gameOverTitle.innerHTML = "⏱️ TIME RAN OUT ⏱️";
                gameOverMessage.innerHTML = "The journey was cut short...";
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
            html += `<p>${g.emoji} ${g.name}: ${g.current}/${g.target}</p>`;
        }
        html += `<p>❤️ Hope: ${Math.max(0, hope)}%</p>`;
        return html;
    }
    
    function spawnObject() {
        const isGood = Math.random() < 0.55;
        
        let object;
        const objectSize = Math.min(58, displayW * 0.062);
        const speed = 2.5 + Math.random() * 1.5;
        
        const spawnY = uiAreaHeight + 15;
        
        if (isGood) {
            const goodType = goodTypes[Math.floor(Math.random() * goodTypes.length)];
            object = {
                x: Math.random() * (displayW - 100) + 50,
                y: spawnY,
                type: "good",
                subtype: goodType.id,
                emoji: goodType.emoji,
                value: goodType.value,
                width: objectSize,
                height: objectSize,
                speed: speed
            };
        } else {
            const badType = badTypes[Math.floor(Math.random() * badTypes.length)];
            object = {
                x: Math.random() * (displayW - 100) + 50,
                y: spawnY,
                type: "bad",
                emoji: badType.emoji,
                penalty: badType.penalty,
                width: objectSize,
                height: objectSize,
                speed: speed
            };
        }
        fallingObjects.push(object);
    }
    
    function checkCollections() {
        const playerLeft = playerX - playerWidth/2;
        const playerRight = playerX + playerWidth/2;
        
        for (let i = 0; i < fallingObjects.length; i++) {
            const obj = fallingObjects[i];
            const objLeft = obj.x - obj.width/2;
            const objRight = obj.x + obj.width/2;
            const objBottom = obj.y + obj.height/2;
            
            if (objBottom >= playerY && obj.y <= playerY + playerHeight &&
                objRight > playerLeft && objLeft < playerRight) {
                
                if (obj.type === "good") {
                    if (goals[obj.subtype].current < goals[obj.subtype].target) {
                        goals[obj.subtype].current++;
                        hope = Math.min(maxHope, hope + obj.value);
                        showMessage(`+${obj.value}`, true);
                        addHeart(obj.x, obj.y);
                        timeLeft = Math.min(90, timeLeft + 1);
                        
                        if (goals[obj.subtype].current === goals[obj.subtype].target) {
                            showMessage(`✨ ${goals[obj.subtype].name}! ✨`, true);
                            flashScreen();
                        }
                    } else {
                        hope = Math.min(maxHope, hope + 3);
                        showMessage(`+3`, true);
                        addHeart(obj.x, obj.y);
                        timeLeft = Math.min(90, timeLeft + 0.5);
                    }
                    
                    fallingObjects.splice(i, 1);
                    i--;
                    
                    if (checkAllCollectionsComplete() && hope > 0 && gameRunning) {
                        endGame(true);
                        return;
                    }
                } 
                else if (obj.type === "bad") {
                    hope -= obj.penalty;
                    showMessage(`-${obj.penalty}`, false);
                    flashScreen();
                    fallingObjects.splice(i, 1);
                    i--;
                    timeLeft = Math.max(0, timeLeft - 4);
                    
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
    
    function updateGame() {
        if (!gameRunning) return;
        
        if (frameCounter % 60 === 0 && timeLeft > 0) {
            timeLeft -= 1;
            if (timeLeft <= 0) {
                endGame(false, "time");
                return;
            }
        }
        
        for (let i = 0; i < fallingObjects.length; i++) {
            fallingObjects[i].y += fallingObjects[i].speed;
            if (fallingObjects[i].y > displayH + 100) {
                fallingObjects.splice(i, 1);
                i--;
            }
        }
        
        if (frameCounter % spawnDelay === 0) {
            spawnObject();
        }
        
        checkCollections();
        
        for (let i = 0; i < hearts.length; i++) {
            hearts[i].life--;
            hearts[i].y -= 1;
            if (hearts[i].life <= 0) {
                hearts.splice(i, 1);
                i--;
            }
        }
        
        if (screenFlash > 0) screenFlash--;
        
        for (let i = 0; i < messageQueue.length; i++) {
            messageQueue[i].life--;
            if (messageQueue[i].life <= 0) {
                messageQueue.splice(i, 1);
                i--;
            }
        }
        
        frameCounter++;
        
        // Animate clouds
        cloudOffset = (cloudOffset + 0.2) % (displayW * 2);
    }
    
    function draw() {
        if (!ctx) return;
        ctx.clearRect(0, 0, displayW, displayH);
        
        // ========== CALM SKY BLUE BACKGROUND ==========
        // Sky gradient from light blue to deeper blue
        const skyGradient = ctx.createLinearGradient(0, 0, 0, displayH * 0.8);
        skyGradient.addColorStop(0, "#87CEEB");
        skyGradient.addColorStop(0.4, "#98D8E8");
        skyGradient.addColorStop(0.7, "#B0E0E6");
        skyGradient.addColorStop(1, "#C9E9F0");
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, displayW, displayH);
        
        // Soft clouds
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        for (let i = 0; i < 6; i++) {
            const cloudX = (cloudOffset + i * 180) % (displayW + 300) - 150;
            const cloudY = 30 + i * 45;
            ctx.beginPath();
            ctx.ellipse(cloudX, cloudY, 45, 32, 0, 0, Math.PI * 2);
            ctx.ellipse(cloudX + 35, cloudY - 8, 38, 30, 0, 0, Math.PI * 2);
            ctx.ellipse(cloudX - 35, cloudY - 5, 38, 30, 0, 0, Math.PI * 2);
            ctx.ellipse(cloudX + 55, cloudY + 5, 32, 28, 0, 0, Math.PI * 2);
            ctx.ellipse(cloudX - 55, cloudY + 2, 32, 28, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Distant hills
        ctx.fillStyle = "#8BAF8C";
        ctx.beginPath();
        ctx.moveTo(0, displayH * 0.6);
        ctx.lineTo(displayW * 0.15, displayH * 0.52);
        ctx.lineTo(displayW * 0.3, displayH * 0.58);
        ctx.lineTo(displayW * 0.45, displayH * 0.5);
        ctx.lineTo(displayW * 0.6, displayH * 0.55);
        ctx.lineTo(displayW * 0.75, displayH * 0.52);
        ctx.lineTo(displayW * 0.9, displayH * 0.58);
        ctx.lineTo(displayW, displayH * 0.55);
        ctx.lineTo(displayW, displayH * 0.7);
        ctx.lineTo(0, displayH * 0.7);
        ctx.fill();
        
        ctx.fillStyle = "#6A9C6E";
        ctx.beginPath();
        ctx.moveTo(0, displayH * 0.62);
        ctx.lineTo(displayW * 0.12, displayH * 0.56);
        ctx.lineTo(displayW * 0.28, displayH * 0.61);
        ctx.lineTo(displayW * 0.42, displayH * 0.55);
        ctx.lineTo(displayW * 0.58, displayH * 0.59);
        ctx.lineTo(displayW * 0.72, displayH * 0.57);
        ctx.lineTo(displayW * 0.88, displayH * 0.62);
        ctx.lineTo(displayW, displayH * 0.6);
        ctx.lineTo(displayW, displayH * 0.72);
        ctx.lineTo(0, displayH * 0.72);
        ctx.fill();
        
        // Ground
        const groundHeight = Math.min(55, displayH * 0.07);
        ctx.fillStyle = "#8B5A2B";
        ctx.fillRect(0, displayH - groundHeight, displayW, groundHeight);
        
        // Grass texture
        ctx.fillStyle = "#9B6A3B";
        for (let i = 0; i < displayW / 12; i++) {
            ctx.fillRect(i * 12, displayH - groundHeight - 2, 3, 6);
        }
        
        ctx.fillStyle = "#7B4A2B";
        for (let i = 0; i < displayW / 25; i++) {
            ctx.fillRect(i * 25, displayH - groundHeight - 1, 20, 3);
        }
        
        // Ground shadow
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.fillRect(0, displayH - groundHeight - 2, displayW, 2);
        
        // ========== UI AREA ==========
        const uiX = 15;
        let uiY = 8;
        
        // Timer
        ctx.font = `bold ${Math.min(28, displayW * 0.028)}px "Courier New", monospace`;
        ctx.fillStyle = "#2C3E50";
        ctx.shadowBlur = 2;
        ctx.shadowColor = "rgba(255,255,255,0.5)";
        ctx.fillText(`⏱️ ${Math.floor(timeLeft)}s`, displayW - 80, uiY + 26);
        
        // Hope Meter
        ctx.font = `bold ${Math.min(14, displayW * 0.014)}px monospace`;
        ctx.fillStyle = "#2C3E50";
        ctx.fillText("❤️ HOPE", uiX, uiY + 12);
        
        const hopeBarWidth = 150;
        const hopeBarHeight = 12;
        ctx.fillStyle = "#E0E0E0";
        ctx.fillRect(uiX, uiY + 16, hopeBarWidth, hopeBarHeight);
        
        const hopeFillWidth = (hope / maxHope) * hopeBarWidth;
        const hopeGradient = ctx.createLinearGradient(uiX, uiY + 16, uiX + hopeFillWidth, uiY + 16);
        hopeGradient.addColorStop(0, "#E67E22");
        hopeGradient.addColorStop(1, "#F39C12");
        ctx.fillStyle = hopeGradient;
        ctx.fillRect(uiX, uiY + 16, hopeFillWidth, hopeBarHeight);
        
        ctx.strokeStyle = "#2C3E50";
        ctx.lineWidth = 1;
        ctx.strokeRect(uiX, uiY + 16, hopeBarWidth, hopeBarHeight);
        
        ctx.font = `bold ${Math.min(12, displayW * 0.012)}px monospace`;
        ctx.fillStyle = "#2C3E50";
        ctx.fillText(`${Math.floor(hope)}%`, uiX + hopeBarWidth + 8, uiY + 26);
        
        // Collection Progress
        let collectionY = uiY + 42;
        
        ctx.font = `bold ${Math.min(14, displayW * 0.014)}px monospace`;
        ctx.fillStyle = "#2C3E50";
        ctx.fillText("📋", uiX, collectionY);
        collectionY += 2;
        
        const barWidth = 140;
        const barHeight = 10;
        
        for (let [key, goal] of Object.entries(goals)) {
            const percent = goal.current / goal.target;
            const fillWidth = barWidth * percent;
            
            ctx.font = `${Math.min(24, displayW * 0.024)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
            ctx.fillStyle = "#2C3E50";
            ctx.fillText(goal.emoji, uiX, collectionY + 10);
            
            ctx.font = `${Math.min(12, displayW * 0.012)}px monospace`;
            ctx.fillStyle = "#2C3E50";
            ctx.fillText(goal.name, uiX + 32, collectionY + 13);
            
            ctx.fillStyle = "#E0E0E0";
            ctx.fillRect(uiX + 90, collectionY + 2, barWidth, barHeight);
            
            if (fillWidth > 0) {
                const barGradient = ctx.createLinearGradient(uiX + 90, collectionY + 2, uiX + 90 + fillWidth, collectionY + 2);
                barGradient.addColorStop(0, goal.color);
                barGradient.addColorStop(1, "#F39C12");
                ctx.fillStyle = barGradient;
                ctx.fillRect(uiX + 90, collectionY + 2, fillWidth, barHeight);
            }
            
            ctx.strokeStyle = "#2C3E50";
            ctx.lineWidth = 0.8;
            ctx.strokeRect(uiX + 90, collectionY + 2, barWidth, barHeight);
            
            ctx.font = `bold ${Math.min(11, displayW * 0.011)}px monospace`;
            ctx.fillStyle = goal.current >= goal.target ? "#27AE60" : "#E67E22";
            ctx.fillText(`${goal.current}/${goal.target}`, uiX + 90 + barWidth + 8, collectionY + 11);
            
            collectionY += 28;
        }
        
        uiAreaHeight = collectionY + 8;
        
        // Separator
        ctx.beginPath();
        ctx.moveTo(0, uiAreaHeight - 3);
        ctx.lineTo(displayW, uiAreaHeight - 3);
        ctx.strokeStyle = "rgba(44, 62, 80, 0.3)";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // ========== GAME AREA ==========
        
        // Draw falling objects
        const objFontSize = Math.min(62, displayW * 0.066);
        
        for (let obj of fallingObjects) {
            if (obj.y + obj.height/2 > uiAreaHeight) {
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                
                // Dark outline
                ctx.shadowBlur = 0;
                ctx.font = `${objFontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
                ctx.fillStyle = "#000000";
                ctx.fillText(obj.emoji, obj.x - 2, obj.y - 2);
                ctx.fillText(obj.emoji, obj.x + 2, obj.y - 2);
                ctx.fillText(obj.emoji, obj.x - 2, obj.y + 2);
                ctx.fillText(obj.emoji, obj.x + 2, obj.y + 2);
                
                // Main solid emoji
                ctx.fillStyle = "#FFFFFF";
                ctx.fillText(obj.emoji, obj.x, obj.y);
                
                // Bold layer
                ctx.fillStyle = "#FFFFFF";
                ctx.fillText(obj.emoji, obj.x - 1, obj.y - 1);
                ctx.fillText(obj.emoji, obj.x + 1, obj.y - 1);
                ctx.fillText(obj.emoji, obj.x - 1, obj.y + 1);
                ctx.fillText(obj.emoji, obj.x + 1, obj.y + 1);
                
                // Final solid
                ctx.fillStyle = "#FFFFFF";
                ctx.fillText(obj.emoji, obj.x, obj.y);
                
                // Glow
                ctx.shadowBlur = 12;
                ctx.shadowColor = obj.type === "good" ? "rgba(243, 156, 18, 0.6)" : "rgba(231, 76, 60, 0.5)";
                ctx.fillText(obj.emoji, obj.x, obj.y);
            }
        }
        ctx.shadowBlur = 0;
        
        // Draw player
        ctx.save();
        if (hope > 70) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = "#F39C12";
        }
        const headSize = playerWidth * 0.7;
        
        ctx.fillStyle = "#2C3E50";
        ctx.beginPath();
        ctx.ellipse(playerX, playerY - headSize/2.2, playerWidth/2.5, playerHeight/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#3E5A6B";
        ctx.fillRect(playerX - playerWidth/3, playerY - headSize/3.5, playerWidth/1.5, playerHeight/2);
        
        const headGradient = ctx.createRadialGradient(playerX - 5, playerY - headSize - 5, 5, playerX, playerY - headSize, 15);
        headGradient.addColorStop(0, "#F5DEB3");
        headGradient.addColorStop(1, "#E8D4B5");
        ctx.fillStyle = headGradient;
        ctx.beginPath();
        ctx.ellipse(playerX, playerY - headSize, headSize/1.6, headSize/1.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "#5C4533";
        ctx.beginPath();
        ctx.arc(playerX - headSize/6, playerY - headSize - 2, headSize/9, 0, Math.PI * 2);
        ctx.arc(playerX + headSize/6, playerY - headSize - 2, headSize/9, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(playerX - headSize/6.5, playerY - headSize - 4, headSize/18, 0, Math.PI * 2);
        ctx.arc(playerX + headSize/6.5, playerY - headSize - 4, headSize/18, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(playerX, playerY - headSize + 3, headSize/7, 0.1, Math.PI - 0.1);
        ctx.fillStyle = "#8B694A";
        ctx.fill();
        
        ctx.fillStyle = "#5C4533";
        ctx.fillRect(playerX - headSize/3, playerY - headSize - 8, headSize/1.5, 8);
        
        if (hope > 50) {
            ctx.beginPath();
            ctx.ellipse(playerX, playerY - headSize/1.4, playerWidth/1.4, playerHeight/1.3, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(243, 156, 18, 0.2)";
            ctx.fill();
        }
        ctx.restore();
        
        // Draw hearts
        for (let heart of hearts) {
            ctx.font = `${Math.min(26, displayW * 0.026)}px "Segoe UI Emoji"`;
            ctx.textAlign = "center";
            ctx.shadowBlur = 10;
            ctx.shadowColor = "rgba(231, 76, 60, 0.6)";
            ctx.fillStyle = "#E74C3C";
            ctx.fillText("❤️", heart.x, heart.y);
        }
        ctx.shadowBlur = 0;
        
        // Victory message
        if (checkAllCollectionsComplete() && gameRunning) {
            ctx.font = `bold ${Math.min(28, displayW * 0.028)}px monospace`;
            ctx.fillStyle = "#F39C12";
            ctx.shadowBlur = 10;
            ctx.shadowColor = "rgba(0,0,0,0.3)";
            ctx.fillText("✨ VICTORY! ✨", displayW/2 - 85, displayH/2);
            ctx.shadowBlur = 0;
        }
        
        // Floating messages
        for (let i = 0; i < messageQueue.length; i++) {
            const msg = messageQueue[i];
            ctx.font = `bold ${Math.min(18, displayW * 0.018)}px monospace`;
            ctx.fillStyle = msg.isGood ? "#27AE60" : "#E67E22";
            ctx.shadowBlur = 2;
            ctx.fillText(msg.text, playerX - 25, playerY - 45 - i * 32);
        }
        ctx.shadowBlur = 0;
        
        // Screen flash
        if (screenFlash > 0) {
            ctx.fillStyle = `rgba(255, 220, 180, ${screenFlash / 12})`;
            ctx.fillRect(0, 0, displayW, displayH);
        }
    }
    
    function gameLoop() {
        if (gameRunning) {
            updateGame();
        }
        draw();
        animationId = requestAnimationFrame(gameLoop);
    }
    
    function handleMove(clientX) {
        if (!gameRunning) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = displayW / rect.width;
        let canvasX = (clientX - rect.left) * scaleX;
        canvasX = Math.min(Math.max(canvasX, playerWidth/2 + 12), displayW - playerWidth/2 - 12);
        playerX = canvasX;
    }
    
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
    
    function resetGame() {
        for (let key in goals) {
            goals[key].current = 0;
        }
        
        hope = 100;
        timeLeft = 50;
        fallingObjects = [];
        hearts = [];
        messageQueue = [];
        frameCounter = 0;
        playerX = displayW / 2;
        screenFlash = 0;
    }
    
    function startGame() {
        resetGame();
        gameRunning = true;
        
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        winScreen.style.display = 'none';
        
        playerX = displayW / 2;
    }
    
    function init() {
        resizeCanvas();
        setupControls();
        
        startBtn.addEventListener('click', startGame);
        restartBtn.addEventListener('click', startGame);
        playAgainBtn.addEventListener('click', startGame);
        
        window.addEventListener('resize', () => {
            resizeCanvas();
        });
        
        gameLoop();
    }
    
    init();
})();
