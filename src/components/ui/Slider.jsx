import React from "react";

// Slider — a styled wrapper around <input type="range"> that gives us
// label + value alignment, mono numerics, and a consistent focus ring.

export default function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue,
  disabled = false,
  className = "",
  hint,
  trailing, // Custom node rendered next to the value (e.g. a "reset" button)
}) {
  const display =
    typeof formatValue === "function" ? formatValue(value) : String(value);

  return (
    <div className={["flex flex-col gap-1", className].join(" ")}>
      {label && (
        <div className="flex justify-between items-center text-xs text-zinc-400">
          <span className="font-medium tracking-tight">{label}</span>
          <span className="flex items-center gap-2">
            <span className="font-mono tabular-nums text-zinc-200 text-[11px]">
              {display}
            </span>
            {trailing}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className={[
          "w-full accent-brand cursor-pointer rounded-full",
          "h-1.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring",
          "disabled:opacity-40 disabled:cursor-not-allowed",
        ].join(" ")}
      />
      {hint && <p className="text-[10px] text-zinc-500">{hint}</p>}
    </div>
  );
}
