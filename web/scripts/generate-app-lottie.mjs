/**
 * Generates premium looping Lottie JSON for app empty states.
 * Run: node scripts/generate-app-lottie.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../src/assets/lottie/app");

const FPS = 60;
const DURATION_FRAMES = 180;

const MINT_500 = hex("#12B886");
const MINT_300 = hex("#5FD4A8");
const MINT_100 = hex("#D2F8E7");
const MINT_50 = hex("#E8FBF3");
const INK_900 = hex("#0E2A22");
const INK_600 = hex("#4A645B");
const WHITE = [1, 1, 1];

function hex(h) {
  const n = h.replace("#", "");
  return [
    parseInt(n.slice(0, 2), 16) / 255,
    parseInt(n.slice(2, 4), 16) / 255,
    parseInt(n.slice(4, 6), 16) / 255,
  ];
}

const ease = { i: { x: [0.16], y: [1] }, o: { x: [0.3], y: [0] } };

function lerpKeyframes(values, easing = ease) {
  return {
    a: 1,
    k: values.map(([t, v]) => ({
      t,
      s: Array.isArray(v) ? v : [v],
      ...(easing ? { i: easing.i, o: easing.o } : {}),
    })),
  };
}

function staticVal(v) {
  return { a: 0, k: Array.isArray(v) ? v : [v] };
}

function transform({
  pos = [100, 100],
  anchor = [0, 0],
  scale = [100, 100],
  rotation = 0,
  opacity = 100,
  scaleAnim,
  rotationAnim,
  posAnim,
  opacityAnim,
}) {
  return {
    o: opacityAnim ?? staticVal(opacity),
    r: rotationAnim ?? staticVal(rotation),
    p: posAnim ?? staticVal([...pos, 0]),
    a: staticVal([...anchor, 0]),
    s: scaleAnim ?? staticVal([...scale, 100]),
  };
}

function fill(color, opacity = 100) {
  return { ty: "fl", c: { a: 0, k: color }, o: { a: 0, k: opacity }, r: 1, bm: 0 };
}

function stroke(color, width = 2, opacity = 100) {
  return {
    ty: "st",
    c: { a: 0, k: color },
    o: { a: 0, k: opacity },
    w: { a: 0, k: width },
    lc: 2,
    lj: 2,
    bm: 0,
  };
}

function ellipse(w, h) {
  return { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [w, h] } };
}

function rect(w, h, round = 0) {
  return {
    ty: "rc",
    p: { a: 0, k: [0, 0] },
    s: { a: 0, k: [w, h] },
    r: { a: 0, k: round },
  };
}

function trim(start, end) {
  return {
    ty: "tm",
    s: { a: 0, k: start },
    e: { a: 0, k: end },
    o: { a: 0, k: 0 },
    m: 1,
  };
}

function groupTr(p = [0, 0], r = 0, s = [100, 100], o = 100) {
  return {
    ty: "tr",
    p: { a: 0, k: p },
    a: { a: 0, k: [0, 0] },
    s: { a: 0, k: s },
    r: { a: 0, k: r },
    o: { a: 0, k: o },
  };
}

function shapeLayer({ name, index, shapes, transformOpts }) {
  return {
    ddd: 0,
    ind: index,
    ty: 4,
    nm: name,
    sr: 1,
    ks: transform(transformOpts),
    ao: 0,
    shapes: [{ ty: "gr", it: [...shapes, groupTr()] }],
    ip: 0,
    op: DURATION_FRAMES,
    st: 0,
    bm: 0,
  };
}

function baseAnimation(name, layers) {
  return {
    v: "5.7.4",
    fr: FPS,
    ip: 0,
    op: DURATION_FRAMES,
    w: 200,
    h: 200,
    nm: name,
    ddd: 0,
    assets: [],
    // Lottie stacks the FIRST array entry on top — we author background-first,
    // so reverse to put glyphs above the backdrop.
    layers: [...layers].reverse(),
    markers: [],
  };
}

/** Soft breathing backdrop shared by every empty state. */
function backdropLayers(startIndex = 1) {
  return [
    shapeLayer({
      name: "Backdrop",
      index: startIndex,
      shapes: [ellipse(148, 148), fill(MINT_50, 100)],
      transformOpts: {
        pos: [100, 100],
        scaleAnim: lerpKeyframes([
          [0, [97, 97, 100]],
          [90, [103, 103, 100]],
          [180, [97, 97, 100]],
        ]),
      },
    }),
    shapeLayer({
      name: "Backdrop Ring",
      index: startIndex + 1,
      shapes: [ellipse(164, 164), stroke(MINT_100, 2, 100)],
      transformOpts: {
        pos: [100, 100],
        scaleAnim: lerpKeyframes([
          [0, [101, 101, 100]],
          [90, [96, 96, 100]],
          [180, [101, 101, 100]],
        ]),
        opacityAnim: lerpKeyframes([
          [0, [60]],
          [90, [100]],
          [180, [60]],
        ]),
      },
    }),
  ];
}

