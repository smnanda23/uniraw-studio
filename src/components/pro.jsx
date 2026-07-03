import React, { useState, useRef, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// UNIRAW Pro — shared UI primitives (ported from the hi-fi spec ui.jsx).
// ---------------------------------------------------------------------------

/* ---- tiny icon set (simple geometric strokes only) ---- */
function Ic({ d, size = 14, sw = 1.6 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "none" }}
    >
      {d}
    </svg>
  );
}

export const Icons = {
  overview: (p) => (
    <Ic
      {...p}
      d={
        <>
          <rect x="2" y="2" width="5" height="5" rx="1" />
          <rect x="9" y="2" width="5" height="5" rx="1" />
          <rect x="2" y="9" width="5" height="5" rx="1" />
          <rect x="9" y="9" width="5" height="5" rx="1" />
        </>
      }
    />
  ),
  media: (p) => (
    <Ic
      {...p}
      d={
        <>
          <rect x="2" y="3" width="12" height="10" rx="1.5" />
          <circle cx="6" cy="7" r="1.4" />
          <path d="M2 11.5 L6 9 L9 11 L11.5 9.5 L14 11" />
        </>
      }
    />
  ),
  deliver: (p) => (
    <Ic
      {...p}
      d={
        <>
          <path d="M3 8 H13" />
          <path d="M9 4 L13 8 L9 12" />
        </>
      }
    />
  ),
  train: (p) => (
    <Ic
      {...p}
      d={
        <>
          <path d="M2 13 L6 8 L9 10.5 L14 3.5" />
          <path d="M10.5 3.5 H14 V7" />
        </>
      }
    />
  ),
  edit: (p) => (
    <Ic
      {...p}
      d={
        <>
          <path d="M3 5 H13" />
          <circle cx="6" cy="5" r="1.6" />
          <path d="M3 11 H13" />
          <circle cx="10" cy="11" r="1.6" />
        </>
      }
    />
  ),
  api: (p) => (
    <Ic
      {...p}
      d={
        <>
          <path d="M6 4 L2.5 8 L6 12" />
          <path d="M10 4 L13.5 8 L10 12" />
        </>
      }
    />
  ),
  upload: (p) => (
    <Ic
      {...p}
      d={
        <>
          <path d="M8 11 V3" />
          <path d="M4.5 6.5 L8 3 L11.5 6.5" />
          <path d="M3 13 H13" />
        </>
      }
    />
  ),
  download: (p) => (
    <Ic
      {...p}
      d={
        <>
          <path d="M8 3 V11" />
          <path d="M4.5 7.5 L8 11 L11.5 7.5" />
          <path d="M3 13 H13" />
        </>
      }
    />
  ),
  search: (p) => (
    <Ic
      {...p}
      d={
        <>
          <circle cx="7" cy="7" r="4" />
          <path d="M10.2 10.2 L13.5 13.5" />
        </>
      }
    />
  ),
  check: (p) => <Ic {...p} d={<path d="M3 8.5 L6.5 12 L13 4.5" />} />,
  x: (p) => (
    <Ic
      {...p}
      d={
        <>
          <path d="M4 4 L12 12" />
          <path d="M12 4 L4 12" />
        </>
      }
    />
  ),
  play: (p) => <Ic {...p} d={<path d="M5 3.5 L12 8 L5 12.5 Z" />} />,
  pause: (p) => (
    <Ic
      {...p}
      d={
        <>
          <path d="M5.5 4 V12" />
          <path d="M10.5 4 V12" />
        </>
      }
    />
  ),
  stop: (p) => <Ic {...p} d={<rect x="4.5" y="4.5" width="7" height="7" rx="1" />} />,
  prev: (p) => <Ic {...p} d={<path d="M10 3 L5 8 L10 13" />} />,
  next: (p) => <Ic {...p} d={<path d="M6 3 L11 8 L6 13" />} />,
  compare: (p) => (
    <Ic
      {...p}
      d={
        <>
          <path d="M8 2 V14" />
          <path d="M5 5.5 L2.5 8 L5 10.5" />
          <path d="M11 5.5 L13.5 8 L11 10.5" />
        </>
      }
    />
  ),
  flag: (p) => (
    <Ic
      {...p}
      d={
        <>
          <path d="M4 14 V2.5" />
          <path d="M4 3 H12 L10 5.5 L12 8 H4" />
        </>
      }
    />
  ),
  pen: (p) => (
    <Ic {...p} d={<path d="M11 2.5 L13.5 5 L6 12.5 L3 13 L3.5 10 Z" />} />
  ),
  refresh: (p) => (
    <Ic
      {...p}
      d={
        <>
          <path d="M13 8 A5 5 0 1 1 9.5 3.2" />
          <path d="M13 3 V6.5 H9.5" />
        </>
      }
    />
  ),
  plus: (p) => (
    <Ic
      {...p}
      d={
        <>
          <path d="M8 3 V13" />
          <path d="M3 8 H13" />
        </>
      }
    />
  ),
  trash: (p) => (
    <Ic
      {...p}
      d={
        <>
          <path d="M3 4.5 H13" />
          <path d="M6 4 V3 H10 V4" />
          <path d="M4.5 4.5 L5.2 13 H10.8 L11.5 4.5" />
        </>
      }
    />
  ),
};

