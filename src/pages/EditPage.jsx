import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  SlidersHorizontal,
  Eye,
  EyeOff,
  Cpu,
  Image as ImageIcon,
  Info,
  Save,
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeftRight,
  Sparkles,
  Wand2,
} from "lucide-react";
import RightSidebar from "../components/RightSidebar";
import {
  Button,
  Card,
  Badge,
  Slider as UiSlider,
  EmptyState,
  Logo,
} from "../components/ui";
import { EditRenderer } from "../lib/EditRenderer";

// ---------------------------------------------------------------------------
// localStorage fallback — MediaPage owns the canonical selected/mediaFiles
// state and persists them under these keys. App.jsx forwards them as props,
// but its copy can lag behind MediaPage's writes inside the same session,
// so we trust localStorage as a fallback when the prop is empty.
// ---------------------------------------------------------------------------
const loadSelectedFromStorage = () => {
  try {
    const raw = localStorage.getItem("uniraw_selected");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Match MediaPage's sanitizeMediaItem behaviour: drop unserializable fields
// and don't blow the localStorage quota with full data: URIs.
const sanitizeForStorage = (item) => {
  if (!item) return null;
  // Strip originalFile (a File object can't survive JSON round-trip)
  // and replace heavy data: previews with null so we stay under the quota.
  // eslint-disable-next-line no-unused-vars
  const { originalFile, ...rest } = item;
  if (
    rest.preview &&
    typeof rest.preview === "string" &&
    rest.preview.startsWith("data:")
  ) {
    rest.preview = null;
  }
  return rest;
};

// Persist an updated media item into BOTH uniraw_selected and the
// uniraw_mediaFiles array entry so MediaPage sees the same truth on its
// next mount (MediaPage's hydration prefers local matches by name).
const persistActiveFile = (updated) => {
  if (!updated) return;
  const sanitized = sanitizeForStorage(updated);
  try {
    localStorage.setItem("uniraw_selected", JSON.stringify(sanitized));
  } catch (e) {
    console.warn("EditPage: failed to write uniraw_selected:", e);
  }
  try {
    const raw = localStorage.getItem("uniraw_mediaFiles");
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    const next = arr.map((m) => {
      if (!m) return m;
      const sameId = m.id && updated.id && m.id === updated.id;
      const sameName =
        !sameId &&
        m.name &&
        updated.name &&
        m.name.toLowerCase() === updated.name.toLowerCase();
      return sameId || sameName ? { ...m, ...sanitized } : m;
    });
    localStorage.setItem("uniraw_mediaFiles", JSON.stringify(next));
  } catch (e) {
    console.warn("EditPage: failed to merge uniraw_mediaFiles:", e);
  }
};

// ---------------------------------------------------------------------------
// Tone curve → 256-entry LUT.
// Curve points are stored in canvas coords (y=0 is top → output=1, y=1 →
// output=0), so we invert when sampling. The four default points form an
// identity diagonal (input == output).
// ---------------------------------------------------------------------------
const buildToneLUT = (points) => {
  const lut = new Uint8ClampedArray(256);
  const samples = [];
  const N = 200;

  for (let s = 0; s < points.length - 1; s++) {
    const p0 = points[s];
    const p1 = points[s + 1];
    const cx1 = p0.x + (p1.x - p0.x) * 0.3;
    const cy1 = p0.y;
    const cx2 = p1.x - (p1.x - p0.x) * 0.3;
    const cy2 = p1.y;

    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const omt = 1 - t;
      const x =
        omt * omt * omt * p0.x +
        3 * omt * omt * t * cx1 +
        3 * omt * t * t * cx2 +
        t * t * t * p1.x;
      const y =
        omt * omt * omt * p0.y +
        3 * omt * omt * t * cy1 +
        3 * omt * t * t * cy2 +
        t * t * t * p1.y;
      samples.push({ x, y });
    }
  }
  samples.sort((a, b) => a.x - b.x);

  let i = 0;
  for (let v = 0; v < 256; v++) {
    const xt = v / 255;
    while (i + 1 < samples.length && samples[i + 1].x < xt) i++;
    const a = samples[i];
    const b = samples[Math.min(i + 1, samples.length - 1)];
    const span = Math.max(b.x - a.x, 1e-6);
    const t = (xt - a.x) / span;
    const y = a.y + (b.y - a.y) * t;
    const out = (1 - y) * 255;
    lut[v] = Math.max(0, Math.min(255, Math.round(out)));
  }
  return lut;
};

// ---------------------------------------------------------------------------
// Render the source image onto a target canvas with the full edit pipeline.
// Kept simple and per-pixel; for the truecolor JPGs we ship (≤1280px on
// the long edge) this stays well under 100ms on a slider drag.
// ---------------------------------------------------------------------------
const renderEdited = (image, canvas, opts) => {
  if (!image || !canvas) return;
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  if (!w || !h) return;

  const maxW = 1280;
  const maxH = 1024;
  const scale = Math.min(1, maxW / w, maxH / h);
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  if (canvas.width !== cw) canvas.width = cw;
  if (canvas.height !== ch) canvas.height = ch;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, cw, ch);

  let img;
  try {
    img = ctx.getImageData(0, 0, cw, ch);
  } catch (err) {
    // Tainted canvas (cross-origin without CORS) — fall back to drawn-only.
    console.warn("EditPage: getImageData blocked, edits disabled:", err);
    return;
  }
  const data = img.data;

  const exposureGain = Math.pow(2, opts.exposure);
  const contrast = (opts.contrast || 100) / 100;
  const saturation = (opts.saturation || 100) / 100;
  const wb = (opts.whiteBalance || 0) / 100; // -1..+1
  const rGain = 1 + wb * 0.4;
  const bGain = 1 - wb * 0.4;
  const lut = opts.lut;

  for (let p = 0; p < data.length; p += 4) {
    let r = data[p] * exposureGain * rGain;
    let g = data[p + 1] * exposureGain;
    let b = data[p + 2] * exposureGain * bGain;

    // contrast around midpoint
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;

    // saturation via luma blend
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    r = luma + (r - luma) * saturation;
    g = luma + (g - luma) * saturation;
    b = luma + (b - luma) * saturation;

    // tone curve LUT
    r = lut[Math.max(0, Math.min(255, r | 0))];
    g = lut[Math.max(0, Math.min(255, g | 0))];
    b = lut[Math.max(0, Math.min(255, b | 0))];

    data[p] = r;
    data[p + 1] = g;
    data[p + 2] = b;
  }
  ctx.putImageData(img, 0, 0);
};