/** Tiny accent dot that twinkles on a delay. */
function sparkleLayer(index, x, y, delay, size = 7, color = MINT_300) {
  const cycle = (offset) => (offset + delay) % DURATION_FRAMES;
  return shapeLayer({
    name: `Sparkle ${index}`,
    index,
    shapes: [ellipse(size, size), fill(color, 100)],
    transformOpts: {
      pos: [x, y],
      opacityAnim: lerpKeyframes(
        [
          [0, [0]],
          [cycle(18), [0]],
          [cycle(40), [90]],
          [cycle(70), [0]],
          [180, [0]],
        ].sort((a, b) => a[0] - b[0]),
      ),
      scaleAnim: lerpKeyframes(
        [
          [0, [60, 60, 100]],
          [cycle(18), [60, 60, 100]],
          [cycle(40), [110, 110, 100]],
          [cycle(70), [60, 60, 100]],
          [180, [60, 60, 100]],
        ].sort((a, b) => a[0] - b[0]),
      ),
    },
  });
}

/* ------------------------------------------------------------------ */
/* Wallet — accounts empty state: coin drops into a wallet, twice.    */
/* ------------------------------------------------------------------ */
function walletAnimation() {
  const coinDrop = (start) => ({
    pos: lerpKeyframes([
      [0, [100, 52, 0]],
      [start, [100, 52, 0]],
      [start + 34, [100, 96, 0]],
      [start + 42, [100, 102, 0]],
      [180, [100, 102, 0]],
    ]),
    opacity: lerpKeyframes([
      [0, [0]],
      [start, [0]],
      [start + 8, [100]],
      [start + 36, [100]],
      [start + 46, [0]],
      [180, [0]],
    ]),
    scale: lerpKeyframes([
      [0, [100, 100, 100]],
      [start + 30, [100, 100, 100]],
      [start + 38, [116, 80, 100]],
      [start + 46, [100, 100, 100]],
      [180, [100, 100, 100]],
    ]),
  });

  const dropA = coinDrop(18);
  const dropB = coinDrop(104);

  const coinLayer = (name, index, drop) =>
    shapeLayer({
      name,
      index,
      shapes: [
        ellipse(26, 26),
        fill(MINT_500, 100),
        ellipse(17, 17),
        stroke(WHITE, 2.5, 70),
      ],
      transformOpts: {
        posAnim: drop.pos,
        opacityAnim: drop.opacity,
        scaleAnim: drop.scale,
      },
    });

  return baseAnimation("Empty — Wallet", [
    ...backdropLayers(1),
    coinLayer("Coin A", 3, dropA),
    coinLayer("Coin B", 4, dropB),
    shapeLayer({
      name: "Wallet Body",
      index: 5,
      shapes: [
        rect(86, 56, 14),
        fill(MINT_500, 100),
        rect(86, 56, 14),
        stroke(MINT_300, 1.5, 35),
      ],
      transformOpts: {
        pos: [100, 124],
        scaleAnim: lerpKeyframes([
          [0, [100, 100, 100]],
          [54, [103, 98, 100]],
          [70, [100, 100, 100]],
          [140, [103, 98, 100]],
          [156, [100, 100, 100]],
          [180, [100, 100, 100]],
        ]),
      },
    }),
    shapeLayer({
      name: "Wallet Slot",
      index: 6,
      shapes: [rect(58, 7, 3.5), fill(INK_900, 28)],
      transformOpts: { pos: [100, 101] },
    }),
    shapeLayer({
      name: "Wallet Clasp",
      index: 7,
      shapes: [
        ellipse(18, 18),
        fill(WHITE, 26),
        ellipse(7, 7),
        fill(WHITE, 85),
      ],
      transformOpts: { pos: [128, 124] },
    }),
    sparkleLayer(8, 56, 70, 0),
    sparkleLayer(9, 148, 60, 80, 6),
  ]);
}

