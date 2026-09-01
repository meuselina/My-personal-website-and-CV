/* =========================================================
   PORTFOLIO INTERACTIONS — landonorris.com style

   Five systems, all driven by ONE animation loop:
   1. Spotlight reveal on the portrait   (red duotone develop)
   2. Interactive dot-grid background    (canvas)
      — excited by the cursor AND by invisible "light streaks"
        that keep flying through the grid on their own
   3. Sticker parallax                   (cursor depth illusion)
   4. Pinned hero scroll sequence        (portrait shrinks,
        holds, then the signature writes itself on the photo)
   Plus: IntersectionObserver reveals sections while scrolling.
   ========================================================= */

// Respect the user's OS setting "reduce motion".
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// lerp(a, b, t) = "go t percent of the way from a to b".
function lerp(a, b, t) {
  return a + (b - a) * t;
}
// clamp01 squeezes any number into the 0…1 range.
function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

/* =========================================================
   1. SPOTLIGHT REVEAL
   ========================================================= */
const portrait = document.getElementById('portrait');
const colorLayer = document.querySelector('.portrait-color');

let targetX = 0, targetY = 0, targetR = 0;
let currentX = 0, currentY = 0, currentR = 0;

const SPOTLIGHT_RADIUS = 190;
const EASE_POSITION = reducedMotion ? 1 : 0.12;
const EASE_RADIUS   = reducedMotion ? 1 : 0.08;

function localCoords(event) {
  const box = portrait.getBoundingClientRect();
  return {
    x: event.clientX - box.left,
    y: event.clientY - box.top,
  };
}

portrait.addEventListener('pointerenter', (event) => {
  const pos = localCoords(event);
  currentX = targetX = pos.x;
  currentY = targetY = pos.y;
  targetR = SPOTLIGHT_RADIUS;
});

portrait.addEventListener('pointermove', (event) => {
  const pos = localCoords(event);
  targetX = pos.x;
  targetY = pos.y;
  targetR = SPOTLIGHT_RADIUS;
});

portrait.addEventListener('pointerleave', () => {
  targetR = 0;
});

function updateSpotlight() {
  currentX = lerp(currentX, targetX, EASE_POSITION);
  currentY = lerp(currentY, targetY, EASE_POSITION);
  currentR = lerp(currentR, targetR, EASE_RADIUS);

  colorLayer.style.setProperty('--mx', currentX + 'px');
  colorLayer.style.setProperty('--my', currentY + 'px');
  colorLayer.style.setProperty('--r', currentR + 'px');
}

/* =========================================================
   2. INTERACTIVE DOT-GRID BACKGROUND + LIGHT STREAKS

   The grid reacts to a LIST of influence points. The cursor
   is one of them. The others are "streaks": invisible points
   that fly through the screen on gently curved paths and
   excite the dots exactly like the cursor does — so the
   background keeps moving on its own, landonorris.com style.
   ========================================================= */
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

const DOT_SPACING = 26;
let dots = [];
let dpr = 1;

// --- the cursor influence point (eased) ---
let mouseX = -9999, mouseY = -9999;
let easedX = -9999, easedY = -9999;

function buildGrid() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width  = window.innerWidth  * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width  = window.innerWidth  + 'px';
  canvas.style.height = window.innerHeight + 'px';

  dots = [];
  for (let y = DOT_SPACING / 2; y < window.innerHeight; y += DOT_SPACING) {
    for (let x = DOT_SPACING / 2; x < window.innerWidth; x += DOT_SPACING) {
      dots.push({ x, y });
    }
  }
}
buildGrid();
window.addEventListener('resize', buildGrid);

window.addEventListener('pointermove', (event) => {
  mouseX = event.clientX;
  mouseY = event.clientY;
});

// --- the streaks ---
const STREAK_COUNT = 3;
const streaks = [];

function spawnStreak(streak, onScreen = false) {
  const w = window.innerWidth, h = window.innerHeight;
  if (onScreen) {
    // First spawn: somewhere visible, flying in a random direction
    streak.x = Math.random() * w;
    streak.y = Math.random() * h;
    streak.angle = Math.random() * Math.PI * 2;
  } else {
    // Respawn: enter from a random edge, aimed inwards
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { streak.x = -150;    streak.y = Math.random() * h; streak.angle = 0; }
    if (edge === 1) { streak.x = w + 150; streak.y = Math.random() * h; streak.angle = Math.PI; }
    if (edge === 2) { streak.x = Math.random() * w; streak.y = -150;    streak.angle = Math.PI / 2; }
    if (edge === 3) { streak.x = Math.random() * w; streak.y = h + 150; streak.angle = -Math.PI / 2; }
    // ±40° variation so paths never look identical
    streak.angle += (Math.random() - 0.5) * (Math.PI / 2.2);
  }
  streak.speed = 2.2 + Math.random() * 3.2;       // px per frame
  streak.curve = (Math.random() - 0.5) * 0.012;   // gentle arc
  streak.radius = 110 + Math.random() * 70;       // influence size
}

for (let i = 0; i < STREAK_COUNT; i++) {
  const s = {};
  spawnStreak(s, true);
  streaks.push(s);
}

