import React from "react";

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
  size = "md", // "sm" | "md" | "lg"
}) {
  const pad =
    size === "sm" ? "py-6 px-4" : size === "lg" ? "py-16 px-6" : "py-10 px-6";
  const iconSize =
    size === "sm" ? "w-10 h-10" : size === "lg" ? "w-16 h-16" : "w-14 h-14";

  return (
    <div
      className={[
        "flex flex-col items-center justify-center text-center",
        pad,
        className,
      ].join(" ")}
    >
      {icon && (
        <div
          className={[
            "mb-3 text-zinc-600 flex items-center justify-center",
            iconSize,
          ].join(" ")}
          aria-hidden
        >
          {icon}
        </div>
      )}
      {title && (
        <h4 className="text-sm font-medium text-zinc-300 tracking-tight">
          {title}
        </h4>
      )}
      {description && (
        <p className="mt-1 text-xs text-zinc-500 max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
