// Motor de Asteroides portado desde references/started-games/02-asteroids/game.js.
// Sin React y sin acceso a window/document a nivel de módulo: todo vive dentro
// de createAsteroidsEngine(), que registra sus listeners y los quita en destroy().
export const ASTEROIDS_WIDTH = 800;
export const ASTEROIDS_HEIGHT = 600;
export type AsteroidsState = 'playing' | 'dead' | 'gameover';
export interface AsteroidsSnapshot {
  score: number;
  lives: number;
  level: number;
  tripleShot: number; // segundos restantes, redondeado a 0.1; 0 si inactivo
  state: AsteroidsState;
  paused: boolean;
}
export interface AsteroidsEngineOptions {
  canvas: HTMLCanvasElement;
  onChange: (snapshot: AsteroidsSnapshot) => void; // solo cuando cambia algún campo
  onGameOver: (finalScore: number) => void; // al perder la última vida o con end()
}
export interface AsteroidsEngine {
  pause(): void;
  resume(): void;
  togglePause(): void;
  restart(): void; // initGame() + reanuda el loop
  end(): void; // fuerza game over y llama a onGameOver
  destroy(): void; // cancela el rAF y quita los listeners de window
}
const W = ASTEROIDS_WIDTH;
const H = ASTEROIDS_HEIGHT;
type Keys = Record<string, boolean>;
// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
// ── Constants ─────────────────────────────────────────────────────────────────
const POWERUP_DROP_CHANCE = 0.15;
const POWERUP_DURATION = 5;
const POWERUP_TTL = 12;
const TRIPLE_SPREAD = 0.18;
const MAX_DT = 0.05;
// Teclas de juego: preventDefault() mientras se juega para que la página no haga scroll.
const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);
// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = 1.1;
  radius = 2;
  dead = false;
  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
  }
  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño
class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  dead = false;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][] = [];
  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];
    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);
    // Polígono irregular
    const n = randInt(8, 13);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }
  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }
  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++) ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}
// ── PowerUp ───────────────────────────────────────────────────────────────────
class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = 12;
  ttl = POWERUP_TTL;
  dead = false;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }
  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D) {
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 2;
    const r = this.radius * pulse;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.fillStyle = '#0ff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('3x', this.x, this.y);
  }
}
// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  x = W / 2;
  y = H / 2;
  angle = -Math.PI / 2;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 3;
  shootCooldown = 0;
  dead = false;
  tripleShot = 0;
  constructor() {
    this.reset();
  }
  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }
  update(dt: number, keys: Keys) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;
    const ROT = 3.5; // rad/s
    const THRUST = 260; // px/s²
    const DRAG = 0.987;
    if (keys['ArrowLeft']) this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;
    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }
    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }
  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }
  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo(20, 0); // nariz
    ctx.lineTo(-12, -9); // ala izquierda
    ctx.lineTo(-7, 0); // muesca trasera
    ctx.lineTo(-12, 9); // ala derecha
    ctx.closePath();
    ctx.stroke();
    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }
    ctx.restore();
  }
}
// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
  }
  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}
