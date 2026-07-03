import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { isDemo, makeDemoFiles, demoAnnotation, demoDelay } from "./demo.js";

// ---------------------------------------------------------------------------
// UNIRAW Pro — central media library store.
// All real backend wiring (annotator :5050, converter :5051, previewer :5053)
// lives here so Overview / Media / Deliver / Edit share one source of truth.
// Ported from the original MediaPage.jsx.
// ---------------------------------------------------------------------------

const isBrowserImage = (file) =>
  (file.type && file.type.startsWith("image/")) ||
  /\.(png|jpg|jpeg|tif|tiff)$/i.test(file.name);

const sanitizeMediaItem = (item) => {
  if (!item) return null;
  // eslint-disable-next-line no-unused-vars
  const { originalFile, ...rest } = item;
  if (rest.preview && rest.preview.startsWith("data:")) {
    rest.preview = null;
  }
  return rest;
};

const saveState = (key, value) => {
  try {
    let valToSave = value;
    if (key === "uniraw_mediaFiles" && Array.isArray(value)) {
      valToSave = value.map(sanitizeMediaItem);
    } else if (key === "uniraw_selected" && value) {
      valToSave = sanitizeMediaItem(value);
    }
    localStorage.setItem(key, JSON.stringify(valToSave));
  } catch (err) {
    console.warn("Failed to save state (quota exceeded?):", err);
  }
};

const loadState = (key, fallback = null) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

export const isUnirawMedia = (m) => {
  if (!m) return false;
  const name = (m.name || "").toLowerCase();
  return (
    name.endsWith(".uniraw") ||
    m.type === "application/uniraw" ||
    m.annotation?.file_type === "uniraw"
  );
};

export const isAnnotated = (m) => {
  const a = m?.annotation;
  if (!a || typeof a !== "object") return false;
  const keys = Object.keys(a);
  if (keys.length === 0) return false;
  if (
    keys.length === 1 &&
    typeof a.summary === "string" &&
    /unavailable|failed/i.test(a.summary)
  )
    return false;
  return true;
};

export const isConvertible = (m) => {
  if (!m || m.isConverted) return false;
  const n = (m.name || "").toLowerCase();
  return n.endsWith(".dng") || n.endsWith(".nef");
};

// raw → ann → uni
export const fileStatus = (m) =>
  m.isConverted || isUnirawMedia(m) ? "uni" : isAnnotated(m) ? "ann" : "raw";

export const sizeMB = (m) => (m?.size || 0) / (1024 * 1024);

export const uniMB = (m) => {
  if (!m?.unirawSize) return null;
  const v = parseFloat(String(m.unirawSize));
  return Number.isFinite(v) ? v : null;
};

export const fmtMB = (v) =>
  v >= 1024 ? (v / 1024).toFixed(2) + " GB" : (v || 0).toFixed(1) + " MB";

const rewriteTruecolor = (url) =>
  url ? url.replace(/^https?:\/\/[^/]+\/api5053/, "/api/previewer") : null;

const ts = () => new Date().toTimeString().slice(0, 8);

const MediaContext = createContext(null);
export const useMedia = () => useContext(MediaContext);