/* ------------------------------------------------------------------- */
/* Receipt search — no matching transactions: magnifier sweeps a slip. */
/* ------------------------------------------------------------------- */
function receiptSearchAnimation() {
  const rowShimmer = (delay) =>
    lerpKeyframes(
      [
        [0, [30]],
        [(20 + delay) % 180, [30]],
        [(50 + delay) % 180, [85]],
        [(80 + delay) % 180, [30]],
        [180, [30]],
      ].sort((a, b) => a[0] - b[0]),
    );

  return baseAnimation("Empty — Receipt Search", [
    ...backdropLayers(1),
    shapeLayer({
      name: "Receipt",
      index: 3,
      shapes: [
        rect(72, 92, 9),
        fill(WHITE, 100),
        rect(72, 92, 9),
        stroke(MINT_300, 2, 55),
      ],
      transformOpts: {
        pos: [96, 100],
        rotationAnim: lerpKeyframes([
          [0, [-2]],
          [90, [2]],
          [180, [-2]],
        ]),
      },
    }),
    ...[0, 1, 2, 3].map((row) =>
      shapeLayer({
        name: `Row ${row + 1}`,
        index: 4 + row,
        shapes: [
          rect(row === 3 ? 26 : 46, 5, 2.5),
          fill(row === 3 ? MINT_500 : INK_600, 100),
        ],
        transformOpts: {
          pos: [row === 3 ? 86 : 96, 76 + row * 16],
          opacityAnim: rowShimmer(row * 18),
        },
      }),
    ),
    shapeLayer({
      name: "Magnifier",
      index: 8,
      shapes: [
        ellipse(40, 40),
        stroke(MINT_500, 5, 100),
        ellipse(40, 40),
        fill(MINT_100, 28),
        {
          ty: "gr",
          it: [rect(6, 20, 3), fill(MINT_500, 100), groupTr([20, 22], -45)],
        },
      ],
      transformOpts: {
        posAnim: lerpKeyframes([
          [0, [76, 92, 0]],
          [45, [116, 102, 0]],
          [90, [124, 78, 0]],
          [135, [84, 112, 0]],
          [180, [76, 92, 0]],
        ]),
        rotationAnim: lerpKeyframes([
          [0, [-6]],
          [90, [6]],
          [180, [-6]],
        ]),
      },
    }),
    sparkleLayer(9, 150, 64, 30),
    sparkleLayer(10, 52, 142, 100, 6),
  ]);
}

