/**
 * Generates premium looping Lottie JSON for each setup wizard step.
 * Run: node scripts/generate-setup-lottie.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIRS = [join(__dirname, "../src/assets/lottie/setup")];

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

function lerpKeyframes(values, easing = { i: { x: [0.16], y: [1] }, o: { x: [0.3], y: [0] } }) {
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
  return {
    ty: "fl",
    c: { a: 0, k: color },
    o: { a: 0, k: opacity },
    r: 1,
    bm: 0,
  };
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
  return {
    ty: "el",
    p: { a: 0, k: [0, 0] },
    s: { a: 0, k: [w, h] },
  };
}

function rect(w, h, round = 0) {
  return {
    ty: "rc",
    p: { a: 0, k: [0, 0] },
    s: { a: 0, k: [w, h] },
    r: { a: 0, k: round },
  };
}

function shapeLayer({
  name,
  index,
  shapes,
  transformOpts,
  inPoint = 0,
  outPoint = DURATION_FRAMES,
}) {
  return {
    ddd: 0,
    ind: index,
    ty: 4,
    nm: name,
    sr: 1,
    ks: transform(transformOpts),
    ao: 0,
    shapes: [
      {
        ty: "gr",
        it: [
          ...shapes,
          { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        ],
      },
    ],
    ip: inPoint,
    op: outPoint,
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
    // so reverse to put foreground glyphs above the soft fills.
    layers: [...layers].reverse(),
    markers: [],
  };
}

const ease = { i: { x: [0.16], y: [1] }, o: { x: [0.3], y: [0] } };

function currencyAnimation() {
  const pulse = lerpKeyframes([
    [0, [92, 92, 100]],
    [90, [108, 108, 100]],
    [180, [92, 92, 100]],
  ], ease);

  const floatY = lerpKeyframes([
    [0, [100, 102, 0]],
    [90, [100, 98, 0]],
    [180, [100, 102, 0]],
  ], ease);

  const spin = lerpKeyframes([
    [0, [0]],
    [180, [360]],
  ], ease);

  const ringOpacity = lerpKeyframes([
    [0, [35]],
    [90, [55]],
    [180, [35]],
  ], ease);

  return baseAnimation("Setup — Currency", [
    shapeLayer({
      name: "Glow Ring",
      index: 1,
      shapes: [ellipse(88, 88), stroke(MINT_300, 3, 100)],
      transformOpts: {
        pos: [100, 100],
        scaleAnim: pulse,
        opacityAnim: ringOpacity,
      },
    }),
    shapeLayer({
      name: "Soft Fill",
      index: 2,
      shapes: [ellipse(72, 72), fill(MINT_100, 100)],
      transformOpts: {
        pos: [100, 100],
        scaleAnim: lerpKeyframes([
          [0, [96, 96, 100]],
          [90, [104, 104, 100]],
          [180, [96, 96, 100]],
        ], ease),
      },
    }),
    shapeLayer({
      name: "Coin",
      index: 3,
      shapes: [ellipse(52, 52), fill(MINT_500, 100)],
      transformOpts: {
        posAnim: floatY,
        rotationAnim: spin,
      },
    }),
    shapeLayer({
      name: "Coin Inner",
      index: 4,
      shapes: [ellipse(38, 38), fill(WHITE, 18)],
      transformOpts: {
        posAnim: floatY,
        rotationAnim: spin,
      },
    }),
    shapeLayer({
      name: "Currency Symbol",
      index: 5,
      shapes: [
        rect(4, 22, 2),
        rect(18, 4, 2),
        rect(18, 4, 2),
      ].flatMap((s, i) => {
        const offsets = [[0, -2], [-7, -8], [7, 8]];
        return [{
          ty: "gr",
          it: [
            s,
            fill(WHITE, 95),
            {
              ty: "tr",
              p: { a: 0, k: offsets[i] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: i === 2 ? 90 : 0 },
              o: { a: 0, k: 100 },
            },
          ],
        }];
      }),
      transformOpts: {
        posAnim: floatY,
        rotationAnim: spin,
      },
    }),
  ]);
}

function accountsAnimation() {
  const cards = [
    { x: 100, y: 108, rot: -6, delay: 0, color: MINT_100 },
    { x: 100, y: 100, rot: 0, delay: 20, color: MINT_300 },
    { x: 100, y: 92, rot: 6, delay: 40, color: MINT_500 },
  ];

  const layers = cards.map((card, i) => {
    const yAnim = lerpKeyframes([
      [0, [card.x, card.y, 0]],
      [60 + card.delay, [card.x, card.y - 5, 0]],
      [120 + card.delay, [card.x, card.y + 3, 0]],
      [180, [card.x, card.y, 0]],
    ], ease);

    const rotAnim = lerpKeyframes([
      [0, [card.rot]],
      [90, [card.rot + (i === 1 ? 0 : i === 0 ? -2 : 2)]],
      [180, [card.rot]],
    ], ease);

    return shapeLayer({
      name: `Card ${i + 1}`,
      index: i + 1,
      shapes: [
        rect(72, 46, 10),
        fill(i === 2 ? MINT_500 : card.color, i === 2 ? 100 : 85),
        rect(72, 46, 10),
        stroke(i === 2 ? WHITE : MINT_500, 1.5, i === 2 ? 30 : 15),
        rect(18, 4, 2),
        fill(i === 2 ? WHITE : MINT_500, i === 2 ? 80 : 40),
        { ty: "tr", p: { a: 0, k: [-22, -12] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        rect(36, 3, 1.5),
        fill(i === 2 ? WHITE : INK_600, i === 2 ? 50 : 25),
        { ty: "tr", p: { a: 0, k: [-14, 6] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ],
      transformOpts: {
        posAnim: yAnim,
        rotationAnim: rotAnim,
      },
    });
  });

  layers.push(
    shapeLayer({
      name: "Plus Badge",
      index: 4,
      shapes: [ellipse(16, 16), fill(MINT_500, 100), rect(8, 2, 1), fill(WHITE, 100), { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }, rect(2, 8, 1), fill(WHITE, 100)],
      transformOpts: {
        pos: [138, 72],
        scaleAnim: lerpKeyframes([
          [0, [100, 100, 100]],
          [45, [112, 112, 100]],
          [90, [100, 100, 100]],
          [135, [112, 112, 100]],
          [180, [100, 100, 100]],
        ], ease),
      },
    }),
  );

  return baseAnimation("Setup — Accounts", layers);
}

function balancesAnimation() {
  const beamTilt = lerpKeyframes([
    [0, [-4]],
    [45, [4]],
    [90, [-4]],
    [135, [4]],
    [180, [-4]],
  ], ease);

  const leftPanY = lerpKeyframes([
    [0, [62, 118, 0]],
    [45, [62, 122, 0]],
    [90, [62, 114, 0]],
    [135, [62, 122, 0]],
    [180, [62, 118, 0]],
  ], ease);

  const rightPanY = lerpKeyframes([
    [0, [138, 114, 0]],
    [45, [138, 110, 0]],
    [90, [138, 118, 0]],
    [135, [138, 110, 0]],
    [180, [138, 114, 0]],
  ], ease);

  return baseAnimation("Setup — Balances", [
    shapeLayer({
      name: "Stand",
      index: 1,
      shapes: [rect(6, 36, 3), fill(INK_600, 60)],
      transformOpts: { pos: [100, 148] },
    }),
    shapeLayer({
      name: "Beam",
      index: 2,
      shapes: [rect(96, 5, 2.5), fill(MINT_500, 100)],
      transformOpts: {
        pos: [100, 88],
        rotationAnim: beamTilt,
      },
    }),
    shapeLayer({
      name: "Pivot",
      index: 3,
      shapes: [ellipse(12, 12), fill(MINT_500, 100)],
      transformOpts: { pos: [100, 88] },
    }),
    shapeLayer({
      name: "Left Pan",
      index: 4,
      shapes: [
        rect(3, 24, 1.5), fill(MINT_300, 80),
        { ty: "tr", p: { a: 0, k: [0, -12] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        rect(34, 8, 4), fill(MINT_100, 100),
        { ty: "tr", p: { a: 0, k: [0, 8] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        rect(20, 12, 3), fill(MINT_500, 70),
        { ty: "tr", p: { a: 0, k: [0, 4] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ],
      transformOpts: {
        posAnim: leftPanY,
        rotationAnim: beamTilt,
      },
    }),
    shapeLayer({
      name: "Right Pan",
      index: 5,
      shapes: [
        rect(3, 24, 1.5), fill(MINT_300, 80),
        { ty: "tr", p: { a: 0, k: [0, -12] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        rect(34, 8, 4), fill(MINT_100, 100),
        { ty: "tr", p: { a: 0, k: [0, 8] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
        rect(14, 14, 3), fill(MINT_500, 70),
        { ty: "tr", p: { a: 0, k: [0, 2] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
      ],
      transformOpts: {
        posAnim: rightPanY,
        rotationAnim: beamTilt,
      },
    }),
  ]);
}

function primaryAnimation() {
  const starPulse = lerpKeyframes([
    [0, [96, 96, 100]],
    [60, [108, 108, 100]],
    [120, [100, 100, 100]],
    [180, [96, 96, 100]],
  ], ease);

  const ringScale = lerpKeyframes([
    [0, [80, 80, 100]],
    [90, [130, 130, 100]],
    [180, [80, 80, 100]],
  ], ease);

  const ringOpacity = lerpKeyframes([
    [0, [50]],
    [90, [0]],
    [180, [50]],
  ], ease);

  const shineRot = lerpKeyframes([
    [0, [0]],
    [180, [360]],
  ], ease);

  return baseAnimation("Setup — Primary", [
    shapeLayer({
      name: "Pulse Ring",
      index: 1,
      shapes: [ellipse(70, 70), stroke(MINT_300, 2.5, 100)],
      transformOpts: {
        pos: [100, 100],
        scaleAnim: ringScale,
        opacityAnim: ringOpacity,
      },
    }),
    shapeLayer({
      name: "Badge Base",
      index: 2,
      shapes: [ellipse(56, 56), fill(MINT_100, 100)],
      transformOpts: {
        pos: [100, 100],
        scaleAnim: starPulse,
      },
    }),
    shapeLayer({
      name: "Badge",
      index: 3,
      shapes: [ellipse(44, 44), fill(MINT_500, 100)],
      transformOpts: {
        pos: [100, 100],
        scaleAnim: starPulse,
      },
    }),
    shapeLayer({
      name: "Star",
      index: 4,
      shapes: [
        {
          ty: "sr",
          sy: 1,
          d: 1,
          pt: { a: 0, k: 5 },
          p: { a: 0, k: [0, 0] },
          r: { a: 0, k: 0 },
          ir: { a: 0, k: 8 },
          is: { a: 0, k: 0 },
          or: { a: 0, k: 18 },
          os: { a: 0, k: 0 },
        },
        fill(WHITE, 95),
      ],
      transformOpts: {
        pos: [100, 100],
        scaleAnim: starPulse,
        rotationAnim: lerpKeyframes([
          [0, [0]],
          [180, [15]],
        ], ease),
      },
    }),
    shapeLayer({
      name: "Shine",
      index: 5,
      shapes: [rect(3, 28, 1.5), fill(WHITE, 40)],
      transformOpts: {
        pos: [100, 100],
        rotationAnim: shineRot,
        opacityAnim: lerpKeyframes([
          [0, [0]],
          [30, [60]],
          [60, [0]],
          [180, [0]],
        ], ease),
      },
    }),
  ]);
}

const animations = {
  currency: currencyAnimation(),
  accounts: accountsAnimation(),
  balances: balancesAnimation(),
  primary: primaryAnimation(),
};

for (const OUT_DIR of OUT_DIRS) {
  await mkdir(OUT_DIR, { recursive: true });
  for (const [name, data] of Object.entries(animations)) {
    const path = join(OUT_DIR, `${name}.json`);
    await writeFile(path, JSON.stringify(data, null, 2));
    console.log(`Wrote ${path}`);
  }
}

console.log("Done — 4 setup Lottie files generated.");
