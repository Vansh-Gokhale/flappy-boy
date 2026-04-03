
//board
let board;
let boardWidth = 360;
let boardHeight = 640;
let context;

//bird
let birdWidth = 68; // 34 * 2
let birdHeight = 48; // 24 * 2
let birdX = boardWidth / 8;
let birdY = boardHeight / 2;
let birdImgs = [];
let birdFrame = 0;
let birdFrameTimer = 0;

let bird = {
    x: birdX,
    y: birdY,
    width: birdWidth,
    height: birdHeight,
    angle: 0
}

//pipes
let pipeArray = [];
let pipeWidth = 64;
let pipeHeight = 512;
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

//physics
let velocityX = -1.5; // Slightly slower pipes (was -2)
let velocityY = 0; 
let gravity = 0.2; // Lower gravity (was 0.25)
let jumpStrength = -5; // Slightly weaker jump (was -6) for more control

let gameOver = false;
let gameStarted = false;
let score = 0;

//sounds
let wingSound;
let pointSound;
let hitSound;
let dieSound;
let swooshSound;
let bgm;

//crash background
let crashImg;

window.onload = function() {
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d");

    //load images
    for (let i = 0; i < 4; i++) {
        let img = new Image();
        img.src = `./flappybird${i}.png`;
        birdImgs.push(img);
    }

    topPipeImg = new Image();
    topPipeImg.src = "./toppipe.png";

    bottomPipeImg = new Image();
    bottomPipeImg.src = "./bottompipe.png";

    crashImg = new Image();
    crashImg.src = "./4th.png";

    //load sounds
    wingSound = new Audio("./sfx_wing.wav");
    pointSound = new Audio("./sfx_point.wav");
    hitSound = new Audio("./sfx_hit.wav");
    dieSound = new Audio("./sfx_die.wav");
    swooshSound = new Audio("./sfx_swooshing.wav");
    bgm = new Audio("./bgm_mario.mp3");
    bgm.loop = true;

    requestAnimationFrame(update);
    setInterval(placePipes, 2000); // Shorter interval (was 1500) makes it easier
    document.addEventListener("keydown", moveBird);
    document.addEventListener("mousedown", moveBird);
}

function update() {
    requestAnimationFrame(update);
    
    context.clearRect(0, 0, board.width, board.height);

    if (!gameStarted) {
        // Draw start screen
        drawBird();
        context.fillStyle = "white";
        context.font = "24px 'Courier New', Courier, monospace";
        context.textAlign = "center";
        context.fillText("Press Space to Start", boardWidth / 2, boardHeight / 2 + 50);
        return;
    }

    if (gameOver) {
        // Draw crash background (4th.png)
        context.globalAlpha = 0.5; // Faded background
        context.drawImage(crashImg, 0, 0, boardWidth, boardHeight);
        context.globalAlpha = 1.0;

        // Apply gravity until bird hits the bottom
        if (bird.y + bird.height < board.height) {
            velocityY += gravity;
            bird.y += velocityY;
            bird.angle = Math.min(bird.angle + 0.1, Math.PI / 2);
        }
        
        // Draw pipes (static)
        for (let i = 0; i < pipeArray.length; i++) {
            let pipe = pipeArray[i];
            context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);
        }

        drawBird();
        
        context.fillStyle = "white";
        context.textAlign = "center";
        context.font = "bold 40px 'Courier New', Courier, monospace";
        context.shadowBlur = 10;
        context.shadowColor = "black";
        context.fillText("GAME OVER", boardWidth / 2, boardHeight / 2 - 20);
        context.font = "20px 'Courier New', Courier, monospace";
        context.fillText("Score: " + Math.floor(score), boardWidth / 2, boardHeight / 2 + 30);
        context.fillText("Press Space to Restart", boardWidth / 2, boardHeight / 2 + 80);
        context.shadowBlur = 0;
        return;
    }

    //bird
    velocityY += gravity;
    bird.y = Math.max(bird.y + velocityY, 0);
    
    // bird rotation
    if (velocityY < 0) {
        bird.angle = -0.3; 
    } else {
        bird.angle = Math.min(bird.angle + 0.05, 0.5); 
    }

    // animation (cycle through first 3 images, 4th is for crash)
    birdFrameTimer++;
    if (birdFrameTimer % 10 == 0) {
        birdFrame = (birdFrame + 1) % 3;
    }

    drawBird();

    if (bird.y + bird.height > board.height) {
        triggerGameOver();
    }

    //pipes
    for (let i = 0; i < pipeArray.length; i++) {
        let pipe = pipeArray[i];
        pipe.x += velocityX;
        context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);

        if (!pipe.passed && bird.x > pipe.x + pipe.width) {
            score += 0.5; 
            if (score % 1 === 0) {
                pointSound.play();
            }
            pipe.passed = true;
        }

        if (detectCollision(bird, pipe)) {
            triggerGameOver();
        }
    }

    //clear pipes
    while (pipeArray.length > 0 && pipeArray[0].x < -pipeWidth) {
        pipeArray.shift();
    }

    //score
    context.fillStyle = "white";
    context.textAlign = "left";
    context.font = "bold 45px 'Courier New', Courier, monospace";
    context.fillText(Math.floor(score), 20, 60);
}

function drawBird() {
    context.save();
    context.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    context.rotate(bird.angle);
    context.drawImage(birdImgs[birdFrame], -bird.width / 2, -bird.height / 2, bird.width, bird.height);
    context.restore();
}

function triggerGameOver() {
    if (!gameOver) {
        gameOver = true;
        birdFrame = 3; // Set to the "crash" image
        hitSound.play();
        setTimeout(() => dieSound.play(), 300);
        bgm.pause();
        bgm.currentTime = 0;
    }
}

function placePipes() {
    if (gameOver || !gameStarted) {
        return;
    }

    let randomPipeY = pipeY - pipeHeight / 4 - Math.random() * (pipeHeight / 2);
    let openingSpace = board.height / 3; // Much larger opening (was board.height/4)

    let topPipe = {
        img: topPipeImg,
        x: pipeX,
        y: randomPipeY,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    }
    pipeArray.push(topPipe);

    let bottomPipe = {
        img: bottomPipeImg,
        x: pipeX,
        y: randomPipeY + pipeHeight + openingSpace,
        width: pipeWidth,
        height: pipeHeight,
        passed: false
    }
    pipeArray.push(bottomPipe);
}

function moveBird(e) {
    if (e.type === "mousedown" || e.code == "Space" || e.code == "ArrowUp" || e.code == "KeyX") {
        if (!gameStarted) {
            gameStarted = true;
            bgm.play().catch(e => console.log("BGM play failed:", e));
        }

        if (gameOver) {
            // Reset game
            bird.y = birdY;
            bird.angle = 0;
            birdFrame = 0;
            pipeArray = [];
            score = 0;
            gameOver = false;
            velocityY = 0;
            bgm.play().catch(e => console.log("BGM play failed:", e));
            return;
        }

        //jump
        velocityY = jumpStrength;
        wingSound.currentTime = 0;
        wingSound.play();
    }
}

function detectCollision(a, b) {
    // Shrink collision box slightly to make it even easier
    let margin = 5;
    return a.x + margin < b.x + b.width &&
           a.x + a.width - margin > b.x &&
           a.y + margin < b.y + b.height &&
           a.y + a.height - margin > b.y;
}
