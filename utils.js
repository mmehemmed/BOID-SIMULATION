// Global canvas and context setup
const CANVAS = document.getElementById("canvas");
const ctx = CANVAS.getContext("2d");
CANVAS.width = 1500;  // Set canvas width
CANVAS.height = 800;  // Set canvas height

// Pause state variable
let isPaused = false;
// Mouse position tracking variables
let touchX = 0;
let touchY = 0;

// For detecting mouse position
CANVAS.addEventListener("mousemove", function (e) {
    getMousePos(CANVAS, e);  // Update touch position on mouse move
});
// Toggle pause/resume when "p" is pressed
window.addEventListener("keydown", function (e) {
    if (e.key === "p" || e.key === "P") {  // Check for both lowercase and uppercase 'p'
        isPaused = !isPaused;
        console.log(isPaused ? "Paused" : "Resumed");  // Debugging log to confirm state change
    }
});

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    touchX = evt.clientX - rect.left;
    touchY = evt.clientY - rect.top;
}

// Sea update (background)
function updateSea() {
    ctx.fillStyle = "#16a4c4";
    ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);  // Clear the canvas with a background color
}
class Boid {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = Math.random() * 3 - 1;
        this.vy = Math.random() * 2 - 1;
        this.ax = 0;
        this.ay = 0;
        this.rot = Math.atan2(this.vy, this.vx);
        this.maxVelocity = 15;
        this.maxAcceleration = 0.2;
        this.decelerationFactor = 0.1;
        this.size = 10; // Perception radius size
        this.personalSpace = 30; // Personal space for separation
        this.alignmentRadius = 100; // Radius to consider for alignment
    }

    update() {
        // Update position based on velocity
        this.x += this.vx;
        this.y += this.vy;
        this.rot = Math.atan2(this.vy, this.vx);

        // Apply acceleration to velocity
        this.vx += this.ax;
        this.vy += this.ay;

        // Apply friction
        this.applyFriction();

        // Limit velocity
        this.limitVelocity();

        // Wrap around edges
        this.x = (this.x + CANVAS.width) % CANVAS.width;
        this.y = (this.y + CANVAS.height) % CANVAS.height;

        this.draw();
    }

    applyFriction() {
        let friction = 0.98;
        this.vx *= friction;
        this.vy *= friction;
    }

    limitVelocity() {
        let speed = Math.sqrt(this.vx ** 2 + this.vy ** 2);
        if (speed > this.maxVelocity) {
            let scale = this.maxVelocity / speed;
            this.vx *= scale;
            this.vy *= scale;
        }
    }

    draw() {
        const a = 12;
        const c = 5;
        const halfC = c / 2;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);

        const path = new Path2D();
        path.moveTo(a, 0);
        path.lineTo(-halfC, -halfC);
        path.lineTo(-halfC, halfC);
        path.closePath();

        ctx.fillStyle = "#353d37";
        ctx.fill(path);
        ctx.restore();
    }

    // Move towards the target (mouse)
    moveTowards(x, y) {
        let dx = x - this.x;
        let dy = y - this.y;
        let dist = Math.sqrt(dx ** 2 + dy ** 2);

        if (dist > 0) {
            let dirX = dx / dist;
            let dirY = dy / dist;

            let deceleration = Math.max(this.decelerationFactor * dist, 0.1);
            let targetAx = dirX * deceleration;
            let targetAy = dirY * deceleration;

            let accelerationMagnitude = Math.sqrt(targetAx ** 2 + targetAy ** 2);
            if (accelerationMagnitude > this.maxAcceleration) {
                let scale = this.maxAcceleration / accelerationMagnitude;
                targetAx *= scale;
                targetAy *= scale;
            }

            return { x: targetAx, y: targetAy }; // Return move towards acceleration
        }
        return { x: 0, y: 0 }; // If no movement, return no force
    }

    // Cohesion: Move towards the average position of nearby boids
    cohesion(nearbyBoids) {
        let avgX = 0, avgY = 0;
        let count = 0;

        for (let boid of nearbyBoids) {
            avgX += boid.x;
            avgY += boid.y;
            count++;
        }

        if (count > 0) {
            avgX /= count;
            avgY /= count;

            let dx = avgX - this.x;
            let dy = avgY - this.y;
            let dist = Math.sqrt(dx ** 2 + dy ** 2);

            let dirX = dx / dist;
            let dirY = dy / dist;

            let deceleration = Math.max(this.decelerationFactor * dist, 0.1);
            let targetAx = dirX * deceleration;
            let targetAy = dirY * deceleration;

            let accelerationMagnitude = Math.sqrt(targetAx ** 2 + targetAy ** 2);
            if (accelerationMagnitude > this.maxAcceleration) {
                let scale = this.maxAcceleration / accelerationMagnitude;
                targetAx *= scale;
                targetAy *= scale;
            }

            return { x: targetAx, y: targetAy }; // Return cohesion acceleration
        }
        return { x: 0, y: 0 }; // If no cohesion, return no force
    }

    // Separation: Avoid nearby boids that are too close
    separation(nearbyBoids) {
        let avoidX = 0, avoidY = 0;
        let count = 0;

        for (let boid of nearbyBoids) {
            let dx = this.x - boid.x;
            let dy = this.y - boid.y;
            let dist = Math.sqrt(dx ** 2 + dy ** 2);

            if (dist < this.personalSpace) {
                count++;
                let strength = Math.max(0, (this.personalSpace - dist) / this.personalSpace);
                avoidX += (dx / dist) * strength;
                avoidY += (dy / dist) * strength;
            }
        }

        return { x: avoidX, y: avoidY }; // Return separation acceleration
    }

    // Alignment: Align velocity with nearby boids
    alignment(nearbyBoids) {
        let avgVx = 0, avgVy = 0;
        let count = 0;

        for (let boid of nearbyBoids) {
            avgVx += boid.vx;
            avgVy += boid.vy;
            count++;
        }

        if (count > 0) {
            avgVx /= count;
            avgVy /= count;

            let dx = avgVx - this.vx;
            let dy = avgVy - this.vy;
            let dist = Math.sqrt(dx ** 2 + dy ** 2);

            let dirX = dx / dist;
            let dirY = dy / dist;

            let deceleration = Math.max(this.decelerationFactor * dist, 0.1);
            let targetAx = dirX * deceleration;
            let targetAy = dirY * deceleration;

            let accelerationMagnitude = Math.sqrt(targetAx ** 2 + targetAy ** 2);
            if (accelerationMagnitude > this.maxAcceleration) {
                let scale = this.maxAcceleration / accelerationMagnitude;
                targetAx *= scale;
                targetAy *= scale;
            }

            return { x: targetAx, y: targetAy }; // Return alignment acceleration
        }
        return { x: 0, y: 0 }; // If no alignment, return no force
    }

    // Combine all forces (moveTowards, cohesion, separation, alignment)
    applyBehaviors(nearbyBoids, targetX, targetY) {
        // Get all accelerations
        let moveTowardsForce = this.moveTowards(targetX, targetY);
        let cohesionForce = this.cohesion(nearbyBoids);
        let separationForce = this.separation(nearbyBoids);
        let alignmentForce = this.alignment(nearbyBoids);

        // Combine all forces
        this.ax = moveTowardsForce.x + cohesionForce.x + separationForce.x + alignmentForce.x;
        this.ay = moveTowardsForce.y + cohesionForce.y + separationForce.y + alignmentForce.y;
    }
}
// Grid Class to manage boids in the world grid
class Grid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.columns = Math.floor(CANVAS.width / this.cellSize);
        this.rows = Math.floor(CANVAS.height / this.cellSize);
        this.cells = Array.from({ length: this.columns * this.rows }, () => []);
    }

    getCellIndex(x, y) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        return row * this.columns + col;
    }

    addBoid(boid) {
        const index = this.getCellIndex(boid.x, boid.y);
        this.cells[index].push(boid);
    }

    getNearbyBoids(boid) {
        const nearbyBoids = [];
        const index = this.getCellIndex(boid.x, boid.y);
        const neighboringCells = [
            index, // Current cell
            index - 1, index + 1,  // Left & Right neighbors
            index - this.columns, index + this.columns,  // Above & Below neighbors
            index - this.columns - 1, index - this.columns + 1, // Diagonal neighbors
            index + this.columns - 1, index + this.columns + 1
        ];

        for (const cellIndex of neighboringCells) {
            if (this.cells[cellIndex]) {
                for (const neighbor of this.cells[cellIndex]) {
                    const dist = Math.sqrt((boid.x - neighbor.x) ** 2 + (boid.y - neighbor.y) ** 2);
                    if (dist < boid.size) {
                        nearbyBoids.push(neighbor);
                    }
                }
            }
        }

        return nearbyBoids;
    }

    clear() {
        this.cells.forEach(cell => cell.length = 0);
    }
}

// Generate pack of boids
function generatePack(number) {
    let pack = [];
    for (let i = 0; i < number; i++) {
        const boid = new Boid(Math.random() * CANVAS.width, Math.random() * CANVAS.height);
        pack.push(boid);
        grid.addBoid(boid); // Add boid to grid
    }
    return pack;
}

function updatePack(pack) {
    grid.clear();  // Clear grid before updating

    for (let boid of pack) {
        const nearbyBoids = grid.getNearbyBoids(boid);
        boid.applyBehaviors(nearbyBoids, touchX, touchY);  // Apply all behaviors
        boid.update();
        grid.addBoid(boid);  // Re-add boid after update
    }
}


// Main update function
function update() {
    if(!isPaused){
    ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);  // Clear canvas each frame
    updateSea();  // Draw the background
    updatePack(pack);  // Update boids and grid
  }
}


const grid = new Grid(50);  // Create grid with cell size of 50px
const pack = generatePack(100);  // Create a pack of 50 boids


// Using requestAnimationFrame for smoother updates
function animate() {
    update();
    requestAnimationFrame(animate);
}

animate();  // Start animation
