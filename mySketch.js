const block_size = 25;
const block_core = 1;
const block_move_distance = 10;
const block_move_range = 70;
const block_scale = 0.02;
const ripple_speed = 0.24;

var show_ripples = false;
var show_info = false;

var mouse_speed;
var fps, avgFps = 0;
var prevFrame = 0;
var prevTime = 0;
var fpsInterval = 1000;

var mic;
/**
 * @type {Block[][]}
 */
var blocks;

/**
 * @type {Ripple[]}
 */
var ripples = [];

function setup() {
    createCanvas(900, 900);
    noStroke();
    fill(233, 230);
    rectMode(CENTER);
    noSmooth();

    var left_padding = Math.round(width % block_size) / 2;
    var top_padding = Math.round(height % block_size) / 2;

    blocks = Array.from({ length: Math.floor(height / block_size) }, (v, y) =>
        Array.from({ length: Math.floor(width / block_size) }, (v, x) =>
            new Block(left_padding + block_size * (x + 0.5), top_padding + block_size * (y + 0.5), y * Math.floor(width / block_size) + x)
        )
    );
    // Create an Audio input
    mic = new p5.AudioIn();

    // start the Audio Input.
    // By default, it does not .connect() (to the computer speakers)
    mic.start();
}

function draw() {
    var vol = mic.getLevel();
    var soundLevel = vol * 15;
    // 读取音量
    for (var i = soundLevel % 5; i >= 0; i--) {  // 决定创造多少个圈
        // Ripple(x, y, spread_speed)
        var x = random(-width, width);
        var y = random(-height, height);
        ripples.push(new Ripple(x, y, vol));
    }
    // 结束读取音量
    if (keyIsDown(32)) {
        if (random() < pow(fps / 60, 3)) {
            ripples.push(new Ripple(random(width), random(height), 0.4));
        }
    } else {
        if (random() < pow(fps / 60, 3) / 16) {
            ripples.push(new Ripple(random(width), random(height), 0.1));
        }
    }

    fps = frameRate();

    if (millis() - prevTime > fpsInterval) {
        avgFps = (frameCount - prevFrame) / fpsInterval * 1000;
        prevFrame = frameCount;
        prevTime = millis();
    }

    mouse_speed = dist(mouseX, mouseY, pmouseX, pmouseY);

    background(100, 140);

    rectMode(CENTER);

    ripples.forEach((ripple, i) => {
        ripple.updateRadius();
        ripple.checkKill();
    });

    if (show_ripples) {
        strokeWeight(2);
        ripples.forEach((ripple, i) => {
            ripple.draw();
        })
    }

    noStroke();
    blocks.forEach((line, i) =>
        line.forEach((block, j) => {
            block.calcDiff(ripples);
            block.render();
        })
    );
    if (show_info) {
        rectMode(CORNER);
        fill(20, 200);
        rect(0, 0, 260, 110);
        fill(220);
        textFont('monospace', 16);
        text('Ripples: ' + ripples.length, 10, 24);
        text('FPS: ' + avgFps, 10, 48);
        text('Vol: ' + vol, 10, 72);
        text('SL: ' + soundLevel, 10, 96)
    }
}

//function mousePressed() {
//    ripples.push(new Ripple(mouseX, mouseY, 1));
//}

function mouseMoved() {
    if (random() < pow(fps / 60, 3) * mouse_speed / 30) {
        ripples.push(new Ripple(mouseX, mouseY, 0.15 * mouse_speed / 40));
    }
}

function mouseDragged() {
    if (random() < pow(fps / 60, 3) * mouse_speed / 20) {
        ripples.push(new Ripple(mouseX, mouseY, 0.6 * mouse_speed / 40));
    }
}

function keyPressed() {
    if (keyCode === 73) {
        show_info = !show_info;
    } else if (keyCode === 82) {
        show_ripples = !show_ripples;
    }
}


class Block {
    constructor(x, y, id) {
        this.pos = createVector(x, y);
        this.id = id;
    }

    render() {
        fill(255, cubicInOut(this.amp, 60, 240, 15));
        rect(this.pos.x + this.diff.x, this.pos.y + this.diff.y, (block_core + this.amp * block_scale) * 5, block_core + this.amp * block_scale * 0.5);
        rect(this.pos.x + this.diff.x, this.pos.y + this.diff.y, block_core + this.amp * block_scale * 0.5, (block_core + this.amp * block_scale) * 5);
    }

    /**
     * @param {Ripple[]} ripples
     */
    calcDiff(ripples) {
        this.diff = createVector(0, 0);
        this.amp = 0;

        ripples.forEach((ripple, i) => {
            if (!ripple.dists[this.id]) {
                ripple.dists[this.id] = dist(this.pos.x, this.pos.y, ripple.pos.x, ripple.pos.y);
            };
            var distance = ripple.dists[this.id] - ripple.currRadius;
            if (distance < 0 && distance > -block_move_range * 2) {
                if (!ripple.angles[this.id]) {
                    ripple.angles[this.id] = p5.Vector.sub(this.pos, ripple.pos).heading();
                };
                const angle = ripple.angles[this.id];
                const localAmp = cubicInOut(-abs(block_move_range + distance) + block_move_range, 0, block_move_distance, block_move_range) * ripple.scale;
                this.amp += localAmp;
                const movement = p5.Vector.fromAngle(angle).mult(localAmp);
                this.diff.add(movement);
            }
        });
    }

}

class Ripple {
    constructor(x, y, scale) {
        this.pos = createVector(x, y);
        this.initTime = millis();
        this.currRadius = 0;
        this.endRadius = max(dist(this.pos.x, this.pos.y, 0, 0), dist(this.pos.x, this.pos.y, 0, height), dist(this.pos.x, this.pos.y, width, 0), dist(this.pos.x, this.pos.y, height, width)) + block_move_range;
        this.scale = scale;

        this.dists = [];
        this.angles = [];
    }

    checkKill() {
        if (this.currRadius > this.endRadius) {
            ripples.splice(ripples.indexOf(this), 1);
        }
    }

    updateRadius() {
        this.currRadius = (millis() - this.initTime) * ripple_speed;
        //this.currRadius = 200;
    }

    draw() {
        stroke(255, cubicInOut(this.scale, 30, 120, 1));
        noFill();
        ellipse(this.pos.x, this.pos.y, this.currRadius * 2, this.currRadius * 2);
    }
}

function cubicInOut(t, b, c, d) {
    if (t <= 0) return b;
    else if (t >= d) return b + c;
    else {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t * t + b;
        t -= 2;
        return c / 2 * (t * t * t + 2) + b;
    }
}