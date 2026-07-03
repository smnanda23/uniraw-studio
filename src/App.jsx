import React, { useState, useEffect, useRef, useCallback } from "react";
import LandingPage from "./pages/LandingPage.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import MediaPage from "./pages/MediaPage.jsx";
import DeliverPage from "./pages/DeliverPage.jsx";
import TrainingPage from "./pages/TrainingPage.jsx";
import EditPage from "./pages/EditPage.jsx";
import ApiPage from "./pages/ApiPage.jsx";
import { Icons, Dot } from "./components/pro.jsx";
import { useMedia } from "./lib/mediaStore.jsx";
import { isDemo } from "./lib/demo.js";

// ---------------------------------------------------------------------------
// UNIRAW Pro shell — topbar · main · bottom pagebar (Resolve-style).
// Primary pages per the hi-fi spec: Overview / Media / Deliver / Train.
// Edit and API remain available as secondary workspaces (keys 5 / 6).
// ---------------------------------------------------------------------------

const PAGES = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "media", label: "Media", icon: "media" },
  { id: "deliver", label: "Deliver", icon: "deliver" },
  { id: "train", label: "Train", icon: "train" },
];
const SECONDARY = [
  { id: "edit", label: "Edit", icon: "edit" },
  { id: "api", label: "API", icon: "api" },
];

const HEALTH_ENDPOINTS = [
  { id: "annotator", label: "Annotator", port: 5050, sub: "FastAPI · VLM annotator", url: "/api/annotator/health" },
  { id: "converter", label: "Converter", port: 5051, sub: "Flask · palette loaded", url: "/api/converter/health" },
  { id: "previewer", label: "Previewer", port: 5053, sub: "FastAPI · TrueColor", url: "/api/previewer/health" },
];

