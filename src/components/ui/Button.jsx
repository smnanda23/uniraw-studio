import React from "react";

// Button — single source of truth for clickable action surfaces.
// Variants reflect intent; sizes reflect density. Use IconButton for
// square icon-only affordances (zoom, close, etc.).

const VARIANT = {
  primary:
    "bg-brand text-white hover:bg-brand-hi active:bg-brand-lo " +
    "shadow-[0_1px_0_rgba(255,255,255,0.08)_inset] " +
    "disabled:bg-brand/30 disabled:text-white/70",
  secondary:
    "bg-surface-3 text-zinc-100 hover:bg-surface-4 border border-surface-4 " +
    "disabled:bg-surface-2 disabled:text-zinc-500 disabled:border-surface-3",
  ghost:
    "bg-transparent text-zinc-300 hover:bg-surface-3 hover:text-zinc-100 " +
    "disabled:text-zinc-600",
  outline:
    "bg-transparent border border-surface-4 text-zinc-200 " +
    "hover:bg-surface-3 hover:text-zinc-100 " +
    "disabled:opacity-40",
  destructive:
    "bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 border border-rose-500/30 " +
    "disabled:bg-rose-500/5 disabled:text-rose-200/40 disabled:border-rose-500/15",
  success:
    "bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 border border-emerald-500/30 " +
    "disabled:bg-emerald-500/5 disabled:text-emerald-200/40 disabled:border-emerald-500/15",
};

const SIZE = {
  xs: "h-7 px-2 text-[11px] gap-1.5 rounded-md",
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-sm gap-2 rounded-lg",
  lg: "h-10 px-4 text-sm gap-2 rounded-lg",
};

export default function Button({
  variant = "secondary",
  size = "md",
  children,
  className = "",
  disabled = false,
  loading = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  type = "button",
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center font-medium",
        "transition-colors duration-150 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-0",
        "disabled:cursor-not-allowed",
        VARIANT[variant] || VARIANT.secondary,
        SIZE[size] || SIZE.md,
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {loading ? (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden
        />
      ) : (
        iconLeft
      )}
      {children !== undefined && children !== null && (
        <span className="truncate">{children}</span>
      )}
      {!loading && iconRight}
    </button>
  );
}