function updateStreaks() {
  const w = window.innerWidth, h = window.innerHeight;
  for (const s of streaks) {
    s.x += Math.cos(s.angle) * s.speed;
    s.y += Math.sin(s.angle) * s.speed;
    s.angle += s.curve;                  // the path bends slightly
    // Far off-screen? Fly in again from somewhere else.
    if (s.x < -300 || s.x > w + 300 || s.y < -300 || s.y > h + 300) {
      spawnStreak(s);
    }
  }
}

function drawDots() {
  easedX = lerp(easedX, mouseX, 0.15);
  easedY = lerp(easedY, mouseY, 0.15);

  // Everything that excites the grid this frame:
  const points = reducedMotion
    ? []
    : [{ x: easedX, y: easedY, radius: 190 }, ...streaks];

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  for (const dot of dots) {
    // Find the strongest influence on this dot
    let t = 0, px = 0, py = 0, pd = 1;
    for (const p of points) {
      const dx = dot.x - p.x;
      const dy = dot.y - p.y;
      const dist = Math.hypot(dx, dy);
      const ti = Math.max(0, 1 - dist / p.radius);
      if (ti > t) { t = ti; px = dx; py = dy; pd = dist; }
    }

    const push = t * t * 16;             // dots flee the influence point
    const x = dot.x + (pd > 0 ? (px / pd) * push : 0);
    const y = dot.y + (pd > 0 ? (py / pd) * push : 0);

    // Blend dark grey → racing red as t rises.
    // (Dots are darker than before: they sit on grey now.)
    const r = Math.round(58 + (225 - 58) * t);
    const g = Math.round(58 + (6   - 58) * t);
    const b = Math.round(62 + (0   - 62) * t);
    const alpha = 0.22 + t * 0.6;
    const size  = 1 + t * 1.5;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.fill();
  }
}

/* =========================================================
   3. STICKER PARALLAX
   ========================================================= */
const stickers = [...document.querySelectorAll('.sticker')].map((el) => ({
  el,
  depth: parseFloat(el.dataset.depth) || 0.08,
  x: 0,
  y: 0,
}));

let normX = 0, normY = 0;
window.addEventListener('pointermove', (event) => {
  normX = event.clientX / window.innerWidth  - 0.5;
  normY = event.clientY / window.innerHeight - 0.5;
});

function updateStickers() {
  if (reducedMotion) return;
  for (const s of stickers) {
    s.x = lerp(s.x, normX * s.depth * 700, 0.06);
    s.y = lerp(s.y, normY * s.depth * 500, 0.06);
    s.el.style.translate = `${s.x}px ${s.y}px`;
  }
}

/* =========================================================
   4. PINNED HERO SCROLL SEQUENCE

   #home is 260vh tall, its .hero-stage is sticky. While the
   stage is pinned we translate scroll distance into progress
   p = 0…1 and choreograph:

     p 0.00 – 0.35  portrait scales 1 → 0.62 (shrink)
     p 0.35 – 0.50  nothing moves (the "hold")
     p 0.50 – 0.85  signature wipes in across the photo
   ========================================================= */
const hero = document.getElementById('home');
const heroName = document.querySelector('.hero-name');
const heroStickers = document.querySelector('.stickers');
const signature = document.querySelector('.signature');
const tagline = document.querySelector('.hero-tagline');

function updateHeroScroll() {
  if (reducedMotion) return;

  const total = hero.offsetHeight - window.innerHeight;  // pinned distance
  const p = clamp01(window.scrollY / total);

  // --- portrait: shrink, then hold ---
  const shrink = clamp01(p / 0.35);
  // ease-out: fast at first, soft landing
  const eased = 1 - Math.pow(1 - shrink, 3);
  const scale = 1 - 0.38 * eased;                        // 1 → 0.62
  portrait.style.scale = scale;

  // --- giant name: drifts up and fades a little ---
  heroName.style.translate = `0 ${p * -120}px`;
  heroName.style.opacity = 1 - p * 0.55;

  // --- stickers & tagline: gone early, they had their moment ---
  const fadeOut = 1 - clamp01(p / 0.28);
  heroStickers.style.opacity = fadeOut;
  tagline.style.opacity = fadeOut;

  // --- signature: writes itself onto the photo ---
  const sig = clamp01((p - 0.5) / 0.35);
  signature.style.opacity = sig > 0 ? 1 : 0;
  signature.style.clipPath = `inset(-20% ${(1 - sig) * 100}% -20% 0)`;
}

/* =========================================================
   THE ONE LOOP
   ========================================================= */
function tick() {
  updateSpotlight();
  updateStreaks();
  drawDots();
  updateStickers();
  updateHeroScroll();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

/* =========================================================
   ENTRANCE — body.is-loaded triggers the staggered sticker
   pop-in (see CSS transition-delays).
   ========================================================= */
window.addEventListener('load', () => {
  document.body.classList.add('is-loaded');
});
// Fallback: if 'load' hangs on a slow asset, start anyway.
setTimeout(() => document.body.classList.add('is-loaded'), 2500);

/* =========================================================
   SCROLL REVEALS
   ========================================================= */
const revealables = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }
}, { threshold: 0.15 });

revealables.forEach((el, i) => {
  el.style.transitionDelay = `${(i % 3) * 0.12}s`;
  observer.observe(el);
});
