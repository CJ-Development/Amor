(function () {
  'use strict';

  const canvas = document.getElementById('flowerCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GOLDEN_ANGLE = 137.508 * (Math.PI / 180);

  // Curated crimson + purple palettes harmonized with #0b0912 nocturnal theme
  const PALETTES = [
    {
      name: 'crimson-velvet',
      outer: '#7d1437',
      mid: '#cc2e5d',
      inner: '#f26d93',
      stroke: 'rgba(255, 138, 174, 0.72)',
      glow: 'rgba(218, 56, 104, 0.35)',
      core: '#f2c98a'
    },
    {
      name: 'ruby-wine',
      outer: '#611132',
      mid: '#b3224c',
      inner: '#e65e84',
      stroke: 'rgba(245, 122, 158, 0.68)',
      glow: 'rgba(195, 42, 86, 0.32)',
      core: '#ffe0ad'
    },
    {
      name: 'royal-amethyst',
      outer: '#4a218c',
      mid: '#8754cf',
      inner: '#c8a8f5',
      stroke: 'rgba(214, 186, 255, 0.72)',
      glow: 'rgba(155, 114, 212, 0.35)',
      core: '#f2c98a'
    },
    {
      name: 'wine-orchid',
      outer: '#681c59',
      mid: '#b33d82',
      inner: '#eb96c2',
      stroke: 'rgba(244, 168, 210, 0.7)',
      glow: 'rgba(196, 78, 148, 0.34)',
      core: '#ffe2b3'
    },
    {
      name: 'crimson-violet',
      outer: '#561858',
      mid: '#be2d64',
      inner: '#d99af4',
      stroke: 'rgba(236, 168, 248, 0.7)',
      glow: 'rgba(192, 62, 132, 0.34)',
      core: '#f2c98a'
    }
  ];

  const FLOWER_TYPES = ['rose', 'lotus', 'phyllotaxis'];

  let W = 0;
  let H = 0;
  let dpr = 1;
  let bouquet = [];
  let ambientFlowers = [];
  let celebrationFlowers = [];
  let motes = [];
  let ripples = [];
  let rippleTimer = 0;
  let rafId = null;
  let startTime = performance.now();
  let lastFrame = startTime;
  let elapsed = 0;
  const setupInitialEl = document.getElementById('setupScreen');
  const startsInShowcase = !!(setupInitialEl && setupInitialEl.classList.contains('garden-mode') && setupInitialEl.style.display !== 'none');
  let showcaseTarget = startsInShowcase ? 1 : 0;
  let showcaseMix = showcaseTarget;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - clamp01(t), 3);
  }

  function easeInOutSine(t) {
    return -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;
  }

  // Evaluate quadratic Bezier point & tangent
  function quadPoint(x0, y0, cx, cy, x1, y1, t) {
    const u = 1 - t;
    return {
      x: u * u * x0 + 2 * u * t * cx + t * t * x1,
      y: u * u * y0 + 2 * u * t * cy + t * t * y1
    };
  }

  function quadTangentAngle(x0, y0, cx, cy, x1, y1, t) {
    const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
    const dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
    return Math.atan2(dy, dx);
  }

  // Draw a curved stem progressively (like Python turtle tracing forward) + unfurling leaves
  function drawStem(x0, y0, cx, cy, x1, y1, progress, alpha, stemWidth, leaves) {
    if (progress <= 0.005 || alpha <= 0.005) return null;
    const p = easeOutCubic(progress);
    const steps = 26;
    const maxStep = Math.max(2, Math.floor(steps * p));

    ctx.save();
    ctx.globalAlpha = alpha;

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    grad.addColorStop(0, 'rgba(62, 52, 92, 0.35)');
    grad.addColorStop(0.45, 'rgba(72, 114, 108, 0.72)');
    grad.addColorStop(1, 'rgba(132, 94, 152, 0.85)');

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    let tip = { x: x0, y: y0 };
    for (let i = 1; i <= maxStep; i++) {
      const t = (i / steps);
      if (t > p) break;
      tip = quadPoint(x0, y0, cx, cy, x1, y1, t);
      ctx.lineTo(tip.x, tip.y);
    }
    tip = quadPoint(x0, y0, cx, cy, x1, y1, p);
    ctx.lineTo(tip.x, tip.y);

    ctx.strokeStyle = grad;
    ctx.lineWidth = stemWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Unfurling botanical leaves along stem
    if (leaves && leaves.length) {
      leaves.forEach(function (lf) {
        if (p <= lf.t) return;
        const leafProg = easeOutCubic((p - lf.t) / 0.28);
        const anchor = quadPoint(x0, y0, cx, cy, x1, y1, lf.t);
        const baseAngle = quadTangentAngle(x0, y0, cx, cy, x1, y1, lf.t);
        const angle = baseAngle + lf.side * (0.58 + lf.spread * 0.25);
        const len = lf.len * leafProg;
        const wid = len * 0.34;

        ctx.save();
        ctx.translate(anchor.x, anchor.y);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.48, -wid, len, 0);
        ctx.quadraticCurveTo(len * 0.48, wid, 0, 0);

        const lGrad = ctx.createLinearGradient(0, 0, len, 0);
        lGrad.addColorStop(0, 'rgba(66, 110, 108, 0.35)');
        lGrad.addColorStop(1, 'rgba(148, 86, 138, 0.28)');
        ctx.fillStyle = lGrad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(140, 178, 168, 0.38)';
        ctx.lineWidth = 0.85;
        ctx.stroke();
        ctx.restore();
      });
    }

    ctx.restore();
    return tip;
  }

  // Draw a single teardrop/botanical petal progressively (outline traces first, velvet fill blooms in)
  function drawPetal(len, wid, progress, fillStyle, strokeStyle, showSpark) {
    if (progress <= 0.01) return;
    const p = clamp01(progress);
    const curLen = len * (0.28 + 0.72 * easeOutCubic(p));
    const curWid = wid * (0.22 + 0.78 * easeOutCubic(p));

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(curLen * 0.32, -curWid, curLen * 0.78, -curWid * 0.72, curLen, 0);
    ctx.bezierCurveTo(curLen * 0.78, curWid * 0.72, curLen * 0.32, curWid, 0, 0);

    if (p > 0.22) {
      const fillAlpha = clamp01((p - 0.22) / 0.78);
      ctx.save();
      ctx.globalAlpha *= fillAlpha;
      ctx.fillStyle = fillStyle;
      ctx.fill();
      ctx.restore();
    }

    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    // Subtle glowing vein down center of petal
    if (p > 0.45) {
      ctx.beginPath();
      ctx.moveTo(curLen * 0.08, 0);
      ctx.lineTo(curLen * 0.68, 0);
      ctx.strokeStyle = 'rgba(255, 224, 240, 0.22)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // Turtle-like drawing tip sparkle while actively blooming
    if (showSpark && p > 0.08 && p < 0.92) {
      ctx.beginPath();
      ctx.arc(curLen, 0, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe9c4';
      ctx.fill();
    }
  }

  // Species 1: Layered Velvet Spiral Rose (crimson/amethyst concentric petals)
  function drawRose(x, y, radius, progress, alpha, palette, rot) {
    if (progress <= 0.005 || alpha <= 0.005) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;

    // Soft nocturnal glow halo behind flower
    const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, radius * 1.35);
    halo.addColorStop(0, palette.glow);
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.35, 0, Math.PI * 2);
    ctx.fill();

    const rings = [
      { count: 8, len: radius * 1.02, wid: radius * 0.42, start: 0.0, span: 0.55, c0: palette.outer, c1: palette.mid, offset: 0 },
      { count: 7, len: radius * 0.74, wid: radius * 0.34, start: 0.24, span: 0.52, c0: palette.mid, c1: palette.inner, offset: 0.42 },
      { count: 5, len: radius * 0.44, wid: radius * 0.24, start: 0.48, span: 0.46, c0: palette.inner, c1: '#ffd4e6', offset: 0.9 }
    ];

    rings.forEach(function (ring) {
      const ringProg = clamp01((progress - ring.start) / ring.span);
      if (ringProg <= 0) return;

      const grad = ctx.createLinearGradient(0, 0, ring.len, 0);
      grad.addColorStop(0, ring.c0);
      grad.addColorStop(0.7, ring.c1);
      grad.addColorStop(1, 'rgba(255, 232, 244, 0.55)');

      for (let i = 0; i < ring.count; i++) {
        const localP = clamp01(ringProg * ring.count - i * 0.65);
        if (localP <= 0) continue;
        const a = ring.offset + (i / ring.count) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ctx.globalAlpha = alpha * 0.62;
        drawPetal(ring.len, ring.wid, localP, grad, palette.stroke, true);
        ctx.restore();
      }
    });

    // Warm golden stamen center
    const coreP = clamp01((progress - 0.65) / 0.35);
    if (coreP > 0) {
      drawFlowerCore(radius * 0.17, coreP, alpha, palette.core);
    }

    ctx.restore();
  }

  // Species 2: Luminous Lotus / Cosmos (double-ring slender turtle arcs)
  function drawLotus(x, y, radius, progress, alpha, palette, rot) {
    if (progress <= 0.005 || alpha <= 0.005) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;

    const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, radius * 1.3);
    halo.addColorStop(0, palette.glow);
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.3, 0, Math.PI * 2);
    ctx.fill();

    const outerN = 9;
    const outerGrad = ctx.createLinearGradient(0, 0, radius * 1.12, 0);
    outerGrad.addColorStop(0, palette.outer);
    outerGrad.addColorStop(0.55, palette.mid);
    outerGrad.addColorStop(1, palette.inner);

    for (let i = 0; i < outerN; i++) {
      const lp = clamp01(progress * 1.45 * outerN - i * 0.72) / 1.15;
      if (lp <= 0) continue;
      ctx.save();
      ctx.rotate((i / outerN) * Math.PI * 2);
      ctx.globalAlpha = alpha * 0.56;
      drawPetal(radius * 1.1, radius * 0.25, lp, outerGrad, palette.stroke, true);
      ctx.restore();
    }

    const innerProg = clamp01((progress - 0.28) / 0.72);
    if (innerProg > 0) {
      const innerN = 9;
      const innerGrad = ctx.createLinearGradient(0, 0, radius * 0.72, 0);
      innerGrad.addColorStop(0, palette.mid);
      innerGrad.addColorStop(1, '#ffe0ee');

      for (let j = 0; j < innerN; j++) {
        const lp = clamp01(innerProg * innerN - j * 0.65);
        if (lp <= 0) continue;
        ctx.save();
        ctx.rotate(((j + 0.5) / innerN) * Math.PI * 2);
        ctx.globalAlpha = alpha * 0.52;
        drawPetal(radius * 0.68, radius * 0.17, lp, innerGrad, palette.stroke, false);
        ctx.restore();
      }
    }

    const coreP = clamp01((progress - 0.55) / 0.45);
    if (coreP > 0) {
      drawFlowerCore(radius * 0.2, coreP, alpha, palette.core);
    }

    ctx.restore();
  }

  // Species 3: Golden-Angle Phyllotaxis Flower (137.508° Python math spiral!)
  function drawPhyllotaxis(x, y, radius, progress, alpha, palette, rot) {
    if (progress <= 0.005 || alpha <= 0.005) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;

    const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, radius * 1.25);
    halo.addColorStop(0, palette.glow);
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.25, 0, Math.PI * 2);
    ctx.fill();

    const totalPetals = 42;
    const visible = Math.floor(easeOutCubic(progress) * totalPetals);
    const spread = radius / Math.sqrt(totalPetals);

    for (let i = 0; i < visible; i++) {
      const t = i / totalPetals;
      const r = spread * Math.sqrt(i + 1) * 0.72;
      const a = i * GOLDEN_ANGLE;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      const pLen = radius * (0.14 + 0.28 * t);
      const pWid = pLen * 0.38;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a);

      let fill = palette.core;
      if (t > 0.58) fill = palette.inner;
      else if (t > 0.22) fill = palette.mid;

      ctx.globalAlpha = alpha * (t < 0.2 ? 0.8 : 0.58);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(pLen * 0.55, -pWid, pLen, 0);
      ctx.quadraticCurveTo(pLen * 0.55, pWid, 0, 0);
      ctx.fillStyle = fill;
      ctx.fill();

      ctx.strokeStyle = t < 0.2 ? 'rgba(255, 236, 194, 0.75)' : palette.stroke;
      ctx.lineWidth = 0.65;
      ctx.stroke();

      // Sparkle on the latest petal being drawn
      if (i === visible - 1 && progress < 0.96) {
        ctx.beginPath();
        ctx.arc(pLen, 0, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = '#fff1d0';
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  function drawFlowerCore(r, progress, alpha, coreColor) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.88 * progress;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.4);
    g.addColorStop(0, '#fff5db');
    g.addColorStop(0.55, coreColor);
    g.addColorStop(1, 'rgba(242, 201, 138, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Delicate pollen dots
    const dots = 8;
    for (let i = 0; i < dots; i++) {
      const a = (i / dots) * Math.PI * 2;
      const dr = r * 0.82 * progress;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * dr, Math.sin(a) * dr, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#fff2d2';
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSpecies(type, x, y, radius, progress, alpha, palette, rot) {
    if (type === 'rose') drawRose(x, y, radius, progress, alpha, palette, rot);
    else if (type === 'lotus') drawLotus(x, y, radius, progress, alpha, palette, rot);
    else drawPhyllotaxis(x, y, radius, progress, alpha, palette, rot);
  }

  // Build the Center Bouquet (anchored gracefully at bottom-center)
  function buildBouquet() {
    bouquet = [];
    const narrow = W < 640;
    const spreadX = narrow ? W * 0.42 : Math.min(W * 0.27, 300);
    const baseH = H;
    const baseScale = narrow ? 0.72 : 1;

    // 9 balanced botanical stems framing the center
    const specs = [
      { dx: 0.0,   hy: 0.54, curve: 0.05,  r: 46, type: 'rose',        pal: 0, delay: 0.15 },
      { dx: -0.34, hy: 0.46, curve: -0.22, r: 40, type: 'phyllotaxis', pal: 2, delay: 0.45 },
      { dx: 0.34,  hy: 0.48, curve: 0.24,  r: 41, type: 'rose',        pal: 3, delay: 0.65 },
      { dx: -0.68, hy: 0.37, curve: -0.45, r: 36, type: 'lotus',       pal: 1, delay: 0.95 },
      { dx: 0.68,  hy: 0.39, curve: 0.44,  r: 36, type: 'lotus',       pal: 4, delay: 1.15 },
      { dx: -0.20, hy: 0.29, curve: -0.14, r: 32, type: 'rose',        pal: 1, delay: 1.45 },
      { dx: 0.22,  hy: 0.28, curve: 0.15,  r: 33, type: 'phyllotaxis', pal: 0, delay: 1.65 },
      { dx: -0.96, hy: 0.25, curve: -0.65, r: 28, type: 'phyllotaxis', pal: 2, delay: 1.95 },
      { dx: 0.96,  hy: 0.26, curve: 0.62,  r: 29, type: 'rose',        pal: 3, delay: 2.15 }
    ];

    specs.forEach(function (s, idx) {
      const x0 = W * 0.5 + s.dx * (narrow ? 14 : 24);
      const y0 = baseH + 26;
      const x1 = W * 0.5 + s.dx * spreadX;
      const y1 = baseH - Math.max(180, H * s.hy);
      const cx = (x0 + x1) * 0.5 + s.curve * (narrow ? 45 : 75);
      const cy = (y0 + y1) * 0.52;

      bouquet.push({
        x0: x0, y0: y0, cx: cx, cy: cy, x1: x1, y1: y1,
        radius: s.r * baseScale,
        type: s.type,
        palette: PALETTES[s.pal],
        delay: s.delay,
        stemDur: 1.55,
        bloomDur: 2.35,
        swaySpeed: 0.55 + (idx % 4) * 0.12,
        swayPhase: idx * 0.9,
        swayAmp: narrow ? 4 : 7,
        rotOffset: rand(0, Math.PI * 2),
        leaves: [
          { t: 0.38, side: s.dx >= 0 ? 1 : -1, len: (24 + (idx % 3) * 5) * baseScale, spread: 0.3 },
          { t: 0.66, side: s.dx >= 0 ? -1 : 1, len: (19 + (idx % 2) * 5) * baseScale, spread: 0.5 }
        ]
      });
    });
  }

  // Pick a graceful coordinate for an ambient sprouting flower
  function pickAmbientSpot() {
    const wide = W > 880;
    let x, y;
    if (wide && Math.random() < 0.78) {
      // Favor the open wings beside the central 720px column so every bloom shines clearly
      const leftSide = Math.random() < 0.5;
      const wingW = Math.max(110, (W - 720) * 0.5);
      x = leftSide ? rand(36, Math.max(60, wingW + 28)) : rand(Math.min(W - 60, W - wingW - 28), W - 36);
      y = rand(70, H - 70);
    } else {
      x = rand(40, W - 40);
      y = rand(60, H - 80);
    }
    return { x: x, y: y };
  }

  function createAmbientFlower(initialProgressOffset) {
    const spot = pickAmbientSpot();
    const stemLen = rand(52, 118);
    const lean = rand(-28, 28);
    const x1 = spot.x;
    const y1 = spot.y;
    const x0 = x1 - lean * 0.45;
    const y0 = y1 + stemLen;
    const cx = (x0 + x1) * 0.5 + lean * 0.7;
    const cy = (y0 + y1) * 0.5;

    const stemDur = rand(1.1, 1.7);
    const bloomDur = rand(2.1, 3.0);
    const holdDur = rand(5.5, 10.5);
    const fadeDur = 2.4;
    const totalLife = stemDur + bloomDur + holdDur + fadeDur;

    return {
      x0: x0, y0: y0, cx: cx, cy: cy, x1: x1, y1: y1,
      radius: rand(16, 30) * (W < 600 ? 0.82 : 1),
      type: pick(FLOWER_TYPES),
      palette: pick(PALETTES),
      age: initialProgressOffset !== undefined ? initialProgressOffset * totalLife : -rand(0, 3.2),
      stemDur: stemDur,
      bloomDur: bloomDur,
      holdDur: holdDur,
      fadeDur: fadeDur,
      maxAlpha: W > 880 ? rand(0.55, 0.78) : rand(0.36, 0.52),
      swayPhase: rand(0, Math.PI * 2),
      swaySpeed: rand(0.6, 1.1),
      rotOffset: rand(0, Math.PI * 2),
      leaves: [
        { t: 0.46, side: Math.random() < 0.5 ? 1 : -1, len: rand(12, 20), spread: 0.4 }
      ]
    };
  }

  function buildAmbientFlowers() {
    ambientFlowers = [];
    const count = W > 1100 ? 18 : W > 760 ? 14 : 10;
    for (let i = 0; i < count; i++) {
      // Stagger initial ages so flowers are continuously blooming at different phases
      ambientFlowers.push(createAmbientFlower(i / count * 0.75));
    }
  }

  // Drifting glowing petals & golden pollen motes
  function createMote(randomY) {
    const colors = ['#e8648c', '#c8a8f5', '#f2c98a', '#d63e6c', '#b482eb'];
    return {
      x: rand(0, W),
      y: randomY ? rand(0, H) : H + rand(10, 60),
      vx: rand(-9, 9),
      vy: -rand(8, 22),
      size: rand(1.4, 3.6),
      isPetal: Math.random() < 0.45,
      color: pick(colors),
      alpha: rand(0.18, 0.52),
      phase: rand(0, Math.PI * 2),
      rot: rand(0, Math.PI * 2),
      rotSpeed: rand(-0.8, 0.8)
    };
  }

  function buildMotes() {
    motes = [];
    const count = W < 600 ? 14 : 24;
    for (let i = 0; i < count; i++) motes.push(createMote(true));
  }

  function getWaterTop() {
    return H - Math.max(76, Math.min(132, H * 0.145));
  }

  function spawnRipple(isCenter) {
    const waterTop = getWaterTop();
    const x = isCenter
      ? W * 0.5 + rand(-36, 36)
      : rand(W * 0.08, W * 0.92);
    const y = isCenter
      ? waterTop + rand(16, 42)
      : rand(waterTop + 14, H - 16);
    ripples.push({
      x: x,
      y: y,
      age: 0,
      dur: rand(3.2, 4.8),
      maxRx: isCenter ? rand(55, 110) : rand(30, 68),
      color: isCenter ? 'rgba(232, 148, 186, ' : 'rgba(196, 168, 245, '
    });
  }

  function buildRipples() {
    ripples = [];
    spawnRipple(true);
    spawnRipple(false);
    if (ripples[0]) ripples[0].age = 1.1;
    if (ripples[1]) ripples[1].age = 2.0;
  }

  // Nocturnal moving water with layered waves, bouquet reflections & ripples
  function drawWater(t, dt, isStatic) {
    const waterTop = getWaterTop();
    const waterH = H - waterTop;
    const boost = 0.72 + showcaseMix * 0.28;

    ctx.save();

    // 1. Base midnight pond fill (feathered top edge)
    const baseGrad = ctx.createLinearGradient(0, waterTop - 16, 0, H);
    baseGrad.addColorStop(0, 'rgba(14, 10, 28, 0)');
    baseGrad.addColorStop(0.18, 'rgba(18, 13, 36, ' + (0.58 * boost).toFixed(3) + ')');
    baseGrad.addColorStop(0.55, 'rgba(16, 11, 34, ' + (0.76 * boost).toFixed(3) + ')');
    baseGrad.addColorStop(1, 'rgba(10, 7, 22, ' + (0.92 * boost).toFixed(3) + ')');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, waterTop - 16, W, waterH + 16);

    // 2. Shimmering floral reflections dancing on the water beneath the bouquet
    const reflCenterX = W * 0.5;
    const reflWidth = Math.min(W * 0.42, 290);
    const bands = 14;
    for (let b = 0; b < bands; b++) {
      const f = b / bands;
      const by = waterTop + 10 + f * (waterH - 14);
      const waveShift = Math.sin(t * 1.6 + b * 0.85) * (6 + f * 12);
      const bw = reflWidth * (1 - f * 0.42) * (0.78 + 0.22 * Math.sin(t * 1.15 + b * 1.3));
      const bh = 2.2 + f * 2.4;
      const alpha = (1 - f) * (0.14 + showcaseMix * 0.1) * (0.7 + 0.3 * Math.sin(t * 2.1 + b));

      const rGrad = ctx.createLinearGradient(reflCenterX - bw + waveShift, by, reflCenterX + bw + waveShift, by);
      rGrad.addColorStop(0, 'rgba(155, 114, 212, 0)');
      rGrad.addColorStop(0.25, 'rgba(155, 114, 212, ' + (alpha * 0.75).toFixed(3) + ')');
      rGrad.addColorStop(0.5, 'rgba(218, 62, 112, ' + (alpha * 1.15).toFixed(3) + ')');
      rGrad.addColorStop(0.68, 'rgba(242, 201, 138, ' + (alpha * 0.65).toFixed(3) + ')');
      rGrad.addColorStop(1, 'rgba(155, 114, 212, 0)');

      ctx.fillStyle = rGrad;
      ctx.beginPath();
      ctx.ellipse(reflCenterX + waveShift, by, bw, bh, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Three undulating translucent wave layers with luminous moonlit crests
    const waveLayers = [
      { yOff: 4,  amp1: 5.5, freq1: 0.0085, spd1: 0.85, amp2: 2.5, freq2: 0.019, spd2: -0.55, fill: 'rgba(42, 26, 74, 0.26)', stroke: 'rgba(200, 168, 245, 0.28)', lw: 1.2 },
      { yOff: 22, amp1: 6.5, freq1: 0.0068, spd1: -0.72, amp2: 3.0, freq2: 0.015, spd2: 0.62,  fill: 'rgba(64, 24, 62, 0.24)', stroke: 'rgba(232, 155, 184, 0.24)', lw: 1.1 },
      { yOff: 46, amp1: 7.0, freq1: 0.0055, spd1: 0.6,   amp2: 2.8, freq2: 0.013, spd2: -0.48, fill: 'rgba(22, 14, 42, 0.34)', stroke: 'rgba(242, 201, 138, 0.16)', lw: 1.0 }
    ];

    const stepX = Math.max(12, Math.floor(W / 64));
    waveLayers.forEach(function (wl) {
      ctx.beginPath();
      for (let x = 0; x <= W + stepX; x += stepX) {
        const y = waterTop + wl.yOff
          + Math.sin(x * wl.freq1 + t * wl.spd1) * wl.amp1
          + Math.cos(x * wl.freq2 + t * wl.spd2) * wl.amp2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      // Stroke delicate shimmering wave crest
      ctx.strokeStyle = wl.stroke;
      ctx.lineWidth = wl.lw;
      ctx.stroke();

      // Fill wave body to bottom
      ctx.lineTo(W + stepX, H + 4);
      ctx.lineTo(0, H + 4);
      ctx.closePath();
      ctx.fillStyle = wl.fill;
      ctx.fill();
    });

    // 4. Expanding elliptical water ripples (around bouquet stems & across pond)
    if (!isStatic) {
      rippleTimer += dt;
      if (rippleTimer > 1.35) {
        rippleTimer = 0;
        if (ripples.length < 7) {
          spawnRipple(Math.random() < 0.62);
        }
      }
    }

    for (let r = ripples.length - 1; r >= 0; r--) {
      const rp = ripples[r];
      if (!isStatic) rp.age += dt;
      const p = rp.age / rp.dur;
      if (p >= 1) {
        ripples.splice(r, 1);
        continue;
      }
      const rx = 8 + easeOutCubic(p) * rp.maxRx;
      const ry = rx * 0.2;
      const alpha = Math.sin(p * Math.PI) * (0.28 + showcaseMix * 0.16);

      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = rp.color + alpha.toFixed(3) + ')';
      ctx.lineWidth = 1.05;
      ctx.stroke();

      // Inner secondary echo ring
      if (p > 0.18) {
        const p2 = clamp01((p - 0.18) / 0.82);
        const rx2 = 4 + easeOutCubic(p2) * (rp.maxRx * 0.68);
        ctx.beginPath();
        ctx.ellipse(rp.x, rp.y, rx2, rx2 * 0.2, 0, 0, Math.PI * 2);
        ctx.strokeStyle = rp.color + (alpha * 0.55).toFixed(3) + ')';
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }
    }

    // 5. Tiny moonlit water glints along wave surface
    const glints = W < 600 ? 8 : 16;
    for (let g = 0; g < glints; g++) {
      const gx = ((g + 0.5) / glints) * W + Math.sin(t * 0.5 + g * 2.1) * 24;
      const gy = waterTop + 12 + ((g * 37) % Math.max(24, Math.floor(waterH - 22)));
      const gAlpha = Math.max(0, Math.sin(t * 2.2 + g * 1.7)) * (0.32 + showcaseMix * 0.18);
      if (gAlpha <= 0.02) continue;
      const gLen = 6 + (g % 4) * 4;
      ctx.strokeStyle = g % 3 === 0
        ? 'rgba(242, 201, 138, ' + gAlpha.toFixed(3) + ')'
        : 'rgba(220, 200, 255, ' + gAlpha.toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx - gLen, gy);
      ctx.lineTo(gx + gLen, gy);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Celebratory bloom when user completes a dream!
  function spawnCelebration(clientX, clientY) {
    if (reducedMotion) return;
    const x = typeof clientX === 'number' ? clientX : W * 0.5;
    const y = typeof clientY === 'number' ? clientY : H * 0.45;
    celebrationFlowers.push({
      x: x,
      y: y,
      radius: rand(34, 48),
      type: pick(['rose', 'phyllotaxis']),
      palette: pick([PALETTES[0], PALETTES[2], PALETTES[3]]),
      age: 0,
      bloomDur: 1.35,
      holdDur: 3.4,
      fadeDur: 1.8,
      rotOffset: rand(0, Math.PI * 2)
    });
  }

  function setShowcaseMode(enabled) {
    showcaseTarget = enabled ? 1 : 0;
    if (reducedMotion) {
      showcaseMix = showcaseTarget;
      renderStatic();
    }
  }

  window.FlowerGarden = {
    spawnCelebration: spawnCelebration,
    setShowcaseMode: setShowcaseMode
  };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildBouquet();
    buildAmbientFlowers();
    buildMotes();
    buildRipples();
    if (reducedMotion) renderStatic();
  }

  function renderFrame(dt) {
    elapsed += dt;
    showcaseMix += (showcaseTarget - showcaseMix) * Math.min(1, dt * 4.5);
    ctx.clearRect(0, 0, W, H);

    // Subtle soft glow behind the base of the central bouquet
    const baseGlow = ctx.createRadialGradient(W * 0.5, H * 0.92, 10, W * 0.5, H * 0.85, Math.min(W * 0.45, 360));
    baseGlow.addColorStop(0, 'rgba(182, 42, 92, ' + (0.14 + showcaseMix * 0.12).toFixed(3) + ')');
    baseGlow.addColorStop(0.5, 'rgba(130, 74, 200, ' + (0.08 + showcaseMix * 0.08).toFixed(3) + ')');
    baseGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = baseGlow;
    ctx.fillRect(0, 0, W, H);

    // 1. Draw Center Bouquet
    const baseBouquetAlpha = W < 640 ? 0.46 : 0.56;
    const bouquetAlpha = baseBouquetAlpha + showcaseMix * (0.94 - baseBouquetAlpha);
    bouquet.forEach(function (st) {
      const localT = elapsed - st.delay;
      if (localT <= 0) return;

      const stemP = clamp01(localT / st.stemDur);
      const bloomP = clamp01((localT - st.stemDur * 0.72) / st.bloomDur);
      const sway = Math.sin(elapsed * st.swaySpeed + st.swayPhase) * st.swayAmp * stemP;
      const tipX = st.x1 + sway;
      const tipY = st.y1 + Math.abs(sway) * 0.12;
      const ctrlX = st.cx + sway * 0.5;

      drawStem(st.x0, st.y0, ctrlX, st.cy, tipX, tipY, stemP, bouquetAlpha * 0.9, 1.65, st.leaves);

      if (bloomP > 0) {
        const breathe = 1 + Math.sin(elapsed * 0.9 + st.swayPhase) * 0.025;
        const rot = st.rotOffset + sway * 0.012;
        drawSpecies(st.type, tipX, tipY, st.radius * breathe, bloomP, bouquetAlpha, st.palette, rot);
      }
    });

    // 2. Draw Many Delicate Ambient Flowers Sprouting Around Screen
    for (let i = 0; i < ambientFlowers.length; i++) {
      const fl = ambientFlowers[i];
      fl.age += dt;
      if (fl.age < 0) continue;

      const totalLife = fl.stemDur + fl.bloomDur + fl.holdDur + fl.fadeDur;
      if (fl.age >= totalLife) {
        ambientFlowers[i] = createAmbientFlower();
        continue;
      }

      const stemP = clamp01(fl.age / fl.stemDur);
      const bloomP = clamp01((fl.age - fl.stemDur * 0.65) / fl.bloomDur);

      let fadeFactor = 1;
      const fadeStart = fl.stemDur + fl.bloomDur + fl.holdDur;
      if (fl.age > fadeStart) {
        fadeFactor = 1 - easeInOutSine((fl.age - fadeStart) / fl.fadeDur);
      }

      const alphaBoost = Math.min(0.95, fl.maxAlpha + showcaseMix * 0.28);
      const alpha = alphaBoost * fadeFactor;
      const sway = Math.sin(elapsed * fl.swaySpeed + fl.swayPhase) * 4.5 * stemP;
      const tipX = fl.x1 + sway;
      const tipY = fl.y1;
      const ctrlX = fl.cx + sway * 0.5;

      drawStem(fl.x0, fl.y0, ctrlX, fl.cy, tipX, tipY, stemP, alpha * 0.78, 1.15, fl.leaves);

      if (bloomP > 0) {
        drawSpecies(fl.type, tipX, tipY, fl.radius, bloomP, alpha, fl.palette, fl.rotOffset + sway * 0.015);
      }
    }

    // 3. Draw Moving Nocturnal Water beneath the flowers (stems emerge from water)
    drawWater(elapsed, dt, false);

    // 4. Draw Celebratory Blooms (on dream completion)
    for (let c = celebrationFlowers.length - 1; c >= 0; c--) {
      const cf = celebrationFlowers[c];
      cf.age += dt;
      const total = cf.bloomDur + cf.holdDur + cf.fadeDur;
      if (cf.age >= total) {
        celebrationFlowers.splice(c, 1);
        continue;
      }
      const bp = clamp01(cf.age / cf.bloomDur);
      let alpha = 0.85;
      if (cf.age > cf.bloomDur + cf.holdDur) {
        alpha *= 1 - easeInOutSine((cf.age - cf.bloomDur - cf.holdDur) / cf.fadeDur);
      }
      drawSpecies(cf.type, cf.x, cf.y, cf.radius, bp, alpha, cf.palette, cf.rotOffset + cf.age * 0.12);
    }

    // 4. Draw Floating Petals & Pollen Motes
    motes.forEach(function (m) {
      m.y += m.vy * dt;
      m.x += (m.vx + Math.sin(elapsed * 0.8 + m.phase) * 8) * dt;
      m.rot += m.rotSpeed * dt;

      if (m.y < -20 || m.x < -30 || m.x > W + 30) {
        Object.assign(m, createMote(false));
      }

      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.rot);
      ctx.globalAlpha = m.alpha * (0.65 + 0.35 * Math.sin(elapsed * 1.8 + m.phase));
      ctx.fillStyle = m.color;
      if (m.isPetal) {
        ctx.beginPath();
        ctx.ellipse(0, 0, m.size * 1.45, m.size * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, m.size * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function renderStatic() {
    ctx.clearRect(0, 0, W, H);
    const bouquetAlpha = W < 640 ? 0.38 : 0.48;
    bouquet.forEach(function (st) {
      drawStem(st.x0, st.y0, st.cx, st.cy, st.x1, st.y1, 1, bouquetAlpha * 0.85, 1.6, st.leaves);
      drawSpecies(st.type, st.x1, st.y1, st.radius, 1, bouquetAlpha, st.palette, st.rotOffset);
    });
    ambientFlowers.forEach(function (fl) {
      drawStem(fl.x0, fl.y0, fl.cx, fl.cy, fl.x1, fl.y1, 1, fl.maxAlpha * 0.7, 1.1, fl.leaves);
      drawSpecies(fl.type, fl.x1, fl.y1, fl.radius, 1, fl.maxAlpha * 0.8, fl.palette, fl.rotOffset);
    });
    drawWater(1.5, 0, true);
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    renderFrame(dt);
    rafId = requestAnimationFrame(loop);
  }

  document.addEventListener('visibilitychange', function () {
    if (reducedMotion) return;
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else {
      lastFrame = performance.now();
      if (!rafId) rafId = requestAnimationFrame(loop);
    }
  });

  window.addEventListener('resize', resize);
  resize();

  if (!reducedMotion) {
    lastFrame = performance.now();
    rafId = requestAnimationFrame(loop);
  }
})();
