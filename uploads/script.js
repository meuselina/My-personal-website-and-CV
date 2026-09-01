/* =========================================================
   THE SPOTLIGHT REVEAL — landonorris.com style

   Upgrade over version 1:
   The spotlight no longer jumps to the cursor. Instead it
   GLIDES after it, like it's attached with a rubber band.

   The trick has two parts:
   1. We remember TWO positions: where the cursor IS (target)
      and where the spotlight currently is (current).
   2. 60 times per second we move "current" a small step
      towards "target". Never all the way — just 12% of the
      remaining distance. That produces the smooth trailing.

   This "move a fraction of the remaining distance" is called
   LERP (linear interpolation) and powers almost every smooth
   animation you see on award-winning websites.
   ========================================================= */

const portrait = document.getElementById('portrait');
const colorLayer = document.querySelector('.portrait-color');

// --- State ---------------------------------------------------
// target*: where the spotlight WANTS to be (follows the cursor)
// current*: where the spotlight IS right now (eases towards target)
let targetX = 0, targetY = 0, targetR = 0;
let currentX = 0, currentY = 0, currentR = 0;

// The spotlight size when open, in pixels.
const SPOTLIGHT_RADIUS = 180;

// Respect the user's OS setting "reduce motion":
// factor 1 = jump instantly (no trailing), 0.12 = smooth glide.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const EASE_POSITION = reducedMotion ? 1 : 0.12;
const EASE_RADIUS   = reducedMotion ? 1 : 0.08;

// --- Helper --------------------------------------------------
// lerp(a, b, t) = "go t percent of the way from a to b".
// Example: lerp(0, 100, 0.12) → 12. Called every frame, the
// remaining distance shrinks by 12% each time — fast at first,
// gently slowing down as it arrives. Free easing!
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Converts a pointer event into coordinates INSIDE the portrait.
function localCoords(event) {
  const box = portrait.getBoundingClientRect();
  return {
    x: event.clientX - box.left,
    y: event.clientY - box.top,
  };
}

// --- Events: only update the TARGET, never the visuals -------
portrait.addEventListener('pointerenter', (event) => {
  // Teleport the spotlight to the entry point, so it doesn't
  // fly across the image from wherever it was last time.
  const pos = localCoords(event);
  currentX = targetX = pos.x;
  currentY = targetY = pos.y;
  targetR = SPOTLIGHT_RADIUS;   // open up…
});

portrait.addEventListener('pointermove', (event) => {
  const pos = localCoords(event);
  targetX = pos.x;
  targetY = pos.y;
  targetR = SPOTLIGHT_RADIUS;
});

portrait.addEventListener('pointerleave', () => {
  targetR = 0;                  // …shrink closed when leaving
});

// --- The animation loop --------------------------------------
// requestAnimationFrame = "browser, call this function right
// before you paint the next frame" (usually 60×/second).
// Inside, we nudge current towards target and write the result
// into the CSS variables that the mask in style.css reads.
function animate() {
  currentX = lerp(currentX, targetX, EASE_POSITION);
  currentY = lerp(currentY, targetY, EASE_POSITION);
  currentR = lerp(currentR, targetR, EASE_RADIUS);

  colorLayer.style.setProperty('--mx', currentX + 'px');
  colorLayer.style.setProperty('--my', currentY + 'px');
  colorLayer.style.setProperty('--r', currentR + 'px');

  requestAnimationFrame(animate); // schedule the NEXT frame → endless loop
}

requestAnimationFrame(animate);   // kick the loop off once


/* =========================================================
   SCROLL REVEAL — sections fade in as you scroll to them

   Tool of choice: IntersectionObserver. Instead of checking
   positions on every scroll event (slow!), we register the
   sections once and the browser notifies us the moment one
   of them enters the viewport.
   ========================================================= */

// 1. Collect every content section — but NOT the hero,
//    which is already visible when the page loads.
//    querySelectorAll returns a list we can loop over.
const revealSections = document.querySelectorAll('main section:not(#home)');

// 2. Add the .reveal starting state via JS (not in the HTML).
//    If JS doesn't load, no class is added → content stays visible.
revealSections.forEach((section) => {
  section.classList.add('reveal');
});

// 3. Create the observer. It calls our function with a list of
//    "entries" — one per observed element whose visibility changed.
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      // entry.isIntersecting = "is this element in view right now?"
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');   // triggers the CSS transition

        // The animation should only play once. unobserve = "stop
        // watching this one" — scrolling back up won't re-hide it.
        observer.unobserve(entry.target);
      }
    });
  },
  {
    // threshold 0.15 = fire when 15% of the section is visible.
    // 0 would feel too early (fires while still off-screen edge),
    // 0.5 too late for tall sections on small screens.
    threshold: 0.15,
  }
);

// 4. Tell the observer which elements to watch.
revealSections.forEach((section) => {
  observer.observe(section);
});


/* =========================================================
   STAT COUNTERS — numbers count up when scrolled into view

   Combines two things you already know:
   - IntersectionObserver (from the scroll reveal) decides WHEN
   - requestAnimationFrame (from the spotlight) animates HOW
   ========================================================= */

const statNumbers = document.querySelectorAll('.stat-number');

function animateCounter(el) {
  // dataset.target reads the data-target="4" attribute from the
  // HTML. Attributes are always strings — Number() converts "4" → 4.
  const target = Number(el.dataset.target);

  // Accessibility: reduced motion users get the final value instantly.
  // (reducedMotion is already defined at the top of this file.)
  if (reducedMotion) {
    el.textContent = target;
    return;
  }

  const duration = 1500;               // total time in milliseconds
  const start = performance.now();     // high-precision "now" timestamp

  function tick(now) {
    // progress: 0 at the start → 1 when `duration` has passed.
    // Math.min caps it at 1 so we never overshoot the target.
    const progress = Math.min((now - start) / duration, 1);

    // Easing: raw progress is linear (robotic). This formula —
    // "ease-out cubic" — starts fast and lands gently, so the
    // last few numbers tick in slowly. Feels far more alive.
    const eased = 1 - Math.pow(1 - progress, 3);

    el.textContent = Math.round(target * eased);

    // Keep going until progress reaches 1.
    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

// Watch the stats section; start all counters the moment it appears.
const statsSection = document.getElementById('stats');

const statsObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        statNumbers.forEach(animateCounter);
        statsObserver.unobserve(entry.target);  // count up only once
      }
    });
  },
  { threshold: 0.4 }   // fire when 40% of the band is visible
);

statsObserver.observe(statsSection);