/* ------------------------------------------------------------- */
/* Categories — tile grid pulses in sequence with a plus badge.  */
/* ------------------------------------------------------------- */
function categoriesAnimation() {
  const tiles = [
    { x: 81, y: 81, color: MINT_300, opacity: 100, delay: 0 },
    { x: 119, y: 81, color: MINT_500, opacity: 100, delay: 24 },
    { x: 81, y: 119, color: MINT_100, opacity: 100, delay: 48 },
    { x: 119, y: 119, color: INK_600, opacity: 22, delay: 72 },
  ];

  const tileLayers = tiles.map((tile, i) =>
    shapeLayer({
      name: `Tile ${i + 1}`,
      index: 3 + i,
      shapes: [rect(32, 32, 9), fill(tile.color, tile.opacity)],
      transformOpts: {
        pos: [tile.x, tile.y],
        scaleAnim: lerpKeyframes(
          [
            [0, [100, 100, 100]],
            [(10 + tile.delay) % 180, [100, 100, 100]],
            [(34 + tile.delay) % 180, [114, 114, 100]],
            [(58 + tile.delay) % 180, [100, 100, 100]],
            [180, [100, 100, 100]],
          ].sort((a, b) => a[0] - b[0]),
        ),
      },
    }),
  );

  return baseAnimation("Empty — Categories", [
    ...backdropLayers(1),
    ...tileLayers,
    shapeLayer({
      name: "Plus Badge",
      index: 7,
      shapes: [
        ellipse(24, 24),
        fill(MINT_500, 100),
        ellipse(24, 24),
        stroke(WHITE, 2, 40),
        rect(11, 3, 1.5),
        fill(WHITE, 100),
        rect(3, 11, 1.5),
        fill(WHITE, 100),
      ],
      transformOpts: {
        pos: [134, 66],
        scaleAnim: lerpKeyframes([
          [0, [100, 100, 100]],
          [45, [114, 114, 100]],
          [90, [100, 100, 100]],
          [135, [114, 114, 100]],
          [180, [100, 100, 100]],
        ]),
      },
    }),
    sparkleLayer(8, 56, 64, 60, 6),
  ]);
}

/* --------------------------------------------------------------- */
/* Recurring — orbiting arc with arrowheads around a calendar.     */
/* --------------------------------------------------------------- */
function recurringAnimation() {
  const orbit = lerpKeyframes(
    [
      [0, [0]],
      [180, [360]],
    ],
    null,
  );

  const arrowhead = (angleDeg) => {
    const rad = (angleDeg * Math.PI) / 180;
    const r = 41;
    return {
      ty: "gr",
      it: [
        {
          ty: "sr",
          sy: 2,
          d: 1,
          pt: { a: 0, k: 3 },
          p: { a: 0, k: [0, 0] },
          r: { a: 0, k: 0 },
          or: { a: 0, k: 8 },
          os: { a: 0, k: 0 },
        },
        fill(MINT_500, 100),
        groupTr(
          [Math.cos(rad) * r, Math.sin(rad) * r],
          angleDeg + 180,
        ),
      ],
    };
  };

  return baseAnimation("Empty — Recurring", [
    ...backdropLayers(1),
    shapeLayer({
      name: "Orbit Arcs",
      index: 3,
      shapes: [
        ellipse(82, 82),
        stroke(MINT_500, 5, 100),
        trim(8, 42),
        {
          ty: "gr",
          it: [ellipse(82, 82), stroke(MINT_500, 5, 100), trim(58, 92), groupTr()],
        },
        arrowhead(151),
        arrowhead(331),
      ],
      transformOpts: {
        pos: [100, 100],
        rotationAnim: orbit,
      },
    }),
    shapeLayer({
      name: "Calendar Body",
      index: 4,
      shapes: [
        rect(40, 36, 7),
        fill(WHITE, 100),
        rect(40, 36, 7),
        stroke(MINT_300, 2, 60),
      ],
      transformOpts: {
        pos: [100, 102],
        scaleAnim: lerpKeyframes([
          [0, [98, 98, 100]],
          [90, [104, 104, 100]],
          [180, [98, 98, 100]],
        ]),
      },
    }),
    shapeLayer({
      name: "Calendar Header",
      index: 5,
      shapes: [rect(40, 11, 4), fill(MINT_500, 100)],
      transformOpts: {
        pos: [100, 89.5],
        scaleAnim: lerpKeyframes([
          [0, [98, 98, 100]],
          [90, [104, 104, 100]],
          [180, [98, 98, 100]],
        ]),
      },
    }),
    shapeLayer({
      name: "Calendar Dots",
      index: 6,
      shapes: [
        { ty: "gr", it: [ellipse(6, 6), fill(MINT_500, 80), groupTr([-8, 6])] },
        { ty: "gr", it: [ellipse(6, 6), fill(INK_600, 35), groupTr([4, 6])] },
      ],
      transformOpts: { pos: [100, 100] },
    }),
    sparkleLayer(7, 152, 130, 20, 6),
    sparkleLayer(8, 48, 76, 100, 6),
  ]);
}

