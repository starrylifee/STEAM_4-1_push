const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const titleEl = document.querySelector("#gameTitle");
const statsEl = document.querySelector("#gameStats");
const instructionsEl = document.querySelector("#gameInstructions");
const planFrame = document.querySelector("#planFrame");
const planLink = document.querySelector("#planLink");
const startBtn = document.querySelector("#startBtn");
const resetBtn = document.querySelector("#resetBtn");
const tabs = [...document.querySelectorAll(".game-tab")];

const W = canvas.width;
const H = canvas.height;
const keys = new Set();
const pointer = { x: W / 2, y: H / 2, down: false };

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const rand = (min, max) => min + Math.random() * (max - min);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const circleHit = (a, b) => dist(a, b) < a.r + b.r;
const rectHit = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function drawBackplate(c, tone = "#15171d") {
  const bg = c.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, tone);
  bg.addColorStop(0.58, "#101318");
  bg.addColorStop(1, "#241a20");
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);

  c.strokeStyle = "rgba(255,255,255,.045)";
  c.lineWidth = 1;
  for (let x = 0; x <= W; x += 40) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, H);
    c.stroke();
  }
  for (let y = 0; y <= H; y += 40) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(W, y);
    c.stroke();
  }
}

function drawStars(c, t, count = 72) {
  for (let i = 0; i < count; i += 1) {
    const x = (i * 137 + t * (8 + (i % 5) * 2)) % W;
    const y = (i * 71 + (i % 9) * 33) % H;
    const size = 1 + (i % 3) * 0.55;
    c.fillStyle = i % 6 === 0 ? "rgba(255,209,102,.9)" : "rgba(247,239,225,.55)";
    c.fillRect(x, y, size, size);
  }
}

function drawMessage(c, headline, copy, color = "#3be2c0") {
  c.save();
  c.fillStyle = "rgba(16,17,20,.74)";
  roundRect(c, 218, 192, 524, 176, 8);
  c.fill();
  c.strokeStyle = "rgba(255,255,255,.18)";
  c.stroke();
  c.textAlign = "center";
  c.fillStyle = color;
  c.font = "900 38px system-ui, sans-serif";
  c.fillText(headline, W / 2, 258);
  c.fillStyle = "#f7efe1";
  c.font = "700 18px system-ui, sans-serif";
  c.fillText(copy, W / 2, 302);
  c.font = "650 15px system-ui, sans-serif";
  c.fillStyle = "rgba(247,239,225,.7)";
  c.fillText("시작 또는 다시 버튼으로 이어갈 수 있어요.", W / 2, 334);
  c.restore();
}

function drawCapsule(c, x, y, text, color = "#ffd166") {
  c.font = "800 15px system-ui, sans-serif";
  const w = c.measureText(text).width + 26;
  roundRect(c, x, y, w, 32, 8);
  c.fillStyle = "rgba(16,17,20,.68)";
  c.fill();
  c.strokeStyle = "rgba(255,255,255,.12)";
  c.stroke();
  c.fillStyle = color;
  c.fillText(text, x + 13, y + 21);
}

class BaseGame {
  constructor(title, instructions, planFile) {
    this.title = title;
    this.instructions = instructions;
    this.planFile = planFile;
    this.state = "ready";
    this.time = 0;
    this.message = "";
  }

  start() {
    if (this.state === "won" || this.state === "lost") this.reset();
    this.state = "playing";
  }

  reset() {
    this.state = "ready";
    this.time = 0;
    this.message = "";
  }

  getStats() {
    return "";
  }

  update(dt) {
    this.time += dt;
  }

  onPointerDown() {}

  onPointerMove() {}

  onPointerUp() {}

  onKeyDown() {}
}

class AebiAdventure extends BaseGame {
  constructor() {
    super(
      "에이비의 모험",
      "방향키 또는 WASD로 에이비를 움직여 행성 조각 6개를 모은 뒤 오른쪽 신전에 도착하세요.",
      "에이비의 모험.pdf",
    );
    this.reset();
  }

  reset() {
    super.reset();
    this.player = { x: 92, y: 308, r: 19, speed: 255, inv: 0 };
    this.energy = 3;
    this.planets = [
      { x: 180, y: 132, r: 16, color: "#3be2c0", got: false },
      { x: 324, y: 468, r: 15, color: "#ffd166", got: false },
      { x: 474, y: 178, r: 17, color: "#ff756b", got: false },
      { x: 602, y: 410, r: 15, color: "#b7f7d4", got: false },
      { x: 738, y: 128, r: 16, color: "#b9a6ff", got: false },
      { x: 746, y: 490, r: 14, color: "#8fd3ff", got: false },
    ];
    this.comets = [
      { x: 282, y: 90, r: 18, vx: 110, vy: 88 },
      { x: 452, y: 348, r: 22, vx: -132, vy: 74 },
      { x: 652, y: 230, r: 19, vx: 126, vy: -104 },
    ];
    this.temple = { x: 828, y: 214, w: 92, h: 228 };
  }

