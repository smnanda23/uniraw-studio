import React from "react";

export default function ModelPanel() {
  return (
    <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 shadow-inner">
      <h3 className="text-lg font-semibold mb-2 text-zinc-200">Model</h3>
      <select className="w-full p-2 bg-zinc-800/80 rounded-lg text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-600">
        <option>Select Pretrained Model</option>
        <option>Upload Local Checkpoint</option>
        <option>Import from URL</option>
      </select>
      <button className="w-full mt-3 px-3 py-2 bg-violet-700/40 hover:bg-violet-700/60 rounded-lg text-sm text-violet-200 border border-violet-600/30">
        Load Model
      </button>
    </div>
  );
}