/* ----------------------------------------------------------- */
/* Caught up — celebratory check with rays and a soft ripple.  */
/* ----------------------------------------------------------- */
function caughtUpAnimation() {
  const rays = Array.from({ length: 6 }, (_, i) => {
    const angle = i * 60 - 90;
    const rad = (angle * Math.PI) / 180;
    const r = 56;
    return shapeLayer({
      name: `Ray ${i + 1}`,
      index: 6 + i,
      shapes: [rect(4.5, 12, 2.25), fill(MINT_300, 100)],
      transformOpts: {
        pos: [100 + Math.cos(rad) * r, 100 + Math.sin(rad) * r],
        rotation: angle + 90,
        opacityAnim: lerpKeyframes(
          [
            [0, [25]],
            [(10 + i * 14) % 180, [25]],
            [(34 + i * 14) % 180, [100]],
            [(58 + i * 14) % 180, [25]],
            [180, [25]],
          ].sort((a, b) => a[0] - b[0]),
        ),
        scaleAnim: lerpKeyframes(
          [
            [0, [80, 80, 100]],
            [(10 + i * 14) % 180, [80, 80, 100]],
            [(34 + i * 14) % 180, [112, 112, 100]],
            [(58 + i * 14) % 180, [80, 80, 100]],
            [180, [80, 80, 100]],
          ].sort((a, b) => a[0] - b[0]),
        ),
      },
    });
  });

  return baseAnimation("Empty — Caught Up", [
    ...backdropLayers(1),
    shapeLayer({
      name: "Ripple",
      index: 3,
      shapes: [ellipse(70, 70), stroke(MINT_300, 2.5, 100)],
      transformOpts: {
        pos: [100, 100],
        scaleAnim: lerpKeyframes([
          [0, [86, 86, 100]],
          [88, [150, 150, 100]],
          [89, [86, 86, 100]],
          [90, [86, 86, 100]],
          [178, [150, 150, 100]],
          [179, [86, 86, 100]],
          [180, [86, 86, 100]],
        ]),
        opacityAnim: lerpKeyframes([
          [0, [55]],
          [88, [0]],
          [90, [55]],
          [178, [0]],
          [180, [55]],
        ]),
      },
    }),
    shapeLayer({
      name: "Badge",
      index: 4,
      shapes: [
        ellipse(62, 62),
        fill(MINT_500, 100),
        ellipse(62, 62),
        stroke(WHITE, 2, 25),
      ],
      transformOpts: {
        pos: [100, 100],
        scaleAnim: lerpKeyframes([
          [0, [97, 97, 100]],
          [90, [105, 105, 100]],
          [180, [97, 97, 100]],
        ]),
      },
    }),
    shapeLayer({
      name: "Check",
      index: 5,
      shapes: [
        { ty: "gr", it: [rect(5.5, 17, 2.75), fill(WHITE, 100), groupTr([-8.5, 5], -45)] },
        { ty: "gr", it: [rect(5.5, 30, 2.75), fill(WHITE, 100), groupTr([6, 0.5], 45)] },
      ],
      transformOpts: {
        pos: [100, 100],
        scaleAnim: lerpKeyframes([
          [0, [97, 97, 100]],
          [90, [105, 105, 100]],
          [180, [97, 97, 100]],
        ]),
      },
    }),
    ...rays,
    sparkleLayer(12, 148, 56, 40, 6),
    sparkleLayer(13, 52, 144, 110, 6),
  ]);
}

const animations = {
  wallet: walletAnimation(),
  "receipt-search": receiptSearchAnimation(),
  categories: categoriesAnimation(),
  recurring: recurringAnimation(),
  "caught-up": caughtUpAnimation(),
};

await mkdir(OUT_DIR, { recursive: true });
for (const [name, data] of Object.entries(animations)) {
  const path = join(OUT_DIR, `${name}.json`);
  await writeFile(path, JSON.stringify(data));
  console.log(`Wrote ${path}`);
}

console.log(`Done — ${Object.keys(animations).length} app Lottie files generated.`);