  update(dt) {
    this.time += dt;
    if (this.state !== "playing") return;

    const p = this.player;
    const dx = (keys.has("arrowright") || keys.has("d") ? 1 : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0);
    const dy = (keys.has("arrowdown") || keys.has("s") ? 1 : 0) - (keys.has("arrowup") || keys.has("w") ? 1 : 0);
    const len = Math.hypot(dx, dy) || 1;
    p.x = clamp(p.x + (dx / len) * p.speed * dt, p.r + 18, W - p.r - 18);
    p.y = clamp(p.y + (dy / len) * p.speed * dt, p.r + 18, H - p.r - 18);
    p.inv = Math.max(0, p.inv - dt);

    for (const planet of this.planets) {
      if (!planet.got && circleHit(p, planet)) planet.got = true;
    }

    for (const comet of this.comets) {
      comet.x += comet.vx * dt;
      comet.y += comet.vy * dt;
      if (comet.x < 68 || comet.x > W - 68) comet.vx *= -1;
      if (comet.y < 74 || comet.y > H - 68) comet.vy *= -1;
      if (p.inv <= 0 && circleHit(p, comet)) {
        this.energy -= 1;
        p.inv = 1.2;
        p.x = 92;
        p.y = 308;
        if (this.energy <= 0) {
          this.state = "lost";
          this.message = "혜성에 너무 많이 부딪혔어요.";
        }
      }
    }

    const allCollected = this.planets.every((planet) => planet.got);
    const inTemple = rectHit(
      { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 },
      this.temple,
    );
    if (allCollected && inTemple) {
      this.state = "won";
      this.message = "에이비가 신전의 별빛 문을 열었어요.";
    }
  }

  getStats() {
    const got = this.planets.filter((planet) => planet.got).length;
    return `조각 ${got}/6 · 에너지 ${this.energy}`;
  }

