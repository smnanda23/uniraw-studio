import React from "react";

const COLOR = {
  ok: "bg-emerald-400",
  warn: "bg-amber-400",
  err: "bg-rose-500",
  off: "bg-zinc-600",
  loading: "bg-amber-400",
};

const RING = {
  ok: "bg-emerald-400/50",
  warn: "bg-amber-400/50",
  err: "bg-rose-500/50",
  loading: "bg-amber-400/50",
};

// StatusDot — a colored dot with an optional pulsing halo. Used in the
// header chrome (per-service health) and inline next to status copy.

export default function StatusDot({
  status = "off",
  label,
  hint,
  size = "sm",
  className = "",
}) {
  const dotSize = size === "lg" ? "h-2.5 w-2.5" : "h-2 w-2";
  const showHalo = status === "ok" || status === "loading" || status === "warn";
  return (
    <span
      className={["inline-flex items-center gap-2", className].join(" ")}
      title={hint}
    >
      <span className={["relative inline-flex", dotSize].join(" ")}>
        {showHalo && (
          <span
            className={[
              "absolute inline-flex h-full w-full rounded-full opacity-60 motion-safe:animate-ping",
              RING[status],
            ].join(" ")}
            aria-hidden
          />
        )}
        <span
          className={[
            "relative inline-flex h-full w-full rounded-full",
            COLOR[status] || COLOR.off,
          ].join(" ")}
        />
      </span>
      {label && (
        <span className="text-xs text-zinc-300 font-medium tracking-tight">
          {label}
        </span>
      )}
    </span>
  );
}
