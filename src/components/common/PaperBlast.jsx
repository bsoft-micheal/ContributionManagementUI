/**
 * Lightweight, zero-dependency canvas-based Paper Blast (Confetti) celebration effect.
 * Creates an explosion of colorful confetti ribbons, streamers, and flakes.
 */

const CONFETTI_COLORS = [
  "#ec4899", // Vibrant Pink
  "#8b5cf6", // Purple
  "#3b82f6", // Sky Blue
  "#10b981", // Emerald Green
  "#f59e0b", // Amber Gold
  "#ef4444", // Coral Red
  "#06b6d4", // Cyan
  "#fbbf24", // Yellow Gold
  "#f43f5e", // Rose
  "#a855f7", // Violet
];

/**
 * Triggers a paper blast confetti explosion at specified screen coordinates (or screen center).
 * @param {number} [originX]
 * @param {number} [originY]
 * @param {number} [count=80]
 */
export function launchPaperBlast(originX, originY, count = 85) {
  if (typeof window === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "999999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const startX = originX !== undefined && originX > 0 ? originX : window.innerWidth * 0.75;
  const startY = originY !== undefined && originY > 0 ? originY : window.innerHeight * 0.45;

  const particles = [];

  for (let i = 0; i < count; i++) {
    // 360-degree burst with upward party popper bias
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 14 + 5;
    const size = Math.random() * 9 + 6;
    const isRibbon = Math.random() > 0.35;

    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed * (Math.random() * 0.7 + 0.6),
      vy: Math.sin(angle) * speed * 0.9 - (Math.random() * 6 + 4), // upward launch force
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      width: isRibbon ? size * 1.8 : size,
      height: isRibbon ? size * 0.6 : size,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 18,
      opacity: 1,
      decay: Math.random() * 0.012 + 0.007,
      gravity: 0.32,
      wobble: Math.random() * Math.PI,
      wobbleSpeed: Math.random() * 0.15 + 0.05,
    });
  }

  let animationFrameId;

  function render() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let activeCount = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.985;
      p.rotation += p.rotSpeed;
      p.wobble += p.wobbleSpeed;
      p.opacity -= p.decay;

      if (p.opacity > 0) {
        activeCount++;
        ctx.save();
        ctx.translate(p.x + Math.sin(p.wobble) * 3, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        ctx.restore();
      }
    }

    if (activeCount > 0) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrameId);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  }

  animationFrameId = requestAnimationFrame(render);
}

/**
 * Triggers a grand multi-burst celebratory paper blast from left, right, and center.
 */
export function launchCelebrationBlast() {
  if (typeof window === "undefined") return;
  // Left burst
  launchPaperBlast(window.innerWidth * 0.32, window.innerHeight * 0.45, 80);
  // Right burst
  setTimeout(() => {
    launchPaperBlast(window.innerWidth * 0.68, window.innerHeight * 0.45, 80);
  }, 180);
  // Center fountain burst
  setTimeout(() => {
    launchPaperBlast(window.innerWidth * 0.5, window.innerHeight * 0.35, 95);
  }, 360);
}
