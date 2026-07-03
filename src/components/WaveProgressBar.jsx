import React from "react";
import { motion } from "framer-motion";

export default function WaveProgressBar({ progress = 0, metrics = {} }) {
  return (
    <div className="relative h-14 overflow-hidden bg-zinc-900 border-t border-zinc-800 flex items-center justify-between px-6">
      {/* Animated wave background */}
      <motion.div
        className="absolute left-0 top-0 w-full h-full bg-gradient-to-r from-violet-700/40 via-fuchsia-500/30 to-violet-700/40 blur-xl opacity-50"
        animate={{ backgroundPositionX: ["0%", "200%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        style={{ backgroundSize: "200% 100%" }}
      />

      {/* Metrics info */}
      <div className="relative flex items-center gap-6 z-10 text-sm">
        <span>
          Epoch: <b>{metrics.epoch ?? 0}</b>
        </span>
        <span>
          Loss: <b className="text-cyan-400">{metrics.loss?.toFixed(4) ?? "0.0000"}</b>
        </span>
        <span>
          GPU: <b className="text-green-400">{metrics.gpu?.toFixed(1) ?? 0}%</b>
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative w-1/3 h-3 bg-zinc-800 rounded-full overflow-hidden z-10">
        <motion.div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-600"
          style={{ width: `${progress}%` }}
          animate={{ backgroundPositionX: ["0%", "200%"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* ETA placeholder */}
      <div className="relative text-zinc-400 z-10 text-sm">
        ETA: 00:00:00
      </div>
    </div>
  );
}

