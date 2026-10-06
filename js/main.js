const sys = wx.getSystemInfoSync();
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');
const DPR = Math.min(sys.pixelRatio || 1, 3);
const W = sys.windowWidth;
const H = sys.windowHeight;

canvas.width = Math.round(W * DPR);
canvas.height = Math.round(H * DPR);
ctx.scale(DPR, DPR);

const COLORS = {
  skyTop: '#a9d8d2',
  skyBottom: '#f8dfb4',
  ink: '#24423f',
  muted: '#627a72',
  cream: '#fffaf0',
  coral: '#e9785d',
  coralDark: '#b94f3d',
  green: '#3f685b',
  greenDark: '#294a43',
  yellow: '#f4c95d'
};

const TAU = Math.PI * 2;
const summitDistance = 1700;
const groundY = () => H * 0.77;
let lastTime = Date.now();
let raf = null;

const game = {
  state: 'title',
  distance: 0,
  score: 0,
  energy: 100,
  elapsed: 0,
  speed: 190,
  spawnTimer: 0,
  flowerTimer: 0,
  shake: 0,
  flash: 0,
  caughtTimer: 0,
  checkpoint: 0,
  objects: [],
  particles: [],
  story: null,
  storyIndex: 0,
  best: Number(wx.getStorageSync('mountain_best_time')) || 0
};

const player = {
  x: W * 0.22,
  y: groundY() - 58,
  w: 38,
  h: 58,
  vy: 0,
  jumps: 0,
  invincible: 0,
  step: 0
};

const chaser = {
  x: -70,
  y: groundY() - 57,
  w: 36,
  h: 57,
  step: 0
};

const stories = [
  {
    at: 360,
    tag: '第一程 · 松风坡',
    text: '山路比想象中陡。黄璐漩停下来系紧鞋带，听见松林在风里回答：慢一点，也是在向前。'
  },
  {
    at: 850,
    tag: '第二程 · 云雾径',
    text: '雾遮住了远处的路，她便只看脚下的一小步。走着走着，云竟在身后让开了。'
  },
  {
    at: 1330,
    tag: '第三程 · 星光脊',
    text: '天色渐暗，最难的一段就在眼前。黄璐漩想起出发时的自己：既然来了，就去看看山顶的光。'
  }
];

function resetGame() {
  game.state = 'playing';
  game.distance = 0;
  game.score = 0;
  game.energy = 100;
  game.elapsed = 0;
  game.speed = 190;
  game.spawnTimer = 1.15;
  game.flowerTimer = 1.9;
  game.shake = 0;
  game.flash = 0;
  game.caughtTimer = 0;
  game.checkpoint = 0;
  game.objects = [];
  game.particles = [];
  game.story = null;
  player.x = W * 0.22;
  player.y = groundY() - player.h;
  player.vy = 0;
  player.jumps = 0;
  player.invincible = 0;
  chaser.x = -70;
  chaser.y = groundY() - chaser.h;
  chaser.step = 0;
}

function roundedRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function text(str, x, y, size, color, align, weight) {
  ctx.fillStyle = color || COLORS.ink;
  ctx.font = `${weight || 400} ${size}px sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function wrapText(str, x, y, maxWidth, lineHeight, size, color, align) {
  const chars = str.split('');
  let line = '';
  let row = 0;
  ctx.font = `400 ${size}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  chars.forEach((char, i) => {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + row * lineHeight);
      line = char;
      row += 1;
    } else {
      line = test;
    }
    if (i === chars.length - 1) ctx.fillText(line, x, y + row * lineHeight);
  });
  return row + 1;
}

