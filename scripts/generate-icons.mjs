// Generates the PWA icon set from a single inline SVG source.
//   icon-192.png, icon-512.png            — standard (full-bleed glyph)
//   icon-512-maskable.png                 — extra safe-zone padding for Android masks
//
// Run once and commit the PNGs:  node scripts/generate-icons.mjs
// Re-run only when the brand mark changes.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "icons");

const BG = "#FAF8F5"; // brand background (matches manifest theme_color)
const FG = "#2E3A59"; // brand primary (ink)
const ACCENT = "#C9A24B"; // warm accent

// A wallet mark on the brand background. `pad` shrinks the glyph for the maskable
// variant so it survives Android's circular/squircle mask crop (~20% safe zone).
function svg({ pad }) {
  const inset = Math.round(512 * pad);
  const size = 512 - inset * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>
  <g transform="translate(${inset},${inset})">
    <rect x="${size * 0.12}" y="${size * 0.26}" width="${size * 0.76}" height="${size * 0.5}" rx="${size * 0.08}" fill="${FG}"/>
    <rect x="${size * 0.55}" y="${size * 0.42}" width="${size * 0.4}" height="${size * 0.2}" rx="${size * 0.05}" fill="${ACCENT}"/>
    <circle cx="${size * 0.66}" cy="${size * 0.52}" r="${size * 0.045}" fill="${FG}"/>
  </g>
</svg>`;
}

async function render(name, svgString, dim) {
  const out = join(OUT, name);
  await sharp(Buffer.from(svgString)).resize(dim, dim).png().toFile(out);
  console.log("wrote", out);
}

await mkdir(OUT, { recursive: true });
await render("icon-192.png", svg({ pad: 0 }), 192);
await render("icon-512.png", svg({ pad: 0 }), 512);
await render("icon-512-maskable.png", svg({ pad: 0.12 }), 512);
console.log("done");
