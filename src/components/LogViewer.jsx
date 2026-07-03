import React from "react";

export default function LogViewer({ logs = [] }) {
  return (
    <div className="flex-1 overflow-y-auto p-3 font-mono text-xs bg-zinc-950">
      {logs.length ? (
        logs.map((l, i) => (
          <div key={i} className="text-zinc-400 leading-tight">
            {l}
          </div>
        ))
      ) : (
        <p className="text-zinc-600 italic">No logs yet. Start training to view output.</p>
      )}
    </div>
  );
}

