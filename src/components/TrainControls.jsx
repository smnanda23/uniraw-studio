import React from "react";
import { Play, Square, Trash2 } from "lucide-react";

export default function TrainControls({ isTraining, onStart, onStop, onClear }) {
  return (
    <div className="flex gap-2">
      {isTraining ? (
        <button
          onClick={onStop}
          className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
          title="Stop Training"
        >
          <Square className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={onStart}
          className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition"
          title="Start Training"
        >
          <Play className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={onClear}
        className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition"
        title="Clear Logs"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