async function probeHealth(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 2500);
  try {
    const r = await fetch(url, {
      cache: "no-store",
      signal: ctrl.signal,
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    if (!r.ok) return { ok: false };
    const data = await r.json().catch(() => null);
    return { ok: true, data };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(t);
  }
}

function ServicePopover({ health, onClose, onOpenApi }) {
  return (
    <div className="svc-pop">
      <div className="u-row-sb">
        <span className="u-label">Backend services</span>
        <button className="u-btn ghost sm" onClick={onClose}>
          <Icons.x size={10} />
        </button>
      </div>
      {HEALTH_ENDPOINTS.map((s) => (
        <button
          key={s.id}
          className="u-row-sb"
          style={{
            fontSize: 12.5,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "inherit",
            padding: 0,
            fontFamily: "inherit",
          }}
          onClick={() => onOpenApi(s.id)}
          title="open API console"
        >
          <span className="u-row" style={{ gap: 8 }}>
            <Dot err={health[s.id] === "err"} idle={health[s.id] === "loading"} />{" "}
            {s.label}
          </span>
          <span className="u-faint u-mono" style={{ fontSize: 10.5 }}>
            :{s.port} · {s.sub}
          </span>
        </button>
      ))}
      <span className="u-faint" style={{ fontSize: 10.5 }}>
        Polled every 15 s · click a service for the API console
      </span>
    </div>
  );
}

export default function App() {
  const media = useMedia();
  // first visit lands on the marketing page; afterwards the last page wins
  const [page, setPage] = useState(
    () => localStorage.getItem("uniraw_pro_page") || "home"
  );
  const [svcOpen, setSvcOpen] = useState(false);
  const [focusReq, setFocusReq] = useState(null);
  const uploadRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("uniraw_pro_page", page);
  }, [page]);

  // legacy pages (Edit / API) use the fixed 340px right rail
  useEffect(() => {
    const legacy = page === "edit" || page === "api";
    document.documentElement.style.setProperty("--rail-w", legacy ? "340px" : "0px");
  }, [page]);

  // ---------- backend health ----------
  const [health, setHealth] = useState(() =>
    Object.fromEntries(HEALTH_ENDPOINTS.map((e) => [e.id, "loading"]))
  );
  const refreshHealth = useCallback(async () => {
    if (isDemo) {
      // static portfolio deploy — services are simulated
      setHealth(Object.fromEntries(HEALTH_ENDPOINTS.map((e) => [e.id, "ok"])));
      return;
    }
    const results = await Promise.all(
      HEALTH_ENDPOINTS.map(async (e) => {
        const r = await probeHealth(e.url);
        return [e.id, r.ok ? "ok" : "err"];
      })
    );
    setHealth(Object.fromEntries(results));
  }, []);
  useEffect(() => {
    refreshHealth();
    const id = setInterval(refreshHealth, 15000);
    return () => clearInterval(id);
  }, [refreshHealth]);

  // ---------- keyboard: 1–6 switch pages (not on the landing page) ----------
  useEffect(() => {
    if (page === "home") return undefined;
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const all = [...PAGES, ...SECONDARY];
      const i = ["1", "2", "3", "4", "5", "6"].indexOf(e.key);
      if (i !== -1 && all[i]) setPage(all[i].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page]);

  const go = useCallback((p) => setPage(p), []);

  const openApi = (serviceId) => {
    setFocusReq({ id: serviceId, key: Date.now() });
    setSvcOpen(false);
    setPage("api");
  };

  const renderPage = () => {
    switch (page) {
      case "overview":
        return <OverviewPage go={go} health={health} />;
      case "media":
        return <MediaPage go={go} />;
      case "deliver":
        return <DeliverPage go={go} />;
      case "train":
        return <TrainingPage />;
      case "edit":
        return (
          <div
            className="u-grow page-enter"
            style={{
              position: "relative",
              paddingRight: "var(--rail-w, 340px)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <EditPage selected={media.selected} />
          </div>
        );
      case "api":
        return (
          <div
            className="u-grow page-enter"
            style={{
              position: "relative",
              paddingRight: "var(--rail-w, 340px)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <ApiPage health={health} refreshHealth={refreshHealth} focusReq={focusReq} />
          </div>
        );
      default:
        return <OverviewPage go={go} health={health} />;
    }
  };

  // full-screen marketing page — no studio chrome
  if (page === "home") {
    return <LandingPage onLaunch={() => setPage("overview")} />;
  }

  return (
    <>
      <div className="topbar">
        <button
          className="brand"
          onClick={() => setPage("home")}
          title="UniRaw home"
          style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontFamily: "inherit" }}
        >
          <span className="brand-mark">U</span>
          <span className="brand-name">UNIRAW</span>
          <span className="brand-sub">UNIVERSAL RAW STUDIO</span>
        </button>
        <span className="u-faint u-mono" style={{ fontSize: 10.5 }}>
          {media.mediaFiles.length} files in library
        </span>
        {isDemo ? (
          <span
            className="u-mono"
            style={{
              fontSize: 9.5,
              letterSpacing: "0.08em",
              padding: "2px 8px",
              borderRadius: 5,
              color: "var(--accent-2)",
              border: "1px solid rgba(34, 211, 238, 0.35)",
              background: "rgba(34, 211, 238, 0.08)",
            }}
            title="Static portfolio deployment — sample data, simulated pipeline"
          >
            DEMO · sample data
          </span>
        ) : null}
        <div className="u-grow"></div>
        <span className="kbd">1–6 switch pages</span>
        <button className="u-btn sm" onClick={() => uploadRef.current?.click()}>
          <Icons.upload size={12} /> Upload
        </button>
        <input
          ref={uploadRef}
          type="file"
          multiple
          hidden
          accept=".dng,.tif,.tiff,.nef,.uniraw,.json,.jpg,.jpeg"
          onChange={(e) => {
            media.uploadFiles(e.target.files);
            e.target.value = "";
            setPage("media");
          }}
        />
      </div>

      <div className="main" style={{ position: "relative" }}>
        {renderPage()}
        {svcOpen ? (
          <ServicePopover
            health={health}
            onClose={() => setSvcOpen(false)}
            onOpenApi={openApi}
          />
        ) : null}
      </div>

      <div className="pagebar">
        {PAGES.map((p, i) => {
          const I = Icons[p.icon];
          return (
            <button
              key={p.id}
              className={"page-btn" + (page === p.id ? " on" : "")}
              onClick={() => setPage(p.id)}
            >
              <I size={13} /> {p.label} <span className="kbd">{i + 1}</span>
            </button>
          );
        })}
        <div className="pagebar-left">
          {SECONDARY.map((p, i) => {
            const I = Icons[p.icon];
            return (
              <button
                key={p.id}
                className={"page-btn" + (page === p.id ? " on" : "")}
                style={{ padding: "5px 10px", fontSize: 11.5 }}
                onClick={() => setPage(p.id)}
                title={`${p.label} (${i + 5})`}
              >
                <I size={12} /> {p.label}
              </button>
            );
          })}
        </div>
        <div className="pagebar-right">
          <button
            className="u-row"
            style={{
              gap: 5,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              fontFamily: "inherit",
              fontSize: "inherit",
            }}
            onClick={() => setSvcOpen((v) => !v)}
            title="service health"
          >
            {HEALTH_ENDPOINTS.map((s) => (
              <Dot
                key={s.id}
                err={health[s.id] === "err"}
                idle={health[s.id] === "loading"}
              />
            ))}{" "}
            services
          </button>
          {media.queueRunning ? (
            <span className="u-row" style={{ gap: 5 }}>
              <Dot pulse /> rendering
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
}
