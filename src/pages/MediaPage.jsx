import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Icons,
  Dot,
  Bar,
  Stat,
  Thumb,
  Histogram,
  CompareViewer,
} from "../components/pro.jsx";
import {
  useMedia,
  fileStatus,
  isConvertible,
  isUnirawMedia,
  sizeMB,
  fmtMB,
} from "../lib/mediaStore.jsx";

// ---------------------------------------------------------------------------
// Media workspace — pool · viewer · inspector (UNIRAW Pro hi-fi layout),
// wired to the real annotator / converter / previewer backends via the store.
// ---------------------------------------------------------------------------

export default function MediaPage({ go }) {
  const {
    mediaFiles,
    selected,
    selectFile,
    checked,
    setChecked,
    busy,
    progress,
    statusMessage,
    uploadFiles,
    deleteFiles,
    downloadBundle,
    addToQueue,
  } = useMedia();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [compare, setCompare] = useState(true);
  const [zoom, setZoom] = useState("fit");
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const uploadRef = useRef(null);

  // ---------- filtering ----------
  const visible = mediaFiles.filter((f) => {
    const st = fileStatus(f);
    if (filter === "ann" && st === "raw") return false;
    if (filter === "uni" && st !== "uni") return false;
    if (filter === "raw" && st !== "raw") return false;
    if (query && !f.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const file =
    (selected && mediaFiles.find((f) => f.id === selected.id)) ||
    visible[0] ||
    mediaFiles[0] ||
    null;

  const counts = {
    all: mediaFiles.length,
    raw: mediaFiles.filter((f) => fileStatus(f) === "raw").length,
    ann: mediaFiles.filter((f) => fileStatus(f) !== "raw").length,
    uni: mediaFiles.filter((f) => fileStatus(f) === "uni").length,
  };

  const toggleCheck = (id) =>
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const idx = file ? visible.findIndex((f) => f.id === file.id) : -1;
  const step = useCallback(
    (d) => {
      if (visible.length === 0) return;
      const n = visible[(idx + d + visible.length) % visible.length];
      if (n) selectFile(n);
    },
    [visible, idx, selectFile]
  );

  // ---------- keyboard: J/K walk, C compare ----------
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "k") step(1);
      if (e.key === "ArrowLeft" || e.key === "j") step(-1);
      if (e.key === "c") setCompare((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  // ---------- viewer sources ----------
  const hasTruecolor = !!file?.truecolorUrl;
  const isUniUpload = isUnirawMedia(file) && !file?.originalFile;
  const original = file?.preview || null;
  const truecolor = hasTruecolor ? file.truecolorUrl : null;
  const canCompare = !!(original && truecolor) && !isUniUpload;

  const checkedFiles = mediaFiles.filter((f) => checked.includes(f.id));
  const checkedMB = checkedFiles.reduce((s, f) => s + sizeMB(f), 0);
  const annotation = file?.annotation || {};

  const confirmDelete = () => {
    if (!deleteCandidate) return;
    deleteFiles(deleteCandidate);
    setDeleteCandidate(null);
  };

  return (
    <div className="main page-enter" style={{ position: "relative" }}>
      {/* ---- media pool ---- */}
      <div className="pool">
        <div className="u-col" style={{ padding: "var(--pad)", paddingBottom: 8, gap: 9 }}>
          <div className="u-row-sb">
            <span className="u-label">Media pool</span>
            <span className="u-mono u-faint" style={{ fontSize: 10.5 }}>
              {visible.length}/{mediaFiles.length}
            </span>
          </div>
          <input
            type="text"
            className="u-input"
            placeholder="Filter files…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="u-row" style={{ gap: 5, flexWrap: "wrap" }}>
            {["all", "raw", "ann", "uni"].map((k) => (
              <button
                key={k}
                className={"chip" + (filter === k ? " on" : "")}
                onClick={() => setFilter(k)}
              >
                {k === "all" ? "All" : k === "raw" ? "RAW" : k === "ann" ? "Ann" : ".uni"}{" "}
                {counts[k]}
              </button>
            ))}
          </div>
          {(busy || statusMessage) && (
            <div className="u-col" style={{ gap: 3 }}>
              <Bar pct={busy ? progress : 100} />
              <span className="u-faint u-mono" style={{ fontSize: 9.5 }}>
                {busy ? `processing · ${Math.round(progress)}%` : statusMessage}
              </span>
            </div>
          )}
        </div>
        <div
          className="pool-grid u-grow"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer?.files?.length) uploadFiles(e.dataTransfer.files);
          }}
          style={isDragging ? { outline: "2px dashed var(--accent-line)", outlineOffset: -6 } : null}
        >
          {visible.length === 0 ? (
            <span className="u-faint" style={{ gridColumn: "1 / -1", fontSize: 11.5, textAlign: "center", padding: "20px 4px" }}>
              {mediaFiles.length === 0
                ? "Library is empty — drop RAW files here or use Import."
                : "Nothing matches this filter."}
            </span>
          ) : (
            visible.map((f) => (
              <Thumb
                key={f.id}
                file={f}
                status={fileStatus(f)}
                sel={file && f.id === file.id}
                checked={checked.includes(f.id)}
                onClick={() => selectFile(f)}
                onCheck={() => toggleCheck(f.id)}
              />
            ))
          )}
        </div>
        <div style={{ padding: "var(--pad)", borderTop: "1px solid var(--line-soft)" }}>
          <button
            className="u-btn"
            style={{ width: "100%" }}
            onClick={() => uploadRef.current?.click()}
          >
            <Icons.upload size={13} /> Import media
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
            }}
          />
        </div>
      </div>

      {/* ---- viewer ---- */}
      <div className="viewer-wrap">
        <div
          style={{
            position: "relative",
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <CompareViewer
            original={original}
            truecolor={truecolor}
            compare={canCompare && compare}
            zoom={zoom}
          />
          <div className="viewer-hud">
            <button className="hud-btn" onClick={() => step(-1)} title="previous (J)">
              <Icons.prev size={11} />
            </button>
            <button
              className={"hud-btn" + (zoom === "fit" ? " on" : "")}
              onClick={() => setZoom("fit")}
            >
              Fit
            </button>
            <button
              className={"hud-btn" + (zoom === "100" ? " on" : "")}
              onClick={() => setZoom("100")}
            >
              100%
            </button>
            {canCompare ? (
              <button
                className={"hud-btn" + (compare ? " on" : "")}
                onClick={() => setCompare(!compare)}
                title="compare (C)"
              >
                <Icons.compare size={11} /> Compare
              </button>
            ) : null}
            <button className="hud-btn" onClick={() => step(1)} title="next (K)">
              <Icons.next size={11} />
            </button>
          </div>
        </div>
        <div className="filmstrip">
          {visible.slice(0, 14).map((f) => (
            <Thumb
              key={f.id}
              file={f}
              status={fileStatus(f)}
              sel={file && f.id === file.id}
              onClick={() => selectFile(f)}
              width={92}
            />
          ))}
        </div>
        {checked.length > 0 ? (
          <div className="bulkbar">
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>
              {checked.length} selected
            </span>
            <span className="u-faint u-mono" style={{ fontSize: 11 }}>
              {fmtMB(checkedMB)}
            </span>
            <button
              className="u-btn primary sm"
              onClick={() => {
                addToQueue(checkedFiles);
                setChecked([]);
                go("deliver");
              }}
              disabled={!checkedFiles.some(isConvertible)}
            >
              <Icons.deliver size={12} /> Add to Deliver
            </button>
            <button
              className="u-btn danger sm"
              onClick={() => setDeleteCandidate(checkedFiles)}
            >
              <Icons.trash size={11} /> Remove
            </button>
            <button className="u-btn ghost sm" onClick={() => setChecked([])}>
              <Icons.x size={11} /> Clear
            </button>
          </div>
        ) : null}
      </div>

      {/* ---- inspector ---- */}
      <div className="inspector">
        {file ? (
          <>
            <div className="u-col" style={{ gap: 3 }}>
              <span className="u-label">File</span>
              <span style={{ fontSize: 14, fontWeight: 600, wordBreak: "break-all" }}>
                {file.name}
              </span>
              <span className="u-mono u-faint" style={{ fontSize: 10.5 }}>
                {sizeMB(file).toFixed(1)} MB · {file.type || "unknown mime"}
              </span>
              {file.unirawPath ? (
                <button
                  onClick={() => {
                    try {
                      navigator.clipboard?.writeText(file.unirawPath);
                    } catch {
                      /* noop */
                    }
                  }}
                  className="u-mono u-faint"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 9.5,
                    padding: 0,
                    textAlign: "left",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={`Copy path: ${file.unirawPath}`}
                >
                  {file.unirawPath}
                </button>
              ) : null}
            </div>

            <div className="ins-box">
              <span className="u-label" style={{ display: "block", marginBottom: 7 }}>
                Histogram
              </span>
              <Histogram />
            </div>

            <div className="ins-box u-col" style={{ gap: 6 }}>
              <div className="u-row-sb">
                <span className="u-label">AI annotation</span>
              </div>
              {fileStatus(file) === "raw" && !annotation.summary ? (
                <span className="u-faint" style={{ fontSize: 12 }}>
                  Not annotated yet.
                </span>
              ) : (
                <div className="u-col" style={{ gap: 4, fontSize: 12 }}>
                  {annotation.summary ? (
                    <span>
                      <span className="u-faint">summary</span> &nbsp;
                      {annotation.summary}
                    </span>
                  ) : null}
                  {annotation.file_type ? (
                    <span>
                      <span className="u-faint">type</span> &nbsp;
                      {annotation.file_type}
                    </span>
                  ) : null}
                  {Array.isArray(annotation.objects) && annotation.objects.length > 0 ? (
                    <span>
                      <span className="u-faint">objects</span> &nbsp;
                      {annotation.objects.map((o, i) => (
                        <span key={i} style={{ marginRight: 4 }}>
                          {o.name}×{o.count}
                          {i < annotation.objects.length - 1 ? "," : ""}
                        </span>
                      ))}
                    </span>
                  ) : null}
                  <details style={{ marginTop: 2 }}>
                    <summary
                      className="u-acc"
                      style={{ fontSize: 11, cursor: "pointer", listStyle: "none" }}
                    >
                      ▸ raw annotation JSON
                    </summary>
                    <pre
                      className="u-mono"
                      style={{
                        marginTop: 6,
                        padding: 8,
                        background: "#121316",
                        border: "1px solid var(--line-soft)",
                        borderRadius: 6,
                        fontSize: 9.5,
                        color: "var(--text-dim)",
                        whiteSpace: "pre-wrap",
                        maxHeight: 180,
                        overflowY: "auto",
                      }}
                    >
                      {JSON.stringify(annotation, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>

            <div className="u-grow"></div>

            {file.isConverted ? (
              <>
                <div className="ins-box u-col" style={{ gap: 4 }}>
                  <span className="u-label">Compression</span>
                  <span className="u-mono u-acc" style={{ fontSize: 15, fontWeight: 600 }}>
                    {sizeMB(file).toFixed(1)} MB → {file.unirawSize || "—"}
                  </span>
                  <span className="u-faint" style={{ fontSize: 11 }}>
                    {file.compression && file.compression !== "—"
                      ? `${file.compression} ratio · verified ✓`
                      : "verified ✓"}
                  </span>
                </div>
                <button className="u-btn" onClick={() => downloadBundle(file)}>
                  <Icons.download size={13} /> Download .uniraw + DNG
                </button>
              </>
            ) : isConvertible(file) ? (
              <button
                className="u-btn primary"
                onClick={() => {
                  addToQueue([file]);
                  go("deliver");
                }}
              >
                <Icons.deliver size={13} /> Convert to .uniraw
              </button>
            ) : (
              <button className="u-btn" disabled>
                <Icons.deliver size={13} /> Convert (.dng / .nef only)
              </button>
            )}

            <button className="u-btn danger sm" onClick={() => setDeleteCandidate(file)}>
              <Icons.trash size={11} /> Remove
            </button>
            <span
              className="u-faint u-mono"
              style={{ fontSize: 10, textAlign: "center" }}
            >
              J/K walk · C compare
            </span>
          </>
        ) : (
          <span className="u-faint" style={{ fontSize: 12 }}>
            Select a file in the pool to inspect it.
          </span>
        )}
      </div>

      {/* ---- delete confirm ---- */}
      {deleteCandidate ? (
        <div className="u-modal-veil" onClick={() => setDeleteCandidate(null)}>
          <div className="u-modal" onClick={(e) => e.stopPropagation()}>
            <div className="u-col" style={{ gap: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>
                {Array.isArray(deleteCandidate)
                  ? `Delete ${deleteCandidate.length} files?`
                  : "Delete file?"}
              </span>
              <span className="u-dim" style={{ fontSize: 12.5 }}>
                {Array.isArray(deleteCandidate) ? (
                  <>Permanently delete {deleteCandidate.length} items from the library and server.</>
                ) : (
                  <>
                    Permanently delete{" "}
                    <span style={{ color: "var(--text)" }}>"{deleteCandidate.name}"</span>{" "}
                    from the library and server.
                  </>
                )}{" "}
                This cannot be undone.
              </span>
            </div>
            <div className="u-row" style={{ justifyContent: "flex-end" }}>
              <button className="u-btn" onClick={() => setDeleteCandidate(null)}>
                Cancel
              </button>
              <button
                className="u-btn danger"
                style={{ background: "var(--err)", color: "#fff", borderColor: "var(--err)" }}
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
