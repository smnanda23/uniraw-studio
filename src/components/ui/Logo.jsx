import React from "react";

// Logo — hand-authored SVG of the Uniraw brand mark (brain hemispheres with
// circuit nodes). Themes via currentColor for the outlines; nodes can use
// the brand accent in `duo` tone or follow currentColor in `mono` tone.
//
// Props:
//   size      — pixel dimension (square). Default 28.
//   tone      — "mono" | "duo". duo paints nodes in --tw-text-brand-hi.
//   variant   — "mark" | "wordmark". wordmark adds the UNIRAW lockup.
//   className — extra classes for the outer span / svg.
//   strokeWidth — override line weight (defaults scale with size).

export default function Logo({
  size = 28,
  tone = "mono",
  variant = "mark",
  className = "",
  strokeWidth,
  title = "Uniraw",
}) {
  // Stroke gets thinner at small sizes so the tracery doesn't muddy
  const sw = strokeWidth ?? (size <= 18 ? 4 : size <= 28 ? 3.25 : 2.75);
  const nodeFill =
    tone === "duo" ? "var(--logo-node-color, #2dd4bf)" : "currentColor";

  const Mark = (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={variant === "mark" ? className : ""}
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>{title}</title>

      {/* Right hemisphere — D-shape with the flat side on centerline x=32 */}
      <path d="M32 6 C 41 6 51 9 55 18 C 59 27 58 38 54 47 C 50 56 41 58 32 58 L 32 6 Z" />

      {/* Left hemisphere — mirror of right */}
      <path d="M32 6 C 23 6 13 9 9 18 C 5 27 6 38 10 47 C 14 56 23 58 32 58 L 32 6 Z" />

      {/* RIGHT circuit cluster — node + L-shaped trace back to center */}
      <circle cx="40" cy="17" r="2.4" fill={nodeFill} stroke="none" />
      <path d="M40 19.4 L 40 24 L 33 24" />

      <circle cx="46" cy="28" r="2.4" fill={nodeFill} stroke="none" />
      <path d="M46 30.4 L 46 33 L 33 33" />

      <circle cx="44" cy="40" r="2.4" fill={nodeFill} stroke="none" />
      <path d="M44 37.6 L 44 36 L 33 36" />

      <circle cx="38" cy="50" r="2.4" fill={nodeFill} stroke="none" />
      <path d="M38 47.6 L 38 45 L 33 45" />

      {/* LEFT circuit cluster — mirror */}
      <circle cx="24" cy="17" r="2.4" fill={nodeFill} stroke="none" />
      <path d="M24 19.4 L 24 24 L 31 24" />

      <circle cx="18" cy="28" r="2.4" fill={nodeFill} stroke="none" />
      <path d="M18 30.4 L 18 33 L 31 33" />

      <circle cx="20" cy="40" r="2.4" fill={nodeFill} stroke="none" />
      <path d="M20 37.6 L 20 36 L 31 36" />

      <circle cx="26" cy="50" r="2.4" fill={nodeFill} stroke="none" />
      <path d="M26 47.6 L 26 45 L 31 45" />
    </svg>
  );

  if (variant === "mark") return Mark;

  // wordmark layout — mark + "UNIRAW" + optional tagline
  return (
    <span
      className={["inline-flex items-center gap-2.5", className]
        .filter(Boolean)
        .join(" ")}
    >
      {Mark}
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-zinc-100 tracking-tight">
          UNIRAW
        </span>
        <span className="block text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          Universal RAW Studio
        </span>
      </span>
    </span>
  );
}
