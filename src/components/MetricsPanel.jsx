import React, { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Activity, Cpu } from "lucide-react";

export default function MetricsPanel({ metrics }) {
  const data = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, i) => ({
        step: metrics.epoch - (9 - i),
        loss: Math.max(0.01, metrics.loss + (Math.random() * 0.05 - 0.02)),
      })),
    [metrics]
  );

  return (
    <div className="p-3 bg-zinc-950/80 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Chart */}
      <div className="flex-1 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="step" stroke="#666" fontSize={10} />
            <YAxis stroke="#666" fontSize={10} />
            <Tooltip
              contentStyle={{
                background: "#1a1a1a",
                border: "1px solid #333",
                color: "#fff",
                fontSize: "12px",
              }}
            />
            <Line type="monotone" dataKey="loss" stroke="#00C6FF" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Metrics Summary */}
      <div className="flex flex-col justify-center px-3 text-sm">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Loss: <b>{metrics.loss.toFixed(4)}</b></span>
        </div>
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-green-400" />
          <span>GPU Usage: <b>{metrics.gpu.toFixed(1)}%</b></span>
        </div>
        <div className="text-zinc-400 mt-1">
          Epoch: <b>{metrics.epoch}</b>
        </div>
      </div>
    </div>
  );
}


