import React from "react";

// Card — a single, consistent container for grouped content.
// Use `title`/`subtitle`/`actions` for the standard header, or
// pass `header` to fully replace it. `padded={false}` removes the
// inner padding when the body owns its own layout (e.g. canvases).

export default function Card({
  title,
  subtitle,
  actions,
  header,
  children,
  className = "",
  padded = true,
  density = "default", // "default" | "tight"
  as: Tag = "section",
}) {
  const bodyPad =
    padded && density === "tight"
      ? "p-3"
      : padded
      ? "p-4"
      : "";

  return (
    <Tag
      className={[
        "rounded-xl border border-surface-3 surface-raised shadow-soft",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {header
        ? header
        : (title || actions) && (
            <header className="flex items-start justify-between gap-3 px-4 pt-3 pb-2 border-b border-surface-3">
              <div className="min-w-0">
                {title && (
                  <h3 className="text-sm font-semibold text-zinc-100 tracking-tight truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="mt-0.5 text-[11px] text-zinc-500 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-2 shrink-0">{actions}</div>
              )}
            </header>
          )}
      <div className={bodyPad}>{children}</div>
    </Tag>
  );
}
