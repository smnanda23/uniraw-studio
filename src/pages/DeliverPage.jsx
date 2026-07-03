import React, { useState } from "react";
import { Icons, Dot, Bar, Stat, CtlSlider } from "../components/pro.jsx";
import { useMedia, fmtMB } from "../lib/mediaStore.jsx";

// ---------------------------------------------------------------------------
// Deliver workspace — presets + batch convert queue (UNIRAW Pro hi-fi layout).
// Jobs run sequentially through the real converter (:5051) + previewer (:5053).
// ---------------------------------------------------------------------------

const PRESETS = [
  { id: "archival", name: "Archival .uniraw", sub: "full lightmap + annotation" },
  { id: "dataset", name: "Dataset export", sub: ".uniraw + JSON sidecar" },
  { id: "jpg", name: "Preview JPG", sub: "TrueColor re-render" },
];

export default function DeliverPage({ go }) {
  const {
    mediaFiles,
    queue,
    queueRunning,
    runQueue,
    pauseQueue,
    clearDone,
    removeJob,
    selectFile,
  } = useMedia();

  const [preset, setPreset] = useState("archival");
  const [quality, setQuality] = useState(80);

  const done = queue.filter((j) => j.status === "done");
  const errored = queue.filter((j) => j.status === "error");
  const savedMB = done.reduce(
    (s, j) => s + (j.uniMB != null ? Math.max(0, j.sizeMB - j.uniMB) : 0),
    0
  );
  const overall = queue.length
    ? queue.reduce((s, j) => s + j.pct, 0) / queue.length
    : 0;
  const remaining = queue.length - done.length - errored.length;
  const savedPct =
    done.length > 0
      ? Math.round(
          (savedMB / Math.max(0.01, done.reduce((s, j) => s + j.sizeMB, 0))) * 100
        )
      : null;

  const verify = (job) => {
    const f = mediaFiles.find((x) => x.id === job.fileId);
    if (f) selectFile(f);
    go("media");
  };

  return (
    <div className="main page-enter">
      {/* ---- presets ---- */}
      <div className="pool" style={{ width: 252 }}>
        <div className="u-col" style={{ padding: "var(--pad)", gap: 9 }}>
          <span className="u-label">Render preset</span>
          {PRESETS.map((p) => (
            <div
              key={p.id}
              onClick={() => setPreset(p.id)}
              className="ins-box u-col"
              style={{
                gap: 2,
                cursor: "pointer",
                borderColor: preset === p.id ? "var(--accent-line)" : "var(--line-soft)",
                background: preset === p.id ? "var(--accent-dim)" : "var(--panel-2)",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: preset === p.id ? "var(--accent)" : "var(--text)",
                }}
              >
                {p.name}
              </span>
              <span className="u-faint" style={{ fontSize: 11 }}>
                {p.sub}
              </span>
            </div>
          ))}
          <div style={{ marginTop: 6 }}>
            <CtlSlider
              label="quality"
              value={quality}
              min={20}
              max={100}
              onChange={setQuality}
              fmt={(v) => v + "%"}
            />
          </div>
          <span className="u-faint" style={{ fontSize: 11, lineHeight: 1.5 }}>
            Add files from the Media pool — tick thumbnails, then “Add to Deliver”.
            Only unconverted .dng / .nef files are queued.
          </span>
        </div>
      </div>

      {/* ---- queue ---- */}
      <div
        className="u-grow u-col"
        style={{ padding: "calc(var(--pad) + 6px)", gap: 14, overflow: "hidden" }}
      >
        <div className="u-row" style={{ gap: 30 }}>
          <Stat
            label="Queue"
            value={done.length + " / " + queue.length}
            sub={
              remaining > 0
                ? remaining + " job" + (remaining > 1 ? "s" : "") + " remaining"
                : queue.length > 0
                ? "all jobs finished"
                : "queue is empty"
            }
          />
          <Stat
            label="Converter"
            value={queueRunning ? "running" : "idle"}
            sub="palette · :5051"
          />
          <Stat
            label="Saved this batch"
            value={fmtMB(savedMB)}
            acc
            sub={savedPct != null ? `−${savedPct}% average` : "—"}
          />
          <div className="u-grow"></div>
          <div className="u-row">
            {queueRunning ? (
              <button className="u-btn" onClick={pauseQueue}>
                <Icons.pause size={12} /> Pause
              </button>
            ) : (
              <button
                className="u-btn primary"
                onClick={runQueue}
                disabled={remaining === 0}
              >
                <Icons.play size={12} />{" "}
                {overall > 0 && remaining > 0 ? "Resume" : "Start render"}
              </button>
            )}
            <button
              className="u-btn ghost"
              onClick={clearDone}
              disabled={done.length === 0 && errored.length === 0}
            >
              Clear done
            </button>
          </div>
        </div>
        <Bar pct={overall} />
        <div className="u-panel u-grow" style={{ overflowY: "auto" }}>
          <div className="trow head">
            <span style={{ width: 190 }}>Job</span>
            <span className="u-grow">Progress</span>
            <span style={{ width: 150 }}>Size</span>
            <span style={{ width: 110 }}>Status</span>
            <span style={{ width: 30 }}></span>
          </div>
          {queue.length === 0 ? (
            <div
              className="u-faint"
              style={{ padding: 28, textAlign: "center", fontSize: 12.5 }}
            >
              Queue is empty. Select files in Media and add them here.
            </div>
          ) : (
            queue.map((j) => (
              <div className="trow" key={j.id}>
                <span
                  style={{ width: 190, fontWeight: 600, fontSize: 12 }}
                  className="u-mono"
                >
                  {j.name}
                </span>
                <span className="u-grow">
                  <Bar pct={j.pct} />
                </span>
                <span
                  style={{ width: 150 }}
                  className={"u-mono " + (j.status === "done" ? "u-acc" : "u-faint")}
                >
                  {j.status === "done" && j.uniMB != null
                    ? j.sizeMB.toFixed(1) + " → " + j.uniMB.toFixed(2) + " MB"
                    : j.sizeMB.toFixed(1) + " MB"}
                </span>
                <span style={{ width: 110, fontSize: 11.5 }}>
                  {j.status === "done" ? (
                    <button
                      className="u-btn ghost sm"
                      onClick={() => verify(j)}
                      style={{ color: "var(--accent)" }}
                    >
                      <Icons.compare size={11} /> verify
                    </button>
                  ) : j.status === "error" ? (
                    <span className="u-row" style={{ gap: 6, color: "var(--err)" }}>
                      <Dot err /> failed
                    </span>
                  ) : j.status === "running" ? (
                    <span className="u-dim u-row" style={{ gap: 6 }}>
                      <Dot pulse /> {Math.round(j.pct)}%
                    </span>
                  ) : (
                    <span className="u-faint">queued</span>
                  )}
                </span>
                <span style={{ width: 30 }}>
                  {j.status === "queued" || j.status === "error" ? (
                    <button
                      className="u-btn ghost sm"
                      onClick={() => removeJob(j.id)}
                      title="remove"
                    >
                      <Icons.x size={10} />
                    </button>
                  ) : null}
                </span>
              </div>
            ))
          )}
        </div>
        <span className="u-faint" style={{ fontSize: 11.5 }}>
          Finished jobs get a <span className="u-acc">verify</span> link — opens Media
          with the compare slider preloaded on that file.
        </span>
      </div>
    </div>
  );
}
