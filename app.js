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
const pagePath = window.location?.pathname?.replaceAll("\\", "/") || "";
const planBase = pagePath.includes("/source/") ? "./readable-plans/" : "./source/readable-plans/";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const rand = (min, max) => min + Math.random() * (max - min);
const hitRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
const rectHit = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const circleHit = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) <= a.r + b.r;

const transformQuestions = [
  {
    prompt: "삼각형을 시계 방향으로 90도 돌리면?",
    options: ["오른쪽을 향함", "왼쪽으로 뒤집힘", "아래로 밀림"],
    answer: 0,
    action: "돌리기",
  },
  {
    prompt: "도형을 오른쪽 위치로 옮기는 이동은?",
    options: ["뒤집기", "밀기", "크게 만들기"],
    answer: 1,
    action: "밀기",
  },
  {
    prompt: "왼쪽 모습과 거울처럼 반대가 되게 하려면?",
    options: ["왼쪽으로 뒤집기", "90도 돌리기", "아래로 밀기"],
    answer: 0,
    action: "뒤집기",
  },
  {
    prompt: "지붕 타일을 거꾸로 맞추려면 어떤 이동이 필요할까?",
    options: ["270도 돌리기", "오른쪽으로 밀기", "색칠하기"],
    answer: 0,
    action: "돌리기",
  },
];

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
  bg.addColorStop(1, "#231d22");
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

function drawStars(c, t, count = 54) {
  for (let i = 0; i < count; i += 1) {
    const x = (i * 137 + t * (8 + (i % 5) * 2)) % W;
    const y = (i * 71 + (i % 9) * 33) % H;
    c.fillStyle = i % 6 === 0 ? "rgba(255,209,102,.88)" : "rgba(247,239,225,.55)";
    c.fillRect(x, y, 1.2 + (i % 3) * 0.6, 1.2 + (i % 3) * 0.6);
  }
}

function drawMessage(c, headline, copy, color = "#3be2c0") {
  c.save();
  c.fillStyle = "rgba(16,17,20,.78)";
  roundRect(c, 198, 180, 564, 190, 8);
  c.fill();
  c.strokeStyle = "rgba(255,255,255,.18)";
  c.stroke();
  c.textAlign = "center";
  c.fillStyle = color;
  c.font = "900 38px system-ui, sans-serif";
  c.fillText(headline, W / 2, 250);
  c.fillStyle = "#f7efe1";
  c.font = "700 18px system-ui, sans-serif";
  c.fillText(copy, W / 2, 296);
  c.fillStyle = "rgba(247,239,225,.7)";
  c.font = "650 15px system-ui, sans-serif";
  c.fillText("시작 또는 다시 버튼으로 이어갈 수 있어요.", W / 2, 330);
  c.restore();
}

function drawCapsule(c, x, y, text, color = "#ffd166") {
  c.save();
  c.font = "800 15px system-ui, sans-serif";
  const w = c.measureText(text).width + 26;
  roundRect(c, x, y, w, 32, 8);
  c.fillStyle = "rgba(16,17,20,.68)";
  c.fill();
  c.strokeStyle = "rgba(255,255,255,.12)";
  c.stroke();
  c.fillStyle = color;
  c.fillText(text, x + 13, y + 21);
  c.restore();
}

function drawSmallText(c, lines, x, y, color = "rgba(247,239,225,.78)") {
  c.save();
  c.fillStyle = color;
  c.font = "650 15px system-ui, sans-serif";
  lines.forEach((line, i) => c.fillText(line, x, y + i * 22));
  c.restore();
}