/* ---- atoms ---- */
export function Dot({ err, idle, warn, pulse }) {
  return (
    <span
      className={
        "dot" +
        (err ? " err" : "") +
        (idle ? " idle" : "") +
        (warn ? " warn" : "") +
        (pulse ? " pulse" : "")
      }
    ></span>
  );
}

export function Bar({ pct }) {
  return (
    <span className="pbar" style={{ display: "block", width: "100%" }}>
      <i style={{ width: pct + "%" }}></i>
    </span>
  );
}

export function Stat({ label, value, sub, acc, sm }) {
  return (
    <div className="u-col" style={{ gap: 3 }}>
      <span className="u-label">{label}</span>
      <span className={"stat-v" + (sm ? " sm" : "") + (acc ? " u-acc" : "")}>
        {value}
      </span>
      {sub ? (
        <span className="u-faint" style={{ fontSize: 11 }}>
          {sub}
        </span>
      ) : null}
    </div>
  );
}

export function CtlSlider({ label, value, min, max, step, fmt, onChange }) {
  return (
    <div className="ctl-row">
      <span className="ctl-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step || 1}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className="ctl-val">{fmt ? fmt(value) : value}</span>
    </div>
  );
}

/* ---- thumbnail with real preview + graceful fallback ---- */
export function Thumb({ file, status, checked, sel, onClick, onCheck, width }) {
  const src = file.preview || file.truecolorUrl || null;
  return (
    <div
      className={"thumb" + (sel ? " sel" : "") + (checked ? " checked" : "")}
      style={width ? { width } : null}
      onClick={onClick}
      title={file.name}
    >
      {src ? (
        <img src={src} alt={file.name} draggable="false" loading="lazy" />
      ) : (
        <span className="thumb-fallback">
          <span style={{ fontSize: 13 }}>◻</span>
          <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file.name}
          </span>
        </span>
      )}
      <span className={"u-badge" + (status === "uni" ? " uni" : "")}>
        {status === "uni" ? ".UNI" : status === "ann" ? "ANN" : "RAW"}
      </span>
      {onCheck ? (
        <span
          className="tick"
          onClick={(e) => {
            e.stopPropagation();
            onCheck();
          }}
        >
          ✓
        </span>
      ) : null}
    </div>
  );
}

/* ---- decorative histogram (deterministic) ---- */
export function Histogram({ h = 42 }) {
  const vals = [];
  for (let i = 0; i < 48; i++) {
    vals.push(
      Math.max(
        0.04,
        Math.abs(Math.sin(i * 0.42) * 0.9 * Math.exp(-i / 26)) +
          Math.abs(Math.sin(i * 1.9)) * 0.12
      )
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: h }}>
      {vals.map((v, i) => (
        <span
          key={i}
          style={{
            flex: 1,
            height: Math.max(2, v * h),
            background: i % 3 === 0 ? "#4a4d52" : "#3a3d42",
            borderRadius: 1,
          }}
        ></span>
      ))}
    </div>
  );
}

/* ---- compare viewer with draggable divider (real images) ----
   original = RAW preview (left of divider), truecolor = .uniraw render. */
export function CompareViewer({ original, truecolor, compare, zoom = "fit" }) {
  const [split, setSplit] = useState(0.55);
  const ref = useRef(null);
  const dragging = useRef(false);

  const onMove = useCallback((e) => {
    if (!dragging.current || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    setSplit(Math.min(0.96, Math.max(0.04, x / r.width)));
  }, []);

  useEffect(() => {
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", up);
    };
  }, [onMove]);

  const fit = zoom === "fit";
  const imgStyle = fit
    ? {}
    : { objectFit: "none" };
  const both = !!(original && truecolor);
  const showCompare = compare && both;
  const base = truecolor || original;

  return (
    <div className="viewer" ref={ref}>
      {base ? (
        <img className="fill" src={base} alt="" draggable="false" style={imgStyle} />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-faint)",
            fontSize: 12.5,
          }}
        >
          RAW preview not available
        </div>
      )}
      {showCompare ? (
        <img
          className="fill"
          src={original}
          alt=""
          draggable="false"
          style={{ ...imgStyle, clipPath: `inset(0 ${100 - split * 100}% 0 0)` }}
        />
      ) : null}
      {showCompare ? (
        <div
          className="cmp-divider"
          style={{ left: `${split * 100}%` }}
          onMouseDown={() => {
            dragging.current = true;
          }}
          onTouchStart={() => {
            dragging.current = true;
          }}
        >
          <span className="cmp-handle">⇔</span>
        </div>
      ) : null}
      {showCompare ? (
        <span className="viewer-tag" style={{ left: 12 }}>
          ORIGINAL RAW
        </span>
      ) : null}
      {truecolor ? (
        <span className="viewer-tag uni" style={{ right: 12 }}>
          .UNIRAW TRUECOLOR
        </span>
      ) : base ? (
        <span className="viewer-tag" style={{ right: 12 }}>
          ORIGINAL
        </span>
      ) : null}
    </div>
  );
}