// ---------------------------------------------------------------------------
// Real RGB histogram — sample the *edited* canvas so the histogram tracks
// slider changes. Reads via a tmp 2D canvas so this works regardless of
// whether the source canvas is using a 2D or WebGL2 context.
// ---------------------------------------------------------------------------
const drawHistogram = (srcCanvas, histCanvas) => {
  if (!srcCanvas || !histCanvas) return;
  const sw = srcCanvas.width;
  const sh = srcCanvas.height;
  const W = histCanvas.width;
  const H = histCanvas.height;
  const hctx = histCanvas.getContext("2d");
  hctx.clearRect(0, 0, W, H);
  if (!sw || !sh) return;

  // Downsample to keep the read cheap on large native-resolution images.
  const maxEdge = 800;
  const scale = Math.min(1, maxEdge / sw, maxEdge / sh);
  const tw = Math.max(1, Math.round(sw * scale));
  const th = Math.max(1, Math.round(sh * scale));

  let data;
  try {
    const tmp = document.createElement("canvas");
    tmp.width = tw;
    tmp.height = th;
    const tctx = tmp.getContext("2d");
    tctx.drawImage(srcCanvas, 0, 0, sw, sh, 0, 0, tw, th);
    data = tctx.getImageData(0, 0, tw, th).data;
  } catch {
    return; // tainted
  }

  const bins = 128;
  const r = new Float32Array(bins);
  const g = new Float32Array(bins);
  const b = new Float32Array(bins);

  for (let i = 0; i < data.length; i += 4) {
    r[Math.min(bins - 1, (data[i] * bins) >> 8)]++;
    g[Math.min(bins - 1, (data[i + 1] * bins) >> 8)]++;
    b[Math.min(bins - 1, (data[i + 2] * bins) >> 8)]++;
  }

  let peak = 1;
  for (let i = 0; i < bins; i++) {
    if (r[i] > peak) peak = r[i];
    if (g[i] > peak) peak = g[i];
    if (b[i] > peak) peak = b[i];
  }

  const draw = (arr, color) => {
    hctx.fillStyle = color;
    const bw = W / bins;
    for (let i = 0; i < bins; i++) {
      const hh = (arr[i] / peak) * (H * 0.9);
      hctx.fillRect(i * bw, H - hh, Math.max(1, bw * 0.9), hh);
    }
  };
  hctx.globalCompositeOperation = "lighter";
  draw(r, "rgba(244,63,94,0.45)");
  draw(g, "rgba(34,197,94,0.45)");
  draw(b, "rgba(59,130,246,0.45)");
  hctx.globalCompositeOperation = "source-over";
};

// ---------------------------------------------------------------------------
// Region stats — region rect is in container coords; map to canvas pixel
// coords via the canvas's actual displayed bounding rect, intersect with
// the canvas, and compute mean R/G/B/luma.
// ---------------------------------------------------------------------------
const regionStats = (canvas, region, container) => {
  if (!canvas || !region || !container) return null;
  const cw = canvas.width;
  const ch = canvas.height;
  if (!cw || !ch) return null;

  const cRect = canvas.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  if (!cRect.width || !cRect.height) return null;

  const x = Math.min(region.x, region.x + region.w);
  const y = Math.min(region.y, region.y + region.h);
  const w = Math.abs(region.w);
  const h = Math.abs(region.h);
  if (w < 2 || h < 2) return null;

  const regAbsX = containerRect.left + x;
  const regAbsY = containerRect.top + y;
  const x0 = Math.max(regAbsX, cRect.left);
  const y0 = Math.max(regAbsY, cRect.top);
  const x1 = Math.min(regAbsX + w, cRect.right);
  const y1 = Math.min(regAbsY + h, cRect.bottom);
  if (x1 <= x0 || y1 <= y0) return null;

  const sx = Math.max(0, Math.floor(((x0 - cRect.left) / cRect.width) * cw));
  const sy = Math.max(0, Math.floor(((y0 - cRect.top) / cRect.height) * ch));
  const sw = Math.max(1, Math.floor(((x1 - x0) / cRect.width) * cw));
  const sh = Math.max(1, Math.floor(((y1 - y0) / cRect.height) * ch));

  // Use a tmp 2D canvas so this works for WebGL2 source canvases too —
  // .getContext("2d") on a WebGL2 canvas returns null.
  const w2 = Math.min(sw, cw - sx);
  const h2 = Math.min(sh, ch - sy);
  if (w2 <= 0 || h2 <= 0) return null;
  let data;
  try {
    const tmp = document.createElement("canvas");
    tmp.width = w2;
    tmp.height = h2;
    const tctx = tmp.getContext("2d");
    tctx.drawImage(canvas, sx, sy, w2, h2, 0, 0, w2, h2);
    data = tctx.getImageData(0, 0, w2, h2).data;
  } catch {
    return null;
  }

  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  if (!n) return null;
  return {
    r: r / n,
    g: g / n,
    b: b / n,
    lum: (0.299 * r + 0.587 * g + 0.114 * b) / n,
    n,
  };
};

