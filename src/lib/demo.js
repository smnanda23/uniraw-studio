// ---------------------------------------------------------------------------
// UniRaw — demo mode for static portfolio deploys (GitHub Pages etc.).
// Active when built with VITE_DEMO=1 or served from *.github.io.
// Seeds a realistic library and simulates the convert pipeline so the whole
// studio is clickable without the Python backends.
// ---------------------------------------------------------------------------

export const isDemo =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_DEMO === "1") ||
  (typeof window !== "undefined" && /\.github\.io$/i.test(window.location.hostname));

// Lightweight generated "photographs": layered radial gradients as SVG data
// URIs — zero assets, unique per file, and visually distinct in compare view.
const svgPreview = (h1, h2, h3, bright = 1) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="426">
  <defs>
    <radialGradient id="a" cx="30%" cy="28%" r="80%">
      <stop offset="0%" stop-color="hsl(${h1},72%,${Math.round(38 * bright)}%)"/>
      <stop offset="100%" stop-color="hsl(${h1},50%,7%)"/>
    </radialGradient>
    <radialGradient id="b" cx="74%" cy="72%" r="70%">
      <stop offset="0%" stop-color="hsl(${h2},64%,${Math.round(30 * bright)}%)" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="hsl(${h2},50%,6%)" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="c" cx="55%" cy="42%" r="45%">
      <stop offset="0%" stop-color="hsl(${h3},80%,${Math.round(52 * bright)}%)" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="hsl(${h3},60%,10%)" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="640" height="426" fill="url(#a)"/>
  <rect width="640" height="426" fill="url(#b)"/>
  <circle cx="352" cy="180" r="190" fill="url(#c)"/>
</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
};

const ANNS = [
  { summary: "Night market stall under tungsten practicals", file_type: "nef", objects: [{ name: "person", count: 2 }, { name: "lantern", count: 5 }], lighting: "tungsten, low-key" },
  { summary: "Street food counter with rising steam", file_type: "dng", objects: [{ name: "cookware", count: 3 }, { name: "signage", count: 2 }], lighting: "mixed fluorescent" },
  { summary: "Crowded market alley at dusk", file_type: "nef", objects: [{ name: "person", count: 7 }, { name: "awning", count: 4 }], lighting: "ambient dusk" },
  { summary: "Vendor portrait beside produce crates", file_type: "dng", objects: [{ name: "person", count: 1 }, { name: "crate", count: 6 }], lighting: "practical lamps" },
  { summary: "Neon reflections on wet pavement", file_type: "nef", objects: [{ name: "sign", count: 3 }, { name: "bicycle", count: 1 }], lighting: "neon, high-contrast" },
  { summary: "Rooftop skyline in blue hour", file_type: "dng", objects: [{ name: "building", count: 12 }], lighting: "blue hour" },
];

const NAMES = [
  "_DSC1793.NEF", "_DSC1794.NEF", "_DSC1801.NEF", "_DSC1822.NEF",
  "20251015_220807.DNG", "20251015_225715.DNG", "20251015_230212.DNG",
  "20251015_230452.DNG", "_DSC3691.NEF", "_DSC3702.NEF",
  "20251016_001204.DNG", "A001_102_2019.DNG",
];

// statuses: uni (converted) / ann (annotated) / raw
const STATUS = ["uni", "ann", "raw", "uni", "ann", "uni", "raw", "ann", "uni", "raw", "ann", "uni"];
const HUES = [
  [226, 188, 262], [30, 226, 190], [262, 200, 320], [190, 226, 150],
  [340, 262, 226], [210, 170, 250], [48, 200, 226], [280, 226, 180],
  [226, 300, 190], [160, 226, 260], [20, 260, 200], [200, 240, 280],
];

export const makeDemoFiles = () =>
  NAMES.map((name, i) => {
    const isNef = name.endsWith(".NEF");
    const size = (isNef ? 22 + ((i * 37) % 90) / 10 : 14 + ((i * 53) % 110) / 10) * 1024 * 1024;
    const st = STATUS[i];
    const [h1, h2, h3] = HUES[i];
    const preview = svgPreview(h1, h2, h3, 0.82);
    const truecolor = svgPreview(h1, h2, h3, 1.12);
    const uniMB = (size / (1024 * 1024)) * 0.028;
    return {
      id: "demo-" + i,
      name,
      size,
      type: isNef ? "image/x-nikon-nef" : "image/x-adobe-dng",
      preview,
      annotation: st === "raw" ? {} : ANNS[i % ANNS.length],
      originalFile: null,
      isConverted: st === "uni",
      unirawPath: st === "uni" ? `/demo/archive/${name.replace(/\.[^.]+$/, "")}.uniraw` : null,
      unirawSize: st === "uni" ? `${uniMB.toFixed(2)} MB` : null,
      compression: st === "uni" ? `${(size / (1024 * 1024) / uniMB).toFixed(2)}×` : null,
      truecolorUrl: st === "uni" ? truecolor : null,
      label: st === "uni" ? "uniraw" : null,
      demoTruecolor: truecolor, // used by the simulated converter
    };
  });

export const demoAnnotation = (name) => ({
  ...ANNS[Math.abs([...name].reduce((s, c) => s + c.charCodeAt(0), 0)) % ANNS.length],
  file_type: name.split(".").pop().toLowerCase(),
});

export const demoDelay = (ms) => new Promise((r) => setTimeout(r, ms));
