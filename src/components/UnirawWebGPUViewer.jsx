import React, { useEffect, useState } from "react";

export default function UnirawWebGPUViewer({
  filePath,
  palettePath,
  refDngPath,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgSrc, setImgSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!filePath) {
        setLoading(false);
        setError("No Uniraw file path provided.");
        return;
      }

      setLoading(true);
      setError(null);
      setImgSrc(null);

      try {
        const resp = await fetch("http://127.0.0.1:5053/uniraw_rgb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_path: filePath,
            palette: palettePath,
            refdng: refDngPath,
            v_black: 0.1,
            v_white: 1.4,
          }),
        });

        const data = await resp.json().catch(() => null);

        if (!resp.ok || !data) {
          throw new Error(
            data && data.message
              ? data.message
              : `HTTP ${resp.status || "?"} while building preview`
          );
        }

        if (!data.success) {
          throw new Error(data.message || "Backend failed to build preview");
        }

        if (!data.data) {
          throw new Error("Backend did not return image data");
        }

        if (!cancelled) {
          setImgSrc(`data:image/png;base64,${data.data}`);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("❌ Uniraw viewer error:", err);
          setError(err.message || "Unknown error");
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [filePath, palettePath, refDngPath]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-xs text-zinc-400">
        <div className="mb-2 h-4 w-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        Building Uniraw preview…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-xs text-rose-400">
        Failed to build Uniraw preview
        <span className="mt-1 text-[10px] text-rose-300/70 max-w-xs text-center">
          {error}
        </span>
      </div>
    );
  }

  if (!imgSrc) return null;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <img
        src={imgSrc}
        alt="Uniraw preview"
        className="max-w-full max-h-full object-contain rounded-[14px] shadow-[0_18px_45px_rgba(0,0,0,0.65)]"
        draggable={false}
      />
    </div>
  );
}