export function MediaProvider({ children }) {
  const [mediaFiles, setMediaFiles] = useState(() =>
    isDemo ? makeDemoFiles() : loadState("uniraw_mediaFiles", [])
  );
  const [selected, setSelected] = useState(() =>
    loadState("uniraw_selected", null)
  );
  const [checked, setChecked] = useState([]); // ids ticked in the pool

  // shared busy/progress strip (upload + convert)
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  // activity feed for the Overview page
  const [activity, setActivity] = useState([]);
  const logActivity = useCallback((msg) => {
    setActivity((prev) => [{ t: ts(), msg }, ...prev].slice(0, 12));
  }, []);

  // ---------- persistence (skipped in demo — seeds reset on reload) ----------
  useEffect(() => {
    if (!isDemo) saveState("uniraw_mediaFiles", mediaFiles);
  }, [mediaFiles]);
  useEffect(() => {
    if (!isDemo) saveState("uniraw_selected", selected);
  }, [selected]);

  // keep `selected` in sync with library updates
  useEffect(() => {
    if (selected && mediaFiles.length > 0) {
      const fresh = mediaFiles.find((f) => f.id === selected.id);
      if (fresh && fresh !== selected) setSelected(fresh);
    }
  }, [mediaFiles, selected]);

  // ---------- server history sync (annotator is source of truth) ----------
  useEffect(() => {
    if (isDemo) return; // demo: no backends, keep seeded library
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/annotator/history", {
          cache: "no-store",
          headers: {
            "ngrok-skip-browser-warning": "true",
            "Cache-Control": "no-cache",
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!data.history || !Array.isArray(data.history)) return;

        const storedFiles = loadState("uniraw_mediaFiles", []);
        const historyFiles = data.history.map((item) => {
          const localMatch = storedFiles.find(
            (sf) =>
              sf.name &&
              item.name &&
              sf.name.toLowerCase() === item.name.toLowerCase()
          );
          if (localMatch) {
            return {
              ...localMatch,
              preview: item.preview || localMatch.preview,
              annotation: item.annotation || localMatch.annotation || {},
              originalFile: null,
            };
          }
          return {
            id: item.name + "-" + item.timestamp,
            name: item.name,
            size: item.size,
            type: "image/" + item.name.split(".").pop(),
            preview: item.preview,
            annotation: item.annotation || {},
            originalFile: null,
            isConverted: false,
            unirawPath: null,
            unirawSize: null,
            compression: null,
            truecolorUrl: null,
            label: null,
          };
        });

        if (historyFiles.length === 0) {
          console.warn("Server history is empty. Wiping all local media state.");
          setMediaFiles([]);
          setSelected(null);
          localStorage.removeItem("uniraw_mediaFiles");
          localStorage.removeItem("uniraw_selected");
          return;
        }
        setMediaFiles(historyFiles);
      } catch (err) {
        console.warn("Connection to backend failed or timed out.", err);
        const storedFiles = loadState("uniraw_mediaFiles", []);
        if (storedFiles.length > 0) setMediaFiles(storedFiles);
      }
    };
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- selection helper (keeps EditPage / viewer contract) ----------
  const selectFile = useCallback((m) => {
    setSelected(m);
    if (m?.isConverted && m.unirawPath) {
      localStorage.setItem("selected_uniraw_path", m.unirawPath);
      localStorage.setItem("selected_uniraw_name", m.name);
      localStorage.setItem(
        "selected_uniraw_filename",
        m.unirawPath.split("/").pop()
      );
    }
  }, []);

  // ---------- upload (both .uniraw and RAW/DNG branches) ----------
  const uploadFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || []);
      if (files.length === 0) return;

      setBusy(true);
      setStatusMessage("");
      setProgress(0);
      let fake = 0;
      const tick = setInterval(() => {
        fake = Math.min(95, fake + Math.random() * 10);
        setProgress(fake);
      }, 200);

      // ---------- demo: ingest locally, no backends ----------
      if (isDemo) {
        for (const file of files) {
          await demoDelay(450);
          const preview = isBrowserImage(file) ? URL.createObjectURL(file) : null;
          const newFile = {
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type || "unknown",
            preview,
            annotation: demoAnnotation(file.name),
            originalFile: file,
            isConverted: false,
            unirawPath: null,
            unirawSize: null,
            compression: null,
            truecolorUrl: null,
            label: null,
          };
          setMediaFiles((prev) => [newFile, ...prev]);
          setSelected(newFile);
        }
        clearInterval(tick);
        setBusy(false);
        setProgress(100);
        setStatusMessage("Upload complete (demo)");
        logActivity(`${files.length} file${files.length > 1 ? "s" : ""} ingested (demo)`);
        return;
      }

      for (const file of files) {
        const lowerName = file.name.toLowerCase();
        const isUniraw = lowerName.endsWith(".uniraw");

        if (isUniraw) {
          // ---------- Branch A: .uniraw upload ----------
          try {
            const fd = new FormData();
            fd.append("file", file);
            const uploadRes = await fetch(`/api/previewer/upload_uniraw`, {
              method: "POST",
              body: fd,
            });
            const uploadText = await uploadRes.text();
            let uploadData = {};
            try {
              uploadData = JSON.parse(uploadText || "{}");
            } catch {
              uploadData = {};
            }
            if (!uploadRes.ok || !uploadData.success || !uploadData.saved_path) {
              console.error("upload_uniraw failed:", uploadText);
              continue;
            }
            const serverUnirawPath = uploadData.saved_path;

            let truecolorUrl = null;
            try {
              const gpuRes = await fetch(`/api/previewer/preview`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uniraw_path: serverUnirawPath }),
              });
              const gpuText = await gpuRes.text();
              let gpuData = {};
              try {
                gpuData = JSON.parse(gpuText || "{}");
              } catch {
                gpuData = {};
              }
              if (gpuRes.ok && gpuData.success && gpuData.truecolor_url) {
                truecolorUrl = rewriteTruecolor(gpuData.truecolor_url);
              }
            } catch (gpuErr) {
              console.error("GPU preview request error (uniraw upload):", gpuErr);
            }

            let annotation = {};
            try {
              const annRes = await fetch(`/api/previewer/annotate_uniraw`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uniraw_path: serverUnirawPath }),
              });
              const annText = await annRes.text();
              let annData = {};
              try {
                annData = JSON.parse(annText || "{}");
              } catch {
                annData = {};
              }
              if (annRes.ok && annData.success && annData.annotation) {
                annotation = annData.annotation;
              } else {
                annotation =
                  (annData?.annotation?.annotation || annData?.annotation || {}) ??
                  {};
              }
            } catch (e) {
              console.error("annotate_uniraw request error:", e);
            }

            const unirawSizeMB = file.size / (1024 * 1024);
            const newFile = {
              id: Date.now() + Math.random(),
              name: file.name,
              size: file.size,
              type: "application/uniraw",
              preview: truecolorUrl || null,
              annotation,
              originalFile: null,
              isConverted: true,
              unirawPath: serverUnirawPath,
              unirawSize: `${unirawSizeMB.toFixed(2)} MB`,
              compression: "—",
              truecolorUrl: truecolorUrl || null,
              label: "uniraw",
            };
            setMediaFiles((prev) => [newFile, ...prev]);
            setSelected(newFile);
          } catch (err) {
            console.error("Uniraw upload/preview/annotate failed:", err);
          }
          continue;
        }

        // ---------- Branch B: RAW/DNG/image upload + annotation ----------
        try {
          const formData = new FormData();
          formData.append("file", file);

          let data = {};
          let annotation = {};
          try {
            const res = await fetch(`/api/annotator/annotate`, {
              method: "POST",
              body: formData,
            });
            if (res.ok) {
              try {
                data = await res.json();
                annotation =
                  (data?.annotation?.annotation || data?.annotation || {}) ?? {};
              } catch {
                annotation = { summary: "Annotation parsing failed" };
              }
            } else {
              annotation = { summary: "Annotation unavailable (service not running)" };
            }
          } catch (fetchError) {
            console.warn("Annotator service not reachable:", fetchError.message);
            annotation = { summary: "Annotation unavailable (service not running)" };
          }

          let preview = null;
          if (data.preview) {
            preview = data.preview.startsWith("data:")
              ? data.preview
              : `data:image/jpeg;base64,${data.preview}`;
          } else if (isBrowserImage(file)) {
            preview = URL.createObjectURL(file);
          }

          const newFile = {
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type || "unknown",
            preview,
            annotation,
            originalFile: file,
            isConverted: false,
            unirawPath: null,
            unirawSize: null,
            compression: null,
            truecolorUrl: null,
            label: null,
          };
          setMediaFiles((prev) => [newFile, ...prev]);
          setSelected(newFile);
        } catch (err) {
          console.error("Upload failed:", err);
        }
      }

      clearInterval(tick);
      setBusy(false);
      setProgress(100);
      setStatusMessage("Upload complete");
      logActivity(
        `${files.length} file${files.length > 1 ? "s" : ""} ingested + annotated`
      );
    },
    [logActivity]
  );

  // ---------- single-file conversion (real converter + previewer) ----------
  // Returns { ok, updated?, error? } and updates the library on success.
  const convertFile = useCallback(async (fileItem) => {
    // ---------- demo: simulated conversion with realistic stats ----------
    if (isDemo) {
      await demoDelay(1100 + Math.random() * 900);
      const mb = (fileItem.size || 0) / (1024 * 1024);
      const uniMBVal = Math.max(0.05, mb * 0.028);
      const updated = {
        ...fileItem,
        unirawPath: `/demo/archive/${fileItem.name.replace(/\.[^.]+$/, "")}.uniraw`,
        unirawSize: `${uniMBVal.toFixed(2)} MB`,
        compression: `${(mb / uniMBVal).toFixed(2)}×`,
        isConverted: true,
        label: "uniraw",
        truecolorUrl: fileItem.demoTruecolor || fileItem.preview || null,
      };
      setMediaFiles((prev) => prev.map((f) => (f.id === fileItem.id ? updated : f)));
      return { ok: true, updated, uniMBVal };
    }
    try {
      const blob = fileItem.originalFile
        ? fileItem.originalFile
        : await (await fetch(fileItem.preview)).blob();

      const formData = new FormData();
      formData.append("file", new File([blob], fileItem.name));

      const res = await fetch(`/api/converter/convert_to_uniraw`, {
        method: "POST",
        body: formData,
      });
      const text = await res.text();
      const data = JSON.parse(text || "{}");
      if (!data.success) {
        console.error("Conversion error:", data);
        return { ok: false, error: data.error || "conversion failed" };
      }

      let truecolorUrl = null;
      try {
        const gpuRes = await fetch(`/api/previewer/preview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uniraw_path: data.uinraw }),
        });
        if (gpuRes.ok) {
          const gpuData = await gpuRes.json().catch(() => ({}));
          if (gpuData.truecolor_url) {
            truecolorUrl = rewriteTruecolor(gpuData.truecolor_url);
          }
        }
      } catch (gpuErr) {
        console.error("GPU preview request error:", gpuErr);
      }

      const updated = {
        ...fileItem,
        unirawPath: data.uinraw,
        unirawSize: data.stats?.uniraw_size_mb
          ? `${data.stats.uniraw_size_mb.toFixed(2)} MB`
          : "Unknown",
        compression: data.stats?.compression_ratio
          ? `${data.stats.compression_ratio.toFixed(2)}×`
          : "—",
        isConverted: true,
        label: "uniraw",
        truecolorUrl: truecolorUrl || fileItem.truecolorUrl || null,
      };
      setMediaFiles((prev) => prev.map((f) => (f.id === fileItem.id ? updated : f)));
      return { ok: true, updated, uniMBVal: data.stats?.uniraw_size_mb ?? null };
    } catch (err) {
      console.error("Conversion failed:", err);
      return { ok: false, error: err.message };
    }
  }, []);

  // ---------- delete ----------
  const deleteFiles = useCallback(
    async (targets) => {
      const list = Array.isArray(targets) ? targets : [targets];
      const targetIds = new Set(list.map((f) => f.id));
      setMediaFiles((prev) => prev.filter((f) => !targetIds.has(f.id)));
      setSelected((sel) => (sel && targetIds.has(sel.id) ? null : sel));
      setChecked((prev) => prev.filter((id) => !targetIds.has(id)));

      if (isDemo) {
        logActivity(`${list.length} file${list.length > 1 ? "s" : ""} removed (demo)`);
        return;
      }

      for (const file of list) {
        try {
          const res = await fetch("/api/annotator/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: file.name }),
          });
          const data = await res.json();
          const alreadyGone = !data.success && data.message === "File not found";
          if (!res.ok && !alreadyGone) {
            console.error(`Delete failed for ${file.name}:`, data.error || data.message);
          }
        } catch (err) {
          console.error(`Delete request failed for ${file.name}:`, err);
        }
      }
      logActivity(`${list.length} file${list.length > 1 ? "s" : ""} removed`);
    },
    [logActivity]
  );

  // ---------- download .uniraw bundle ----------
  const downloadBundle = useCallback(async (m) => {
    if (isDemo) {
      alert(
        "Demo deployment — the conversion backend isn't attached, so bundles can't be downloaded here. Run UniRaw locally for real .uniraw exports."
      );
      return;
    }
    if (!m?.unirawPath) {
      alert("No Uniraw file found.");
      return;
    }
    try {
      const response = await fetch(`/api/converter/download_uniraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uniraw_path: m.unirawPath,
          annotation: m.annotation,
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        alert("Download failed: " + errText);
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = m.name ? m.name.replace(/\.[^/.]+$/, "") : "uniraw";
      a.download = `${safeName}_UnirawBundle.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download failed: " + err.message);
    }
  }, []);

  // =========================================================================
  // Deliver queue — sequential real conversions through the converter API.
  // jobs: { id, fileId, name, sizeMB, pct, status: queued|running|done|error, uniMB }
  // =========================================================================
  const [queue, setQueue] = useState([]);
  const [queueRunning, setQueueRunning] = useState(false);
  const runningRef = useRef(false);
  const queueRef = useRef(queue);
  const filesRef = useRef(mediaFiles);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    filesRef.current = mediaFiles;
  }, [mediaFiles]);

  const addToQueue = useCallback((fileList) => {
    setQueue((q) => {
      const have = new Set(q.map((j) => j.fileId));
      const add = fileList
        .filter((f) => !have.has(f.id) && isConvertible(f))
        .map((f) => ({
          id: "j" + f.id + "-" + Date.now(),
          fileId: f.id,
          name: f.name,
          sizeMB: sizeMB(f),
          pct: 0,
          status: "queued",
          uniMB: null,
        }));
      return [...q, ...add];
    });
  }, []);

  const removeJob = useCallback((jobId) => {
    setQueue((q) => q.filter((j) => j.id !== jobId || j.status === "running"));
  }, []);

  const clearDone = useCallback(() => {
    setQueue((q) => q.filter((j) => j.status !== "done" && j.status !== "error"));
  }, []);

  const patchJob = (jobId, patch) =>
    setQueue((q) => q.map((j) => (j.id === jobId ? { ...j, ...patch } : j)));

  const runQueue = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setQueueRunning(true);

    /* eslint-disable no-await-in-loop */
    while (runningRef.current) {
      const next = queueRef.current.find((j) => j.status === "queued");
      if (!next) break;

      const fileItem = filesRef.current.find((f) => f.id === next.fileId);
      if (!fileItem || !isConvertible(fileItem)) {
        patchJob(next.id, { status: "error", pct: 0 });
        continue;
      }

      patchJob(next.id, { status: "running", pct: 4 });
      // creep the bar while the real request is in flight
      const tick = setInterval(() => {
        setQueue((q) =>
          q.map((j) =>
            j.id === next.id && j.status === "running"
              ? { ...j, pct: Math.min(90, j.pct + 3 + Math.random() * 6) }
              : j
          )
        );
      }, 350);

      const result = await convertFile(fileItem);
      clearInterval(tick);

      if (result.ok) {
        patchJob(next.id, {
          status: "done",
          pct: 100,
          uniMB: result.uniMBVal ?? uniMB(result.updated),
        });
        logActivity(`${fileItem.name} converted → .uniraw`);
      } else {
        patchJob(next.id, { status: "error", pct: 0 });
      }
    }
    /* eslint-enable no-await-in-loop */

    runningRef.current = false;
    setQueueRunning(false);
  }, [convertFile, logActivity]);

  const pauseQueue = useCallback(() => {
    runningRef.current = false; // current job finishes, then the loop stops
    setQueueRunning(false);
  }, []);

  const value = {
    mediaFiles,
    setMediaFiles,
    selected,
    selectFile,
    setSelected,
    checked,
    setChecked,
    busy,
    progress,
    statusMessage,
    activity,
    uploadFiles,
    convertFile,
    deleteFiles,
    downloadBundle,
    queue,
    queueRunning,
    addToQueue,
    removeJob,
    clearDone,
    runQueue,
    pauseQueue,
  };

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
}
