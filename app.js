// ---------- Flow ----------
const $ = (id) => document.getElementById(id);
const screens = ["q1", "q2", "nf", "love"];

const WRONG_LINK = "Sorry, you hit the wrong link.";
const WRONG_SURNAME = "Sorry, I love only one Julia, and you're not the one.";

function show(name, msg = WRONG_LINK) {
  $("nfmsg").textContent = msg;
  screens.forEach((s) => $(s).classList.toggle("hidden", s !== name));
  if (name === "nf") document.title = "404 Not Found";
  if (name === "love") { document.title = "Love Heart"; startHeart(); }
  if (name === "q2") $("surname").focus();
}

$("yes1").onclick = () => show("q2");
$("no1").onclick = () => show("nf");
$("form").onsubmit = (e) => {
  e.preventDefault();
  const v = $("surname").value.trim().toLowerCase();
  if (v === "petrusiak" || v === "петрусяк") show("love");
  else show("nf", WRONG_SURNAME);
};

// ---------- Heart (port of love.py) ----------
const SC = 21, OY = 20, DURATION = 10000, ANIM = 42 * 16, LIFT = 34, GAP = 7;
const SIZES = [9, 10, 11, 12];
const UKR = "Я тебе кохаю", UKR_BOOST = 2; // slightly larger than the rest
const PX = 4 / 3; // tk points -> css px
const BG = [6 / 255, 2 / 255, 8 / 255];
const FLASH = [1, 0.78, 0.78];
const PHRASES = [
  "I love you", "Seni seviyorum", "Te amo", "Je t'aime",
  "Ich liebe dich", "Ti amo", "Eu te amo", "Я тебя люблю",
  "사랑해", "愛してる", "我爱你", "मैं तुमसे प्यार करता हूँ",
  "Σ' αγαπώ", "Ik hou van jou", "Jag älskar dig", "Kocham cię",
  "ฉันรักเธอ", "Anh yêu em", "Aku cinta kamu", "Я тебе кохаю",
];

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v) => Math.max(0, Math.min(1, v));
const mix = (a, b, k) => a.map((p, i) => p + (b[i] - p) * k);
const dim = (c, k) => c.map((v) => v * k);
const hx = (c) => "rgb(" + c.map((v) => Math.round(clamp(v) * 255)).join(",") + ")";

function heartPt(a) {
  const x = 16 * Math.sin(a) ** 3;
  const y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
  return [x * SC, y * SC + OY];
}
const POLY = Array.from({ length: 720 }, (_, i) => heartPt((2 * Math.PI * i) / 720));
const EDGES = POLY.map((p, i) => [p, POLY[(i + 1) % POLY.length]]);
const YMAX = Math.max(...POLY.map((p) => p[1]));
const YMIN = Math.min(...POLY.map((p) => p[1]));
const CY = (YMAX + YMIN) / 2;

function spans(y) {
  const xs = [];
  for (const [[x1, y1], [x2, y2]] of EDGES) {
    if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
      xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
    }
  }
  xs.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i + 1 < xs.length; i += 2) out.push([xs[i], xs[i + 1]]);
  return out;
}
function intersect(A, B) {
  const out = [];
  for (const a of A) for (const b of B) {
    const lo = Math.max(a[0], b[0]), hi = Math.min(a[1], b[1]);
    if (hi - lo > 14) out.push([lo, hi]);
  }
  return out;
}

const cv = $("cv");
const ctx = cv.getContext("2d");
const font = (size, bold = true) => `bold ${size * PX}px Arial, sans-serif`;
const measure = (text, size) => { ctx.font = font(size); return ctx.measureText(text).width; };
const mathDist = (x, y) => Math.hypot(x / (16 * SC), (y - CY) / (14.5 * SC));