// ---------------------------------------------------------------------------
// EditPage
// ---------------------------------------------------------------------------
export default function EditPage({ selected = null }) {
  // Resolve the file actually being edited. Prefer prop if it carries a
  // preview, else fall back to localStorage (where MediaPage stashes it).
  const [activeFile, setActiveFile] = useState(() =>
    selected?.truecolorUrl || selected?.preview
      ? selected
      : loadSelectedFromStorage()
  );
  useEffect(() => {
    if (selected?.truecolorUrl || selected?.preview) setActiveFile(selected);
  }, [selected]);

  const sourceUrl = activeFile?.truecolorUrl || activeFile?.preview || null;
  const originalUrl = activeFile?.preview || null;

  // --- adjustment state --------------------------------------------------
  const [compareMode, setCompareMode] = useState(false);
  const [splitPct, setSplitPct] = useState(50); // 0..100, divider position
  const splitDragRef = useRef(false);
  const [exposure, setExposure] = useState(0); // EV stops
  const [contrast, setContrast] = useState(100); // %
  const [saturation, setSaturation] = useState(100); // %
  const [whiteBalance, setWhiteBalance] = useState(0); // -100..+100
  const [points, setPoints] = useState([
    { x: 0, y: 1 },
    { x: 0.33, y: 0.66 },
    { x: 0.66, y: 0.33 },
    { x: 1, y: 0 },
  ]);
  const [activePoint, setActivePoint] = useState(null);

  // --- save / export state ----------------------------------------------
  const [applyState, setApplyState] = useState("idle"); // idle | saving | saved | error
  const [applyError, setApplyError] = useState(null);

  // --- region selection state -------------------------------------------
  const [regions, setRegions] = useState([]);
  const [activeRegion, setActiveRegion] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState(null);
  const [statsTick, setStatsTick] = useState(0); // forces region-stats recompute

  // Per-region AI identification state — keyed by region.level.
  // Shape: { [level]: { state: 'idle'|'loading'|'ok'|'error', data?, error? } }
  const [regionAnalysis, setRegionAnalysis] = useState({});

  // --- refs --------------------------------------------------------------
  const previewRef = useRef(null);
  const editedCanvasRef = useRef(null);
  const histCanvasRef = useRef(null);
  const curveCanvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const lastRestoredFileKey = useRef(null);

  // WebGL2 renderer — built once when the canvas mounts. Falls back
  // transparently to the existing 2D `renderEdited` path if WebGL2 is
  // unavailable (rare on modern browsers).
  const rendererRef = useRef(null);
  const [useGL, setUseGL] = useState(false);

  // Restore (or reset) the slider/curve state when the *file* changes —
  // not on every render. Keyed by id||name so toggling unrelated state
  // doesn't clobber the user's in-progress edits.
  useEffect(() => {
    if (!activeFile) return;
    const key = activeFile.id || activeFile.name;
    if (!key || key === lastRestoredFileKey.current) return;
    lastRestoredFileKey.current = key;

    const e = activeFile.editState;
    if (e && typeof e === "object") {
      setExposure(typeof e.exposure === "number" ? e.exposure : 0);
      setContrast(typeof e.contrast === "number" ? e.contrast : 100);
      setSaturation(typeof e.saturation === "number" ? e.saturation : 100);
      setWhiteBalance(
        typeof e.whiteBalance === "number" ? e.whiteBalance : 0
      );
      if (Array.isArray(e.points) && e.points.length >= 2) {
        setPoints(e.points);
      }
    } else {
      setExposure(0);
      setContrast(100);
      setSaturation(100);
      setWhiteBalance(0);
      setPoints([
        { x: 0, y: 1 },
        { x: 0.33, y: 0.66 },
        { x: 0.66, y: 0.33 },
        { x: 1, y: 0 },
      ]);
    }
    // Clear any stale "saved!" indicator when switching files
    setApplyState("idle");
    setApplyError(null);
    // Re-center the compare divider on file switch
    setSplitPct(50);
  }, [activeFile?.id, activeFile?.name]);

  // Build LUT once per curve change
  const lut = useMemo(() => buildToneLUT(points), [points]);

  // Load source image whenever the URL changes
  useEffect(() => {
    setImageLoaded(false);
    imgRef.current = null;
    if (!sourceUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error("EditPage: failed to load preview", sourceUrl);
      imgRef.current = null;
      setImageLoaded(false);
    };
    img.src = sourceUrl;
  }, [sourceUrl]);

  // ----------------------------------------------------------------
  // Renderer lifecycle
  // ----------------------------------------------------------------

  // 1. Init the WebGL2 renderer once when the canvas first mounts.
  //    If the GPU/browser can't give us WebGL2, the renderer flips
  //    isSupported() to false and we fall back to the existing 2D
  //    pipeline (renderEdited) automatically.
  useEffect(() => {
    if (!editedCanvasRef.current) return undefined;
    const r = new EditRenderer(editedCanvasRef.current);
    rendererRef.current = r;
    setUseGL(r.isSupported());
    return () => {
      r.destroy();
      if (rendererRef.current === r) rendererRef.current = null;
    };
  }, []);

  // 2. Upload the source image to the GPU when it (re)loads. This is
  //    a one-time cost per image — slider changes only push uniforms,
  //    not pixels.
  useEffect(() => {
    if (!imageLoaded || !imgRef.current) return;
    const r = rendererRef.current;
    if (r && r.isSupported()) r.setImage(imgRef.current);
  }, [imageLoaded]);

  // 3. Upload the tone-curve LUT when it changes. Defensively coerced
  //    to a fresh Uint8Array since the shader expects that format.
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !r.isSupported() || !lut) return;
    r.setLUT(lut instanceof Uint8Array ? lut : new Uint8Array(lut));
  }, [lut]);

  // 4. Render on every input change. WebGL2 path is the default; the
  //    2D fallback fires only when the renderer reports unsupported.
  useEffect(() => {
    if (!imageLoaded) return;
    const canvas = editedCanvasRef.current;
    if (!canvas) return;
    const r = rendererRef.current;
    if (r && r.isSupported()) {
      r.render({ exposure, contrast, saturation, whiteBalance });
    } else if (imgRef.current) {
      // Fallback: per-pixel JS on a 2D canvas (≤1280 long edge).
      renderEdited(imgRef.current, canvas, {
        exposure,
        contrast,
        saturation,
        whiteBalance,
        lut,
      });
    }
    drawHistogram(canvas, histCanvasRef.current);
    setStatsTick((t) => t + 1);
  }, [imageLoaded, exposure, contrast, saturation, whiteBalance, lut]);

  // Tone curve canvas drawing (kept from the original UI)
  useEffect(() => {
    const c = curveCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width;
    const H = c.height;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo((W / 4) * i, 0);
      ctx.lineTo((W / 4) * i, H);
      ctx.moveTo(0, (H / 4) * i);
      ctx.lineTo(W, (H / 4) * i);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, H * points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx1 = prev.x * W + (curr.x - prev.x) * 0.3 * W;
      const cy1 = prev.y * H;
      const cx2 = curr.x * W - (curr.x - prev.x) * 0.3 * W;
      const cy2 = curr.y * H;
      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, curr.x * W, curr.y * H);
    }
    ctx.strokeStyle = "rgb(45,212,191)";
    ctx.lineWidth = 2;
    ctx.stroke();
    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, 5, 0, Math.PI * 2);
      ctx.fillStyle = i === activePoint ? "#2dd4bf" : "#f5f5f5";
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.stroke();
    });
  }, [points, activePoint]);

  const handleCurveMouseDown = (e) => {
    const rect = curveCanvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const idx = points.findIndex((p) => Math.hypot(p.x - x, p.y - y) < 0.05);
    if (idx !== -1) setActivePoint(idx);
  };
  const handleCurveMouseMove = (e) => {
    if (activePoint === null) return;
    const rect = curveCanvasRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    setPoints((prev) =>
      prev
        .map((p, i) => (i === activePoint ? { x, y } : p))
        .sort((a, b) => a.x - b.x)
    );
  };
  const handleCurveMouseUp = () => setActivePoint(null);

  // --- region drag handlers (preview-area mousedown) --------------------
  // Region drawing is disabled while compareMode is on — in that mode the
  // preview area belongs to the slider.
  const handleMouseDown = (e) => {
    if (!previewRef.current || !sourceUrl || compareMode) return;
    const rect = previewRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    setDragging(true);
    setStart({ x: sx, y: sy });
    setRegions((prev) => [
      ...prev,
      { x: sx, y: sy, w: 0, h: 0, level: prev.length + 1 },
    ]);
    setActiveRegion(regions.length + 1);
  };
  const handleMouseMove = (e) => {
    if (!dragging || !start || !previewRef.current || compareMode) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRegions((prev) =>
      prev.map((r, i) =>
        i === prev.length - 1 ? { ...r, w: x - start.x, h: y - start.y } : r
      )
    );
  };
  const handleMouseUp = () => {
    setDragging(false);
    setStart(null);
    setStatsTick((t) => t + 1);
  };
  const clearRegions = () => {
    setRegions([]);
    setRegionAnalysis({});
  };
  const deleteRegion = (level) => {
    setRegions(regions.filter((r) => r.level !== level));
    setRegionAnalysis((prev) => {
      const next = { ...prev };
      delete next[level];
      return next;
    });
  };

  // ----- AI region identification ---------------------------------------
  // Crop the EDITED canvas (so the model sees what the user is looking at)
  // to a JPEG data URI, then POST to /api/annotator/annotate_region.
  // Re-uses the running Ollama (LLaVA) instance — no new model dependency.
  const cropRegionToDataURI = (canvas, region, container) => {
    if (!canvas || !region || !container) return null;
    const cw = canvas.width;
    const ch = canvas.height;
    if (!cw || !ch) return null;
    const cRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (!cRect.width || !cRect.height) return null;

    const x = Math.min(region.x, region.x + region.w);
    const y = Math.min(region.y, region.y + region.h);
    const w = Math.abs(region.w);
    const h = Math.abs(region.h);
    if (w < 4 || h < 4) return null;

    const regAbsX = containerRect.left + x;
    const regAbsY = containerRect.top + y;
    const x0 = Math.max(regAbsX, cRect.left);
    const y0 = Math.max(regAbsY, cRect.top);
    const x1 = Math.min(regAbsX + w, cRect.right);
    const y1 = Math.min(regAbsY + h, cRect.bottom);
    if (x1 <= x0 || y1 <= y0) return null;

    const sx = Math.max(0, Math.floor(((x0 - cRect.left) / cRect.width) * cw));
    const sy = Math.max(0, Math.floor(((y0 - cRect.top) / cRect.height) * ch));
    const sw = Math.max(1, Math.floor(((x1 - x0) / cRect.width) * cw));
    const sh = Math.max(1, Math.floor(((y1 - y0) / cRect.height) * ch));

    // Cap the sent crop at 768px on the long edge so Ollama isn't fed
    // a huge payload — LLaVA downsamples internally anyway.
    const maxEdge = 768;
    const scale = Math.min(1, maxEdge / Math.max(sw, sh));
    const tw = Math.max(4, Math.round(sw * scale));
    const th = Math.max(4, Math.round(sh * scale));

    try {
      const tmp = document.createElement("canvas");
      tmp.width = tw;
      tmp.height = th;
      const tctx = tmp.getContext("2d");
      tctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, tw, th);
      return tmp.toDataURL("image/jpeg", 0.85);
    } catch (err) {
      console.warn("EditPage: region crop failed", err);
      return null;
    }
  };

  const analyzeRegion = async (level) => {
    const region = regions.find((r) => r.level === level);
    if (!region) return;
    const b64 = cropRegionToDataURI(
      editedCanvasRef.current,
      region,
      previewRef.current
    );
    if (!b64) {
      setRegionAnalysis((p) => ({
        ...p,
        [level]: {
          state: "error",
          error: "Region is outside the preview area or too small.",
        },
      }));
      return;
    }
    setRegionAnalysis((p) => ({
      ...p,
      [level]: { state: "loading" },
    }));
    try {
      const res = await fetch("/api/annotator/annotate_region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_b64: b64 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        setRegionAnalysis((p) => ({
          ...p,
          [level]: {
            state: "error",
            error: data?.error || `HTTP ${res.status}`,
          },
        }));
        return;
      }
      setRegionAnalysis((p) => ({
        ...p,
        [level]: { state: "ok", data },
      }));
    } catch (err) {
      setRegionAnalysis((p) => ({
        ...p,
        [level]: { state: "error", error: err?.message || String(err) },
      }));
    }
  };

  const analyzeAllRegions = async () => {
    // Run sequentially so we don't pile up Ollama requests (the model
    // queues internally but the user sees clearer progress this way).
    for (const r of regions) {
      // Skip ones already in flight or already done successfully.
      const cur = regionAnalysis[r.level];
      if (cur?.state === "loading" || cur?.state === "ok") continue;
      // eslint-disable-next-line no-await-in-loop
      await analyzeRegion(r.level);
    }
  };

  // --- compare-slider drag handlers -------------------------------------
  // The slider strip lives inside the preview area; we listen on the
  // window for mousemove/mouseup so the drag survives the cursor leaving
  // the strip (matches the standard before/after slider feel).
  const updateSplitFromEvent = (e) => {
    const node = previewRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    // The compare layers are inset 6px on every side (matches the
    // border inset above), so account for that to keep the handle
    // visually aligned with the clip edge.
    const inset = 6;
    const x = e.clientX - rect.left - inset;
    const usable = Math.max(rect.width - inset * 2, 1);
    const pct = (x / usable) * 100;
    setSplitPct(Math.max(0, Math.min(100, pct)));
  };
  const handleSplitMouseDown = (e) => {
    if (!compareMode) return;
    e.stopPropagation();
    e.preventDefault();
    splitDragRef.current = true;
    updateSplitFromEvent(e);
  };
  useEffect(() => {
    if (!compareMode) return undefined;
    const onMove = (e) => {
      if (!splitDragRef.current) return;
      updateSplitFromEvent(e);
    };
    const onUp = () => {
      splitDragRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      splitDragRef.current = false;
    };
  }, [compareMode]);

  // --- region stats ------------------------------------------------------
  const regionInfo = useMemo(() => {
    const out = {};
    if (!editedCanvasRef.current || !previewRef.current) return out;
    regions.forEach((r) => {
      out[r.level] = regionStats(
        editedCanvasRef.current,
        r,
        previewRef.current
      );
    });
    return out;
    // statsTick is intentionally part of deps so post-render recompute fires
  }, [regions, statsTick]);

  // --- resets ------------------------------------------------------------
  const resetCurve = () =>
    setPoints([
      { x: 0, y: 1 },
      { x: 0.33, y: 0.66 },
      { x: 0.66, y: 0.33 },
      { x: 1, y: 0 },
    ]);
  const resetAll = () => {
    setExposure(0);
    setContrast(100);
    setSaturation(100);
    setWhiteBalance(0);
    resetCurve();
  };

  // --- save / export ----------------------------------------------------
  // The existing /api/previewer/preview endpoint accepts preview_ev (rawpy
  // exp_shift) plus v_black/v_white normalization. We map only Exposure
  // → preview_ev because the backend has no analogue for Contrast /
  // Saturation / White Balance / Tone Curve. Those stay client-side until
  // we add a richer endpoint.
  const canApplyServer =
    !!activeFile?.unirawPath && imageLoaded && applyState !== "saving";

  const applyAndSave = async () => {
    if (!activeFile?.unirawPath) {
      setApplyState("error");
      setApplyError(
        "This file has no .uniraw path yet. Convert it from the Media tab first."
      );
      return;
    }
    setApplyState("saving");
    setApplyError(null);
    try {
      // The viewer script's neutral exp_shift is 1.0 (see uniraw_webgpu_api.py
      // default), so the slider's 0 EV maps to 1.0 and ±N stops add to it.
      const previewEv = 1.0 + Number(exposure || 0);
      const res = await fetch("/api/previewer/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uniraw_path: activeFile.unirawPath,
          preview_ev: previewEv,
        }),
      });
      const text = await res.text();
      let data = {};
      try {
        data = JSON.parse(text || "{}");
      } catch {
        /* keep data empty */
      }
      if (!res.ok || !data.success || !data.truecolor_url) {
        throw new Error(
          data.message || `Preview re-render failed (HTTP ${res.status})`
        );
      }

      // Normalize the URL the same way MediaPage does (handles ngrok-style
      // absolute URLs from older builds).
      const normalizedUrl = String(data.truecolor_url).replace(
        /^https?:\/\/[^/]+\/api5053/,
        "/api/previewer"
      );
      // Cache-bust so the <img>/canvas reload actually fetches the new bytes.
      const cacheBusted =
        normalizedUrl + (normalizedUrl.includes("?") ? "&" : "?") + "t=" + Date.now();

      const updated = {
        ...activeFile,
        truecolorUrl: cacheBusted,
        editState: {
          exposure,
          contrast,
          saturation,
          whiteBalance,
          points,
          savedAt: Date.now(),
        },
      };
      setActiveFile(updated);
      persistActiveFile(updated);
      setApplyState("saved");
      // Auto-clear the "Saved" badge after a moment
      setTimeout(() => setApplyState("idle"), 2500);
    } catch (err) {
      console.error("EditPage: applyAndSave failed", err);
      setApplyState("error");
      setApplyError(err?.message || String(err));
    }
  };

  const downloadEdited = () => {
    const canvas = editedCanvasRef.current;
    if (!canvas || !canvas.width) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const baseName = (activeFile?.name || "uniraw_edit").replace(
          /\.[^/.]+$/,
          ""
        );
        a.href = url;
        a.download = `${baseName}_edited.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Revoke after the click event has had a chance to settle.
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      },
      "image/jpeg",
      0.95
    );
  };

  // ----------------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------------
  return (
    <div className="flex h-full w-full text-zinc-200 overflow-hidden select-none">
      {/* MAIN PREVIEW */}
      <main className="flex-1 overflow-hidden p-4 transition-all duration-300">
        <div
          ref={previewRef}
          className="relative w-full h-full rounded-xl border border-surface-3 bg-surface-2 overflow-hidden cursor-crosshair shadow-soft flex items-center justify-center"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="absolute inset-[6px] rounded-xl border border-zinc-800/80 pointer-events-none"></div>

          {/* Empty state — branded watermark */}
          {!sourceUrl && (
            <EmptyState
              className="absolute inset-0"
              icon={
                <span className="text-zinc-700">
                  <Logo size={88} tone="mono" title="" />
                </span>
              }
              title="No image selected"
              description="Pick a converted file in the Media tab to start editing."
            />
          )}

          {/* Preview area — both layers stacked at the same position so
              the canvas is never remounted when compareMode toggles. In
              compare mode the edited layer is clipped via clip-path and a
              draggable handle controls splitPct. */}
          {sourceUrl && (
            <div className="absolute inset-[6px] rounded-xl overflow-hidden bg-zinc-900">
              {/* Layer 1: Original — only painted in compare mode */}
              {compareMode && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {originalUrl ? (
                    <img
                      src={originalUrl}
                      alt="Original"
                      className="max-w-full max-h-full object-contain"
                      draggable={false}
                    />
                  ) : (
                    <div className="text-xs text-zinc-500">
                      No original preview available
                    </div>
                  )}
                </div>
              )}

              {/* Layer 2: Edited canvas — clipped from the right when
                  compareMode is on. The wrapper itself is full-size so the
                  canvas's object-contain layout matches the original layer
                  pixel-for-pixel; only the visible region changes. */}
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={
                  compareMode
                    ? { clipPath: `inset(0 ${100 - splitPct}% 0 0)` }
                    : undefined
                }
              >
                <canvas
                  ref={editedCanvasRef}
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Layer 3: Slider strip + handle (compare mode only).
                  Mousedown anywhere along the strip jumps the divider and
                  starts a drag (window-level handlers above pick it up). */}
              {compareMode && (
                <>
                  <div
                    role="slider"
                    tabIndex={0}
                    aria-label="Compare divider"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(splitPct)}
                    onMouseDown={handleSplitMouseDown}
                    onKeyDown={(e) => {
                      const step = e.shiftKey ? 5 : 1;
                      if (e.key === "ArrowLeft") {
                        e.preventDefault();
                        setSplitPct((p) => Math.max(0, p - step));
                      } else if (e.key === "ArrowRight") {
                        e.preventDefault();
                        setSplitPct((p) => Math.min(100, p + step));
                      } else if (e.key === "Home") {
                        e.preventDefault();
                        setSplitPct(0);
                      } else if (e.key === "End") {
                        e.preventDefault();
                        setSplitPct(100);
                      }
                    }}
                    className="absolute top-0 bottom-0 cursor-ew-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:rounded"
                    style={{
                      left: `calc(${splitPct}% - 12px)`,
                      width: 24,
                    }}
                  >
                    <div
                      className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-brand-hi/85 shadow-[0_0_10px_rgba(45,212,191,0.6)]"
                      aria-hidden
                    />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-brand border border-brand-hi/60 shadow-glow flex items-center justify-center">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  <span className="absolute top-2 left-2 text-[10px] uppercase tracking-wider text-zinc-300 bg-black/50 px-2 py-0.5 rounded pointer-events-none">
                    Original
                  </span>
                  <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider text-brand-hi bg-black/50 px-2 py-0.5 rounded pointer-events-none">
                    Uniraw · Edited
                  </span>
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-zinc-400 bg-black/50 px-2 py-0.5 rounded pointer-events-none">
                    {Math.round(splitPct)}%
                  </span>
                </>
              )}
            </div>
          )}

          {/* Region overlays — sit on top of preview area, mousedown on
              them stops propagation so we don't start a new region. */}
          {regions.map((r) => (
            <div
              key={r.level}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setActiveRegion(r.level);
              }}
              className={`absolute border-2 ${
                activeRegion === r.level
                  ? "border-brand-hi"
                  : "border-brand/50"
              } border-dashed`}
              style={{
                left: Math.min(r.x, r.x + r.w),
                top: Math.min(r.y, r.y + r.h),
                width: Math.abs(r.w),
                height: Math.abs(r.h),
              }}
            >
              <div className="absolute -top-5 left-0 text-[10px] text-brand-hi bg-surface-1/80 px-1 rounded">
                Region {r.level}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* SIDEBAR */}
      <RightSidebar>
        {/* File summary */}
        <Card density="tight" padded>
          <div className="flex items-center justify-between mb-1 gap-2">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              Editing
            </span>
            <div className="flex items-center gap-1.5">
              {activeFile?.isConverted ? (
                <Badge color="success" size="xs">
                  uniraw
                </Badge>
              ) : activeFile?.name ? (
                <Badge color="neutral" size="xs">
                  preview
                </Badge>
              ) : null}
              {imageLoaded && (
                <Badge
                  color={useGL ? "brand" : "warning"}
                  size="xs"
                  title={
                    useGL
                      ? "GPU shader pipeline — native resolution, no cumulative quantization"
                      : "CPU fallback — image downscaled to 1280px long edge"
                  }
                >
                  {useGL ? "GPU" : "CPU"}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-sm text-zinc-100 truncate font-medium">
            {activeFile?.name || "No file selected"}
          </div>
          {activeFile?.compression && (
            <div className="mt-1 text-[10px] text-zinc-500 font-mono tabular-nums">
              {activeFile.unirawSize} · {activeFile.compression} compression
            </div>
          )}
          {imageLoaded && imgRef.current && (
            <div className="mt-1 text-[10px] text-zinc-500 font-mono tabular-nums">
              {imgRef.current.naturalWidth}×{imgRef.current.naturalHeight} px ·{" "}
              {useGL ? "highp float" : "8-bit"} pipeline
            </div>
          )}
        </Card>

        {/* Histogram */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2">Histogram</h3>
          <canvas
            ref={histCanvasRef}
            width={320}
            height={120}
            className="w-full h-[120px] rounded border border-zinc-800 bg-zinc-950/40"
          />
          {!imageLoaded && (
            <p className="text-[10px] text-zinc-500 mt-1">
              Histogram will appear once an image is loaded.
            </p>
          )}
        </div>

        {/* Sliders */}
        <Card title="Adjustments" density="tight" padded>
          <div className="flex flex-col gap-3">
            <UiSlider
              label="Exposure"
              value={exposure}
              onChange={setExposure}
              min={-2}
              max={2}
              step={0.1}
              disabled={!imageLoaded}
              formatValue={(v) =>
                `${v >= 0 ? "+" : ""}${Number(v).toFixed(2)} EV`
              }
            />
            <UiSlider
              label="Contrast"
              value={contrast}
              onChange={setContrast}
              min={0}
              max={200}
              step={1}
              disabled={!imageLoaded}
              formatValue={(v) => `${Number(v).toFixed(0)}%`}
            />
            <UiSlider
              label="Saturation"
              value={saturation}
              onChange={setSaturation}
              min={0}
              max={200}
              step={1}
              disabled={!imageLoaded}
              formatValue={(v) => `${Number(v).toFixed(0)}%`}
            />
            <UiSlider
              label="White Balance"
              value={whiteBalance}
              onChange={setWhiteBalance}
              min={-100}
              max={100}
              step={1}
              disabled={!imageLoaded}
              formatValue={(v) =>
                `${v > 0 ? "+" : ""}${Number(v).toFixed(0)}`
              }
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={resetAll}
            disabled={!imageLoaded}
            className="mt-3"
          >
            Reset adjustments
          </Button>
        </Card>

        {/* Tone curve */}
        <Card
          title="Tone Curve"
          density="tight"
          padded
          actions={
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-hi" />
          }
        >
          <canvas
            ref={curveCanvasRef}
            width={320}
            height={160}
            onMouseDown={handleCurveMouseDown}
            onMouseMove={handleCurveMouseMove}
            onMouseUp={handleCurveMouseUp}
            onMouseLeave={handleCurveMouseUp}
            className="w-full h-[160px] rounded-md border border-surface-3 bg-surface-1/60 cursor-pointer"
          />
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <Button
              size="xs"
              variant="ghost"
              onClick={() =>
                setPoints([
                  { x: 0, y: 1 },
                  { x: 0.33, y: 0.66 },
                  { x: 0.66, y: 0.33 },
                  { x: 1, y: 0 },
                ])
              }
              title="Linear (identity) curve"
            >
              Linear
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() =>
                setPoints([
                  { x: 0, y: 1 },
                  { x: 0.25, y: 0.85 },
                  { x: 0.75, y: 0.15 },
                  { x: 1, y: 0 },
                ])
              }
              title="Standard S-curve (mild contrast boost)"
            >
              S-curve
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() =>
                setPoints([
                  { x: 0, y: 0.85 },
                  { x: 0.33, y: 0.5 },
                  { x: 0.66, y: 0.25 },
                  { x: 1, y: 0 },
                ])
              }
              title="Lift the shadows"
            >
              Lift shadows
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() =>
                setPoints([
                  { x: 0, y: 1 },
                  { x: 0.33, y: 0.85 },
                  { x: 0.66, y: 0.4 },
                  { x: 1, y: 0.05 },
                ])
              }
              title="Crush blacks for cinematic feel"
            >
              Crush blacks
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            fullWidth
            onClick={resetCurve}
            className="mt-2"
          >
            Reset curve
          </Button>
        </Card>

        {/* Compare */}
        <Card
          title="Compare"
          density="tight"
          padded
          actions={
            <Button
              size="xs"
              variant={compareMode ? "primary" : "ghost"}
              disabled={!sourceUrl}
              onClick={() => setCompareMode(!compareMode)}
              iconLeft={
                compareMode ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )
              }
            >
              {compareMode ? "Exit" : "Enable"}
            </Button>
          }
        >
          {compareMode ? (
            <UiSlider
              label="Divider"
              min={0}
              max={100}
              step={0.5}
              value={splitPct}
              onChange={setSplitPct}
              formatValue={(v) => `${Math.round(v)}%`}
              trailing={
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setSplitPct(50)}
                  disabled={Math.round(splitPct) === 50}
                  title="Center the divider"
                  className="-mr-1"
                >
                  50%
                </Button>
              }
            />
          ) : (
            <p className="text-[11px] text-zinc-500">
              Reveal Original vs Edited side-by-side. Drag the violet handle
              once enabled.
            </p>
          )}
        </Card>

        {/* Save / Export */}
        <Card
          title="Save & Export"
          density="tight"
          padded
          actions={
            applyState === "saved" ? (
              <Badge color="success" size="xs">
                Saved
              </Badge>
            ) : applyState === "error" ? (
              <Badge color="danger" size="xs">
                Error
              </Badge>
            ) : null
          }
        >
          <p className="text-[11px] text-zinc-500 leading-relaxed flex items-start gap-1.5 mb-3">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-zinc-600" />
            <span>
              <span className="text-zinc-400">Apply & Save</span> bakes only
              Exposure into the canonical TrueColor JPG (server re-render).
              Contrast, Saturation, White Balance and Tone Curve stay
              client-side — use{" "}
              <span className="text-zinc-400">Download Edited</span> to keep
              them.
            </span>
          </p>

          <Button
            variant="success"
            size="md"
            fullWidth
            onClick={applyAndSave}
            disabled={!canApplyServer}
            loading={applyState === "saving"}
            iconLeft={
              applyState === "saved" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : applyState === "error" ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )
            }
            title={
              !activeFile?.unirawPath
                ? "Convert this file to .uniraw first (Media tab)"
                : applyState === "saving"
                ? "Re-rendering on the server…"
                : "Re-render the canonical TrueColor JPG with the new exposure"
            }
            className="mb-2"
          >
            {applyState === "saving"
              ? "Re-rendering…"
              : applyState === "saved"
              ? "Saved"
              : "Apply & Save (server)"}
          </Button>

          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={downloadEdited}
            disabled={!imageLoaded}
            iconLeft={<Download className="w-4 h-4" />}
            title="Save the locally-edited canvas as a JPEG"
          >
            Download edited (local)
          </Button>

          {applyState === "error" && applyError && (
            <p className="mt-2 text-[10px] text-rose-300/80 break-words">
              {applyError}
            </p>
          )}
        </Card>

        {/* AI Enhancements — greyed out, not implemented in this build */}
        <Card
          title="AI Enhancements"
          density="tight"
          padded
          actions={
            <Badge color="neutral" size="xs">
              Coming soon
            </Badge>
          }
        >
          <p className="text-[11px] text-zinc-500 mb-3 flex items-start gap-1.5">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-zinc-600" />
            Not implemented in this build.
          </p>
          <div className="flex flex-col gap-1.5">
            {[
              "Enhance Dynamic Range",
              "Upscale 2×",
              "Upscale 4×",
              "Denoise / Dehaze",
            ].map((label) => (
              <Button
                key={label}
                variant="outline"
                size="sm"
                fullWidth
                disabled
                title="Not implemented in this build"
              >
                {label}
              </Button>
            ))}
          </div>
        </Card>

        {/* Selection regions — stats + AI Identify */}
        <Card
          title="Selection Tool"
          subtitle="Drag in the preview to inspect & identify regions"
          density="tight"
          padded
          actions={
            <Badge color="brand" size="xs" icon={<Wand2 className="w-2.5 h-2.5" />}>
              LLaVA
            </Badge>
          }
        >
          {regions.length > 0 ? (
            <>
              <div className="space-y-2 mb-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {regions.map((r) => {
                  const stats = regionInfo[r.level];
                  const a = regionAnalysis[r.level] || { state: "idle" };
                  return (
                    <div
                      key={r.level}
                      onClick={() => setActiveRegion(r.level)}
                      className={`px-2.5 py-2 rounded-md text-xs cursor-pointer transition-colors ${
                        activeRegion === r.level
                          ? "bg-brand-soft border border-brand/30"
                          : "bg-surface-1/60 border border-surface-3 hover:bg-surface-3"
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-zinc-200 font-medium">
                          Region {r.level}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              analyzeRegion(r.level);
                            }}
                            disabled={a.state === "loading" || !stats}
                            title={
                              !stats
                                ? "Region must overlap the canvas"
                                : a.state === "loading"
                                ? "Identifying…"
                                : "Identify what's in this region"
                            }
                            className={`inline-flex items-center gap-1 h-6 px-2 rounded text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring ${
                              a.state === "loading"
                                ? "bg-brand/20 text-brand-hi cursor-wait"
                                : !stats
                                ? "bg-surface-3 text-zinc-600 cursor-not-allowed"
                                : a.state === "ok"
                                ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/20"
                                : "bg-brand-soft text-brand-hi hover:bg-brand/25 border border-brand/30"
                            }`}
                          >
                            {a.state === "loading" ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : a.state === "ok" ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            {a.state === "loading"
                              ? "Identifying"
                              : a.state === "ok"
                              ? "Re-run"
                              : "Identify"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRegion(r.level);
                            }}
                            className="text-rose-400 hover:text-rose-300 text-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring rounded px-1"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {stats ? (
                        <div className="mt-1.5 text-[10px] text-zinc-500 grid grid-cols-3 gap-x-2 font-mono tabular-nums">
                          <span>R {stats.r.toFixed(0)}</span>
                          <span>G {stats.g.toFixed(0)}</span>
                          <span>B {stats.b.toFixed(0)}</span>
                          <span>L {stats.lum.toFixed(0)}</span>
                          <span className="col-span-2 text-zinc-600">
                            n={stats.n}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1 text-[10px] text-zinc-600">
                          Outside canvas
                        </div>
                      )}

                      {/* AI analysis result */}
                      {a.state === "ok" && a.data && (
                        <div className="mt-2 pt-2 border-t border-surface-3 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-medium text-zinc-100">
                              {a.data.subject || "—"}
                            </span>
                            <Badge
                              color={
                                a.data.confidence === "high"
                                  ? "success"
                                  : a.data.confidence === "low"
                                  ? "warning"
                                  : "neutral"
                              }
                              size="xs"
                            >
                              {a.data.confidence || "low"}
                            </Badge>
                          </div>
                          {a.data.description && (
                            <p className="text-[10px] text-zinc-400 leading-snug">
                              {a.data.description}
                            </p>
                          )}
                          {Array.isArray(a.data.objects) &&
                            a.data.objects.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {a.data.objects.slice(0, 8).map((o, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-medium bg-surface-3 text-zinc-300 border border-surface-4"
                                  >
                                    {o.name}
                                    {o.count && o.count > 1 ? (
                                      <span className="ml-1 text-zinc-500 font-mono tabular-nums">
                                        ×{o.count}
                                      </span>
                                    ) : null}
                                  </span>
                                ))}
                              </div>
                            )}
                          {a.data.lighting &&
                            a.data.lighting !== "unknown" && (
                              <div className="text-[9px] text-zinc-500 uppercase tracking-wider">
                                {a.data.lighting}
                              </div>
                            )}
                        </div>
                      )}

                      {a.state === "error" && (
                        <p className="mt-1.5 text-[10px] text-rose-300/80 leading-snug">
                          {a.error || "Identification failed."}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={analyzeAllRegions}
                  disabled={
                    regions.length === 0 ||
                    Object.values(regionAnalysis).some(
                      (a) => a.state === "loading"
                    )
                  }
                  iconLeft={<Sparkles className="w-3.5 h-3.5" />}
                  fullWidth
                >
                  Identify all
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  fullWidth
                  onClick={clearRegions}
                >
                  Clear all
                </Button>
              </div>
              <p className="mt-2 text-[10px] text-zinc-500 leading-relaxed flex items-start gap-1.5">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0 text-zinc-600" />
                <span>
                  Identification uses your local Ollama LLaVA model — runs
                  fully offline. Each call typically takes 5–15 s.
                </span>
              </p>
            </>
          ) : (
            <div className="text-[11px] text-zinc-500">No regions yet.</div>
          )}
        </Card>
      </RightSidebar>
    </div>
  );
}
