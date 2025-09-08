const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Constants ---
const GRAVITY = 0.7;
const FRICTION = 0.8;
const JUMP_POWER = -14;
const PLAYER_SPEED = 5;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 60;
const ATTACK_COOLDOWN = 30;
const ATTACK_RANGE = 50;
const DAMAGE = 10;

// --- Game State ---
const platforms = [
  { x: 100, y: 500, w: 600, h: 20 },
  { x: 200, y: 400, w: 120, h: 20 },
  { x: 500, y: 300, w: 120, h: 20 }
];

function makePlayer(x, color, controls) {
  return {
    x, y: 200,
    vx: 0, vy: 0,
    width: PLAYER_WIDTH, height: PLAYER_HEIGHT,
    onGround: false,
    color,
    health: 100,
    facing: 1,
    attackCooldown: 0,
    controls,
    alive: true
  }
}

const players = [
  makePlayer(150, 'red', { left: 'a', right: 'd', jump: 'w', attack: 'f' }),
  makePlayer(600, 'blue', { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', attack: 'm' })
];

const keys = {};

// --- Input ---
document.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

// --- Collision Helpers ---
function rectsCollide(a, b) {
  return (a.x < b.x + b.w && a.x + a.width > b.x &&
          a.y < b.y + b.h && a.y + a.height > b.y);
}

// --- Core Functions ---
function updatePlayer(p, idx) {
  if (!p.alive) return;

  // Movement
  if (keys[p.controls.left]) {
    p.vx = -PLAYER_SPEED;
    p.facing = -1;
  } else if (keys[p.controls.right]) {
    p.vx = PLAYER_SPEED;
    p.facing = 1;
  } else {
    p.vx *= FRICTION;
    if (Math.abs(p.vx) < 0.5) p.vx = 0;
  }

  // Jump
  if (keys[p.controls.jump] && p.onGround) {
    p.vy = JUMP_POWER;
    p.onGround = false;
  }

  // Attack
  if (keys[p.controls.attack] && p.attackCooldown === 0) {
    p.attackCooldown = ATTACK_COOLDOWN;
    // Check hit
    const opponent = players[1 - idx];
    if (opponent.alive) {
      const inRange = Math.abs(opponent.x - p.x) < ATTACK_RANGE
        && Math.abs(opponent.y - p.y) < PLAYER_HEIGHT
        && (opponent.x - p.x) * p.facing > 0;
      if (inRange) {
        opponent.health -= DAMAGE;
        if (opponent.health <= 0) {
          opponent.alive = false;
        }
        // Knockback
        opponent.vx += 10 * p.facing;
        opponent.vy = JUMP_POWER / 2;
      }
    }
  }
  if (p.attackCooldown > 0) p.attackCooldown--;

  // Physics
  p.vy += GRAVITY;
  p.x += p.vx;
  p.y += p.vy;

  // Collisions with platforms
  p.onGround = false;
  for (const plat of platforms) {
    if (rectsCollide({x: p.x, y: p.y, width: p.width, height: p.height}, plat)) {
      // Only land on top
      if (p.vy > 0 && p.y + p.height - p.vy <= plat.y) {
        p.y = plat.y - p.height;
        p.vy = 0;
        p.onGround = true;
      }
    }
  }

  // Edges of stage
  if (p.x < 0) p.x = 0;
  if (p.x + p.width > canvas.width) p.x = canvas.width - p.width;

  // Offstage = lose
  if (p.y > canvas.height) p.alive = false;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw platforms
  ctx.fillStyle = '#888';
  for (const plat of platforms) {
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
  }

  // Draw players
  for (const [i, p] of players.entries()) {
    if (p.alive) {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.width, p.height);
      // Health bar
      ctx.fillStyle = '#fff';
      ctx.fillRect(p.x, p.y - 12, p.width, 8);
      ctx.fillStyle = 'lime';
      ctx.fillRect(p.x, p.y - 12, p.width * (p.health / 100), 8);
    }
  }

  // Draw winner
  const alivePlayers = players.filter(p => p.alive);
  if (alivePlayers.length === 1) {
    ctx.font = "40px Arial";
    ctx.fillStyle = "#ff0";
    ctx.fillText(`${alivePlayers[0].color.toUpperCase()} WINS!`, 250, 250);
  } else if (alivePlayers.length === 0) {
    ctx.font = "40px Arial";
    ctx.fillStyle = "#ff0";
    ctx.fillText("DRAW!", 330, 250);
  }
}

function gameLoop() {
  for (let i = 0; i < players.length; i++) {
    updatePlayer(players[i], i);
  }
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
