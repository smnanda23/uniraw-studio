import React from "react";

// StatBlock — tiny KPI rendering. Always mono+tabular to keep digits stable.

export default function StatBlock({
  label,
  value,
  hint,
  icon,
  trend, // { dir: "up" | "down" | "flat", value: string }
  className = "",
  align = "left", // "left" | "right" | "center"
}) {
  const alignCls =
    align === "right"
      ? "items-end text-right"
      : align === "center"
      ? "items-center text-center"
      : "items-start text-left";

  return (
    <div className={["flex flex-col gap-1", alignCls, className].join(" ")}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold text-zinc-100 font-mono tabular-nums leading-none">
        {value}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        {trend && (
          <span
            className={[
              "font-mono tabular-nums",
              trend.dir === "up"
                ? "text-emerald-400"
                : trend.dir === "down"
                ? "text-rose-400"
                : "text-zinc-500",
            ].join(" ")}
          >
            {trend.dir === "up" ? "▲" : trend.dir === "down" ? "▼" : "▬"}{" "}
            {trend.value}
          </span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
}
