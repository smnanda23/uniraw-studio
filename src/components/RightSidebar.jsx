import React from "react";

// RightSidebar — the shared 340px right rail used by Edit / Training / API
// pages. Renders only its `children`; the API-page content that used to
// live here has moved into ApiPage.jsx (Phase F) where it actually belongs.
//
// The rail listens to --rail-w on the document root: when the user
// collapses the rail in the header, --rail-w becomes 0 and the aside
// translates off-screen so the main content gets the full width.

// UNIRAW Pro shell: the rail is absolutely positioned inside the page
// wrapper (App.jsx provides position:relative + right padding) so it sits
// between the topbar and the bottom pagebar instead of covering them.
export default function RightSidebar({ children, className = "" }) {
  return (
    <aside
      className={[
        "absolute right-0 top-0 h-full w-[340px] z-40",
        "border-l border-surface-3 bg-surface-1/95 backdrop-blur-md",
        "flex flex-col overflow-y-auto custom-scrollbar",
        "transition-transform duration-300 ease-out",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        transform: "translateX(calc(340px - var(--rail-w, 340px)))",
      }}
    >
      <div className="flex-1 p-5 space-y-4">{children}</div>
    </aside>
  );
}