// ── Estado del juego ──────────────────────────────────────────────────────────
interface GameState {
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  particles: Particle[];
  powerUps: PowerUp[];
  score: number;
  lives: number;
  level: number;
  state: AsteroidsState;
  deadTimer: number;
  powerUpSpawned: boolean;
  killsSinceSpawn: number;
}
function spawnAsteroids(g: GameState, count: number) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    g.asteroids.push(new Asteroid(x, y, 3));
  }
}
function initGame(): GameState {
  const g: GameState = {
    ship: new Ship(),
    bullets: [],
    asteroids: [],
    particles: [],
    powerUps: [],
    score: 0,
    lives: 3,
    level: 1,
    state: 'playing',
    deadTimer: 0,
    powerUpSpawned: false,
    killsSinceSpawn: 0,
  };
  spawnAsteroids(g, 4);
  return g;
}
function nextLevel(g: GameState) {
  g.level++;
  g.bullets = [];
  g.particles = [];
  g.powerUps = [];
  g.powerUpSpawned = false;
  g.killsSinceSpawn = 0;
  g.ship.reset();
  spawnAsteroids(g, 3 + g.level);
}
function explode(g: GameState, x: number, y: number, count = 8) {
  for (let i = 0; i < count; i++) g.particles.push(new Particle(x, y));
}
function killShip(g: GameState) {
  explode(g, g.ship.x, g.ship.y, 14);
  g.ship.dead = true;
  g.lives--;
  if (g.lives <= 0) {
    g.state = 'gameover';
  } else {
    g.state = 'dead';
    g.deadTimer = 2;
  }
}
// ── Update ────────────────────────────────────────────────────────────────────
function update(g: GameState, dt: number, keys: Keys, pressed: (code: string) => boolean) {
  if (g.state === 'gameover') {
    // Sin reinicio con Espacio: el fin de partida lo gestiona la plataforma.
    g.particles.forEach((p) => p.update(dt));
    g.particles = g.particles.filter((p) => !p.dead);
    return;
  }
  if (g.state === 'dead') {
    g.deadTimer -= dt;
    g.particles.forEach((p) => p.update(dt));
    g.particles = g.particles.filter((p) => !p.dead);
    g.asteroids.forEach((a) => a.update(dt));
    if (g.deadTimer <= 0) {
      g.state = 'playing';
      g.ship.reset();
    }
    return;
  }
  // Disparar
  if (pressed('Space')) {
    g.bullets.push(...g.ship.tryShoot());
  }
  g.ship.update(dt, keys);
  g.bullets.forEach((b) => b.update(dt));
  g.asteroids.forEach((a) => a.update(dt));
  g.particles.forEach((p) => p.update(dt));
  g.powerUps.forEach((p) => p.update(dt));
  g.bullets = g.bullets.filter((b) => !b.dead);
  g.particles = g.particles.filter((p) => !p.dead);
  g.powerUps = g.powerUps.filter((p) => !p.dead);
  for (const p of g.powerUps) {
    if (!p.dead && dist(g.ship, p) < g.ship.radius + p.radius) {
      p.dead = true;
      g.ship.tripleShot = POWERUP_DURATION;
    }
  }
  // Bala vs asteroide
  const newAsteroids: Asteroid[] = [];
  for (const b of g.bullets) {
    for (const a of g.asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        g.score += POINTS[a.size];
        explode(g, a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        if (!g.powerUpSpawned) {
          g.killsSinceSpawn++;
          const guaranteed = g.killsSinceSpawn >= 5;
          if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
            g.powerUps.push(new PowerUp(a.x, a.y));
            g.powerUpSpawned = true;
          }
        }
      }
    }
  }
  g.asteroids = g.asteroids.filter((a) => !a.dead).concat(newAsteroids);
  g.bullets = g.bullets.filter((b) => !b.dead);
  // Nave vs asteroide
  if (g.ship.invincible <= 0) {
    for (const a of g.asteroids) {
      if (dist(g.ship, a) < g.ship.radius + a.radius * 0.82) {
        killShip(g);
        break;
      }
    }
  }
  // Nivel completado
  if (g.asteroids.length === 0) nextLevel(g);
}
// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-6, 5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
function drawHUD(ctx: CanvasRenderingContext2D, g: GameState) {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${g.score}`, 14, 26);
  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${g.level}`, W / 2, 26);
  for (let i = 0; i < g.lives; i++) drawLifeIcon(ctx, W - 16 - i * 22, 18);
  if (g.ship.tripleShot > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0ff';
    ctx.fillText(`3x  ${g.ship.tripleShot.toFixed(1)}s`, 14, 46);
  }
}
function draw(ctx: CanvasRenderingContext2D, g: GameState) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  g.particles.forEach((p) => p.draw(ctx));
  g.asteroids.forEach((a) => a.draw(ctx));
  g.powerUps.forEach((p) => p.draw(ctx));
  g.bullets.forEach((b) => b.draw(ctx));
  g.ship.draw(ctx);
  drawHUD(ctx, g);
  // Sin overlay "GAME OVER": el fin de partida lo muestra el modal de la plataforma.
}
// ── Motor ─────────────────────────────────────────────────────────────────────
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}
export function createAsteroidsEngine(opts: AsteroidsEngineOptions): AsteroidsEngine {
  const { canvas, onChange, onGameOver } = opts;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Asteroides: el canvas no soporta contexto 2D');
  const keys: Keys = {};
  const justPressed: Keys = {};
  let g = initGame();
  let paused = false;
  let destroyed = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let gameOverNotified = false;
  let lastSnapshot: AsteroidsSnapshot | null = null;
  const pressed = (code: string) => {
    const val = !!justPressed[code];
    justPressed[code] = false;
    return val;
  };
  const clearInput = () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    for (const k of Object.keys(justPressed)) justPressed[k] = false;
  };
  const emit = () => {
    const snapshot: AsteroidsSnapshot = {
      score: g.score,
      lives: g.lives,
      level: g.level,
      tripleShot: g.ship.tripleShot > 0 ? Math.round(g.ship.tripleShot * 10) / 10 : 0,
      state: g.state,
      paused,
    };
    const prev = lastSnapshot;
    if (
      prev &&
      prev.score === snapshot.score &&
      prev.lives === snapshot.lives &&
      prev.level === snapshot.level &&
      prev.tripleShot === snapshot.tripleShot &&
      prev.state === snapshot.state &&
      prev.paused === snapshot.paused
    ) {
      return;
    }
    lastSnapshot = snapshot;
    onChange(snapshot);
  };
  const notifyGameOver = () => {
    if (gameOverNotified) return;
    gameOverNotified = true;
    onGameOver(g.score);
  };
  const loop = (ts: number) => {
    rafId = null;
    if (destroyed || paused) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    update(g, dt, keys, pressed);
    draw(ctx, g);
    emit();
    if (g.state === 'gameover') notifyGameOver();
    rafId = requestAnimationFrame(loop);
  };
  const startLoop = () => {
    if (destroyed || paused || rafId !== null) return;
    // lastTime a null: el primer frame tras arrancar/reanudar usa dt = 0 (sin saltos).
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  };
  const stopLoop = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (destroyed || paused || g.state === 'gameover') return;
    if (isEditableTarget(e.target)) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  };
  // keyup siempre libera la tecla, para que no quede "pegada" tras pausar o escribir.
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  const pause = () => {
    if (destroyed || paused || g.state === 'gameover') return;
    paused = true;
    stopLoop();
    clearInput();
    emit();
  };
  const resume = () => {
    if (destroyed || !paused) return;
    paused = false;
    clearInput();
    startLoop();
    emit();
  };
  const engine: AsteroidsEngine = {
    pause,
    resume,
    togglePause() {
      if (paused) resume();
      else pause();
    },
    restart() {
      if (destroyed) return;
      stopLoop();
      g = initGame();
      paused = false;
      gameOverNotified = false;
      clearInput();
      draw(ctx, g);
      emit();
      startLoop();
    },
    end() {
      if (destroyed || g.state === 'gameover') return;
      g.state = 'gameover';
      paused = false;
      clearInput();
      draw(ctx, g);
      emit();
      notifyGameOver();
      startLoop();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopLoop();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
  // Arranque
  draw(ctx, g);
  emit();
  startLoop();
  return engine;
}
