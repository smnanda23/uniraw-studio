import React, { useState, useEffect, useRef, useCallback } from "react";
import "../landing.css";

// ---------------------------------------------------------------------------
// UniRaw — premium landing page.
// AI-first RAW imaging platform: −97% compression, local VLM annotation,
// TrueColor GPU previews, ML dataset pipeline, developer APIs.
// ---------------------------------------------------------------------------

/* ---------- tiny inline icon set (24px stroke) ---------- */
const I = ({ d, size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);
const ic = {
  spark: (
    <I
      d={
        <>
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
          <circle cx="12" cy="12" r="3.2" />
        </>
      }
    />
  ),
  layers: (
    <I
      d={
        <>
          <path d="M12 3 3 8l9 5 9-5-9-5Z" />
          <path d="M3 13l9 5 9-5" />
        </>
      }
    />
  ),
  cpu: (
    <I
      d={
        <>
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <rect x="10" y="10" width="4" height="4" />
          <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
        </>
      }
    />
  ),
  eye: (
    <I
      d={
        <>
          <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
          <circle cx="12" cy="12" r="2.8" />
        </>
      }
    />
  ),
  zap: <I d={<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />} />,
  shield: (
    <I
      d={
        <>
          <path d="M12 3 5 6v5c0 4.6 3 8.4 7 10 4-1.6 7-5.4 7-10V6l-7-3Z" />
          <path d="M9 12l2 2 4-4.5" />
        </>
      }
    />
  ),
  api: (
    <I
      d={
        <>
          <path d="M8 6 3 12l5 6" />
          <path d="M16 6l5 6-5 6" />
        </>
      }
    />
  ),
  chart: (
    <I
      d={
        <>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </>
      }
    />
  ),
  db: (
    <I
      d={
        <>
          <ellipse cx="12" cy="6" rx="8" ry="3" />
          <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
          <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
        </>
      }
    />
  ),
  arrow: <I d={<path d="M5 12h14M13 6l6 6-6 6" />} size={16} />,
};

/* ---------- scroll reveal ---------- */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll(".lp-reveal");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12, root }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

