const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Character Definitions ---
const CHARACTERS = [
  {
    name: "Brawler",
    color: "red",
    speed: 5,
    jumpPower: -14,
    health: 110
  },
  {
    name: "Ninja",
    color: "purple",
    speed: 7,
    jumpPower: -16,
    health: 90
  },
  {
    name: "Tank",
    color: "green",
    speed: 4,
    jumpPower: -12,
    health: 130
  },
  {
    name: "Robot",
    color: "blue",
    speed: 5.5,
    jumpPower: -13,
    health: 100
  }
];

// --- Game Constants ---
const GRAVITY = 0.7;
const FRICTION = 0.8;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 60;
const ATTACK_COOLDOWN = 30;
const ATTACK_RANGE = 50;
const DAMAGE = 10;
const MAX_JUMPS = 2;

const platforms = [
  { x: 100, y: 500, w: 600, h: 20 },
  { x: 200, y: 400, w: 120, h: 20 },
  { x: 500, y: 300, w: 120, h: 20 }
];

// --- Character Selection ---
function selectCharacter(playerName) {
  let charNames = CHARACTERS.map((c, i) => `[${i+1}] ${c.name}`).join('\n');
  let selected = prompt(`${playerName}: Choose your character by number:\n${charNames}`, "1");
  let idx = parseInt(selected, 10)-1;
  if (isNaN(idx) || idx < 0 || idx >= CHARACTERS.length) idx = 0;
  return CHARACTERS[idx];
}
const playerChar = selectCharacter("Player 1") || CHARACTERS[0];
// CPU random pick
const cpuChar = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];

function makePlayer(x, char, controls = {}, isCPU = false) {
  return {
    x, y: 200,
    vx: 0, vy: 0,
    width: PLAYER_WIDTH, height: PLAYER_HEIGHT,
    onGround: false,
    color: char.color,
    health: char.health,
    maxHealth: char.health,
    facing: 1,
    attackCooldown: 0,
    controls,
    alive: true,
    isCPU,
    speed: char.speed,
    jumpPower: char.jumpPower,
    name: char.name,
    jumpsLeft: MAX_JUMPS,
    maxJumps: MAX_JUMPS
  }
}

const players = [
  makePlayer(150, playerChar, { left: 'a', right: 'd', jump: 'w', attack: 'f' }),
  makePlayer(600, cpuChar, {}, true)
];

const keys = {};
document.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
document.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

function rectsCollide(a, b) {
  return (a.x < b.x + b.w && a.x + a.width > b.x &&
          a.y < b.y + b.h && a.y + a.height > b.y);
}

function cpuLogic(cpu, opponent) {
  if (!cpu.alive) return;

  // Move toward opponent
  if (opponent.x < cpu.x - 5) {
    cpu.vx = -cpu.speed;
    cpu.facing = -1;
  } else if (opponent.x > cpu.x + 5) {
    cpu.vx = cpu.speed;
    cpu.facing = 1;
  } else {
    cpu.vx *= FRICTION;
    if (Math.abs(cpu.vx) < 0.5) cpu.vx = 0;
  }

  // CPU jump: if opponent is above, or random, and has jumps left
  if (cpu.jumpsLeft > 0 && cpu.y > 80 && (
        (cpu.onGround && Math.random() < 0.03) ||
        (opponent.y + 30 < cpu.y && Math.random() < 0.2)
     )) {
    cpu.vy = cpu.jumpPower;
    cpu.jumpsLeft--;
    cpu.onGround = false;
  }

  // Attack if in range
  if (cpu.attackCooldown === 0) {
    const inRange = Math.abs(opponent.x - cpu.x) < ATTACK_RANGE
      && Math.abs(opponent.y - cpu.y) < PLAYER_HEIGHT
      && (opponent.x - cpu.x) * cpu.facing > 0;
    if (inRange) {
      cpu.attackCooldown = ATTACK_COOLDOWN;
      opponent.health -= DAMAGE;
      if (opponent.health <= 0) {
        opponent.alive = false;
      }
      opponent.vx += 10 * cpu.facing;
      opponent.vy = cpu.jumpPower / 2;
    }
  }
  if (cpu.attackCooldown > 0) cpu.attackCooldown--;
}

function updatePlayer(p, idx, skipInput = false) {
  if (!p.alive) return;

  if (!p.isCPU && !skipInput) {
    // Movement
    if (keys[p.controls.left]) {
      p.vx = -p.speed;
      p.facing = -1;
    } else if (keys[p.controls.right]) {
      p.vx = p.speed;
      p.facing = 1;
    } else {
      p.vx *= FRICTION;
      if (Math.abs(p.vx) < 0.5) p.vx = 0;
    }

    // Jump (double jump)
    if (keys[p.controls.jump] && p.jumpsLeft > 0 && !p._jumping) {
      p.vy = p.jumpPower;
      p.jumpsLeft--;
      p.onGround = false;
      p._jumping = true;
    }
    if (!keys[p.controls.jump]) {
      p._jumping = false;
    }

    // Attack
    if (keys[p.controls.attack] && p.attackCooldown === 0) {
      p.attackCooldown = ATTACK_COOLDOWN;
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
          opponent.vx += 10 * p.facing;
          opponent.vy = p.jumpPower / 2;
        }
      }
    }
    if (p.attackCooldown > 0) p.attackCooldown--;
  }

  p.vy += GRAVITY;
  p.x += p.vx;
  p.y += p.vy;

  // Collisions with platforms
  let wasOnGround = p.onGround;
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

  // Double jump reset
  if (p.onGround && !wasOnGround) {
    p.jumpsLeft = p.maxJumps;
  }

  // Edges of stage
  if (p.x < 0) p.x = 0;
  if (p.x + p.width > canvas.width) p.x = canvas.width - p.width;
  if (p.y > canvas.height) p.alive = false;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Platforms
  ctx.fillStyle = '#888';
  for (const plat of platforms) {
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
  }

  // Players
  for (const [i, p] of players.entries()) {
    if (p.alive) {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.width, p.height);

      // Health bar
      ctx.fillStyle = '#fff';
      ctx.fillRect(p.x, p.y - 12, p.width, 8);
      ctx.fillStyle = 'lime';
      ctx.fillRect(p.x, p.y - 12, p.width * (p.health / p.maxHealth), 8);

      // Name
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.fillText(p.name, p.x, p.y - 20);

      // Double jump circles
      for(let j=0;j<p.maxJumps;j++) {
        ctx.beginPath();
        ctx.arc(p.x+10+j*15, p.y + p.height + 8, 6, 0, 2*Math.PI);
        ctx.fillStyle = (j < p.jumpsLeft) ? 'skyblue' : '#444';
        ctx.fill();
        ctx.closePath();
      }
    }
  }

  // Winner
  const alivePlayers = players.filter(p => p.alive);
  if (alivePlayers.length === 1) {
    ctx.font = "40px Arial";
    ctx.fillStyle = "#ff0";
    ctx.fillText(`${alivePlayers[0].name.toUpperCase()} WINS!`, 220, 250);
  } else if (alivePlayers.length === 0) {
    ctx.font = "40px Arial";
    ctx.fillStyle = "#ff0";
    ctx.fillText("DRAW!", 330, 250);
  }
}

function gameLoop() {
  for (let i = 0; i < players.length; i++) {
    if (players[i].isCPU) {
      const opponent = players.find((p, idx) => idx !== i && p.alive);
      if (opponent) cpuLogic(players[i], opponent);
      updatePlayer(players[i], i, true);
    } else {
      updatePlayer(players[i], i);
    }
  }
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
