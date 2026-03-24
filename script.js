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
    con