function build(rng) {
  let pool = [];
  const next = () => {
    if (!pool.length) {
      pool = PHRASES.slice();
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    }
    return pool.pop();
  };
  const uni = (a, b) => a + rng() * (b - a);
  const rowH = SIZES[SIZES.length - 1] * PX * 1.17 + 4;
  const half = rowH / 2;
  const placed = [];

  for (let y = YMAX - half; y > YMIN + half; y -= rowH) {
    for (let [lo, hi] of intersect(spans(y + half), spans(y - half))) {
      lo += 4; hi -= 4;
      let cur = lo + uni(0, 8);
      const line = [];
      for (;;) {
        let fit = null;
        for (let t = 0; t < 10; t++) {
          const text = next();
          const size = SIZES[Math.floor(rng() * SIZES.length)] + (text === UKR ? UKR_BOOST : 0);
          const w = measure(text, size);
          if (cur + w <= hi) { fit = { text, size, w }; break; }
        }
        if (!fit) break;
        line.push({ x: cur + fit.w / 2, text: fit.text, size: fit.size, w: fit.w });
        cur += fit.w + GAP;
      }
      if (!line.length) continue;
      if (line.length > 1) {
        const left = hi - (line[line.length - 1].x + line[line.length - 1].w / 2);
        line.forEach((it, i) => { it.x += (left * i) / (line.length - 1); });
      } else {
        line[0].x = (lo + hi) / 2;
      }
      line.forEach((it, i) => {
        placed.push({ x: it.x, y, text: it.text, size: it.size, edge: i === 0 || i === line.length - 1 });
      });
    }
  }

  const wine = [0.58, 0, 0.09], crimson = [0.9, 0.05, 0.14], blood = [0.98, 0.1, 0.16];
  for (const p of placed) {
    const rad = Math.min(1, mathDist(p.x, p.y));
    let base = mix(wine, crimson, 0.25 + 0.75 * rad);
    base = mix(base, blood, uni(0, 0.35) + (p.edge ? 0.3 : 0));
    p.color = base.map((v) => Math.min(1, v));
    p.rad = rad;
    p.dx = uni(-10, 10);
  }
  const edges = placed.filter((p) => p.edge)
    .sort((a, b) => ((Math.atan2(a.x, a.y - CY) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
                  - ((Math.atan2(b.x, b.y - CY) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
  const inner = placed.filter((p) => !p.edge)
    .map((p) => [-p.rad + uni(0, 0.08), p]).sort((a, b) => a[0] - b[0]).map((e) => e[1]);
  const order = edges.concat(inner);
  order.forEach((p, i) => { p.t0 = (i / order.length) * DURATION; });
  return order;
}

let items = null, t0 = 0, raf = 0, flashes = [], lastFlash = 0, W = 0, H = 0, K = 1;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth; H = window.innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  // fit the heart (about 32*SC wide, ~30*SC tall) into the viewport
  K = Math.min(W / (32 * SC + 80), H / (YMAX - YMIN + 100));
  ctx.setTransform(dpr * K, 0, 0, dpr * K, (dpr * W) / 2, (dpr * H) / 2);
}

function drawText(text, size, x, y, color) {
  ctx.font = font(size);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function frame(now) {
  const el = now - t0;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = hx(BG);
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.restore();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let done = true;
  for (const p of items) {
    if (el < p.t0) { done = false; continue; }
    const u = clamp((el - p.t0) / ANIM);
    if (u < 1) done = false;
    const e = 1 - (1 - u) ** 3;
    const x = p.x, y = CY - p.y;
    const px = x + p.dx * (1 - e), py = y - (1 - e) * LIFT;
    const c = p.color;
    drawText(p.text, p.size, x + 2, y + 3, hx(mix(BG, dim(c, 0.3), e)));
    drawText(p.text, p.size + 1, px, py, hx(mix(BG, dim(c, 0.2), e * e)));
    let col = u >= 1 ? c : mix(mix(BG, c, e ** 1.5), FLASH, 0.75 * Math.sin(Math.PI * clamp((u - 0.55) / 0.45)));
    const fl = p.flashUntil > now ? 0.6 : 0;
    if (fl) col = mix(col, FLASH, fl);
    drawText(p.text, p.size, u >= 1 ? x : px, u >= 1 ? y : py, hx(col));
  }

  if (done && now - lastFlash > 140) {
    lastFlash = now;
    items[Math.floor(Math.random() * items.length)].flashUntil = now + 260;
  }
  raf = requestAnimationFrame(frame);
}

function startHeart() {
  cancelAnimationFrame(raf);
  resize();
  if (!items) items = build(mulberry32(11));
  t0 = performance.now();
  raf = requestAnimationFrame(frame);
}
window.addEventListener("resize", () => { if (!$("love").classList.contains("hidden")) resize(); });
