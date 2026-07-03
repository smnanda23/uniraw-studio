import React from "react";

export default function ScriptPanel() {
  return (
    <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 shadow-inner">
      <h3 className="text-lg font-semibold mb-2 text-zinc-200">Training Script</h3>
      <div className="flex flex-col gap-2">
        <button className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-200">
          Upload Script
        </button>
        <button className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-200">
          Edit / Debug
        </button>
      </div>
    </div>
  );
}

