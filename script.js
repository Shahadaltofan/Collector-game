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
    con            const winSummary = document.getElementById('winCollectionsSummary');
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
        if (isGood) {
            const goodType = goodTypes[Math.floor(Math.random() * goodTypes.length)];
            object = {
                x: Math.random() * (W - 110) + 55,
                y: -45,
                type: "good",
                subtype: goodType.id,
                emoji: goodType.emoji,
                value: goodType.value,
                width: 55,
                height: 55,
                speed: 2.8 + Math.random() * 1.6
            };
        } else {
            const badType = badTypes[Math.floor(Math.random() * badTypes.length)];
            object = {
                x: Math.random() * (W - 110) + 55,
                y: -45,
                type: "bad",
                emoji: badType.emoji,
                penalty: badType.penalty,
                width: 55,
                height: 55,
                speed: 2.8 + Math.random() * 1.6
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
                        showMessage(`+${obj.value} ❤️`, true);
                        addHeart(obj.x, obj.y);
                        timeLeft = Math.min(90, timeLeft + 1);
                        
                        if (goals[obj.subtype].current === goals[obj.subtype].target) {
                            showMessage(`✨ Completed: ${goals[obj.subtype].name}! ✨`, true);
                            flashScreen();
                        }
                    } else {
                        hope = Math.min(maxHope, hope + 3);
                        showMessage(`+3 ❤️ (extra)`, true);
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
                    showMessage(`-${obj.penalty} ❤️ Avoid ${obj.emoji}!`, false);
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
        
        if (frameCounter % 60 === 0) {
            timeLeft -= 1;
            if (timeLeft <= 0) {
                endGame(false, "time");
                return;
            }
        }
        
        for (let i = 0; i < fallingObjects.length; i++) {
            fallingObjects[i].y += fallingObjects[i].speed;
            if (fallingObjects[i].y > H + 100) {
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
            hearts[i].y -= 1.2;
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
    }
    
    function draw() {
        ctx.clearRect(0, 0, W, H);
        
        // Background
        const gradient = ctx.createLinearGradient(0, 0, 0, H);
        gradient.addColorStop(0, "#2d3e3b");
        gradient.addColorStop(1, "#1e2e2c");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);
        
        // Ground
        ctx.fillStyle = "#4a3b2c";
        ctx.fillRect(0, H - 85, W, 85);
        ctx.fillStyle = "#5e4b38";
        for (let i = 0; i < 30; i++) {
            ctx.fillRect(i * 38, H - 88, 32, 10);
        }
        
        // Draw falling objects
        for (let obj of fallingObjects) {
            ctx.font = `58px "Segoe UI Emoji"`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowBlur = 6;
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.fillText(obj.emoji, obj.x, obj.y);
        }
        ctx.shadowBlur = 0;
        
        // Draw player
        ctx.save();
        if (hope > 70) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#f3bc7c";
        }
        // Body
        ctx.fillStyle = "#2c423f";
        ctx.beginPath();
        ctx.ellipse(playerX, playerY - 22, 26, 34, 0, 0, Math.PI * 2);
        ctx.fill();
        // Shirt
        ctx.fillStyle = "#3e605a";
        ctx.fillRect(playerX - 24, playerY - 12, 48, 32);
        // Head
        ctx.fillStyle = "#f0dbc0";
        ctx.beginPath();
        ctx.ellipse(playerX, playerY - 40, 22, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = "#5c4533";
        ctx.beginPath();
        ctx.arc(playerX - 9, playerY - 48, 4, 0, Math.PI * 2);
        ctx.arc(playerX + 9, playerY - 48, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(playerX - 10, playerY - 50, 1.5, 0, Math.PI * 2);
        ctx.arc(playerX + 8, playerY - 50, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Smile
        ctx.beginPath();
        ctx.arc(playerX, playerY - 38, 10, 0.1, Math.PI - 0.1);
        ctx.fill();
        // Hair
        ctx.fillStyle = "#5c4533";
        ctx.fillRect(playerX - 20, playerY - 66, 40, 14);
        // Hope aura
        if (hope > 50) {
            ctx.beginPath();
            ctx.ellipse(playerX, playerY - 32, 44, 52, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(243, 188, 124, 0.2)";
            ctx.fill();
        }
        ctx.restore();
        
        // Draw hearts effect
        for (let heart of hearts) {
            ctx.font = "26px 'Segoe UI Emoji'";
            ctx.textAlign = "center";
            ctx.fillStyle = `rgba(255, 100, 100, ${heart.life / 30})`;
            ctx.fillText("❤️", heart.x, heart.y);
        }
        
        // ========== COMPACT TOP UI - SMALLER SIZE ==========
        
        // Hope Meter - SMALLER (height reduced)
        ctx.fillStyle = "#2e2a24";
        ctx.fillRect(12, 8, 280, 28);
        const hopePercent = hope / maxHope;
        const hopeGradient = ctx.createLinearGradient(12, 8, 12 + 280 * hopePercent, 8);
        hopeGradient.addColorStop(0, "#d95b5b");
        hopeGradient.addColorStop(1, "#e0ac6c");
        ctx.fillStyle = hopeGradient;
        ctx.fillRect(12, 8, 280 * hopePercent, 28);
        ctx.strokeStyle = "#ecc48b";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(12, 8, 280, 28);
        
        // Heart emoji inside bar - SMALLER
        ctx.font = "20px 'Segoe UI Emoji'";
        ctx.fillStyle = "#ffcccc";
        ctx.fillText("❤️", 20, 28);
        ctx.font = "bold 12px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("HOPE", 44, 28);
        ctx.font = "bold 16px monospace";
        ctx.fillStyle = "#ffefc0";
        ctx.fillText(`${Math.floor(hope)}%`, 260, 28);
        
        // Timer - SMALLER
        ctx.font = "bold 26px monospace";
        ctx.fillStyle = "#f7e5c2";
        ctx.fillText(`⏱️ ${Math.floor(timeLeft)}s`, W - 100, 32);
        
        // Collections - COMPACT LAYOUT
        ctx.font = "bold 12px monospace";
        ctx.fillStyle = "#ecc48b";
        ctx.fillText("📋 NEEDED:", 12, 52);
        
        // Collection Items - COMPACT (2 rows, smaller text)
        const compactItems = [
            { key: "bag", emoji: "🎒", x: 12, y: 68 },
            { key: "flower", emoji: "🌼", x: 110, y: 68 },
            { key: "toy", emoji: "🧸", x: 208, y: 68 },
            { key: "book", emoji: "📖", x: 306, y: 68 }
        ];
        
        let allComplete = true;
        
        for (let item of compactItems) {
            const g = goals[item.key];
            const isComplete = g.current >= g.target;
            if (!isComplete) allComplete = false;
            
            // Emoji
            ctx.font = "22px 'Segoe UI Emoji'";
            ctx.fillStyle = "#fff5e6";
            ctx.fillText(item.emoji, item.x, item.y + 8);
            
            // Progress
            ctx.font = "bold 13px monospace";
            ctx.fillStyle = isComplete ? "#a8e6a8" : "#f3bc7c";
            ctx.fillText(`${g.current}/${g.target}`, item.x + 28, item.y + 10);
            
            // Checkmark when complete
            if (isComplete) {
                ctx.font = "16px 'Segoe UI Emoji'";
                ctx.fillStyle = "#7cb57c";
                ctx.fillText("✅", item.x + 75, item.y + 10);
            }
        }
        
        // All complete celebration message
        if (allComplete && gameRunning) {
            ctx.font = "bold 22px monospace";
            ctx.fillStyle = "#f3bc7c";
            ctx.shadowBlur = 6;
            ctx.fillText("✨ VICTORY! ✨", W/2 - 70, H - 50);
            ctx.shadowBlur = 0;
        }
        
        // Floating action messages
        for (let i = 0; i < messageQueue.length; i++) {
            const msg = messageQueue[i];
            ctx.font = "bold 18px monospace";
            ctx.fillStyle = msg.isGood ? "#cbea9e" : "#ffb47b";
            ctx.shadowBlur = 3;
            ctx.fillText(msg.text, W/2 - 60, H - 110 - i * 38);
        }
        ctx.shadowBlur = 0;
        
        // Screen flash effect
        if (screenFlash > 0) {
            ctx.fillStyle = `rgba(255, 200, 150, ${screenFlash / 15})`;
            ctx.fillRect(0, 0, W, H);
        }
        
        // Simple instruction
        ctx.font = "10px monospace";
        ctx.fillStyle = "#8a9e95";
        ctx.fillText("← drag to move →", W/2 - 60, H - 12);
    }
    
    function animate() {
        if (gameRunning) {
            updateGame();
        }
        draw();
        gameLoopId = requestAnimationFrame(animate);
    }
    
    function handleMove(clientX) {
        if (!gameRunning) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        let canvasX = (clientX - rect.left) * scaleX;
        canvasX = Math.min(Math.max(canvasX, playerWidth/2 + 15), W - playerWidth/2 - 15);
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
        gameRunning = false;
        
        for (let key in goals) {
            goals[key].current = 0;
        }
        
        hope = 100;
        timeLeft = 50;
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
    
    function init() {
        setupControls();
        
        startBtn.addEventListener('click', startGame);
        restartBtn.addEventListener('click', startGame);
        playAgainBtn.addEventListener('click', startGame);
        
        draw();
    }
    
    init();
})();            const winSummary = document.getElementById('winCollectionsSummary');
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
        if (isGood) {
            const goodType = goodTypes[Math.floor(Math.random() * goodTypes.length)];
            object = {
                x: Math.random() * (W - 110) + 55,
                y: -45,
                type: "good",
                subtype: goodType.id,
                emoji: goodType.emoji,
                value: goodType.value,
                width: 55,
                height: 55,
                speed: 2.8 + Math.random() * 1.6
            };
        } else {
            const badType = badTypes[Math.floor(Math.random() * badTypes.length)];
            object = {
                x: Math.random() * (W - 110) + 55,
                y: -45,
                type: "bad",
                emoji: badType.emoji,
                penalty: badType.penalty,
                width: 55,
                height: 55,
                speed: 2.8 + Math.random() * 1.6
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
                        showMessage(`+${obj.value} ❤️`, true);
                        addHeart(obj.x, obj.y);
                        timeLeft = Math.min(90, timeLeft + 1);
                        
                        if (goals[obj.subtype].current === goals[obj.subtype].target) {
                            showMessage(`✨ Completed: ${goals[obj.subtype].name}! ✨`, true);
                            flashScreen();
                        }
                    } else {
                        hope = Math.min(maxHope, hope + 3);
                        showMessage(`+3 ❤️ (extra)`, true);
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
                    showMessage(`-${obj.penalty} ❤️ Avoid ${obj.emoji}!`, false);
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
        
        if (frameCounter % 60 === 0) {
            timeLeft -= 1;
            if (timeLeft <= 0) {
                endGame(false, "time");
                return;
            }
        }
        
        for (let i = 0; i < fallingObjects.length; i++) {
            fallingObjects[i].y += fallingObjects[i].speed;
            if (fallingObjects[i].y > H + 100) {
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
            hearts[i].y -= 1.2;
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
    }
    
    function draw() {
        ctx.clearRect(0, 0, W, H);
        
        // Background
        const gradient = ctx.createLinearGradient(0, 0, 0, H);
        gradient.addColorStop(0, "#2d3e3b");
        gradient.addColorStop(1, "#1e2e2c");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);
        
        // Ground
        ctx.fillStyle = "#4a3b2c";
        ctx.fillRect(0, H - 85, W, 85);
        ctx.fillStyle = "#5e4b38";
        for (let i = 0; i < 30; i++) {
            ctx.fillRect(i * 38, H - 88, 32, 10);
        }
        
        // Draw falling objects
        for (let obj of fallingObjects) {
            ctx.font = `58px "Segoe UI Emoji"`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowBlur = 6;
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.fillText(obj.emoji, obj.x, obj.y);
        }
        ctx.shadowBlur = 0;
        
        // Draw player
        ctx.save();
        if (hope > 70) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#f3bc7c";
        }
        // Body
        ctx.fillStyle = "#2c423f";
        ctx.beginPath();
        ctx.ellipse(playerX, playerY - 22, 26, 34, 0, 0, Math.PI * 2);
        ctx.fill();
        // Shirt
        ctx.fillStyle = "#3e605a";
        ctx.fillRect(playerX - 24, playerY - 12, 48, 32);
        // Head
        ctx.fillStyle = "#f0dbc0";
        ctx.beginPath();
        ctx.ellipse(playerX, playerY - 40, 22, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = "#5c4533";
        ctx.beginPath();
        ctx.arc(playerX - 9, playerY - 48, 4, 0, Math.PI * 2);
        ctx.arc(playerX + 9, playerY - 48, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(playerX - 10, playerY - 50, 1.5, 0, Math.PI * 2);
        ctx.arc(playerX + 8, playerY - 50, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // Smile
        ctx.beginPath();
        ctx.arc(playerX, playerY - 38, 10, 0.1, Math.PI - 0.1);
        ctx.fill();
        // Hair
        ctx.fillStyle = "#5c4533";
        ctx.fillRect(playerX - 20, playerY - 66, 40, 14);
        // Hope aura
        if (hope > 50) {
            ctx.beginPath();
            ctx.ellipse(playerX, playerY - 32, 44, 52, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(243, 188, 124, 0.2)";
            ctx.fill();
        }
        ctx.restore();
        
        // Draw hearts effect
        for (let heart of hearts) {
            ctx.font = "26px 'Segoe UI Emoji'";
            ctx.textAlign = "center";
            ctx.fillStyle = `rgba(255, 100, 100, ${heart.life / 30})`;
            ctx.fillText("❤️", heart.x, heart.y);
        }
        
        // ========== COMPACT TOP UI - SMALLER SIZE ==========
        
        // Hope Meter - SMALLER (height reduced)
        ctx.fillStyle = "#2e2a24";
        ctx.fillRect(12, 8, 280, 28);
        const hopePercent = hope / maxHope;
        const hopeGradient = ctx.createLinearGradient(12, 8, 12 + 280 * hopePercent, 8);
        hopeGradient.addColorStop(0, "#d95b5b");
        hopeGradient.addColorStop(1, "#e0ac6c");
        ctx.fillStyle = hopeGradient;
        ctx.fillRect(12, 8, 280 * hopePercent, 28);
        ctx.strokeStyle = "#ecc48b";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(12, 8, 280, 28);
        
        // Heart emoji inside bar - SMALLER
        ctx.font = "20px 'Segoe UI Emoji'";
        ctx.fillStyle = "#ffcccc";
        ctx.fillText("❤️", 20, 28);
        ctx.font = "bold 12px monospace";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("HOPE", 44, 28);
        ctx.font = "bold 16px monospace";
        ctx.fillStyle = "#ffefc0";
        ctx.fillText(`${Math.floor(hope)}%`, 260, 28);
        
        // Timer - SMALLER
        ctx.font = "bold 26px monospace";
        ctx.fillStyle = "#f7e5c2";
        ctx.fillText(`⏱️ ${Math.floor(timeLeft)}s`, W - 100, 32);
        
        // Collections - COMPACT LAYOUT
        ctx.font = "bold 12px monospace";
        ctx.fillStyle = "#ecc48b";
        ctx.fillText("📋 NEEDED:", 12, 52);
        
        // Collection Items - COMPACT (2 rows, smaller text)
        const compactItems = [
            { key: "bag", emoji: "🎒", x: 12, y: 68 },
            { key: "flower", emoji: "🌼", x: 110, y: 68 },
            { key: "toy", emoji: "🧸", x: 208, y: 68 },
            { key: "book", emoji: "📖", x: 306, y: 68 }
        ];
        
        let allComplete = true;
        
        for (let item of compactItems) {
            const g = goals[item.key];
            const isComplete = g.current >= g.target;
            if (!isComplete) allComplete = false;
            
            // Emoji
            ctx.font = "22px 'Segoe UI Emoji'";
            ctx.fillStyle = "#fff5e6";
            ctx.fillText(item.emoji, item.x, item.y + 8);
            
            // Progress
            ctx.font = "bold 13px monospace";
            ctx.fillStyle = isComplete ? "#a8e6a8" : "#f3bc7c";
            ctx.fillText(`${g.current}/${g.target}`, item.x + 28, item.y + 10);
            
            // Checkmark when complete
            if (isComplete) {
                ctx.font = "16px 'Segoe UI Emoji'";
                ctx.fillStyle = "#7cb57c";
                ctx.fillText("✅", item.x + 75, item.y + 10);
            }
        }
        
        // All complete celebration message
        if (allComplete && gameRunning) {
            ctx.font = "bold 22px monospace";
            ctx.fillStyle = "#f3bc7c";
            ctx.shadowBlur = 6;
            ctx.fillText("✨ VICTORY! ✨", W/2 - 70, H - 50);
            ctx.shadowBlur = 0;
        }
        
        // Floating action messages
        for (let i = 0; i < messageQueue.length; i++) {
            const msg = messageQueue[i];
            ctx.font = "bold 18px monospace";
            ctx.fillStyle = msg.isGood ? "#cbea9e" : "#ffb47b";
            ctx.shadowBlur = 3;
            ctx.fillText(msg.text, W/2 - 60, H - 110 - i * 38);
        }
        ctx.shadowBlur = 0;
        
        // Screen flash effect
        if (screenFlash > 0) {
            ctx.fillStyle = `rgba(255, 200, 150, ${screenFlash / 15})`;
            ctx.fillRect(0, 0, W, H);
        }
        
        // Simple instruction
        ctx.font = "10px monospace";
        ctx.fillStyle = "#8a9e95";
        ctx.fillText("← drag to move →", W/2 - 60, H - 12);
    }
    
    function animate() {
        if (gameRunning) {
            updateGame();
        }
        draw();
        gameLoopId = requestAnimationFrame(animate);
    }
    
    function handleMove(clientX) {
        if (!gameRunning) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        let canvasX = (clientX - rect.left) * scaleX;
        canvasX = Math.min(Math.max(canvasX, playerWidth/2 + 15), W - playerWidth/2 - 15);
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
        gameRunning = false;
        
        for (let key in goals) {
            goals[key].current = 0;
        }
        
        hope = 100;
        timeLeft = 50;
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
    
    function init() {
        setupControls();
        
        startBtn.addEventListener('click', startGame);
        restartBtn.addEventListener('click', startGame);
        playAgainBtn.addEventListener('click', startGame);
        
        draw();
    }
    
    init();
})();
