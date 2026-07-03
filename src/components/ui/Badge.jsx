import React from "react";

const COLOR = {
  neutral: "bg-surface-3 text-zinc-300 border-surface-4",
  brand: "bg-brand-soft text-brand-hi border-brand/30",
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  danger: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  info: "bg-sky-500/10 text-sky-300 border-sky-500/30",
};

const SIZE = {
  xs: "px-1.5 py-0.5 text-[9px]",
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-[11px]",
};

export default function Badge({
  color = "neutral",
  size = "sm",
  children,
  className = "",
  icon,
  uppercase = true,
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-md border font-medium tracking-wider whitespace-nowrap",
        uppercase ? "uppercase" : "",
        COLOR[color] || COLOR.neutral,
        SIZE[size] || SIZE.sm,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon && <span className="-ml-0.5">{icon}</span>}
      {children}
    </span>
  );
}
