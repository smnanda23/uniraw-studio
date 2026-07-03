import React from "react";

const SIZE = {
  xs: "h-6 w-6",
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-10 w-10",
};

const VARIANT = {
  ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-surface-3",
  solid: "text-zinc-100 bg-surface-3 hover:bg-surface-4 border border-surface-4",
  brand: "text-brand-hi bg-brand-soft hover:bg-brand/25 border border-brand/30",
  destructive:
    "text-rose-300 hover:text-rose-200 hover:bg-rose-500/15 border border-transparent",
};

export default function IconButton({
  size = "md",
  variant = "ghost",
  className = "",
  title,
  ariaLabel,
  ...rest
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel || title}
      className={[
        "inline-flex items-center justify-center rounded-lg",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        VARIANT[variant] || VARIANT.ghost,
        SIZE[size] || SIZE.md,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}
