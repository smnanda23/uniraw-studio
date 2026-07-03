import React, { useState, useEffect, useRef } from "react";
import { Icons, Dot, Stat, CtlSlider } from "../components/pro.jsx";
import { useMedia, fileStatus } from "../lib/mediaStore.jsx";

// ---------------------------------------------------------------------------
// Train workspace — runs · live metrics · config (UNIRAW Pro hi-fi layout).
// The loop is simulated (clearly labelled), as in the previous Training page;
// the training-set size is the real count of converted .uniraw files.
// ---------------------------------------------------------------------------

const ts = () => new Date().toTimeString().slice(0, 8);

function LossChart({ history, h = 150 }) {
  const w = 600;
  const pts =
    history.length > 1
      ? history
          .map(
            (v, i) =>
              `${(i / (history.length - 1)) * w},${h - 8 - v * (h - 20)}`
          )
          .join(" ")
      : "";
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1="0"
          x2={w}
          y1={h * g}
          y2={h * g}
          stroke="var(--line-soft)"
          strokeWidth="1"
        />
      ))}
      {pts ? (
        <polyline
          points={pts}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

const loadRuns = () => {
  try {
    const v = localStorage.getItem("uniraw_train_runs");
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
};

export default function TrainingPage() {
  const { mediaFiles } = useMedia();
  const datasetSize = mediaFiles.filter((f) => fileStatus(f) === "uni").length;

  const [pastRuns, setPastRuns] = useState(loadRuns);
  const runIdx = pastRuns.length + 1;
  const runName = "run-" + String(runIdx).padStart(3, "0");

  const [training, setTraining] = useState({
    running: false,
    epoch: 0,
    epochs: 40,
    loss: 0,
    gpu: 4,
    batch: 16,
    lr: 10,
    history: [],
    logs: [],
  });
  const logRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("uniraw_train_runs", JSON.stringify(pastRuns.slice(0, 8)));
  }, [pastRuns]);

  // simulated loop (labelled in the UI)
  useEffect(() => {
    if (!training.running) return;
    const id = setInterval(() => {
      setTraining((tr) => {
        if (tr.epoch >= tr.epochs) {
          setPastRuns((rs) => [
            { id: runName, note: `loss ${tr.loss.toFixed(3)} · ${tr.epochs} epochs`, ok: true },
            ...rs,
          ]);
          return {
            ...tr,
            running: false,
            gpu: 4,
            logs: [
              { t: ts(), msg: "run complete · final loss " + tr.loss.toFixed(4), hl: true },
              ...tr.logs,
            ].slice(0, 60),
          };
        }
        const epoch = tr.epoch + 1;
        const base = 0.32 * Math.exp(-epoch / 9) + 0.018;
        const loss = base + Math.random() * 0.012;
        const logs = [
          {
            t: ts(),
            msg: `epoch ${epoch}/${tr.epochs} · loss=${loss.toFixed(4)} · lr=${(
              tr.lr / 100000
            ).toExponential(1)}`,
          },
          ...(epoch % 5 === 0
            ? [
                {
                  t: ts(),
                  msg: `checkpoint saved → ckpt-${String(epoch).padStart(3, "0")}.pt`,
                  hl: true,
                },
              ]
            : []),
          ...tr.logs,
        ].slice(0, 60);
        return {
          ...tr,
          epoch,
          loss,
          gpu: 85 + Math.round(Math.random() * 12),
          history: [...tr.history, 1 - base / 0.34],
          logs,
        };
      });
    }, 600);
    return () => clearInterval(id);
  }, [training.running, runName]);

  const start = () =>
    setTraining((tr) => ({
      ...tr,
      running: true,
      epoch: 0,
      history: [],
      loss: 0.33,
      logs: [
        {
          t: ts(),
          msg: `${runName} started · ${datasetSize} .uniraw files (simulated)`,
          hl: true,
        },
      ],
    }));
  const stop = () => setTraining((tr) => ({ ...tr, running: false, gpu: 4 }));
  const setConfig = (c) => setTraining((tr) => ({ ...tr, ...c }));

  const { running, epoch, epochs, loss, history, logs, gpu, batch, lr } = training;
  const eta = running
    ? Math.max(1, Math.round((epochs - epoch) * 1.05)) + " min"
    : "—";

  return (
    <div className="main page-enter">
      {/* ---- runs list ---- */}
      <div className="pool" style={{ width: 240 }}>
        <div className="u-col" style={{ padding: "var(--pad)", gap: 8 }}>
          <span className="u-label">Runs</span>
          <div
            className="ins-box u-col"
            style={{
              gap: 2,
              borderColor: running ? "var(--accent-line)" : "var(--line-soft)",
            }}
          >
            <span className="u-row" style={{ gap: 7, fontSize: 13, fontWeight: 600 }}>
              <Dot pulse={running} idle={!running} /> {runName}{" "}
              {running ? "· live" : "· ready"}
            </span>
            <span className="u-faint" style={{ fontSize: 11 }}>
              uniraw palette · {epoch}/{epochs} epochs
            </span>
          </div>
          {pastRuns.length === 0 ? (
            <span className="u-faint" style={{ fontSize: 11 }}>
              No finished runs yet.
            </span>
          ) : (
            pastRuns.slice(0, 6).map((r) => (
              <div key={r.id} className="ins-box u-col" style={{ gap: 2 }}>
                <span className="u-row" style={{ gap: 7, fontSize: 12.5 }}>
                  <Dot idle={r.ok} err={!r.ok} /> {r.id}
                </span>
                <span className="u-faint" style={{ fontSize: 11 }}>
                  {r.note}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ---- metrics ---- */}
      <div
        className="u-grow u-col"
        style={{ padding: "calc(var(--pad) + 6px)", gap: 14, overflow: "hidden" }}
      >
        <div className="u-row" style={{ gap: 30 }}>
          <Stat label="Loss" value={loss.toFixed(4)} acc />
          <Stat label="Epoch" value={epoch + " / " + epochs} />
          <Stat label="GPU" value={gpu + "%"} sub={running ? "utilization" : "idle"} />
          <Stat label="ETA" value={eta} />
          <div className="u-grow"></div>
          {running ? (
            <button className="u-btn danger" onClick={stop}>
              <Icons.stop size={12} /> Stop run
            </button>
          ) : (
            <button className="u-btn primary" onClick={start}>
              <Icons.play size={12} /> Start run
            </button>
          )}
        </div>
        <div className="u-panel u-grow u-col" style={{ padding: 14, gap: 6, minHeight: 0 }}>
          <span className="u-label">loss / epoch</span>
          <div className="u-grow" style={{ minHeight: 0 }}>
            <LossChart history={history} />
          </div>
        </div>
        <div
          className="console"
          style={{
            height: 150,
            flex: "none",
            display: "flex",
            flexDirection: "column-reverse",
          }}
          ref={logRef}
        >
          <div>
            {logs.length === 0 ? (
              <span className="u-faint">No logs yet — start a run.</span>
            ) : null}
            {logs.map((l, i) => (
              <div key={i}>
                <span className="ts">[{l.t}]</span>{" "}
                {l.hl ? <span className="hl">{l.msg}</span> : l.msg}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- config ---- */}
      <div className="inspector" style={{ width: 250 }}>
        <span className="u-label">Run config</span>
        <div className="ins-box u-col" style={{ gap: 8 }}>
          <div className="u-row-sb" style={{ fontSize: 12.5 }}>
            <span className="u-dim">Dataset</span>
            <span>Library ▾</span>
          </div>
          <div className="u-row-sb" style={{ fontSize: 12.5 }}>
            <span className="u-dim">Model</span>
            <span>uniraw-palette ▾</span>
          </div>
        </div>
        <div className="u-col" style={{ gap: 10 }}>
          <CtlSlider
            label="epochs"
            value={epochs}
            min={5}
            max={120}
            onChange={(v) => setConfig({ epochs: v })}
          />
          <CtlSlider
            label="batch"
            value={batch}
            min={2}
            max={64}
            step={2}
            onChange={(v) => setConfig({ batch: v })}
          />
          <CtlSlider
            label="lr ×1e-5"
            value={lr}
            min={1}
            max={50}
            onChange={(v) => setConfig({ lr: v })}
            fmt={(v) => (v / 10).toFixed(1)}
          />
        </div>
        <div className="ins-box u-col" style={{ gap: 3 }}>
          <span className="u-label">Training set</span>
          <span style={{ fontSize: 12.5 }}>{datasetSize} .uniraw files</span>
          <span className="u-faint" style={{ fontSize: 11 }}>
            converted files only — convert more in Deliver to grow the set
          </span>
        </div>
        <div className="u-grow"></div>
        <span className="u-faint" style={{ fontSize: 10.5, lineHeight: 1.5 }}>
          Demo · simulated loop — the training backend isn't implemented yet. Wire it
          up before shipping.
        </span>
      </div>
    </div>
  );
}