function drawBackground(progress) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, progress > 0.7 ? '#45657b' : COLORS.skyTop);
  grad.addColorStop(0.65, progress > 0.7 ? '#d9a87d' : COLORS.skyBottom);
  grad.addColorStop(1, '#fbefce');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const sunY = H * (0.18 - progress * 0.035);
  ctx.fillStyle = `rgba(255, 221, 128, ${0.38 + progress * 0.35})`;
  ctx.beginPath();
  ctx.arc(W * 0.78, sunY, 44, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f8d26b';
  ctx.beginPath();
  ctx.arc(W * 0.78, sunY, 25, 0, TAU);
  ctx.fill();

  drawMountain(W * 0.55, H * 0.36, W * 0.95, H * 0.37, '#75958a', 0.15);
  drawMountain(W * 0.2, H * 0.48, W * 0.88, H * 0.31, '#557a6d', 0.3);
  drawMountain(W * 0.8, H * 0.54, W * 1.05, H * 0.26, '#3f675d', 0.45);

  ctx.fillStyle = '#31564d';
  ctx.beginPath();
  ctx.moveTo(0, groundY() - 22);
  for (let x = 0; x <= W + 25; x += 25) {
    const y = groundY() - 18 + Math.sin((x + game.distance) * 0.024) * 7;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d8b879';
  ctx.beginPath();
  ctx.moveTo(0, groundY());
  ctx.bezierCurveTo(W * .28, groundY() - 8, W * .65, groundY() + 12, W, groundY() - 5);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
}

function drawMountain(cx, baseY, width, height, color, snow) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - width / 2, baseY + height);
  ctx.lineTo(cx, baseY);
  ctx.lineTo(cx + width / 2, baseY + height);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgba(250,245,225,${snow})`;
  ctx.beginPath();
  ctx.moveTo(cx, baseY);
  ctx.lineTo(cx - width * .12, baseY + height * .24);
  ctx.lineTo(cx - width * .03, baseY + height * .2);
  ctx.lineTo(cx + width * .05, baseY + height * .29);
  ctx.lineTo(cx + width * .13, baseY + height * .25);
  ctx.closePath();
  ctx.fill();
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;
  ctx.save();
  if (player.invincible > 0 && Math.floor(player.invincible * 12) % 2 === 0) ctx.globalAlpha = .35;
  ctx.translate(x + player.w / 2, y + player.h / 2);
  const tilt = Math.max(-0.14, Math.min(0.14, player.vy / 1200));
  ctx.rotate(tilt);
  ctx.translate(-player.w / 2, -player.h / 2);

  // backpack
  ctx.fillStyle = '#e9785d';
  roundedRect(-5, 21, 17, 29, 6);
  ctx.fill();
  // legs
  ctx.strokeStyle = '#263c3a';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  const stride = Math.sin(player.step) * (player.jumps ? 2 : 6);
  ctx.beginPath();
  ctx.moveTo(18, 44); ctx.lineTo(14 - stride, 57);
  ctx.moveTo(25, 44); ctx.lineTo(29 + stride, 57);
  ctx.stroke();
  // coat
  ctx.fillStyle = '#f4c95d';
  roundedRect(8, 18, 26, 31, 9);
  ctx.fill();
  // head
  ctx.fillStyle = '#f1c5a7';
  ctx.beginPath(); ctx.arc(23, 12, 11, 0, TAU); ctx.fill();
  // hair
  ctx.fillStyle = '#35322f';
  ctx.beginPath();
  ctx.arc(22, 10, 11.5, Math.PI, TAU);
  ctx.lineTo(33, 17); ctx.quadraticCurveTo(30, 8, 19, 2); ctx.fill();
  ctx.beginPath(); ctx.arc(32, 10, 5, 0, TAU); ctx.fill();
  // eye and smile
  ctx.fillStyle = '#3d403d';
  ctx.beginPath(); ctx.arc(25, 12, 1.2, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#a86050'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(25, 15, 3, 0.15, 1.4); ctx.stroke();
  // scarf
  ctx.fillStyle = '#d95a4c';
  roundedRect(12, 17, 22, 5, 2); ctx.fill();
  ctx.fillRect(12, 19, 5, 13);
  ctx.restore();
}

function drawChaser() {
  const x = chaser.x;
  const y = chaser.y;
  ctx.save();
  ctx.translate(x + chaser.w / 2, y + chaser.h / 2);
  ctx.rotate(game.state === 'caught' ? .12 : 0);
  ctx.translate(-chaser.w / 2, -chaser.h / 2);
  const stride = Math.sin(chaser.step) * 6;

  // legs
  ctx.strokeStyle = '#263c3a';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(15, 43); ctx.lineTo(11 - stride, 56);
  ctx.moveTo(23, 43); ctx.lineTo(28 + stride, 56);
  ctx.stroke();
  // blue jacket
  ctx.fillStyle = '#507fa0';
  roundedRect(6, 18, 27, 31, 9);
  ctx.fill();
  // reaching arms when he catches up
  ctx.strokeStyle = '#507fa0';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(28, 27);
  ctx.lineTo(game.state === 'caught' ? 43 : 35, game.state === 'caught' ? 31 : 38);
  ctx.stroke();
  // head and hair
  ctx.fillStyle = '#efc3a4';
  ctx.beginPath(); ctx.arc(20, 12, 11, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2f3435';
  ctx.beginPath(); ctx.arc(20, 9, 11.5, Math.PI, TAU); ctx.lineTo(31, 14); ctx.lineTo(27, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#343b39';
  ctx.beginPath(); ctx.arc(24, 12, 1.2, 0, TAU); ctx.fill();
  ctx.restore();
}

function spawn(type) {
  if (type === 'flower') {
    game.objects.push({ type, x: W + 30, y: groundY() - 45 - Math.random() * 75, w: 25, h: 25, hit: false });
  } else {
    const rock = Math.random() > .5;
    game.objects.push({ type: rock ? 'rock' : 'stump', x: W + 35, y: groundY() - (rock ? 31 : 35), w: rock ? 34 : 29, h: rock ? 31 : 35, hit: false });
  }
}

function drawObject(o) {
  if (o.type === 'flower') {
    ctx.strokeStyle = '#40745d'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(o.x + 12, o.y + 25); ctx.lineTo(o.x + 12, o.y + 11); ctx.stroke();
    ctx.fillStyle = '#f7e3ef';
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5;
      ctx.beginPath(); ctx.arc(o.x + 12 + Math.cos(a) * 6, o.y + 9 + Math.sin(a) * 6, 4.5, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#e6a94e'; ctx.beginPath(); ctx.arc(o.x + 12, o.y + 9, 3.5, 0, TAU); ctx.fill();
  } else if (o.type === 'rock') {
    ctx.fillStyle = '#586860';
    ctx.beginPath(); ctx.moveTo(o.x, o.y + o.h); ctx.lineTo(o.x + 4, o.y + 10); ctx.lineTo(o.x + 15, o.y); ctx.lineTo(o.x + 30, o.y + 8); ctx.lineTo(o.x + o.w, o.y + o.h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#829087'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.x + 13, o.y + 6); ctx.lineTo(o.x + 9, o.y + 18); ctx.stroke();
  } else {
    ctx.fillStyle = '#694b36'; roundedRect(o.x, o.y + 5, o.w, o.h - 5, 4); ctx.fill();
    ctx.fillStyle = '#ad7c4f'; ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, o.y + 7, o.w / 2, 7, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#775338'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, o.y + 7, 8, 3.5, 0, 0, TAU); ctx.stroke();
  }
}

function overlap(a, b, pad) {
  const p = pad || 0;
  return a.x + p < b.x + b.w && a.x + a.w - p > b.x && a.y + p < b.y + b.h && a.y + a.h - p > b.y;
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TAU;
    const s = 45 + Math.random() * 100;
    game.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: .65 + Math.random() * .35, color });
  }
}

function update(dt) {
  if (game.state === 'caught') {
    game.caughtTimer += dt;
    chaser.step += dt * 19;
    player.step += dt * 19;
    player.x += 410 * dt;
    chaser.x = player.x - 30;
    if (player.x > W + 70) {
      game.state = 'over';
      player.x = W * 0.22;
    }
    return;
  }
  if (game.state !== 'playing') return;
  game.elapsed += dt;
  game.distance += game.speed * dt / 9.5;
  game.speed = Math.min(270, 190 + game.distance * .035);
  game.spawnTimer -= dt;
  game.flowerTimer -= dt;
  game.shake = Math.max(0, game.shake - dt);
  game.flash = Math.max(0, game.flash - dt);
  player.invincible = Math.max(0, player.invincible - dt);
  player.step += dt * 10;
  chaser.step += dt * 11;
  const chaseGap = 43 + game.energy * .72;
  const chaseTarget = player.x - chaseGap;
  chaser.x += (chaseTarget - chaser.x) * Math.min(1, dt * 2.6);
  chaser.y = groundY() - chaser.h;

  player.vy += 1550 * dt;
  player.y += player.vy * dt;
  if (player.y >= groundY() - player.h) {
    player.y = groundY() - player.h;
    player.vy = 0;
    player.jumps = 0;
  }

  if (game.spawnTimer <= 0) {
    spawn('obstacle');
    game.spawnTimer = Math.max(.72, 1.35 - game.distance / 2600) + Math.random() * .45;
  }
  if (game.flowerTimer <= 0) {
    spawn('flower');
    game.flowerTimer = 2.1 + Math.random() * 1.5;
  }

  game.objects.forEach(o => {
    o.x -= game.speed * dt;
    if (!o.hit && overlap(player, o, o.type === 'flower' ? 3 : 7)) {
      o.hit = true;
      if (o.type === 'flower') {
        game.energy = Math.min(100, game.energy + 8);
        game.score += 100;
        burst(o.x + 12, o.y + 10, '#f8d36d', 10);
      } else if (player.invincible <= 0) {
        game.energy -= 24;
        player.invincible = 1.15;
        game.shake = .32;
        game.flash = .18;
        burst(player.x + 20, player.y + 35, '#f29a72', 12);
        if (game.energy <= 0) {
          game.energy = 0;
          game.state = 'caught';
          game.caughtTimer = 0;
        }
      }
    }
  });
  game.objects = game.objects.filter(o => o.x > -60 && !(o.hit && o.type === 'flower'));
  game.particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 250 * dt; p.life -= dt; });
  game.particles = game.particles.filter(p => p.life > 0);

  if (game.state === 'caught') return;

  if (game.checkpoint < stories.length && game.distance >= stories[game.checkpoint].at) {
    game.story = stories[game.checkpoint];
    game.checkpoint += 1;
    game.state = 'story';
  } else if (game.distance >= summitDistance) {
    game.distance = summitDistance;
    game.state = 'won';
    if (!game.best || game.elapsed < game.best) {
      game.best = game.elapsed;
      wx.setStorageSync('mountain_best_time', Number(game.elapsed.toFixed(2)));
    }
  }
}

function drawHUD() {
  const pad = 18;
  ctx.fillStyle = 'rgba(255,250,240,.88)'; roundedRect(pad, 16, W - pad * 2, 70, 18); ctx.fill();
  text('海拔', 34, 37, 11, COLORS.muted, 'left', 500);
  text(`${Math.floor(game.distance)} m`, 34, 59, 20, COLORS.ink, 'left', 700);
  text('体力', W - 128, 37, 11, COLORS.muted, 'left', 500);
  ctx.fillStyle = '#d9e1d8'; roundedRect(W - 128, 52, 91, 9, 5); ctx.fill();
  ctx.fillStyle = game.energy > 35 ? COLORS.coral : '#c84242'; roundedRect(W - 128, 52, 91 * Math.max(0, game.energy) / 100, 9, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.45)'; roundedRect(34, 75, W - 68, 4, 2); ctx.fill();
  ctx.fillStyle = COLORS.yellow; roundedRect(34, 75, (W - 68) * game.distance / summitDistance, 4, 2); ctx.fill();
}

function drawParticles() {
  game.particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, TAU); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawTitle() {
  drawBackground(0);
  ctx.fillStyle = 'rgba(255,250,240,.94)';
  roundedRect(22, H * .14, W - 44, H * .58, 28); ctx.fill();
  text('黄璐漩的', W / 2, H * .225, 22, COLORS.muted, 'center', 500);
  text('山 野 日 记', W / 2, H * .285, 37, COLORS.ink, 'center', 700);
  ctx.strokeStyle = COLORS.yellow; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(W * .34, H * .325); ctx.lineTo(W * .66, H * .325); ctx.stroke();

  ctx.fillStyle = '#dce9df'; ctx.beginPath();
  ctx.moveTo(W * .15, H * .49); ctx.lineTo(W * .44, H * .355); ctx.lineTo(W * .7, H * .49); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#78978a'; ctx.beginPath();
  ctx.moveTo(W * .38, H * .49); ctx.lineTo(W * .67, H * .38); ctx.lineTo(W * .9, H * .49); ctx.closePath(); ctx.fill();
  player.x = W * .45; player.y = H * .405; player.vy = 0; player.step = 1;
  ctx.save(); ctx.translate(0, -8); drawPlayer(); ctx.restore();

  text('一路向上，去看山顶的日出', W / 2, H * .555, 16, COLORS.muted, 'center', 400);
  ctx.fillStyle = COLORS.coral; roundedRect(W * .18, H * .61, W * .64, 54, 27); ctx.fill();
  text('开始登山', W / 2, H * .61 + 27, 18, '#fff', 'center', 700);
  text('点击跳跃 · 再点一次二段跳', W / 2, H * .755, 13, 'rgba(255,255,255,.9)', 'center', 400);
}

function drawStory() {
  drawWorld();
  ctx.fillStyle = 'rgba(25,49,46,.52)'; ctx.fillRect(0, 0, W, H);
  const boxH = 260;
  const y = (H - boxH) / 2;
  ctx.fillStyle = COLORS.cream; roundedRect(24, y, W - 48, boxH, 24); ctx.fill();
  text(game.story.tag, W / 2, y + 42, 14, COLORS.coral, 'center', 700);
  ctx.fillStyle = COLORS.yellow; roundedRect(W / 2 - 24, y + 66, 48, 4, 2); ctx.fill();
  wrapText(game.story.text, W / 2, y + 92, W - 105, 29, 17, COLORS.ink, 'center');
  ctx.fillStyle = COLORS.green; roundedRect(W * .24, y + 198, W * .52, 42, 22); ctx.fill();
  text('继续向上', W / 2, y + 219, 15, '#fff', 'center', 600);
}

function drawWorld() {
  ctx.save();
  if (game.shake > 0) ctx.translate((Math.random() - .5) * 9, (Math.random() - .5) * 6);
  drawBackground(game.distance / summitDistance);
  game.objects.forEach(drawObject);
  drawParticles();
  drawChaser();
  drawPlayer();
  ctx.restore();
  drawHUD();
  if (game.flash > 0) { ctx.fillStyle = `rgba(255,90,70,${game.flash})`; ctx.fillRect(0, 0, W, H); }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function drawEnd(won) {
  drawBackground(won ? 1 : game.distance / summitDistance);
  if (won) {
    ctx.fillStyle = 'rgba(255,220,115,.25)'; ctx.beginPath(); ctx.arc(W * .78, H * .18, 80, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,250,240,.95)'; roundedRect(24, H * .18, W - 48, H * .57, 28); ctx.fill();
  text(won ? '登 顶 啦' : '被 追 上 啦', W / 2, H * .265, 31, COLORS.ink, 'center', 700);
  text(won ? '山顶的风，把一路的疲惫吹成了光。' : '赵云追了上来，推着她飞快走出了画面。', W / 2, H * .33, 15, COLORS.muted, 'center', 400);
  ctx.fillStyle = '#edf1e8'; roundedRect(W * .14, H * .385, W * .72, 92, 18); ctx.fill();
  text(won ? '本次用时' : '到达海拔', W * .32, H * .42, 12, COLORS.muted, 'center', 400);
  text(won ? formatTime(game.elapsed) : `${Math.floor(game.distance)} m`, W * .32, H * .46, 22, COLORS.ink, 'center', 700);
  text(won ? '收集得分' : '沿途得分', W * .68, H * .42, 12, COLORS.muted, 'center', 400);
  text(String(game.score), W * .68, H * .46, 22, COLORS.ink, 'center', 700);
  if (won && game.best) text(`最佳用时 ${formatTime(game.best)}`, W / 2, H * .525, 13, COLORS.coralDark, 'center', 500);
  ctx.fillStyle = COLORS.coral; roundedRect(W * .18, H * .59, W * .64, 52, 26); ctx.fill();
  text(won ? '再走一次' : '再跑一次', W / 2, H * .59 + 26, 17, '#fff', 'center', 700);
  text(won ? '每一步，都算数。' : '点击按钮，恢复全部体力', W / 2, H * .705, 13, COLORS.muted, 'center', 400);
}

function render() {
  ctx.clearRect(0, 0, W, H);
  if (game.state === 'title') drawTitle();
  else if (game.state === 'story') drawStory();
  else if (game.state === 'won') drawEnd(true);
  else if (game.state === 'over') drawEnd(false);
  else drawWorld();
}

function loop() {
  const now = Date.now();
  const dt = Math.min(.034, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  render();
  raf = requestAnimationFrame(loop);
}

function jump() {
  if (player.jumps >= 2) return;
  player.vy = player.jumps === 0 ? -590 : -525;
  player.jumps += 1;
  burst(player.x + 18, player.y + player.h, '#f2d59b', 5);
}

wx.onTouchStart(e => {
  const touch = e.touches && e.touches[0];
  if (!touch) return;
  if (game.state === 'title' || game.state === 'over' || game.state === 'won') {
    resetGame();
  } else if (game.state === 'story') {
    game.state = 'playing';
  } else {
    jump();
  }
});

if (wx.onShareAppMessage) {
  wx.onShareAppMessage(() => ({
    title: '陪黄璐漩一起去看山顶的日出'
  }));
}

lastTime = Date.now();
loop();