  draw(c) {
    drawBackplate(c, "#121722");
    drawStars(c, this.time);

    c.save();
    c.fillStyle = "rgba(59,226,192,.08)";
    roundRect(c, this.temple.x, this.temple.y, this.temple.w, this.temple.h, 8);
    c.fill();
    c.strokeStyle = this.planets.every((planet) => planet.got) ? "#3be2c0" : "rgba(255,255,255,.22)";
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = "#f7efe1";
    c.fillRect(this.temple.x + 18, this.temple.y + 44, 10, 160);
    c.fillRect(this.temple.x + 64, this.temple.y + 44, 10, 160);
    c.beginPath();
    c.moveTo(this.temple.x + 6, this.temple.y + 44);
    c.lineTo(this.temple.x + this.temple.w / 2, this.temple.y + 5);
    c.lineTo(this.temple.x + this.temple.w - 6, this.temple.y + 44);
    c.closePath();
    c.fillStyle = "#ffd166";
    c.fill();
    c.font = "900 17px system-ui, sans-serif";
    c.textAlign = "center";
    c.fillStyle = "#101114";
    c.fillText("신전", this.temple.x + this.temple.w / 2, this.temple.y + 35);
    c.restore();

    for (const planet of this.planets) {
      if (planet.got) continue;
      c.save();
      c.translate(planet.x, planet.y);
      c.rotate(this.time * 0.8);
      c.strokeStyle = "rgba(247,239,225,.55)";
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(0, 0, planet.r + 10, planet.r * 0.5, 0, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = planet.color;
      c.beginPath();
      c.arc(0, 0, planet.r, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    for (const comet of this.comets) {
      c.save();
      c.translate(comet.x, comet.y);
      c.rotate(Math.atan2(comet.vy, comet.vx));
      c.fillStyle = "rgba(255,117,107,.28)";
      c.beginPath();
      c.moveTo(-comet.r * 2.2, 0);
      c.lineTo(-comet.r * 0.5, -comet.r * 0.8);
      c.lineTo(-comet.r * 0.5, comet.r * 0.8);
      c.closePath();
      c.fill();
      c.fillStyle = "#ff756b";
      c.beginPath();
      c.arc(0, 0, comet.r, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    const flicker = this.player.inv > 0 && Math.floor(this.time * 16) % 2 === 0;
    if (!flicker) {
      c.save();
      c.translate(this.player.x, this.player.y);
      c.fillStyle = "#3be2c0";
      c.beginPath();
      c.arc(0, 0, this.player.r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#101114";
      c.beginPath();
      c.arc(-7, -4, 3.5, 0, Math.PI * 2);
      c.arc(7, -4, 3.5, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#101114";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 4, 7, 0.1, Math.PI - 0.1);
      c.stroke();
      c.restore();
    }

    drawCapsule(c, 22, 20, "행성 조각을 모아 신전을 열기", "#3be2c0");
    if (this.state === "ready") drawMessage(c, "에이비 출발 준비", "별 조각을 모두 모으면 신전이 열립니다.");
    if (this.state === "won") drawMessage(c, "성공!", this.message, "#3be2c0");
    if (this.state === "lost") drawMessage(c, "다시 도전", this.message, "#ff756b");
  }
}

class ObstacleDodge extends BaseGame {
  constructor() {
    super(
      "장애물 피하기",
      "위아래 방향키 또는 W/S로 차선을 바꾸며 장애물을 피하세요. 결승선까지 버티면 성공입니다.",
      "장애물 피하기.pdf",
    );
    this.reset();
  }

  reset() {
    super.reset();
    this.lanes = [206, 302, 398];
    this.player = { x: 132, lane: 1, w: 50, h: 46, inv: 0 };
    this.obstacles = [];
    this.distance = 0;
    this.lives = 3;
    this.spawn = 0.45;
    this.laneCooldown = 0;
  }

  onPointerDown(pos) {
    if (this.state !== "playing") return;
    if (pos.y < this.lanes[this.player.lane]) this.player.lane = Math.max(0, this.player.lane - 1);
    else this.player.lane = Math.min(this.lanes.length - 1, this.player.lane + 1);
  }

  update(dt) {
    this.time += dt;
    if (this.state !== "playing") return;

    this.laneCooldown = Math.max(0, this.laneCooldown - dt);
    const up = keys.has("arrowup") || keys.has("w");
    const down = keys.has("arrowdown") || keys.has("s");
    if (this.laneCooldown <= 0 && up) {
      this.player.lane = Math.max(0, this.player.lane - 1);
      this.laneCooldown = 0.17;
    } else if (this.laneCooldown <= 0 && down) {
      this.player.lane = Math.min(2, this.player.lane + 1);
      this.laneCooldown = 0.17;
    }

    const speed = 285 + this.distance * 0.12;
    this.distance += dt * 84;
    this.spawn -= dt;
    if (this.spawn <= 0) {
      const lane = Math.floor(rand(0, 3));
      this.obstacles.push({ x: W + 40, lane, w: rand(34, 58), h: rand(38, 72), hit: false });
      this.spawn = rand(0.58, 0.95);
    }

    this.player.inv = Math.max(0, this.player.inv - dt);
    const p = {
      x: this.player.x - this.player.w / 2,
      y: this.lanes[this.player.lane] - this.player.h / 2,
      w: this.player.w,
      h: this.player.h,
    };
    for (const obs of this.obstacles) {
      obs.x -= speed * dt;
      const box = {
        x: obs.x - obs.w / 2,
        y: this.lanes[obs.lane] - obs.h / 2,
        w: obs.w,
        h: obs.h,
      };
      if (!obs.hit && this.player.inv <= 0 && rectHit(p, box)) {
        obs.hit = true;
        this.player.inv = 1.0;
        this.lives -= 1;
        if (this.lives <= 0) {
          this.state = "lost";
          this.message = "결승선 앞에서 멈췄어요.";
        }
      }
    }
    this.obstacles = this.obstacles.filter((obs) => obs.x > -80);

    if (this.distance >= 1000) {
      this.state = "won";
      this.message = "장애물을 지나 결승선에 도착했어요.";
    }
  }

  getStats() {
    return `거리 ${Math.min(100, Math.floor(this.distance / 10))}% · 생명 ${this.lives}`;
  }

  draw(c) {
    drawBackplate(c, "#141619");

    c.fillStyle = "rgba(247,239,225,.05)";
    roundRect(c, 74, 160, 812, 284, 8);
    c.fill();
    for (const laneY of this.lanes) {
      c.strokeStyle = "rgba(247,239,225,.26)";
      c.setLineDash([22, 22]);
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(86, laneY);
      c.lineTo(878, laneY);
      c.stroke();
    }
    c.setLineDash([]);

    const progress = clamp(this.distance / 1000, 0, 1);
    c.fillStyle = "#ffd166";
    c.fillRect(78, 118, 804 * progress, 8);
    c.strokeStyle = "rgba(255,255,255,.16)";
    c.strokeRect(78, 118, 804, 8);

    const finishX = 886 - progress * 804;
    c.fillStyle = "#f7efe1";
    c.fillRect(finishX, 142, 6, 326);
    c.fillStyle = "#3be2c0";
    c.fillRect(finishX + 6, 142, 46, 31);
    c.fillStyle = "#101114";
    c.font = "900 14px system-ui, sans-serif";
    c.fillText("FINISH", finishX + 10, 163);

    for (const obs of this.obstacles) {
      const y = this.lanes[obs.lane];
      c.save();
      c.translate(obs.x, y);
      c.fillStyle = obs.hit ? "rgba(255,117,107,.34)" : "#ff756b";
      roundRect(c, -obs.w / 2, -obs.h / 2, obs.w, obs.h, 7);
      c.fill();
      c.fillStyle = "#ffd166";
      c.fillRect(-obs.w / 2 + 7, -obs.h / 2 + 7, obs.w - 14, 8);
      c.restore();
    }

    const flicker = this.player.inv > 0 && Math.floor(this.time * 18) % 2 === 0;
    if (!flicker) {
      const y = this.lanes[this.player.lane];
      c.save();
      c.translate(this.player.x, y);
      c.fillStyle = "#3be2c0";
      roundRect(c, -26, -24, 52, 42, 8);
      c.fill();
      c.fillStyle = "#101114";
      c.fillRect(-15, -12, 30, 16);
      c.fillStyle = "#f7efe1";
      c.beginPath();
      c.arc(-15, 23, 8, 0, Math.PI * 2);
      c.arc(15, 23, 8, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    drawCapsule(c, 22, 20, "차선을 바꿔 결승선까지", "#ffd166");
    if (this.state === "ready") drawMessage(c, "엔진 점화", "위아래로 움직이며 장애물을 피하세요.");
    if (this.state === "won") drawMessage(c, "Finish!", this.message, "#3be2c0");
    if (this.state === "lost") drawMessage(c, "Fail", this.message, "#ff756b");
  }
}

class TargetShooter extends BaseGame {
  constructor() {
    super(
      "적을 맞춰라",
      "좌우 방향키 또는 A/D로 포대를 움직이고 Space 또는 클릭으로 발사하세요. 적 14마리를 맞추면 성공입니다.",
      "적을 맞춰라.pdf",
    );
    this.reset();
  }

  reset() {
    super.reset();
    this.cannon = { x: W / 2, cooldown: 0 };
    this.shots = [];
    this.enemies = [];
    this.score = 0;
    this.lives = 3;
    this.spawn = 0.3;
  }

  shoot() {
    if (this.cannon.cooldown > 0 || this.state !== "playing") return;
    this.shots.push({ x: this.cannon.x, y: 512, r: 5, vy: -560 });
    this.cannon.cooldown = 0.18;
  }

  onPointerDown(pos) {
    this.cannon.x = clamp(pos.x, 72, W - 72);
    this.shoot();
  }

  onPointerMove(pos) {
    if (pointer.down) this.cannon.x = clamp(pos.x, 72, W - 72);
  }

  update(dt) {
    this.time += dt;
    if (this.state !== "playing") return;

    const move = (keys.has("arrowright") || keys.has("d") ? 1 : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0);
    this.cannon.x = clamp(this.cannon.x + move * 380 * dt, 58, W - 58);
    this.cannon.cooldown = Math.max(0, this.cannon.cooldown - dt);
    if (keys.has(" ") || keys.has("spacebar")) this.shoot();

    this.spawn -= dt;
    if (this.spawn <= 0) {
      this.enemies.push({
        x: rand(74, W - 74),
        y: -30,
        r: rand(18, 28),
        vx: rand(-45, 45),
        vy: rand(62, 108) + this.score * 2,
        spin: rand(-2, 2),
        kind: Math.floor(rand(0, 3)),
      });
      this.spawn = rand(0.55, 0.92);
    }

    for (const shot of this.shots) shot.y += shot.vy * dt;
    for (const enemy of this.enemies) {
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      if (enemy.x < enemy.r + 20 || enemy.x > W - enemy.r - 20) enemy.vx *= -1;
    }

    for (const shot of this.shots) {
      if (shot.dead) continue;
      for (const enemy of this.enemies) {
        if (!enemy.dead && circleHit(shot, enemy)) {
          shot.dead = true;
          enemy.dead = true;
          this.score += 1;
          if (this.score >= 14) {
            this.state = "won";
            this.message = "모든 표적을 정확하게 맞췄어요.";
          }
          break;
        }
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.dead && enemy.y > H + 20) {
        enemy.dead = true;
        this.lives -= 1;
        if (this.lives <= 0) {
          this.state = "lost";
          this.message = "표적이 너무 많이 지나갔어요.";
        }
      }
    }
    this.shots = this.shots.filter((shot) => !shot.dead && shot.y > -30);
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
  }

  getStats() {
    return `명중 ${this.score}/14 · 기회 ${this.lives}`;
  }

  drawEnemy(c, enemy) {
    c.save();
    c.translate(enemy.x, enemy.y);
    c.rotate(this.time * enemy.spin);
    c.fillStyle = enemy.kind === 0 ? "#ff756b" : enemy.kind === 1 ? "#ffd166" : "#b9a6ff";
    c.beginPath();
    if (enemy.kind === 0) {
      c.moveTo(0, -enemy.r);
      c.lineTo(enemy.r, enemy.r);
      c.lineTo(-enemy.r, enemy.r);
    } else if (enemy.kind === 1) {
      c.rect(-enemy.r, -enemy.r, enemy.r * 2, enemy.r * 2);
    } else {
      for (let i = 0; i < 6; i += 1) {
        const a = (Math.PI * 2 * i) / 6;
        const rr = i % 2 === 0 ? enemy.r : enemy.r * 0.62;
        c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
    }
    c.closePath();
    c.fill();
    c.fillStyle = "#101114";
    c.beginPath();
    c.arc(-enemy.r * 0.32, -enemy.r * 0.08, 3, 0, Math.PI * 2);
    c.arc(enemy.r * 0.32, -enemy.r * 0.08, 3, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  draw(c) {
    drawBackplate(c, "#16151b");
    drawStars(c, this.time, 44);

    c.fillStyle = "rgba(247,239,225,.06)";
    c.fillRect(0, 538, W, 62);
    c.strokeStyle = "rgba(255,255,255,.14)";
    c.beginPath();
    c.moveTo(0, 538);
    c.lineTo(W, 538);
    c.stroke();

    for (const enemy of this.enemies) this.drawEnemy(c, enemy);
    for (const shot of this.shots) {
      c.fillStyle = "#3be2c0";
      c.beginPath();
      c.arc(shot.x, shot.y, shot.r, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "rgba(59,226,192,.36)";
      c.lineWidth = 8;
      c.beginPath();
      c.moveTo(shot.x, shot.y + 8);
      c.lineTo(shot.x, shot.y + 26);
      c.stroke();
    }

    c.save();
    c.translate(this.cannon.x, 532);
    c.fillStyle = "#3be2c0";
    c.beginPath();
    c.moveTo(0, -42);
    c.lineTo(32, 18);
    c.lineTo(-32, 18);
    c.closePath();
    c.fill();
    c.fillStyle = "#f7efe1";
    c.fillRect(-8, -48, 16, 38);
    c.restore();

    drawCapsule(c, 22, 20, "표적 14개 명중", "#ff756b");
    if (this.state === "ready") drawMessage(c, "조준 준비", "Space 또는 클릭으로 발사하세요.");
    if (this.state === "won") drawMessage(c, "Perfect!", this.message, "#3be2c0");
    if (this.state === "lost") drawMessage(c, "Miss", this.message, "#ff756b");
  }
}

class HouseBuilder extends BaseGame {
  constructor() {
    super(
      "집만들기",
      "아래 팔레트에서 재료를 고르고 격자를 클릭해 집을 지으세요. 체크리스트를 모두 채우면 완성입니다.",
      "집만들기.pdf",
    );
    this.reset();
  }

  reset() {
    super.reset();
    this.state = "playing";
    this.cols = 8;
    this.rows = 5;
    this.gridX = 58;
    this.gridY = 88;
    this.cell = 64;
    this.selected = "base";
    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    this.palette = [
      { id: "base", label: "기초", color: "#ffd166" },
      { id: "wall", label: "벽돌", color: "#f7efe1" },
      { id: "roof", label: "지붕", color: "#ff756b" },
      { id: "door", label: "문", color: "#b9855c" },
      { id: "window", label: "창문", color: "#8fd3ff" },
      { id: "garden", label: "정원", color: "#b7f7d4" },
      { id: "erase", label: "지우개", color: "#adb6bd" },
    ];
    this.required = { base: 2, wall: 4, roof: 2, door: 1, window: 2, garden: 1 };
    this.moves = 0;
    this.message = "";
  }

  start() {
    this.state = "playing";
  }

  countParts() {
    const counts = { base: 0, wall: 0, roof: 0, door: 0, window: 0, garden: 0 };
    for (const row of this.grid) {
      for (const cell of row) {
        if (cell && counts[cell] !== undefined) counts[cell] += 1;
      }
    }
    return counts;
  }

  complete() {
    const counts = this.countParts();
    return Object.entries(this.required).every(([key, needed]) => counts[key] >= needed);
  }

  onPointerDown(pos) {
    const paletteHit = this.paletteAt(pos.x, pos.y);
    if (paletteHit) {
      this.selected = paletteHit.id;
      return;
    }

    const col = Math.floor((pos.x - this.gridX) / this.cell);
    const row = Math.floor((pos.y - this.gridY) / this.cell);
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    this.grid[row][col] = this.selected === "erase" ? null : this.selected;
    this.moves += 1;
    if (this.complete()) {
      this.state = "won";
      this.message = "햇빛 좋은 작은 집이 완성됐어요.";
    }
  }

  onKeyDown(key) {
    const index = Number(key) - 1;
    if (index >= 0 && index < this.palette.length) this.selected = this.palette[index].id;
  }

  paletteAt(x, y) {
    for (let i = 0; i < this.palette.length; i += 1) {
      const box = this.paletteBox(i);
      if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) {
        return this.palette[i];
      }
    }
    return null;
  }

  paletteBox(i) {
    return { x: 58 + i * 122, y: 496, w: 108, h: 54 };
  }

  getStats() {
    const counts = this.countParts();
    const done = Object.entries(this.required).filter(([key, needed]) => counts[key] >= needed).length;
    return `완성 조건 ${done}/6 · 배치 ${this.moves}`;
  }

  drawPiece(c, type, x, y, size) {
    c.save();
    c.translate(x, y);
    if (type === "base") {
      c.fillStyle = "#ffd166";
      roundRect(c, 9, size * 0.55, size - 18, size * 0.24, 5);
      c.fill();
    } else if (type === "wall") {
      c.fillStyle = "#f7efe1";
      roundRect(c, 12, 12, size - 24, size - 24, 5);
      c.fill();
      c.strokeStyle = "rgba(16,17,20,.18)";
      c.strokeRect(18, 18, size - 36, size - 36);
    } else if (type === "roof") {
      c.fillStyle = "#ff756b";
      c.beginPath();
      c.moveTo(size / 2, 8);
      c.lineTo(size - 8, size - 12);
      c.lineTo(8, size - 12);
      c.closePath();
      c.fill();
    } else if (type === "door") {
      c.fillStyle = "#b9855c";
      roundRect(c, 20, 14, size - 40, size - 20, 5);
      c.fill();
      c.fillStyle = "#ffd166";
      c.beginPath();
      c.arc(size - 28, size / 2, 3, 0, Math.PI * 2);
      c.fill();
    } else if (type === "window") {
      c.fillStyle = "#8fd3ff";
      roundRect(c, 15, 16, size - 30, size - 32, 5);
      c.fill();
      c.strokeStyle = "#101114";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(size / 2, 17);
      c.lineTo(size / 2, size - 17);
      c.moveTo(16, size / 2);
      c.lineTo(size - 16, size / 2);
      c.stroke();
    } else if (type === "garden") {
      c.fillStyle = "#b7f7d4";
      c.beginPath();
      c.arc(size / 2, size * 0.58, 18, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#3be2c0";
      c.fillRect(size / 2 - 4, size * 0.55, 8, 22);
      c.fillStyle = "#ff756b";
      c.beginPath();
      c.arc(size / 2 - 10, size * 0.45, 5, 0, Math.PI * 2);
      c.arc(size / 2 + 9, size * 0.43, 5, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  draw(c) {
    drawBackplate(c, "#151815");

    c.fillStyle = "rgba(183,247,212,.08)";
    c.fillRect(0, 420, W, 180);
    c.fillStyle = "#ffd166";
    c.beginPath();
    c.arc(842, 98, 35, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "rgba(255,209,102,.35)";
    c.lineWidth = 7;
    c.beginPath();
    c.arc(842, 98, 50, 0, Math.PI * 2);
    c.stroke();

    c.strokeStyle = "rgba(247,239,225,.16)";
    c.lineWidth = 2;
    for (let r = 0; r <= this.rows; r += 1) {
      c.beginPath();
      c.moveTo(this.gridX, this.gridY + r * this.cell);
      c.lineTo(this.gridX + this.cols * this.cell, this.gridY + r * this.cell);
      c.stroke();
    }
    for (let col = 0; col <= this.cols; col += 1) {
      c.beginPath();
      c.moveTo(this.gridX + col * this.cell, this.gridY);
      c.lineTo(this.gridX + col * this.cell, this.gridY + this.rows * this.cell);
      c.stroke();
    }

    for (let r = 0; r < this.rows; r += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const type = this.grid[r][col];
        if (type) this.drawPiece(c, type, this.gridX + col * this.cell, this.gridY + r * this.cell, this.cell);
      }
    }

    const counts = this.countParts();
    c.fillStyle = "rgba(16,17,20,.62)";
    roundRect(c, 628, 170, 274, 230, 8);
    c.fill();
    c.font = "900 22px system-ui, sans-serif";
    c.fillStyle = "#3be2c0";
    c.fillText("완성 체크", 654, 212);
    c.font = "750 16px system-ui, sans-serif";
    let y = 248;
    for (const [key, needed] of Object.entries(this.required)) {
      const item = this.palette.find((p) => p.id === key);
      const ok = counts[key] >= needed;
      c.fillStyle = ok ? "#b7f7d4" : "#f7efe1";
      c.fillText(`${ok ? "✓" : "·"} ${item.label} ${counts[key]}/${needed}`, 654, y);
      y += 28;
    }

    for (let i = 0; i < this.palette.length; i += 1) {
      const item = this.palette[i];
      const box = this.paletteBox(i);
      c.fillStyle = item.id === this.selected ? "rgba(59,226,192,.22)" : "rgba(16,17,20,.68)";
      roundRect(c, box.x, box.y, box.w, box.h, 8);
      c.fill();
      c.strokeStyle = item.id === this.selected ? "#3be2c0" : "rgba(255,255,255,.16)";
      c.stroke();
      c.fillStyle = item.color;
      c.fillRect(box.x + 13, box.y + 15, 20, 20);
      c.fillStyle = "#f7efe1";
      c.font = "800 15px system-ui, sans-serif";
      c.fillText(item.label, box.x + 43, box.y + 35);
    }

    drawCapsule(c, 22, 20, "재료를 골라 격자에 배치", "#b7f7d4");
    if (this.state === "won") drawMessage(c, "완성!", this.message, "#3be2c0");
  }
}

class BulletDodger extends BaseGame {
  constructor() {
    super(
      "총알을 피해라",
      "방향키 또는 WASD로 움직이며 탄막을 피하세요. 35초를 버티면 성공입니다.",
      "총알을 피해라.pdf",
    );
    this.reset();
  }

  reset() {
    super.reset();
    this.player = { x: W / 2, y: 492, r: 13, speed: 290, inv: 0 };
    this.bullets = [];
    this.lives = 3;
    this.goal = 35;
    this.wave = 0.1;
    this.aimed = 0.7;
    this.pointerTarget = null;
  }

  onPointerDown(pos) {
    this.pointerTarget = { x: pos.x, y: pos.y };
  }

  onPointerMove(pos) {
    if (pointer.down) this.pointerTarget = { x: pos.x, y: pos.y };
  }

  onPointerUp() {
    this.pointerTarget = null;
  }

  spawnRadial() {
    const cx = W / 2 + Math.sin(this.time * 1.7) * 130;
    const cy = 112;
    const count = 10 + Math.floor(this.time / 8);
    for (let i = 0; i < count; i += 1) {
      const a = (Math.PI * 2 * i) / count + this.time * 0.7;
      const speed = 130 + this.time * 1.8;
      this.bullets.push({ x: cx, y: cy, r: 7, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed });
    }
  }

  spawnAimed() {
    const sx = rand(76, W - 76);
    const sy = 84;
    const angle = Math.atan2(this.player.y - sy, this.player.x - sx);
    const speed = 190 + this.time * 2.5;
    this.bullets.push({ x: sx, y: sy, r: 8, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
  }

  update(dt) {
    this.time += dt;
    if (this.state !== "playing") return;

    let dx = (keys.has("arrowright") || keys.has("d") ? 1 : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0);
    let dy = (keys.has("arrowdown") || keys.has("s") ? 1 : 0) - (keys.has("arrowup") || keys.has("w") ? 1 : 0);
    if (this.pointerTarget) {
      dx = this.pointerTarget.x - this.player.x;
      dy = this.pointerTarget.y - this.player.y;
      const len = Math.hypot(dx, dy);
      if (len > 8) {
        dx /= len;
        dy /= len;
      } else {
        dx = 0;
        dy = 0;
      }
    }
    const len = Math.hypot(dx, dy) || 1;
    this.player.x = clamp(this.player.x + (dx / len) * this.player.speed * dt, 28, W - 28);
    this.player.y = clamp(this.player.y + (dy / len) * this.player.speed * dt, 160, H - 28);
    this.player.inv = Math.max(0, this.player.inv - dt);

    this.wave -= dt;
    this.aimed -= dt;
    if (this.wave <= 0) {
      this.spawnRadial();
      this.wave = rand(1.05, 1.4);
    }
    if (this.aimed <= 0) {
      this.spawnAimed();
      this.aimed = rand(0.36, 0.62);
    }

    for (const bullet of this.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (this.player.inv <= 0 && circleHit(this.player, bullet)) {
        bullet.dead = true;
        this.lives -= 1;
        this.player.inv = 1.2;
        if (this.lives <= 0) {
          this.state = "lost";
          this.message = "탄막을 피하지 못했어요.";
        }
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead && b.x > -50 && b.x < W + 50 && b.y > -50 && b.y < H + 50);

    if (this.time >= this.goal) {
      this.state = "won";
      this.message = "마지막 총알까지 모두 피했어요.";
    }
  }

  getStats() {
    return `생존 ${Math.min(this.goal, this.time).toFixed(1)}초/${this.goal}초 · 생명 ${this.lives}`;
  }

  draw(c) {
    drawBackplate(c, "#17151a");
    drawStars(c, this.time, 52);

    c.fillStyle = "rgba(255,117,107,.08)";
    roundRect(c, 60, 148, 840, 390, 8);
    c.fill();
    c.strokeStyle = "rgba(255,117,107,.28)";
    c.stroke();

    const bossX = W / 2 + Math.sin(this.time * 1.7) * 130;
    c.save();
    c.translate(bossX, 102);
    c.fillStyle = "#ff756b";
    c.beginPath();
    c.arc(0, 0, 38, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#101114";
    c.beginPath();
    c.arc(-13, -5, 5, 0, Math.PI * 2);
    c.arc(13, -5, 5, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#101114";
    c.lineWidth = 4;
    c.beginPath();
    c.arc(0, 11, 14, 0.1, Math.PI - 0.1);
    c.stroke();
    c.restore();

    for (const bullet of this.bullets) {
      c.fillStyle = "#ffd166";
      c.beginPath();
      c.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "rgba(255,209,102,.28)";
      c.lineWidth = 5;
      c.stroke();
    }

    const flicker = this.player.inv > 0 && Math.floor(this.time * 18) % 2 === 0;
    if (!flicker) {
      c.save();
      c.translate(this.player.x, this.player.y);
      c.fillStyle = "#3be2c0";
      c.beginPath();
      c.moveTo(0, -18);
      c.lineTo(16, 14);
      c.lineTo(0, 7);
      c.lineTo(-16, 14);
      c.closePath();
      c.fill();
      c.fillStyle = "#f7efe1";
      c.beginPath();
      c.arc(0, -2, 5, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    const progress = clamp(this.time / this.goal, 0, 1);
    c.fillStyle = "#3be2c0";
    c.fillRect(80, 558, 800 * progress, 9);
    c.strokeStyle = "rgba(255,255,255,.16)";
    c.strokeRect(80, 558, 800, 9);
    drawCapsule(c, 22, 20, "35초 생존", "#ffd166");
    if (this.state === "ready") drawMessage(c, "탄막 준비", "총알 사이 빈 공간을 찾아 움직이세요.");
    if (this.state === "won") drawMessage(c, "Survive!", this.message, "#3be2c0");
    if (this.state === "lost") drawMessage(c, "Hit", this.message, "#ff756b");
  }
}

const gameFactories = {
  aebi: () => new AebiAdventure(),
  dodge: () => new ObstacleDodge(),
  shoot: () => new TargetShooter(),
  house: () => new HouseBuilder(),
  bullet: () => new BulletDodger(),
};

class ArcadeApp {
  constructor() {
    this.currentId = "aebi";
    this.game = gameFactories[this.currentId]();
    this.last = performance.now();
    this.bindEvents();
    this.syncUi();
    requestAnimationFrame((t) => this.loop(t));
  }

  bindEvents() {
    startBtn.addEventListener("click", () => {
      this.game.start();
      this.syncUi();
    });
    resetBtn.addEventListener("click", () => {
      this.game.reset();
      this.syncUi();
    });
    for (const tab of tabs) {
      tab.addEventListener("click", () => this.switchGame(tab.dataset.game));
    }

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "spacebar"].includes(key)) {
        event.preventDefault();
      }
      keys.add(key);
      this.game.onKeyDown(key);
    });
    window.addEventListener("keyup", (event) => {
      keys.delete(event.key.toLowerCase());
    });

    canvas.addEventListener("pointerdown", (event) => {
      const pos = this.canvasPos(event);
      pointer.down = true;
      pointer.x = pos.x;
      pointer.y = pos.y;
      canvas.setPointerCapture(event.pointerId);
      this.game.onPointerDown(pos);
      this.syncUi();
    });
    canvas.addEventListener("pointermove", (event) => {
      const pos = this.canvasPos(event);
      pointer.x = pos.x;
      pointer.y = pos.y;
      this.game.onPointerMove(pos);
    });
    canvas.addEventListener("pointerup", (event) => {
      const pos = this.canvasPos(event);
      pointer.down = false;
      pointer.x = pos.x;
      pointer.y = pos.y;
      this.game.onPointerUp(pos);
    });
    canvas.addEventListener("pointercancel", () => {
      pointer.down = false;
      this.game.onPointerUp(pointer);
    });
  }

  canvasPos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * W,
      y: ((event.clientY - rect.top) / rect.height) * H,
    };
  }

  switchGame(id) {
    this.currentId = id;
    this.game = gameFactories[id]();
    for (const tab of tabs) tab.classList.toggle("is-active", tab.dataset.game === id);
    keys.clear();
    this.syncUi();
  }

  syncUi() {
    titleEl.textContent = this.game.title;
    instructionsEl.textContent = this.game.instructions;
    const planPath = `./source/readable-plans/${this.game.planFile}`;
    planFrame.src = encodeURI(planPath);
    planLink.href = encodeURI(planPath);
    statsEl.textContent = this.game.getStats();
    startBtn.textContent = this.game.state === "playing" ? "진행 중" : "시작";
  }

  loop(now) {
    const dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;
    this.game.update(dt);
    this.game.draw(ctx);
    statsEl.textContent = this.game.getStats();
    startBtn.textContent = this.game.state === "playing" ? "진행 중" : "시작";
    requestAnimationFrame((t) => this.loop(t));
  }
}

new ArcadeApp();
