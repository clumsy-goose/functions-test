(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const gameover = document.getElementById('gameover');
  const finalScoreEl = document.getElementById('finalScore');
  const restartBtn = document.getElementById('restartBtn');

  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    keys.add(e.key);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key));

  let pointerX = null;
  let pointerY = null;
  let pointerDown = false;

  function pointerPos(e) {
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  canvas.addEventListener('pointerdown', (e) => {
    const p = pointerPos(e);
    pointerX = p.x; pointerY = p.y; pointerDown = true; shoot();
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointerPos(e);
    pointerX = p.x; pointerY = p.y;
  });
  canvas.addEventListener('pointerup', () => { pointerDown = false; });

  const world = {
    width() { return canvas.clientWidth; },
    height() { return canvas.clientHeight; },
    score: 0,
    lives: 3,
    time: 0,
    gameRunning: false,
  };

  class Entity {
    constructor(x, y, w, h) {
      this.x = x; this.y = y; this.w = w; this.h = h;
      this.vx = 0; this.vy = 0; this.dead = false;
    }
    rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
    update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; }
    draw() {}
  }

  class Player extends Entity {
    constructor() {
      const w = 42, h = 48;
      super(100, world.height() - 120, w, h);
      this.speed = 300; // px/s
      this.cooldown = 0;
    }
    update(dt) {
      // keyboard movement
      let mx = 0, my = 0;
      if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) mx -= 1;
      if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) mx += 1;
      if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) my -= 1;
      if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) my += 1;

      // pointer move assistance
      if (pointerX != null && pointerY != null) {
        const dx = pointerX - (this.x + this.w / 2);
        const dy = pointerY - (this.y + this.h / 2);
        this.x += Math.sign(dx) * Math.min(Math.abs(dx), this.speed * dt);
        this.y += Math.sign(dy) * Math.min(Math.abs(dy), this.speed * dt);
      }

      this.x += mx * this.speed * dt;
      this.y += my * this.speed * dt;

      // clamp inside screen
      this.x = Math.max(0, Math.min(world.width() - this.w, this.x));
      this.y = Math.max(0, Math.min(world.height() - this.h, this.y));

      // shooting
      this.cooldown -= dt;
      if (keys.has(' ') || pointerDown) {
        shoot();
      }
    }
    draw() {
      // body
      ctx.fillStyle = '#69e1ff';
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;
      ctx.beginPath();
      ctx.moveTo(cx, this.y);
      ctx.lineTo(this.x + this.w, this.y + this.h);
      ctx.lineTo(this.x, this.y + this.h);
      ctx.closePath();
      ctx.fill();

      // cockpit
      ctx.fillStyle = '#1a2a44';
      ctx.fillRect(cx - 6, this.y + 12, 12, 14);
    }
  }

  class Bullet extends Entity {
    constructor(x, y) {
      super(x - 2, y - 10, 4, 10);
      this.vy = -600;
    }
    update(dt) {
      super.update(dt);
      if (this.y + this.h < 0) this.dead = true;
    }
    draw() {
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(this.x, this.y, this.w, this.h);
    }
  }

  class Enemy extends Entity {
    constructor(x, y, speed) {
      const w = 36, h = 36;
      super(x - w/2, y, w, h);
      this.vy = speed;
      this.hp = 1;
      this.wobblePhase = Math.random() * Math.PI * 2;
    }
    update(dt) {
      this.wobblePhase += dt * 2;
      this.x += Math.sin(this.wobblePhase) * 40 * dt;
      super.update(dt);
      if (this.y > world.height()) this.dead = true;
    }
    draw() {
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(this.x + this.w/2, this.y + this.h/2, this.w/2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b0d0d';
      ctx.fillRect(this.x + this.w/2 - 6, this.y + 10, 12, 6);
    }
  }

  const player = new Player();
  const bullets = [];
  const enemies = [];

  function shoot() {
    // simple fire rate limit
    if (!world.gameRunning) return;
    if (!shoot.last) shoot.last = 0;
    const now = performance.now();
    if (now - shoot.last < 140) return;
    shoot.last = now;
    bullets.push(new Bullet(player.x + player.w / 2, player.y));
  }

  function spawnEnemy() {
    const margin = 24;
    const x = margin + Math.random() * (world.width() - margin * 2);
    const base = 90, scale = Math.min(1.8, 0.6 + world.time / 30);
    const speed = base * scale + Math.random() * 50;
    enemies.push(new Enemy(x, -40, speed));
  }

  let spawnTimer = 0;
  function update(dt) {
    world.time += dt;
    player.update(dt);

    bullets.forEach(b => b.update(dt));
    enemies.forEach(e => e.update(dt));

    // collisions: bullet vs enemy
    for (const b of bullets) {
      if (b.dead) continue;
      for (const e of enemies) {
        if (e.dead) continue;
        if (intersect(b.rect(), e.rect())) {
          b.dead = true; e.hp -= 1;
          if (e.hp <= 0) { e.dead = true; world.score += 10; updateHUD(); }
          break;
        }
      }
    }

    // enemy vs player
    for (const e of enemies) {
      if (e.dead) continue;
      if (intersect(e.rect(), player.rect())) {
        e.dead = true;
        damage();
      }
    }

    // cleanup
    removeDead(bullets);
    removeDead(enemies);

    // spawn
    spawnTimer -= dt;
    const interval = Math.max(0.35, 1.1 - world.time * 0.03);
    if (spawnTimer <= 0) {
      spawnEnemy();
      spawnTimer = interval;
    }
  }

  function removeDead(arr) {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].dead) arr.splice(i, 1);
    }
  }

  function intersect(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function damage() {
    world.lives -= 1;
    updateHUD();
    flashScreen();
    if (world.lives <= 0) return endGame();
  }

  function updateHUD() {
    scoreEl.textContent = String(world.score);
    livesEl.textContent = String(world.lives);
  }

  let flash = 0;
  function flashScreen() {
    flash = 1;
  }

  function drawBackground() {
    const w = world.width();
    const h = world.height();
    // simple stars
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 60; i++) {
      const x = (i * 73 + (world.time * 40) % w) % w;
      const y = (i * 127 + (world.time * 80)) % h;
      ctx.fillRect(x, (y + h) % h, 2, 2);
    }
  }

  function draw(dt) {
    ctx.clearRect(0, 0, world.width(), world.height());
    drawBackground();

    bullets.forEach(b => b.draw());
    enemies.forEach(e => e.draw());
    player.draw();

    if (flash > 0) {
      ctx.fillStyle = `rgba(255,80,80,${flash * 0.35})`;
      ctx.fillRect(0, 0, world.width(), world.height());
      flash = Math.max(0, flash - dt * 5);
    }
  }

  let last = 0;
  function loop(ts) {
    if (!world.gameRunning) return;
    const t = ts || performance.now();
    const dt = Math.min(0.033, (t - last) / 1000 || 0.016);
    last = t;
    update(dt);
    draw(dt);
    requestAnimationFrame(loop);
  }

  function startGame() {
    world.score = 0; world.lives = 3; world.time = 0;
    updateHUD();
    bullets.length = 0; enemies.length = 0;
    player.x = world.width() / 2 - player.w / 2;
    player.y = world.height() - 120;
    overlay.classList.add('hidden');
    gameover.classList.add('hidden');
    world.gameRunning = true; last = performance.now();
    loop(last);
  }

  function endGame() {
    world.gameRunning = false;
    finalScoreEl.textContent = String(world.score);
    gameover.classList.remove('hidden');
  }

  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);

  // allow press Enter to start/restart
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (!world.gameRunning) startGame();
    }
  });
})();


