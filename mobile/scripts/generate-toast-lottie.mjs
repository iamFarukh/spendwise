/**
 * Generates lightweight one-shot Lottie assets for toast feedback (<0.6s, 48×48).
 * Run: node scripts/generate-toast-lottie.mjs
 */
import {writeFileSync, mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../src/assets/lottie/toast');
mkdirSync(outDir, {recursive: true});

/** @param {[number,number,number]} rgb 0–1 */
function fillLayer(name, rgb, op = 40) {
  return {
    ddd: 0,
    ind: 1,
    ty: 4,
    nm: name,
    sr: 1,
    ks: {
      o: {a: 0, k: 100},
      r: {a: 0, k: 0},
      p: {a: 0, k: [24, 24, 0]},
      a: {a: 0, k: [0, 0, 0]},
      s: {
        a: 1,
        k: [
          {t: 0, s: [0, 0, 100], i: {x: [0.2, 0.2, 0.2], y: [1, 1, 1]}, o: {x: [0.4, 0.4, 0.4], y: [0, 0, 0]}},
          {t: 14, s: [100, 100, 100]},
        ],
      },
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr',
        it: [
          {ty: 'el', p: {a: 0, k: [0, 0]}, s: {a: 0, k: [34, 34]}},
          {ty: 'fl', c: {a: 0, k: [...rgb, 1]}, o: {a: 0, k: 100}, r: 1, bm: 0},
          {ty: 'tr', p: {a: 0, k: [0, 0]}, a: {a: 0, k: [0, 0]}, s: {a: 0, k: [100, 100]}, r: {a: 0, k: 0}, o: {a: 0, k: 100}},
        ],
      },
    ],
    ip: 0,
    op,
    st: 0,
    bm: 0,
  };
}

function markLayer(name, shapes, op = 40, delay = 8) {
  return {
    ddd: 0,
    ind: 2,
    ty: 4,
    nm: name,
    sr: 1,
    ks: {
      o: {
        a: 1,
        k: [
          {t: 0, s: [0], i: {x: [0.2], y: [1]}, o: {x: [0.4], y: [0]}},
          {t: delay, s: [0]},
          {t: delay + 10, s: [100]},
        ],
      },
      r: {a: 0, k: 0},
      p: {a: 0, k: [24, 24, 0]},
      a: {a: 0, k: [0, 0, 0]},
      s: {a: 0, k: [100, 100, 100]},
    },
    ao: 0,
    shapes,
    ip: 0,
    op,
    st: 0,
    bm: 0,
  };
}

function checkShapes() {
  return [
    {
      ty: 'gr',
      it: [
        {
          ty: 'gr',
          it: [
            {ty: 'rc', p: {a: 0, k: [0, 0]}, s: {a: 0, k: [3, 10]}, r: {a: 0, k: 1.5}},
            {ty: 'fl', c: {a: 0, k: [1, 1, 1, 1]}, o: {a: 0, k: 100}, r: 1, bm: 0},
            {ty: 'tr', p: {a: 0, k: [-5, 3]}, a: {a: 0, k: [0, 0]}, s: {a: 0, k: [100, 100]}, r: {a: 0, k: -45}, o: {a: 0, k: 100}},
          ],
        },
        {
          ty: 'gr',
          it: [
            {ty: 'rc', p: {a: 0, k: [0, 0]}, s: {a: 0, k: [3, 18]}, r: {a: 0, k: 1.5}},
            {ty: 'fl', c: {a: 0, k: [1, 1, 1, 1]}, o: {a: 0, k: 100}, r: 1, bm: 0},
            {ty: 'tr', p: {a: 0, k: [4, 0]}, a: {a: 0, k: [0, 0]}, s: {a: 0, k: [100, 100]}, r: {a: 0, k: 45}, o: {a: 0, k: 100}},
          ],
        },
        {ty: 'tr', p: {a: 0, k: [0, 0]}, a: {a: 0, k: [0, 0]}, s: {a: 0, k: [100, 100]}, r: {a: 0, k: 0}, o: {a: 0, k: 100}},
      ],
    },
  ];
}

function xShapes() {
  return [
    {
      ty: 'gr',
      it: [
        {
          ty: 'gr',
          it: [
            {ty: 'rc', p: {a: 0, k: [0, 0]}, s: {a: 0, k: [3, 16]}, r: {a: 0, k: 1.5}},
            {ty: 'fl', c: {a: 0, k: [1, 1, 1, 1]}, o: {a: 0, k: 100}, r: 1, bm: 0},
            {ty: 'tr', p: {a: 0, k: [0, 0]}, a: {a: 0, k: [0, 0]}, s: {a: 0, k: [100, 100]}, r: {a: 0, k: 45}, o: {a: 0, k: 100}},
          ],
        },
        {
          ty: 'gr',
          it: [
            {ty: 'rc', p: {a: 0, k: [0, 0]}, s: {a: 0, k: [3, 16]}, r: {a: 0, k: 1.5}},
            {ty: 'fl', c: {a: 0, k: [1, 1, 1, 1]}, o: {a: 0, k: 100}, r: 1, bm: 0},
            {ty: 'tr', p: {a: 0, k: [0, 0]}, a: {a: 0, k: [0, 0]}, s: {a: 0, k: [100, 100]}, r: {a: 0, k: -45}, o: {a: 0, k: 100}},
          ],
        },
        {ty: 'tr', p: {a: 0, k: [0, 0]}, a: {a: 0, k: [0, 0]}, s: {a: 0, k: [100, 100]}, r: {a: 0, k: 0}, o: {a: 0, k: 100}},
      ],
    },
  ];
}

function bangShapes() {
  return [
    {
      ty: 'gr',
      it: [
        {ty: 'rc', p: {a: 0, k: [0, -2]}, s: {a: 0, k: [3, 12]}, r: {a: 0, k: 1.5}},
        {ty: 'fl', c: {a: 0, k: [1, 1, 1, 1]}, o: {a: 0, k: 100}, r: 1, bm: 0},
        {ty: 'el', p: {a: 0, k: [0, 8]}, s: {a: 0, k: [4, 4]}},
        {ty: 'fl', c: {a: 0, k: [1, 1, 1, 1]}, o: {a: 0, k: 100}, r: 1, bm: 0},
        {ty: 'tr', p: {a: 0, k: [0, 0]}, a: {a: 0, k: [0, 0]}, s: {a: 0, k: [100, 100]}, r: {a: 0, k: 0}, o: {a: 0, k: 100}},
      ],
    },
  ];
}

function base(name, layers) {
  return {v: '5.7.4', fr: 60, ip: 0, op: 40, w: 48, h: 48, nm: name, ddd: 0, assets: [], layers, markers: []};
}

const mint = [0.071, 0.722, 0.525];
const expense = [0.886, 0.416, 0.341];
const pending = [0.851, 0.604, 0.169];

const files = {
  'toast-success.json': base('Toast Success', [fillLayer('Circle', mint), markLayer('Check', checkShapes())]),
  'toast-error.json': base('Toast Error', [fillLayer('Circle', expense), markLayer('X', xShapes())]),
  'toast-warning.json': base('Toast Warning', [fillLayer('Circle', pending), markLayer('Bang', bangShapes())]),
};

for (const [name, data] of Object.entries(files)) {
  writeFileSync(join(outDir, name), JSON.stringify(data));
  console.log(`Wrote ${name} (${JSON.stringify(data).length} bytes)`);
}