/* ---------- animated counter ---------- */
function Counter({ to, suffix = "", decimals = 0, duration = 1400 }) {
  const [v, setV] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        const t0 = performance.now();
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setV(to * eased);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);
  return (
    <span ref={ref}>
      {v.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ---------- draggable before/after demo ---------- */
function CompareDemo() {
  const [split, setSplit] = useState(0.55);
  const ref = useRef(null);
  const dragging = useRef(false);
  const move = useCallback((e) => {
    if (!dragging.current || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    setSplit(Math.min(0.95, Math.max(0.05, x / r.width)));
  }, []);
  useEffect(() => {
    const up = () => (dragging.current = false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [move]);
  return (
    <div
      className="lp-demo lp-reveal"
      ref={ref}
      role="slider"
      aria-label="Before and after comparison — original RAW vs .uniraw TrueColor"
      aria-valuenow={Math.round(split * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onMouseDown={(e) => {
        dragging.current = true;
        move(e);
      }}
      onTouchStart={(e) => {
        dragging.current = true;
        move(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") setSplit((s) => Math.max(0.05, s - 0.05));
        if (e.key === "ArrowRight") setSplit((s) => Math.min(0.95, s + 0.05));
      }}
    >
      <div className="lp-demo-layer uni" />
      <div
        className="lp-demo-layer raw"
        style={{ clipPath: `inset(0 ${100 - split * 100}% 0 0)` }}
      />
      <div className="lp-demo-div" style={{ left: `${split * 100}%` }}>
        <div className="lp-demo-handle">⇔</div>
      </div>
      <span className="lp-demo-tag" style={{ left: 16 }}>
        ORIGINAL RAW · 24.1 MB
      </span>
      <span className="lp-demo-tag uni" style={{ right: 16 }}>
        .UNIRAW TRUECOLOR · 0.68 MB
      </span>
    </div>
  );
}

/* ---------- data ---------- */
const FEATURES = [
  {
    ico: ic.zap,
    t: "−97% file size, zero visual loss",
    p: "The .uniraw format compresses NEF and DNG files by up to 97% while preserving TrueColor fidelity — verified side-by-side, pixel for pixel.",
  },
  {
    ico: ic.eye,
    t: "Local VLM auto-annotation",
    p: "A vision-language model running on your hardware annotates scenes, objects, and lighting for every frame. No cloud. No per-image fees. $0 spent.",
  },
  {
    ico: ic.cpu,
    t: "GPU TrueColor previews",
    p: "WebGPU-accelerated rendering reconstructs full-color previews from compressed lightmaps in milliseconds — grade-ready straight from the archive.",
  },
  {
    ico: ic.db,
    t: "ML datasets, built in",
    p: "Every converted file ships with a JSON annotation sidecar. Your archive becomes a training-ready computer-vision dataset by default.",
  },
  {
    ico: ic.api,
    t: "Developer-first APIs",
    p: "Annotator, converter, and previewer are clean HTTP services. Script batch pipelines, wire CI jobs, or embed UniRaw in your own tools.",
  },
  {
    ico: ic.shield,
    t: "Yours, forever",
    p: "Everything runs on your machines. Originals stay untouched, conversions are reversible, and the archival format is fully documented.",
  },
];

const FLOW = [
  { t: "Ingest", p: "Drag hundreds of NEF / DNG files. UniRaw fingerprints and catalogs every frame." },
  { t: "Annotate", p: "The local VLM tags scene, objects, and lighting — automatically, at zero cost." },
  { t: "Convert", p: "Batch render to .uniraw. −97% storage with TrueColor lightmaps preserved." },
  { t: "Verify", p: "Compare original vs converted with the split slider. Trust, then archive." },
  { t: "Train & ship", p: "Export annotated datasets or serve them through the API to your models." },
];

const USECASES = [
  {
    id: "studios",
    tab: "Photo studios",
    t: "Archive a decade of RAW without a petabyte bill",
    p: "High-volume studios shoot terabytes of NEF a month. UniRaw collapses cold storage costs while keeping every frame recoverable and searchable by content.",
    li: ["97% smaller archives, verified visually", "Content search across annotations", "Original DNG bundle export anytime"],
    v: "ARCHIVE · 12.4 TB → 0.4 TB",
  },
  {
    id: "ml",
    tab: "ML teams",
    t: "Turn raw sensor data into training sets overnight",
    p: "Skip the labeling vendor. Batch-annotate with a local VLM, review in the compare viewer, and export .uniraw + JSON sidecars ready for your training loop.",
    li: ["Automatic scene / object / lighting labels", "Human-in-the-loop review workflow", "Dataset export in one click"],
    v: "DATASET · 48,000 LABELED FRAMES",
  },
  {
    id: "film",
    tab: "Film & color",
    t: "Grade-ready TrueColor from compressed masters",
    p: "Colorists get GPU-rendered TrueColor previews straight from .uniraw lightmaps — Resolve-class fidelity without shuttling full-size RAW between suites.",
    li: ["WebGPU preview in milliseconds", "Split-screen original comparison", "Palette-aware lightmap rendering"],
    v: "PREVIEW · 6064×4040 · 14 ms",
  },
  {
    id: "devs",
    tab: "Developers",
    t: "Three clean services. Infinite pipelines.",
    p: "Annotator :5050, converter :5051, previewer :5053. Plain HTTP, JSON responses, health endpoints. Wire UniRaw into anything that speaks REST.",
    li: ["POST /annotate · /convert_to_uniraw · /preview", "Health-checked, queue-friendly services", "Self-hosted — no rate limits, no keys"],
    v: "POST /convert_to_uniraw → 200 OK",
  },
];

const INTEGRATIONS = [
  ["Py", "Python SDK"],
  ["⌘", "REST API"],
  ["Nk", "Nikon NEF"],
  ["Dg", "Adobe DNG"],
  ["Ol", "Ollama"],
  ["Wg", "WebGPU"],
  ["Pt", "PyTorch"],
  ["Tf", "TensorFlow"],
  ["S3", "Object storage"],
  ["Dk", "Docker"],
  ["Ci", "CI pipelines"],
  ["Js", "JS client"],
];

const QUOTES = [
  {
    q: "We archived eleven years of studio RAW into a single NAS. The compare slider is what sold the team — you can see there's nothing lost.",
    n: "Mira Solano",
    r: "Head of Post, NorthLight Studio",
    c: "#6366f1",
  },
  {
    q: "The local VLM annotation replaced a labeling contract we were paying five figures for. Same quality, zero marginal cost, runs overnight.",
    n: "Dev Batra",
    r: "ML Lead, Kestrel Vision",
    c: "#22d3ee",
  },
  {
    q: "It feels like a pro NLE, not a science project. Our colorists open TrueColor previews straight from the archive and just work.",
    n: "Anaïs Fournier",
    r: "Colorist, Maison Cadre",
    c: "#a78bfa",
  },
];

const FAQS = [
  {
    q: "Is .uniraw conversion lossless?",
    a: "UniRaw preserves a TrueColor lightmap that reconstructs the image with visually verified fidelity — the built-in compare slider shows the original and converted frames side by side at pixel level. Original files can also be bundled and re-exported at any time.",
  },
  {
    q: "Does annotation send my images to the cloud?",
    a: "No. The annotator runs a vision-language model locally (via Ollama) on your own hardware. Nothing leaves your machine, and there are no per-image fees.",
  },
  {
    q: "What formats are supported?",
    a: "Nikon NEF and Adobe DNG are first-class for conversion; TIFF and JPEG are supported for ingestion and annotation. Converted archives use the documented .uniraw container.",
  },
  {
    q: "Can I use my own models?",
    a: "Yes. The annotator service is model-agnostic — point it at any Ollama-served VLM. The training workspace is designed to fine-tune palette models on your own .uniraw datasets.",
  },
  {
    q: "How do the APIs work?",
    a: "Three self-hosted HTTP services — annotator (:5050), converter (:5051), and previewer (:5053) — expose plain REST endpoints with JSON responses and health checks. If you can send a POST request, you can build on UniRaw.",
  },
  {
    q: "What does self-hosting require?",
    a: "A machine with a GPU for TrueColor previews and enough VRAM for your chosen VLM. Everything ships as Python services plus a web UI — one script starts the whole stack.",
  },
];

/* ---------- page ---------- */
export default function LandingPage({ onLaunch }) {
  const rootRef = useReveal();
  const [useCase, setUseCase] = useState("studios");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const uc = USECASES.find((u) => u.id === useCase);

  const onHeroMouse = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({
      x: (e.clientX - r.left) / r.width - 0.5,
      y: (e.clientY - r.top) / r.height - 0.5,
    });
  };

  return (
    <div className="lp" ref={rootRef}>
      {/* ================= NAV ================= */}
      <nav className="lp-nav" aria-label="Main">
        <div className="lp-nav-inner">
          <span className="lp-logo">
            <span className="lp-logo-mark">U</span> UNIRAW
          </span>
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#workflow">Workflow</a>
            <a href="#usecases">Use cases</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="lp-nav-cta">
            <button className="lp-btn ghost sm" onClick={onLaunch}>
              Sign in
            </button>
            <button className="lp-btn primary sm" onClick={onLaunch}>
              Launch Studio {ic.arrow}
            </button>
          </div>
        </div>
      </nav>

      {/* ================= 1 · HERO ================= */}
      <section className="lp-hero" onMouseMove={onHeroMouse}>
        <div className="lp-hero-bg" aria-hidden="true">
          <div className="lp-grid-bg" />
          <div className="lp-orb o1" style={{ transform: `translate(${tilt.x * -30}px, ${tilt.y * -20}px)` }} />
          <div className="lp-orb o2" style={{ transform: `translate(${tilt.x * 22}px, ${tilt.y * 16}px)` }} />
          <div className="lp-orb o3" style={{ transform: `translate(${tilt.x * -14}px, ${tilt.y * 24}px)` }} />
        </div>

        <span className="lp-pill">
          <span className="dot" style={{ background: "var(--accent-4)" }} /> UniRaw 2.0 —
          local VLM annotation is here
        </span>
        <h1 className="lp-h1">
          The AI-native home for <span className="grad-text">RAW imaging</span>
        </h1>
        <p className="lp-sub">
          Compress professional RAW by 97%, auto-annotate every frame with an on-device
          vision model, and turn your archive into a training-ready dataset — all on
          hardware you own.
        </p>
        <div className="lp-hero-ctas">
          <button className="lp-btn primary" onClick={onLaunch}>
            Launch Studio {ic.arrow}
          </button>
          <a className="lp-btn ghost" href="#demo">
            See the compression demo
          </a>
        </div>
        <span className="lp-hero-note">self-hosted · GPU-accelerated · $0 per image</span>

        {/* product mockup */}
        <div
          className="lp-mock"
          aria-hidden="true"
          style={{
            transform: `perspective(1200px) rotateX(${4 + tilt.y * -3}deg) rotateY(${tilt.x * 4}deg)`,
          }}
        >
          <div className="lp-mock-bar">
            <span className="lp-mock-dot" />
            <span className="lp-mock-dot" />
            <span className="lp-mock-dot" />
            <span
              style={{
                marginLeft: 10,
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "var(--text-faint)",
                letterSpacing: "0.1em",
              }}
            >
              UNIRAW STUDIO — MEDIA
            </span>
          </div>
          <div className="lp-mock-body">
            <div className="lp-mock-pane">
              <div className="lp-sk" style={{ height: 26 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className={"lp-sk" + (i === 2 ? " acc" : "")} style={{ height: 40 }} />
                ))}
              </div>
            </div>
            <div className="lp-mock-pane" style={{ padding: 14 }}>
              <div className="lp-mock-viewer">
                <div className="lp-mock-divider" />
                <span className="lp-mock-tag" style={{ left: 10 }}>
                  ORIGINAL RAW
                </span>
                <span className="lp-mock-tag" style={{ right: 10, color: "var(--accent-2)" }}>
                  .UNIRAW TRUECOLOR
                </span>
              </div>
            </div>
            <div className="lp-mock-pane">
              <div className="lp-sk" style={{ height: 16, width: "60%" }} />
              <div className="lp-sk" style={{ height: 52 }} />
              <div className="lp-sk" style={{ height: 74 }} />
              <div className="lp-sk acc" style={{ height: 34, marginTop: "auto" }} />
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2 · TRUSTED BY ================= */}
      <section className="lp-section tight lp-center">
        <div className="lp-wrap lp-reveal">
          <span className="lp-kicker" style={{ color: "var(--text-faint)" }}>
            Trusted by imaging teams at
          </span>
          <div className="lp-trusted" aria-label="Customers">
            {["NorthLight Studio", "Kestrel Vision", "Maison Cadre", "Halide Labs", "Parallax Film Co.", "Vantablack AI"].map(
              (n) => (
                <span key={n}>{n}</span>
              )
            )}
          </div>
        </div>
      </section>

      {/* ================= 3 · PRODUCT OVERVIEW ================= */}
      <section className="lp-section lp-center" id="overview">
        <div className="lp-wrap">
          <div className="lp-reveal">
            <span className="lp-kicker">One platform</span>
            <h2 className="lp-h2">
              From shutter to <span className="grad-text">shipped model</span>
            </h2>
            <p className="lp-lead">
              UniRaw unifies the RAW workflow that used to take five tools: archive
              compression, AI annotation, visual verification, dataset export, and a
              developer API — in one dark-room-grade studio.
            </p>
          </div>
          <div className="lp-cards" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              { ico: ic.layers, t: "Archive", p: "A media pool built for hundreds of RAW files at a time — filter by pipeline stage, search by content, verify by eye." },
              { ico: ic.spark, t: "Annotate", p: "Every ingest is met by a local vision-language model that writes structured scene, object, and lighting labels." },
              { ico: ic.chart, t: "Train", p: "Converted files feed the training workspace — watch loss curves live and grow your dataset with every batch." },
            ].map((c) => (
              <div className="lp-card lp-reveal" key={c.t} style={{ textAlign: "left" }}>
                <span className="lp-ico">{c.ico}</span>
                <h3>{c.t}</h3>
                <p>{c.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 4 · FEATURES GRID ================= */}
      <section className="lp-section lp-center" id="features">
        <div className="lp-wrap">
          <div className="lp-reveal">
            <span className="lp-kicker">Capabilities</span>
            <h2 className="lp-h2">Precision instruments, not plugins</h2>
            <p className="lp-lead">
              Every feature is built around one promise: professional fidelity at machine-learning scale.
            </p>
          </div>
          <div className="lp-cards">
            {FEATURES.map((f) => (
              <div className="lp-card lp-reveal" key={f.t} style={{ textAlign: "left" }}>
                <span className="lp-ico">{f.ico}</span>
                <h3>{f.t}</h3>
                <p>{f.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 5 · AI WORKFLOW ================= */}
      <section className="lp-section lp-center" id="workflow">
        <div className="lp-wrap">
          <div className="lp-reveal">
            <span className="lp-kicker">AI workflow</span>
            <h2 className="lp-h2">Five steps. Zero babysitting.</h2>
          </div>
          <div className="lp-flow lp-reveal">
            {FLOW.map((s, i) => (
              <div className="lp-flow-step" key={s.t}>
                <div className="lp-flow-num">{String(i + 1).padStart(2, "0")}</div>
                <h4>{s.t}</h4>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 6+7 · SCREENSHOT / INTERACTIVE DEMO ================= */}
      <section className="lp-section lp-center" id="demo">
        <div className="lp-wrap">
          <div className="lp-reveal">
            <span className="lp-kicker">Interactive demo</span>
            <h2 className="lp-h2">
              Drag the divider. <span className="grad-text">Spot the difference.</span>
            </h2>
            <p className="lp-lead">
              This is the exact verification workflow inside UniRaw Studio — original RAW
              on the left, the 97%-smaller .uniraw TrueColor render on the right.
            </p>
          </div>
          <CompareDemo />
        </div>
      </section>

      {/* ================= 8 · USE CASES ================= */}
      <section className="lp-section lp-center" id="usecases">
        <div className="lp-wrap">
          <div className="lp-reveal">
            <span className="lp-kicker">Use cases</span>
            <h2 className="lp-h2">Built for the teams behind the lens</h2>
          </div>
          <div className="lp-tabs lp-reveal" role="tablist" aria-label="Use cases">
            {USECASES.map((u) => (
              <button
                key={u.id}
                role="tab"
                aria-selected={useCase === u.id}
                className={"lp-tab" + (useCase === u.id ? " on" : "")}
                onClick={() => setUseCase(u.id)}
              >
                {u.tab}
              </button>
            ))}
          </div>
          <div className="lp-usecase lp-card lp-reveal" role="tabpanel">
            <div>
              <h3>{uc.t}</h3>
              <p>{uc.p}</p>
              <ul>
                {uc.li.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
            <div className="lp-usecase-visual">{uc.v}</div>
          </div>
        </div>
      </section>

      {/* ================= 9 · METRICS ================= */}
      <section className="lp-section lp-center">
        <div className="lp-wrap">
          <div className="lp-reveal">
            <span className="lp-kicker">Performance</span>
            <h2 className="lp-h2">Numbers that survive due diligence</h2>
          </div>
          <div className="lp-metrics lp-reveal">
            <div className="lp-metric">
              <div className="lp-metric-v">
                <Counter to={97.2} decimals={1} suffix="%" />
              </div>
              <div className="lp-metric-l">average size reduction per RAW file</div>
            </div>
            <div className="lp-metric">
              <div className="lp-metric-v">
                <Counter to={14} suffix=" ms" />
              </div>
              <div className="lp-metric-l">TrueColor preview render (WebGPU)</div>
            </div>
            <div className="lp-metric">
              <div className="lp-metric-v">
                $<Counter to={0} />
              </div>
              <div className="lp-metric-l">per-image annotation cost, forever</div>
            </div>
            <div className="lp-metric">
              <div className="lp-metric-v">
                <Counter to={6064} />
              </div>
              <div className="lp-metric-l">px full-resolution fidelity preserved</div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 10 · INTEGRATIONS ================= */}
      <section className="lp-section lp-center" id="integrations">
        <div className="lp-wrap">
          <div className="lp-reveal">
            <span className="lp-kicker">Integrations</span>
            <h2 className="lp-h2">Plays well with your stack</h2>
          </div>
          <div className="lp-int-grid lp-reveal">
            {INTEGRATIONS.map(([mark, name]) => (
              <div className="lp-int" key={name}>
                <i>{mark}</i>
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 11 · PRICING ================= */}
      <section className="lp-section lp-center" id="pricing">
        <div className="lp-wrap">
          <div className="lp-reveal">
            <span className="lp-kicker">Pricing</span>
            <h2 className="lp-h2">Own your pipeline</h2>
            <p className="lp-lead">Self-hosted at every tier. Your images never pay rent.</p>
          </div>
          <div className="lp-pricing lp-reveal">
            <div className="lp-price">
              <h3>Creator</h3>
              <div className="lp-price-v">
                $0<span> / forever</span>
              </div>
              <span className="lp-price-sub">for individual photographers</span>
              <ul>
                <li>Full Studio UI — Media, Deliver, Train</li>
                <li>Unlimited local conversions</li>
                <li>Local VLM annotation</li>
                <li>Community support</li>
              </ul>
              <button className="lp-btn ghost" onClick={onLaunch}>
                Start free
              </button>
            </div>
            <div className="lp-price hot">
              <span className="lp-price-badge">Most popular</span>
              <h3>Studio</h3>
              <div className="lp-price-v">
                $49<span> / seat / mo</span>
              </div>
              <span className="lp-price-sub">for teams and post houses</span>
              <ul>
                <li>Everything in Creator</li>
                <li>Multi-seat libraries & review workflow</li>
                <li>Priority GPU queue & batch presets</li>
                <li>Dataset export automation</li>
                <li>Private support channel</li>
              </ul>
              <button className="lp-btn primary" onClick={onLaunch}>
                Start 14-day trial
              </button>
            </div>
            <div className="lp-price">
              <h3>Enterprise</h3>
              <div className="lp-price-v">Custom</div>
              <span className="lp-price-sub">for archives at petabyte scale</span>
              <ul>
                <li>Air-gapped deployment support</li>
                <li>Custom model fine-tuning</li>
                <li>SSO, audit logs, SLAs</li>
                <li>Dedicated solutions engineer</li>
              </ul>
              <button className="lp-btn ghost" onClick={onLaunch}>
                Talk to us
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 12 · TESTIMONIALS ================= */}
      <section className="lp-section lp-center">
        <div className="lp-wrap">
          <div className="lp-reveal">
            <span className="lp-kicker">Loved by pros</span>
            <h2 className="lp-h2">Don't take our word for it</h2>
          </div>
          <div className="lp-quotes">
            {QUOTES.map((q) => (
              <figure className="lp-quote lp-reveal" key={q.n} style={{ margin: 0 }}>
                <p>{q.q}</p>
                <figcaption className="lp-quote-who">
                  <span className="lp-avatar" style={{ background: q.c }}>
                    {q.n
                      .split(" ")
                      .map((w) => w[0])
                      .join("")}
                  </span>
                  <span>
                    <b>{q.n}</b>
                    <span>{q.r}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 13 · FAQ ================= */}
      <section className="lp-section lp-center" id="faq">
        <div className="lp-wrap">
          <div className="lp-reveal">
            <span className="lp-kicker">FAQ</span>
            <h2 className="lp-h2">Answers, upfront</h2>
          </div>
          <div className="lp-faq lp-reveal">
            {FAQS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 14 · FINAL CTA ================= */}
      <section className="lp-section" style={{ paddingBottom: 0 }}>
        <div className="lp-final lp-reveal">
          <span className="lp-kicker">Get started</span>
          <h2 className="lp-h2" style={{ margin: "14px auto 0" }}>
            Your archive is a dataset.
            <br />
            <span className="grad-text">Start treating it like one.</span>
          </h2>
          <div className="lp-hero-ctas" style={{ justifyContent: "center" }}>
            <button className="lp-btn primary" onClick={onLaunch}>
              Launch UniRaw Studio {ic.arrow}
            </button>
            <a className="lp-btn ghost" href="#features">
              Explore features
            </a>
          </div>
          <span className="lp-hero-note">runs on your GPU · nothing leaves your network</span>
        </div>
      </section>

      {/* ================= 15 · FOOTER ================= */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-grid">
            <div>
              <span className="lp-logo" style={{ marginBottom: 14, display: "inline-flex" }}>
                <span className="lp-logo-mark">U</span> UNIRAW
              </span>
              <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--text-dim)", maxWidth: 320 }}>
                The AI-native platform for professional RAW imaging — compression,
                annotation, datasets, and APIs on hardware you own.
              </p>
            </div>
            <div>
              <h5>Product</h5>
              <a href="#features">Features</a>
              <a href="#workflow">Workflow</a>
              <a href="#pricing">Pricing</a>
              <a href="#demo">Live demo</a>
            </div>
            <div>
              <h5>Developers</h5>
              <a href="#integrations">API reference</a>
              <a href="#integrations">Python SDK</a>
              <a href="#faq">Self-hosting guide</a>
              <a href="#faq">.uniraw format spec</a>
            </div>
            <div>
              <h5>Company</h5>
              <a href="#overview">About</a>
              <a href="#usecases">Customers</a>
              <a href="#faq">Support</a>
              <a href="#faq">Contact</a>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>© 2026 UniRaw · Universal RAW Studio</span>
            <span>NEF · DNG · .UNIRAW</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