function drawPlayer(c, x, y, color = "#3be2c0") {
  c.save();
  c.translate(x, y);
  c.fillStyle = color;
  c.beginPath();
  c.arc(0, -18, 17, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#f7efe1";
  c.beginPath();
  c.arc(-7, -20, 5, 0, Math.PI * 2);
  c.arc(7, -20, 5, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = color;
  c.lineWidth = 9;
  c.beginPath();
  c.moveTo(0, -3);
  c.lineTo(0, 35);
  c.moveTo(-18, 12);
  c.lineTo(18, 12);
  c.moveTo(0, 34);
  c.lineTo(-14, 58);
  c.moveTo(0, 34);
  c.lineTo(16, 58);
  c.stroke();
  c.restore();
}

class BaseGame {
  constructor(title, instructions, planFile) {
    this.title = title;
    this.instructions = instructions;
    this.planFile = planFile;
    this.buttons = [];
    this.state = "ready";
    this.time = 0;
  }

  start() {
    if (this.state === "won" || this.state === "lost" || this.state === "fail") this.reset();
    if (this.state === "ready" || this.state === "intro") this.state = "playing";
  }

  reset() {
    this.buttons = [];
    this.state = "ready";
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
  }

  getStats() {
    return "";
  }

  beginFrame() {
    this.buttons = [];
  }

  addButton(c, x, y, w, h, label, action, accent = "#3be2c0") {
    this.buttons.push({ x, y, w, h, action });
    c.save();
    roundRect(c, x, y, w, h, 8);
    c.fillStyle = "rgba(16,17,20,.76)";
    c.fill();
    c.strokeStyle = accent;
    c.lineWidth = 2;
    c.stroke();
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "#f7efe1";
    c.font = "850 16px system-ui, sans-serif";
    c.fillText(label, x + w / 2, y + h / 2);
    c.restore();
  }

  pressButton(pos) {
    const btn = this.buttons.find((button) => hitRect(pos, button));
    if (!btn) return false;
    btn.action();
    return true;
  }

  onPointerDown(pos) {
    return this.pressButton(pos);
  }

  onPointerMove() {}

  onPointerUp() {}

  onKeyDown() {}
}

class AebiAdventure extends BaseGame {
  constructor() {
    super(
      "에이비의 모험",
      "외계인을 만나면 공격 버튼으로 도형 이동 문제를 풀고, 보스를 이기면 신전에서 코인과 아이템을 얻습니다.",
      "에이비의 모험.pdf",
    );
    this.reset();
  }

  reset() {
    super.reset();
    this.state = "ready";
    this.stageNames = ["수성", "금성", "지구"];
    this.stage = 0;
    this.coins = 0;
    this.hp = 3;
    this.skin = "기본 옷";
    this.player = { x: 92, y: 430, vy: 0, onGround: true };
    this.attackCooldown = 0;
    this.problem = null;
    this.problemTarget = null;
    this.loadStage();
  }

  loadStage() {
    this.player.x = 92;
    this.player.y = 430;
    this.player.vy = 0;
    this.enemies = [
      { x: 305, y: 430, alive: true, name: "외계인 A" },
      { x: 520, y: 430, alive: true, name: "외계인 B" },
      { x: 705, y: 430, alive: true, name: "외계인 C" },
    ];
    this.boss = { x: 830, y: 414, alive: true, open: false };
    this.state = "playing";
  }

  start() {
    if (this.state === "ready" || this.state === "won" || this.state === "lost") this.loadStage();
  }

  openPuzzle(target) {
    this.problem = transformQuestions[Math.floor(rand(0, transformQuestions.length))];
    this.problemTarget = target;
    this.state = "shapePuzzle";
  }

  answerPuzzle(index) {
    if (!this.problem) return;
    const correct = index === this.problem.answer;
    if (correct) {
      if (this.problemTarget?.type === "enemy") {
        this.problemTarget.enemy.alive = false;
        this.coins += 10;
      } else if (this.problemTarget?.type === "boss") {
        this.boss.alive = false;
        this.boss.open = true;
        this.coins += 100;
        this.state = "shrine";
        this.problem = null;
        return;
      }
    } else {
      this.hp -= 1;
      if (this.hp <= 0) {
        this.state = "lost";
        this.problem = null;
        return;
      }
    }
    this.problem = null;
    this.problemTarget = null;
    this.state = "playing";
  }

  nearestEnemy() {
    return this.enemies.find((enemy) => enemy.alive && Math.abs(enemy.x - this.player.x) < 70);
  }

  allEnemiesDefeated() {
    return this.enemies.every((enemy) => !enemy.alive);
  }

  nextStage() {
    if (this.stage < this.stageNames.length - 1) {
      this.stage += 1;
      this.loadStage();
    } else {
      this.state = "won";
    }
  }

  buySkin() {
    if (this.coins >= 80 && this.skin === "기본 옷") {
      this.coins -= 80;
      this.skin = "신전 망토";
    }
  }

  update(dt) {
    this.time += dt;
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.state !== "playing") return;

    const left = keys.has("arrowleft") || keys.has("a");
    const right = keys.has("arrowright") || keys.has("d");
    const jump = keys.has("arrowup") || keys.has("w");
    if (left) this.player.x -= 230 * dt;
    if (right) this.player.x += 230 * dt;
    if (jump && this.player.onGround) {
      this.player.vy = -430;
      this.player.onGround = false;
    }
    this.player.vy += 900 * dt;
    this.player.y += this.player.vy * dt;
    if (this.player.y >= 430) {
      this.player.y = 430;
      this.player.vy = 0;
      this.player.onGround = true;
    }
    this.player.x = clamp(this.player.x, 55, 890);

    const wantsAttack = keys.has(" ") || keys.has("spacebar");
    if (wantsAttack && this.attackCooldown <= 0) {
      this.attackCooldown = 0.4;
      const enemy = this.nearestEnemy();
      if (enemy) this.openPuzzle({ type: "enemy", enemy });
      else if (this.allEnemiesDefeated() && this.boss.alive && Math.abs(this.boss.x - this.player.x) < 95) {
        this.openPuzzle({ type: "boss" });
      }
    }
  }

  onKeyDown(key) {
    if (this.state === "shapePuzzle" && ["1", "2", "3"].includes(key)) this.answerPuzzle(Number(key) - 1);
    if (this.state === "shrine" && key === "enter") this.nextStage();
  }

  onPointerDown(pos) {
    if (super.onPointerDown(pos)) return true;
    if (this.state === "playing") {
      const enemy = this.nearestEnemy();
      if (enemy) this.openPuzzle({ type: "enemy", enemy });
      else if (this.allEnemiesDefeated() && this.boss.alive && Math.abs(this.boss.x - this.player.x) < 110) {
        this.openPuzzle({ type: "boss" });
      }
    }
    return true;
  }

  getStats() {
    return `${this.stageNames[this.stage]} · 코인 ${this.coins} · 목숨 ${this.hp} · ${this.skin}`;
  }

  drawEnemy(c, enemy) {
    if (!enemy.alive) return;
    c.save();
    c.translate(enemy.x, enemy.y);
    c.fillStyle = "#ff756b";
    c.beginPath();
    c.arc(0, -24, 22, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#101114";
    c.beginPath();
    c.arc(-8, -27, 4, 0, Math.PI * 2);
    c.arc(8, -27, 4, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#ff756b";
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(-14, -4);
    c.lineTo(-22, 22);
    c.moveTo(14, -4);
    c.lineTo(22, 22);
    c.stroke();
    c.restore();
  }

  drawPuzzle(c) {
    c.save();
    c.fillStyle = "rgba(16,17,20,.9)";
    roundRect(c, 150, 126, 660, 330, 8);
    c.fill();
    c.strokeStyle = "#ffd166";
    c.lineWidth = 2;
    c.stroke();
    c.textAlign = "center";
    c.fillStyle = "#ffd166";
    c.font = "900 28px system-ui, sans-serif";
    c.fillText("도형 이동 공격", W / 2, 178);
    c.fillStyle = "#f7efe1";
    c.font = "750 20px system-ui, sans-serif";
    c.fillText(this.problem.prompt, W / 2, 226);
    c.font = "700 16px system-ui, sans-serif";
    c.fillStyle = "rgba(247,239,225,.72)";
    c.fillText("공격 도형을 밀기, 돌리기, 뒤집기 중 알맞게 고르세요.", W / 2, 258);
    c.restore();
    this.problem.options.forEach((option, i) => {
      this.addButton(c, 235, 292 + i * 52, 490, 40, `${i + 1}. ${option}`, () => this.answerPuzzle(i), "#ffd166");
    });
  }

  draw(c) {
    this.beginFrame();
    drawBackplate(c, "#111723");
    drawStars(c, this.time, 46);

    c.fillStyle = "rgba(247,239,225,.12)";
    c.fillRect(0, 490, W, 110);
    c.fillStyle = "#342921";
    c.fillRect(0, 462, W, 30);

    c.fillStyle = "rgba(59,226,192,.12)";
    c.fillRect(0, 0, 92, H);
    c.fillStyle = "rgba(255,209,102,.12)";
    c.fillRect(780, 250, 130, 212);
    c.strokeStyle = this.allEnemiesDefeated() ? "#ffd166" : "rgba(255,255,255,.18)";
    c.lineWidth = 3;
    roundRect(c, 790, 290, 110, 172, 8);
    c.stroke();
    c.fillStyle = "#ffd166";
    c.font = "900 20px system-ui, sans-serif";
    c.fillText("신전", 826, 324);

    for (const enemy of this.enemies) this.drawEnemy(c, enemy);
    if (this.allEnemiesDefeated() && this.boss.alive) {
      c.save();
      c.translate(this.boss.x, this.boss.y);
      c.fillStyle = "#b9a6ff";
      c.beginPath();
      c.arc(0, -32, 36, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#101114";
      c.fillText("BOSS", -24, -28);
      c.restore();
    }

    drawPlayer(c, this.player.x, this.player.y, this.skin === "신전 망토" ? "#b9a6ff" : "#3be2c0");
    drawCapsule(c, 22, 20, "외계인 처치: Space 또는 클릭으로 도형 이동 문제 풀기", "#3be2c0");
    drawSmallText(c, [
      `현재 행성: ${this.stageNames[this.stage]}`,
      "적을 모두 물리치면 신전 앞 보스가 나타납니다.",
      "보스를 맞히면 100코인을 받고 다음 스테이지로 갑니다.",
    ], 22, 64);

    const enemy = this.nearestEnemy();
    if (this.state === "playing" && enemy) drawCapsule(c, 380, 426, "공격 가능", "#ff756b");
    if (this.state === "ready") drawMessage(c, "에이비의 모험", "행성을 돌며 외계인을 무찌르고 신전을 여세요.");
    if (this.state === "shapePuzzle") this.drawPuzzle(c);
    if (this.state === "shrine") {
      drawMessage(c, "신전 도착", "코인으로 옷을 사거나 다음 행성으로 이동하세요.", "#ffd166");
      this.addButton(c, 312, 382, 158, 42, "다음 스테이지", () => this.nextStage(), "#3be2c0");
      this.addButton(c, 490, 382, 158, 42, "옷 80코인", () => this.buySkin(), "#b9a6ff");
    }
    if (this.state === "won") drawMessage(c, "행성 탐험 성공", "모든 신전을 열었습니다.", "#3be2c0");
    if (this.state === "lost") drawMessage(c, "목숨을 잃었어요", "도형 이동 공격을 다시 연습해 보세요.", "#ff756b");
  }
}

class ObstacleDodge extends BaseGame {
  constructor() {
    super(
      "장애물 피하기",
      "밀기로 자동차를 움직여 장애물을 피하고, 마지막에는 주차장에 정확히 주차합니다. 레벨2는 장애물이 더 많습니다.",
      "장애물 피하기.pdf",
    );
    this.reset();
  }

  reset() {
    super.reset();
    this.state = "select";
    this.gender = null;
    this.level = 1;
    this.coins = 0;
    this.carName = "기본차";
    this.carColor = "#3be2c0";
    this.distance = 0;
    this.car = { x: 126, y: 326, w: 58, h: 34 };
    this.targetY = this.car.y;
    this.obstacles = [];
    this.coinItems = [];
    this.spawn = 0.4;
    this.coinSpawn = 1.1;
  }

  startLevel(level = this.level) {
    this.state = "playing";
    this.level = level;
    this.distance = 0;
    this.car.x = 126;
    this.car.y = 326;
    this.targetY = this.car.y;
    this.obstacles = [];
    this.coinItems = [];
    this.spawn = 0.3;
    this.coinSpawn = 0.7;
  }

  chooseGender(gender) {
    this.gender = gender;
    this.startLevel(1);
  }

  buyCar() {
    if (this.coins >= 25 && this.carName === "기본차") {
      this.coins -= 25;
      this.carName = "새 자동차";
      this.carColor = "#ffd166";
    }
  }

  fail() {
    this.state = "fail";
  }

  finishLevel() {
    this.coins += this.level * 10;
    if (this.level === 1) this.state = "levelComplete";
    else this.state = "won";
  }

  update(dt) {
    this.time += dt;
    if (this.state !== "playing" && this.state !== "parking") return;

    const up = keys.has("arrowup") || keys.has("w");
    const down = keys.has("arrowdown") || keys.has("s");
    const left = keys.has("arrowleft") || keys.has("a");
    const right = keys.has("arrowright") || keys.has("d");

    if (pointer.down) this.targetY = clamp(pointer.y, 190, 438);
    if (up) this.targetY -= 330 * dt;
    if (down) this.targetY += 330 * dt;
    this.targetY = clamp(this.targetY, 190, 438);
    this.car.y += (this.targetY - this.car.y) * Math.min(1, dt * 9);
    if (left) this.car.x -= 170 * dt;
    if (right) this.car.x += 170 * dt;
    this.car.x = clamp(this.car.x, 84, 820);

    if (this.state === "parking") {
      const parking = { x: 748, y: 254, w: 128, h: 124 };
      if (rectHit(this.carBox(), parking) && (keys.has(" ") || keys.has("spacebar"))) this.finishLevel();
      return;
    }

    const roadSpeed = 285 + this.level * 75;
    this.distance += dt * 95;
    this.spawn -= dt;
    this.coinSpawn -= dt;
    if (this.spawn <= 0) {
      const count = this.level === 1 ? 1 : 2;
      for (let i = 0; i < count; i += 1) {
        this.obstacles.push({
          x: W + rand(20, 180),
          y: rand(190, 438),
          w: rand(28, 52),
          h: rand(42, 76),
        });
      }
      this.spawn = this.level === 1 ? rand(0.7, 1.1) : rand(0.45, 0.8);
    }
    if (this.coinSpawn <= 0) {
      this.coinItems.push({ x: W + 30, y: rand(198, 430), r: 12 });
      this.coinSpawn = rand(1.2, 1.8);
    }

    for (const obstacle of this.obstacles) obstacle.x -= roadSpeed * dt;
    for (const coin of this.coinItems) coin.x -= roadSpeed * dt;
    const carBox = this.carBox();
    for (const obstacle of this.obstacles) {
      if (rectHit(carBox, obstacle)) this.fail();
    }
    for (const coin of this.coinItems) {
      if (!coin.got && circleHit({ x: this.car.x, y: this.car.y, r: 32 }, coin)) {
        coin.got = true;
        this.coins += 1;
      }
    }
    this.obstacles = this.obstacles.filter((obstacle) => obstacle.x > -80);
    this.coinItems = this.coinItems.filter((coin) => !coin.got && coin.x > -50);

    if (this.distance >= 680) {
      this.state = "parking";
      this.car.x = 640;
      this.targetY = 318;
    }
  }

  carBox() {
    return { x: this.car.x - this.car.w / 2, y: this.car.y - this.car.h / 2, w: this.car.w, h: this.car.h };
  }

  onPointerDown(pos) {
    if (super.onPointerDown(pos)) return true;
    if (this.state === "playing" || this.state === "parking") {
      pointer.down = true;
      this.targetY = clamp(pos.y, 190, 438);
    }
    return true;
  }

  onPointerMove(pos) {
    if (pointer.down && (this.state === "playing" || this.state === "parking")) this.targetY = clamp(pos.y, 190, 438);
  }

  onKeyDown(key) {
    if (this.state === "parking" && (key === " " || key === "spacebar")) this.finishLevel();
  }

  getStats() {
    return `레벨 ${this.level} · 코인 ${this.coins} · ${this.gender || "캐릭터 선택"} · ${this.carName}`;
  }

  drawCar(c) {
    c.save();
    c.translate(this.car.x, this.car.y);
    c.fillStyle = this.carColor;
    roundRect(c, -32, -20, 64, 38, 8);
    c.fill();
    c.fillStyle = "#101114";
    c.fillRect(-16, -13, 31, 14);
    c.fillStyle = "#f7efe1";
    c.beginPath();
    c.arc(-20, 20, 8, 0, Math.PI * 2);
    c.arc(20, 20, 8, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  draw(c) {
    this.beginFrame();
    drawBackplate(c, "#141619");
    c.fillStyle = "rgba(247,239,225,.07)";
    roundRect(c, 64, 156, 832, 314, 8);
    c.fill();
    c.strokeStyle = "rgba(247,239,225,.24)";
    c.setLineDash([24, 20]);
    c.lineWidth = 3;
    for (const y of [238, 326, 414]) {
      c.beginPath();
      c.moveTo(78, y);
      c.lineTo(884, y);
      c.stroke();
    }
    c.setLineDash([]);

    const finishX = 840 - clamp(this.distance / 680, 0, 1) * 680;
    c.fillStyle = "#f7efe1";
    c.fillRect(finishX, 160, 7, 310);
    c.fillStyle = "#ffd166";
    c.fillRect(78, 118, 800 * clamp(this.distance / 680, 0, 1), 9);
    c.strokeStyle = "rgba(255,255,255,.14)";
    c.strokeRect(78, 118, 800, 9);

    for (const obstacle of this.obstacles) {
      c.fillStyle = "#ff756b";
      roundRect(c, obstacle.x, obstacle.y, obstacle.w, obstacle.h, 6);
      c.fill();
      c.fillStyle = "#ffd166";
      c.fillRect(obstacle.x + 6, obstacle.y + 8, obstacle.w - 12, 8);
    }
    for (const coin of this.coinItems) {
      c.fillStyle = "#ffd166";
      c.beginPath();
      c.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#101114";
      c.font = "900 12px system-ui, sans-serif";
      c.fillText("C", coin.x - 5, coin.y + 5);
    }

    if (this.state === "parking") {
      c.fillStyle = "rgba(59,226,192,.18)";
      roundRect(c, 748, 254, 128, 124, 8);
      c.fill();
      c.strokeStyle = "#3be2c0";
      c.lineWidth = 3;
      c.stroke();
      drawCapsule(c, 670, 214, "주차장 안에서 Space", "#3be2c0");
    }

    this.drawCar(c);
    drawCapsule(c, 22, 20, "밀기: 드래그 또는 방향키로 차를 움직이기", "#ffd166");
    drawSmallText(c, [
      "장애물에 치이면 다시 시작됩니다.",
      "마지막에는 주차장에 주차해야 통과합니다.",
      "레벨2는 장애물이 더 많이 나옵니다.",
    ], 22, 64);

    if (this.state === "select") {
      drawMessage(c, "캐릭터 선택", "PDF처럼 남자/여자 캐릭터를 먼저 고릅니다.", "#ffd166");
      this.addButton(c, 316, 382, 140, 44, "남자", () => this.chooseGender("남자"), "#3be2c0");
      this.addButton(c, 504, 382, 140, 44, "여자", () => this.chooseGender("여자"), "#ff756b");
    }
    if (this.state === "fail") {
      drawMessage(c, "Fail", "다시 한 번 더? 다음 기회에!", "#ff756b");
      this.addButton(c, 400, 382, 160, 44, "다시 시작", () => this.startLevel(this.level), "#ff756b");
    }
    if (this.state === "levelComplete") {
      drawMessage(c, "Finish!", "잘했어요. 다음 레벨로 갑니다.", "#3be2c0");
      this.addButton(c, 310, 382, 160, 44, "레벨2", () => this.startLevel(2), "#3be2c0");
      this.addButton(c, 492, 382, 160, 44, "자동차 25코인", () => this.buyCar(), "#ffd166");
    }
    if (this.state === "won") drawMessage(c, "Finish!", "레벨2와 주차까지 성공했습니다.", "#3be2c0");
  }
}

class TargetShooter extends BaseGame {
  constructor() {
    super(
      "적을 맞춰라",
      "대포를 쏘기 전 도형의 밀기, 돌리기, 뒤집기 문제를 풀어 정확도와 발사력을 높인 뒤 조준경으로 적을 맞춥니다.",
      "적을 맞춰라.pdf",
    );
    this.reset();
  }

  reset() {
    super.reset();
    this.state = "ready";
    this.hits = 0;
    this.shots = 0;
    this.accuracy = 55;
    this.power = 55;
    this.crosshair = { x: 646, y: 256 };
    this.target = { x: 646, y: 256, r: 58 };
    this.projectile = null;
    this.problem = null;
    this.feedback = "문제를 풀면 정확도와 발사력이 올라갑니다.";
  }

  start() {
    if (this.state === "ready" || this.state === "won" || this.state === "lost") {
      this.state = "question";
      this.makeQuestion();
    }
  }

  makeQuestion() {
    this.problem = transformQuestions[Math.floor(rand(0, transformQuestions.length))];
  }

  answer(index) {
    const correct = index === this.problem.answer;
    this.accuracy = correct ? clamp(this.accuracy + 18, 0, 98) : clamp(this.accuracy - 10, 30, 98);
    this.power = correct ? clamp(this.power + 16, 0, 100) : clamp(this.power - 12, 30, 100);
    this.feedback = correct ? "정답! 대포의 정확도와 발사력이 올랐습니다." : "오답. 그래도 쏠 수 있지만 흔들림이 커졌습니다.";
    this.state = "aim";
  }

  fire() {
    if (this.state !== "aim" || this.projectile) return;
    const spread = (100 - this.accuracy) * 1.2;
    const aimX = this.crosshair.x + rand(-spread, spread);
    const aimY = this.crosshair.y + rand(-spread, spread);
    this.projectile = { x: 148, y: 500, tx: aimX, ty: aimY, t: 0 };
    this.shots += 1;
    this.state = "firing";
  }

  update(dt) {
    this.time += dt;
    if (this.state === "aim") {
      const dx = (keys.has("arrowright") || keys.has("d") ? 1 : 0) - (keys.has("arrowleft") || keys.has("a") ? 1 : 0);
      const dy = (keys.has("arrowdown") || keys.has("s") ? 1 : 0) - (keys.has("arrowup") || keys.has("w") ? 1 : 0);
      this.crosshair.x = clamp(this.crosshair.x + dx * 260 * dt, 380, 852);
      this.crosshair.y = clamp(this.crosshair.y + dy * 220 * dt, 120, 410);
      if (keys.has(" ") || keys.has("spacebar")) this.fire();
    }
    if (this.projectile) {
      this.projectile.t += dt * (1.25 + this.power / 100);
      if (this.projectile.t >= 1) {
        const end = { x: this.projectile.tx, y: this.projectile.ty, r: 7 };
        if (circleHit(end, this.target)) {
          this.hits += 1;
          this.feedback = "명중! 문제 풀이가 조준에 도움이 됐습니다.";
        } else {
          this.feedback = "빗나갔습니다. 다음 문제를 풀어 정확도를 올리세요.";
        }
        this.projectile = null;
        if (this.hits >= 5) this.state = "won";
        else if (this.shots >= 9) this.state = "lost";
        else {
          this.state = "question";
          this.makeQuestion();
          this.target.x = rand(520, 810);
          this.target.y = rand(160, 360);
        }
      }
    }
  }

  onKeyDown(key) {
    if (this.state === "question" && ["1", "2", "3"].includes(key)) this.answer(Number(key) - 1);
    if (this.state === "aim" && (key === " " || key === "spacebar")) this.fire();
  }

  onPointerDown(pos) {
    if (super.onPointerDown(pos)) return true;
    if (this.state === "aim") {
      this.crosshair.x = clamp(pos.x, 380, 852);
      this.crosshair.y = clamp(pos.y, 120, 410);
      this.fire();
    }
    return true;
  }

  onPointerMove(pos) {
    if (pointer.down && this.state === "aim") {
      this.crosshair.x = clamp(pos.x, 380, 852);
      this.crosshair.y = clamp(pos.y, 120, 410);
    }
  }

  getStats() {
    return `명중 ${this.hits}/5 · 발사 ${this.shots}/9 · 정확도 ${this.accuracy}% · 발사력 ${this.power}%`;
  }

  drawQuestion(c) {
    c.save();
    c.fillStyle = "rgba(16,17,20,.86)";
    roundRect(c, 98, 108, 360, 314, 8);
    c.fill();
    c.strokeStyle = "#ffd166";
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = "#ffd166";
    c.font = "900 24px system-ui, sans-serif";
    c.fillText("대포 문제", 124, 154);
    c.fillStyle = "#f7efe1";
    c.font = "750 17px system-ui, sans-serif";
    c.fillText(this.problem.prompt, 124, 194);
    c.font = "650 14px system-ui, sans-serif";
    c.fillStyle = "rgba(247,239,225,.7)";
    c.fillText("정답이면 정확도와 발사력이 올라갑니다.", 124, 224);
    c.restore();
    this.problem.options.forEach((option, i) => {
      this.addButton(c, 124, 252 + i * 52, 300, 40, `${i + 1}. ${option}`, () => this.answer(i), "#ffd166");
    });
  }

  draw(c) {
    this.beginFrame();
    drawBackplate(c, "#16151b");
    c.fillStyle = "rgba(247,239,225,.06)";
    c.fillRect(0, 536, W, 64);
    c.strokeStyle = "rgba(255,255,255,.14)";
    c.beginPath();
    c.moveTo(0, 536);
    c.lineTo(W, 536);
    c.stroke();

    c.save();
    c.translate(148, 502);
    c.fillStyle = "#3be2c0";
    c.beginPath();
    c.moveTo(0, -38);
    c.lineTo(76, -12);
    c.lineTo(0, 14);
    c.closePath();
    c.fill();
    c.fillStyle = "#f7efe1";
    c.beginPath();
    c.arc(-6, 18, 28, 0, Math.PI * 2);
    c.fill();
    c.restore();

    c.save();
    c.translate(this.target.x, this.target.y);
    c.fillStyle = "rgba(255,117,107,.2)";
    c.beginPath();
    c.arc(0, 0, this.target.r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#ff756b";
    c.lineWidth = 4;
    c.beginPath();
    c.arc(0, 0, this.target.r, 0, Math.PI * 2);
    c.moveTo(-this.target.r, 0);
    c.lineTo(this.target.r, 0);
    c.moveTo(0, -this.target.r);
    c.lineTo(0, this.target.r);
    c.stroke();
    c.fillStyle = "#f7efe1";
    c.font = "900 22px system-ui, sans-serif";
    c.fillText("조준", -24, 7);
    c.restore();

    c.save();
    c.translate(this.crosshair.x, this.crosshair.y);
    c.strokeStyle = "#ffd166";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, 0, 22, 0, Math.PI * 2);
    c.moveTo(-34, 0);
    c.lineTo(34, 0);
    c.moveTo(0, -34);
    c.lineTo(0, 34);
    c.stroke();
    c.restore();

    if (this.projectile) {
      const p = this.projectile;
      const t = clamp(p.t, 0, 1);
      const x = p.x + (p.tx - p.x) * t;
      const y = p.y + (p.ty - p.y) * t - Math.sin(t * Math.PI) * 160;
      c.fillStyle = "#3be2c0";
      c.beginPath();
      c.arc(x, y, 9, 0, Math.PI * 2);
      c.fill();
    }

    drawCapsule(c, 22, 20, "문제 풀이 → 정확도/발사력 상승 → 조준경으로 발사", "#ff756b");
    drawSmallText(c, [this.feedback, "방향키로 조준경 이동, Space 또는 클릭으로 발사"], 22, 64);
    if (this.state === "ready") drawMessage(c, "적을 맞춰라", "도형 이동 문제를 풀고 대포를 발사하세요.");
    if (this.state === "question") this.drawQuestion(c);
    if (this.state === "aim") this.addButton(c, 780, 504, 118, 42, "발사", () => this.fire(), "#3be2c0");
    if (this.state === "won") drawMessage(c, "파이팅!", "문제를 풀고 적을 모두 맞췄습니다.", "#3be2c0");
    if (this.state === "lost") drawMessage(c, "아쉬워요", "문제를 더 풀어 정확도를 높여 보세요.", "#ff756b");
  }
}

class HouseBuilder extends BaseGame {
  constructor() {
    super(
      "집만들기",
      "나무판자, 타일, 지지대를 고르고 회전시켜 알맞은 위치에 붙입니다. 힌트와 포인트, 위태로움 상태가 있습니다.",
      "집만들기.pdf",
    );
    this.reset();
  }

  reset() {
    super.reset();
    this.state = "intro";
    this.points = 20;
    this.stability = 3;
    this.selected = "support";
    this.rotation = 0;
    this.step = 0;
    this.hint = "";
    this.specialUsed = false;
    this.tasks = [
      { x: 230, y: 346, w: 34, h: 118, piece: "support", rot: 0, label: "왼쪽 지지대" },
      { x: 450, y: 346, w: 34, h: 118, piece: "support", rot: 0, label: "오른쪽 지지대" },
      { x: 250, y: 318, w: 220, h: 28, piece: "plank", rot: 0, label: "바닥 나무판자" },
      { x: 286, y: 218, w: 150, h: 96, piece: "tile", rot: 90, label: "벽 타일" },
      { x: 260, y: 154, w: 206, h: 70, piece: "roof", rot: 270, label: "270도 돌린 지붕" },
      { x: 322, y: 250, w: 40, h: 64, piece: "door", rot: 0, label: "문" },
      { x: 386, y: 242, w: 38, h: 34, piece: "window", rot: 0, label: "창문" },
      { x: 238, y: 324, w: 24, h: 24, piece: "screw", rot: 0, label: "나사 조이기" },
      { x: 456, y: 324, w: 24, h: 24, piece: "screw", rot: 0, label: "나사 조이기" },
    ];
    this.placed = [];
  }

  start() {
    if (this.state === "intro" || this.state === "ready") this.state = "playing";
    if (this.state === "won" || this.state === "fail") this.reset();
  }

  currentTask() {
    return this.tasks[this.step];
  }

  select(piece) {
    this.selected = piece;
  }

  rotate(delta = 90) {
    this.rotation = (this.rotation + delta + 360) % 360;
  }

  useHint() {
    const task = this.currentTask();
    if (!task || this.points < 5) return;
    this.points -= 5;
    this.hint = `${task.label}: ${task.pieceName || this.pieceLabel(task.piece)}, ${task.rot}도`;
  }

  useSpecial() {
    if (this.specialUsed || this.points < 20) return;
    this.points -= 20;
    this.specialUsed = true;
    this.stability = 3;
    this.placeCurrent(true);
  }

  pieceLabel(piece) {
    return {
      support: "지지대",
      plank: "나무판자",
      tile: "타일",
      roof: "지붕",
      door: "문",
      window: "창문",
      screw: "나사",
    }[piece];
  }

  placeCurrent(force = false) {
    const task = this.currentTask();
    if (!task) return;
    const ok = force || (this.selected === task.piece && this.rotation === task.rot);
    if (ok) {
      this.placed.push(task);
      this.step += 1;
      this.points += 5;
      this.hint = "좋아요! 집이 더 튼튼해졌어요.";
      if (this.step >= this.tasks.length) this.state = "won";
    } else {
      this.stability -= 1;
      this.hint = "앗, 집이 위태로워요! 재료와 회전 각도를 다시 확인하세요.";
      if (this.stability <= 0) this.state = "fail";
    }
  }

  onPointerDown(pos) {
    if (super.onPointerDown(pos)) return true;
    if (this.state !== "playing") return true;
    const task = this.currentTask();
    if (task && hitRect(pos, task)) this.placeCurrent();
    return true;
  }

  onKeyDown(key) {
    const map = { "1": "support", "2": "plank", "3": "tile", "4": "roof", "5": "door", "6": "window", "7": "screw" };
    if (map[key]) this.select(map[key]);
    if (key === "q") this.rotate(-90);
    if (key === "e") this.rotate(90);
    if (key === "h") this.useHint();
    if (key === " " || key === "spacebar") this.placeCurrent();
  }

  getStats() {
    return `포인트 ${this.points}P · 안정도 ${this.stability}/3 · 단계 ${this.step}/${this.tasks.length}`;
  }

  drawPiece(c, piece, x, y, w, h, rot = 0, ghost = false) {
    c.save();
    c.translate(x + w / 2, y + h / 2);
    c.rotate((rot * Math.PI) / 180);
    c.globalAlpha = ghost ? 0.28 : 1;
    const ww = w;
    const hh = h;
    if (piece === "support") {
      c.fillStyle = "#ffd166";
      roundRect(c, -ww / 2, -hh / 2, ww, hh, 6);
      c.fill();
    } else if (piece === "plank") {
      c.fillStyle = "#b9855c";
      roundRect(c, -ww / 2, -hh / 2, ww, hh, 6);
      c.fill();
      c.strokeStyle = "rgba(16,17,20,.3)";
      for (let i = -2; i <= 2; i += 1) {
        c.beginPath();
        c.moveTo(-ww / 2, i * 7);
        c.lineTo(ww / 2, i * 7);
        c.stroke();
      }
    } else if (piece === "tile") {
      c.fillStyle = "#f7efe1";
      roundRect(c, -ww / 2, -hh / 2, ww, hh, 6);
      c.fill();
      c.strokeStyle = "rgba(16,17,20,.25)";
      c.strokeRect(-ww / 2 + 10, -hh / 2 + 10, ww - 20, hh - 20);
    } else if (piece === "roof") {
      c.fillStyle = "#ff756b";
      c.beginPath();
      c.moveTo(0, -hh / 2);
      c.lineTo(ww / 2, hh / 2);
      c.lineTo(-ww / 2, hh / 2);
      c.closePath();
      c.fill();
    } else if (piece === "door") {
      c.fillStyle = "#7e543d";
      roundRect(c, -ww / 2, -hh / 2, ww, hh, 5);
      c.fill();
    } else if (piece === "window") {
      c.fillStyle = "#8fd3ff";
      roundRect(c, -ww / 2, -hh / 2, ww, hh, 5);
      c.fill();
      c.strokeStyle = "#101114";
      c.beginPath();
      c.moveTo(0, -hh / 2);
      c.lineTo(0, hh / 2);
      c.moveTo(-ww / 2, 0);
      c.lineTo(ww / 2, 0);
      c.stroke();
    } else if (piece === "screw") {
      c.fillStyle = "#adb6bd";
      c.beginPath();
      c.arc(0, 0, Math.min(ww, hh) / 2, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#101114";
      c.beginPath();
      c.moveTo(-8, 0);
      c.lineTo(8, 0);
      c.stroke();
    }
    c.restore();
  }

  draw(c) {
    this.beginFrame();
    drawBackplate(c, "#151815");
    c.fillStyle = "rgba(183,247,212,.08)";
    c.fillRect(0, 420, W, 180);

    c.save();
    c.fillStyle = "rgba(247,239,225,.08)";
    roundRect(c, 170, 126, 380, 356, 8);
    c.fill();
    c.strokeStyle = "rgba(255,255,255,.2)";
    c.stroke();
    c.restore();

    for (const task of this.tasks) this.drawPiece(c, task.piece, task.x, task.y, task.w, task.h, task.rot, true);
    for (const task of this.placed) this.drawPiece(c, task.piece, task.x, task.y, task.w, task.h, task.rot, false);
    const task = this.currentTask();
    if (task && this.state === "playing") {
      c.strokeStyle = "#ffd166";
      c.lineWidth = 3;
      c.setLineDash([8, 8]);
      roundRect(c, task.x - 6, task.y - 6, task.w + 12, task.h + 12, 8);
      c.stroke();
      c.setLineDash([]);
    }

    drawCapsule(c, 22, 20, "재료 선택 → Q/E 회전 → 노란 위치 클릭", "#b7f7d4");
    drawSmallText(c, [
      "PDF 규칙: 판자/타일을 시계방향 270도까지 돌려 붙입니다.",
      "힌트는 5P를 사용하고, 맞게 붙이면 5P를 얻습니다.",
      "틀리면 집이 위태로워지고 안정도가 줄어듭니다.",
    ], 22, 64);

    c.fillStyle = "rgba(16,17,20,.68)";
    roundRect(c, 622, 120, 284, 358, 8);
    c.fill();
    c.fillStyle = "#3be2c0";
    c.font = "900 22px system-ui, sans-serif";
    c.fillText("만들기 메뉴", 648, 158);
    c.fillStyle = "#f7efe1";
    c.font = "750 16px system-ui, sans-serif";
    const taskText = task ? `${task.label}: ${this.pieceLabel(task.piece)} ${task.rot}도` : "집 완성";
    c.fillText(`현재 목표: ${taskText}`, 648, 194);
    c.fillText(`선택: ${this.pieceLabel(this.selected)} / ${this.rotation}도`, 648, 224);
    c.fillText(this.hint || "집을 어떻게 짓지?", 648, 254);

    const pieces = [
      ["support", "1 지지대"],
      ["plank", "2 판자"],
      ["tile", "3 타일"],
      ["roof", "4 지붕"],
      ["door", "5 문"],
      ["window", "6 창문"],
      ["screw", "7 나사"],
    ];
    pieces.forEach(([piece, label], i) => {
      const x = 648 + (i % 2) * 124;
      const y = 284 + Math.floor(i / 2) * 44;
      this.addButton(c, x, y, 112, 34, label, () => this.select(piece), piece === this.selected ? "#3be2c0" : "rgba(255,255,255,.35)");
    });
    this.addButton(c, 648, 462, 72, 36, "회전", () => this.rotate(90), "#ffd166");
    this.addButton(c, 730, 462, 72, 36, "힌트", () => this.useHint(), "#b9a6ff");
    this.addButton(c, 812, 462, 72, 36, "특수", () => this.useSpecial(), "#ff756b");

    if (this.state === "intro") {
      drawMessage(c, "집짓기 게임", "시작하기를 누르면 재료를 돌려 집을 짓습니다.", "#ffd166");
      this.addButton(c, 404, 382, 152, 44, "시작하기", () => this.start(), "#3be2c0");
    }
    if (this.state === "won") drawMessage(c, "멋져요!", "집을 튼튼하게 완성했습니다.", "#3be2c0");
    if (this.state === "fail") {
      drawMessage(c, "앗, 위태로워요!", "재료와 회전 각도를 다시 맞춰 주세요.", "#ff756b");
      this.addButton(c, 404, 382, 152, 44, "다시 짓기", () => this.reset(), "#ff756b");
    }
  }
}

class BulletDefense extends BaseGame {
  constructor() {
    super(
      "총알을 피해라",
      "총알이 날아오면 평면도형의 이동 문제를 풀고, 정답이면 방패로 막습니다. 틀리면 총알을 맞고 목숨이 줄어듭니다.",
      "총알을 피해라.pdf",
    );
    this.reset();
  }

  reset() {
    super.reset();
    this.state = "ready";
    this.lives = 3;
    this.blocked = 0;
    this.goal = 8;
    this.bullet = null;
    this.spawnTimer = 0.8;
    this.problem = null;
    this.shieldTimer = 0;
    this.flash = "";
  }

  start() {
    if (this.state === "ready" || this.state === "won" || this.state === "lost") {
      this.state = "playing";
      this.spawnTimer = 0.6;
      this.bullet = null;
      this.problem = null;
    }
  }

  spawnBullet() {
    this.bullet = { x: 790, y: rand(250, 410), r: 9, vx: -260 };
  }

  askQuestion() {
    this.problem = transformQuestions[Math.floor(rand(0, transformQuestions.length))];
    this.state = "question";
  }

  answer(index) {
    const correct = index === this.problem.answer;
    if (correct) {
      this.blocked += 1;
      this.shieldTimer = 0.8;
      this.flash = "막았다!";
    } else {
      this.lives -= 1;
      this.flash = "맞았다!";
    }
    this.bullet = null;
    this.problem = null;
    if (this.blocked >= this.goal) this.state = "won";
    else if (this.lives <= 0) this.state = "lost";
    else {
      this.state = "playing";
      this.spawnTimer = 0.9;
    }
  }

  update(dt) {
    this.time += dt;
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    if (this.state !== "playing") return;
    this.spawnTimer -= dt;
    if (!this.bullet && this.spawnTimer <= 0) this.spawnBullet();
    if (this.bullet) {
      this.bullet.x += this.bullet.vx * dt;
      if (this.bullet.x <= 282) this.askQuestion();
    }
  }

  onKeyDown(key) {
    if (this.state === "question" && ["1", "2", "3"].includes(key)) this.answer(Number(key) - 1);
  }

  getStats() {
    return `방어 ${this.blocked}/${this.goal} · 목숨 ${this.lives}/3`;
  }

  drawQuestion(c) {
    c.save();
    c.fillStyle = "rgba(16,17,20,.9)";
    roundRect(c, 178, 132, 604, 314, 8);
    c.fill();
    c.strokeStyle = "#ffd166";
    c.lineWidth = 2;
    c.stroke();
    c.textAlign = "center";
    c.fillStyle = "#ffd166";
    c.font = "900 28px system-ui, sans-serif";
    c.fillText("총알이 날아옵니다", W / 2, 184);
    c.fillStyle = "#f7efe1";
    c.font = "750 20px system-ui, sans-serif";
    c.fillText(this.problem.prompt, W / 2, 224);
    c.fillStyle = "rgba(247,239,225,.72)";
    c.font = "650 15px system-ui, sans-serif";
    c.fillText("정답이면 방패가 나오고, 틀리면 총알을 맞습니다.", W / 2, 254);
    c.restore();
    this.problem.options.forEach((option, i) => {
      this.addButton(c, 292, 292 + i * 48, 376, 38, `${i + 1}. ${option}`, () => this.answer(i), "#ffd166");
    });
  }

  draw(c) {
    this.beginFrame();
    drawBackplate(c, "#17151a");
    drawStars(c, this.time, 30);
    c.fillStyle = "rgba(247,239,225,.06)";
    roundRect(c, 56, 126, 848, 404, 8);
    c.fill();
    c.strokeStyle = "rgba(255,255,255,.12)";
    c.stroke();

    drawPlayer(c, 214, 432, "#3be2c0");
    c.save();
    c.translate(760, 318);
    c.fillStyle = "#ff756b";
    c.beginPath();
    c.arc(0, 0, 52, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#101114";
    c.beginPath();
    c.arc(-16, -10, 7, 0, Math.PI * 2);
    c.arc(16, -10, 7, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#101114";
    c.lineWidth = 5;
    c.beginPath();
    c.arc(0, 16, 20, 0, Math.PI);
    c.stroke();
    c.restore();

    if (this.bullet) {
      c.fillStyle = "#ffd166";
      c.beginPath();
      c.arc(this.bullet.x, this.bullet.y, this.bullet.r, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "rgba(255,209,102,.32)";
      c.lineWidth = 6;
      c.stroke();
    }
    if (this.shieldTimer > 0) {
      c.strokeStyle = "#3be2c0";
      c.lineWidth = 10;
      c.beginPath();
      c.arc(260, 392, 86, -1.1, 1.1);
      c.stroke();
    }

    c.fillStyle = "#f7efe1";
    c.font = "900 24px system-ui, sans-serif";
    c.fillText(this.flash, 438, 162);
    drawCapsule(c, 22, 20, "평면도형 이동 문제를 맞히면 방패가 나옵니다", "#ffd166");
    drawSmallText(c, ["총알이 가까워지면 문제가 뜹니다.", "목숨은 세 개입니다."], 22, 64);

    if (this.state === "ready") drawMessage(c, "총알을 피해라", "문제를 맞혀 방패로 총알을 막으세요.");
    if (this.state === "question") this.drawQuestion(c);
    if (this.state === "won") drawMessage(c, "막는 것 성공", "총알을 모두 방패로 막았습니다.", "#3be2c0");
    if (this.state === "lost") drawMessage(c, "맞는 것", "총알을 세 번 맞았습니다. 다시 도전하세요.", "#ff756b");
  }
}

const gameFactories = {
  aebi: () => new AebiAdventure(),
  dodge: () => new ObstacleDodge(),
  shoot: () => new TargetShooter(),
  house: () => new HouseBuilder(),
  bullet: () => new BulletDefense(),
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
    for (const tab of tabs) tab.addEventListener("click", () => this.switchGame(tab.dataset.game));

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "spacebar"].includes(key)) event.preventDefault();
      keys.add(key);
      this.game.onKeyDown(key);
    });
    window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

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
    pointer.down = false;
    this.syncUi();
  }

  syncUi() {
    titleEl.textContent = this.game.title;
    instructionsEl.textContent = this.game.instructions;
    const planPath = `${planBase}${this.game.planFile}`;
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
