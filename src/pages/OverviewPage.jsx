import React, { useRef } from "react";
import { Icons, Dot, Bar, Stat } from "../components/pro.jsx";
import {
  useMedia,
  fileStatus,
  isConvertible,
  sizeMB,
  uniMB,
  fmtMB,
} from "../lib/mediaStore.jsx";

// ---------------------------------------------------------------------------
// Overview — pipeline funnel + activity + service health (per hi-fi spec),
// computed from the real media library.
// ---------------------------------------------------------------------------

const SERVICES = [
  { id: "annotator", label: "Annotator", sub: ":5050 · VLM annotator" },
  { id: "converter", label: "Converter", sub: ":5051 · palette" },
  { id: "previewer", label: "Previewer", sub: ":5053 · TrueColor" },
];

export default function OverviewPage({ go, health }) {
  const {
    mediaFiles,
    queue,
    queueRunning,
    activity,
    addToQueue,
    uploadFiles,
  } = useMedia();
  const uploadRef = useRef(null);

  const total = mediaFiles.length;
  const statuses = mediaFiles.map(fileStatus);
  const annotated = statuses.filter((s) => s !== "raw").length;
  const converted = statuses.filter((s) => s === "uni").length;
  const rawMBTotal = mediaFiles.reduce((s, f) => s + sizeMB(f), 0);
  const savedMB = mediaFiles.reduce((s, f) => {
    const u = uniMB(f);
    return fileStatus(f) === "uni" && u != null ? s + Math.max(0, sizeMB(f) - u) : s;
  }, 0);
  const savedPct =
    savedMB > 0 && rawMBTotal > 0
      ? Math.round(
          (savedMB /
            mediaFiles.reduce(
              (s, f) =>
                fileStatus(f) === "uni" && uniMB(f) != null ? s + sizeMB(f) : s,
              0
            )) *
            100
        )
      : null;

  const convertCandidates = mediaFiles.filter(isConvertible);
  const toConvert = convertCandidates.length;
  const toAnnotate = total - annotated;

  const qDone = queue.filter((j) => j.status === "done").length;
  const qActive = queue.length > 0 && qDone < queue.length;
  const qPct = queue.length
    ? Math.round(queue.reduce((s, j) => s + j.pct, 0) / queue.length)
    : 0;

  const W = (n) => (total > 0 ? Math.max(8, (n / total) * 100) : 8);

  return (
    <div className="ov-wrap page-enter">
      <div className="ov">
        <div className="u-row-sb" style={{ alignItems: "baseline" }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 600 }}>Library</div>
            <div className="u-faint" style={{ fontSize: 12 }}>
              Universal RAW archive · synced with annotator history
            </div>
          </div>
          <button className="u-btn primary" onClick={() => uploadRef.current?.click()}>
            <Icons.upload size={13} /> Upload RAW files
          </button>
          <input
            ref={uploadRef}
            type="file"
            multiple
            hidden
            accept=".dng,.tif,.tiff,.nef,.uniraw,.json,.jpg,.jpeg"
            onChange={(e) => {
              uploadFiles(e.target.files);
              e.target.value = "";
              go("media");
            }}
          />
        </div>

        <div className="u-row" style={{ gap: 16, alignItems: "stretch" }}>
          <div className="u-card u-grow">
            <Stat
              label="Library"
              value={total + " files"}
              sub={fmtMB(rawMBTotal) + " of RAW"}
            />
          </div>
          <div className="u-card u-grow">
            <Stat
              label="Storage saved"
              value={fmtMB(savedMB)}
              acc
              sub={savedPct != null ? `−${savedPct}% on converted files` : "convert files to start saving"}
            />
          </div>
          <div className="u-card u-grow">
            <Stat
              label="AI annotated"
              value={annotated}
              sub="local VLM · $0.00 spent"
            />
          </div>
        </div>

        <div className="u-row" style={{ gap: 16, alignItems: "stretch" }}>
          <div
            className="u-card"
            style={{ flex: 1.5, display: "flex", flexDirection: "column", gap: 14 }}
          >
            <span className="u-label">Pipeline</span>
            <div className="u-col" style={{ gap: 10 }}>
              <div className="funnel-row">
                <span className="u-dim" style={{ width: 80, fontSize: 12 }}>
                  Ingested
                </span>
                <div
                  className="funnel-bar"
                  style={{ width: W(total) + "%" }}
                  onClick={() => go("media")}
                >
                  {total}
                </div>
              </div>
              <div className="funnel-row">
                <span className="u-dim" style={{ width: 80, fontSize: 12 }}>
                  Annotated
                </span>
                <div
                  className="funnel-bar"
                  style={{ width: W(annotated) + "%" }}
                  onClick={() => go("media")}
                >
                  {annotated}
                </div>
                <span className="u-faint" style={{ fontSize: 11 }}>
                  → {toAnnotate} pending
                </span>
              </div>
              <div className="funnel-row">
                <span className="u-dim" style={{ width: 80, fontSize: 12 }}>
                  Converted
                </span>
                <div
                  className="funnel-bar acc"
                  style={{ width: W(converted) + "%" }}
                  onClick={() => go("media")}
                >
                  {converted}
                </div>
                <span className="u-faint" style={{ fontSize: 11 }}>
                  → {toConvert} ready to convert
                </span>
              </div>
            </div>
            <div className="u-row" style={{ marginTop: 4 }}>
              <button
                className="u-btn primary sm"
                onClick={() => {
                  addToQueue(convertCandidates);
                  go("deliver");
                }}
                disabled={toConvert === 0}
              >
                <Icons.deliver size={12} /> Convert {toConvert} ready
              </button>
              <button className="u-btn sm" onClick={() => go("media")} disabled={toAnnotate === 0}>
                <Icons.pen size={12} /> Review {toAnnotate} unannotated
              </button>
            </div>
          </div>

          <div
            className="u-card"
            style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}
          >
            <span className="u-label">Activity</span>
            {qActive ? (
              <div className="u-col" style={{ gap: 6 }}>
                <div className="u-row-sb" style={{ fontSize: 12 }}>
                  <span className="u-row" style={{ gap: 7 }}>
                    <Dot pulse={queueRunning} idle={!queueRunning} /> Batch convert ·{" "}
                    {qDone}/{queue.length}
                  </span>
                  <button className="u-btn ghost sm" onClick={() => go("deliver")}>
                    open queue ›
                  </button>
                </div>
                <Bar pct={qPct} />
              </div>
            ) : (
              <div className="u-faint" style={{ fontSize: 12 }}>
                No batch running. Queue is clear.
              </div>
            )}
            <div className="u-col" style={{ gap: 7, fontSize: 12 }}>
              {activity.length === 0 ? (
                <span className="u-faint">No recent activity in this session.</span>
              ) : (
                activity.slice(0, 6).map((a, i) => (
                  <span key={i} className="u-dim">
                    ✓ {a.msg} · {a.t}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="u-card u-row-sb">
          <div className="u-row" style={{ gap: 24 }}>
            {SERVICES.map((s) => (
              <Stat
                key={s.id}
                sm
                label={s.label}
                value={
                  <span className="u-row" style={{ gap: 7 }}>
                    <Dot
                      err={health[s.id] === "err"}
                      idle={health[s.id] === "loading"}
                    />{" "}
                    <span style={{ fontSize: 13 }}>
                      {health[s.id] === "ok"
                        ? "healthy"
                        : health[s.id] === "loading"
                        ? "checking…"
                        : "offline"}
                    </span>
                  </span>
                }
                sub={s.sub}
              />
            ))}
          </div>
          <span className="u-faint u-mono" style={{ fontSize: 10.5 }}>
            health polled every 15s
          </span>
        </div>
      </div>
    </div>
  );
}
