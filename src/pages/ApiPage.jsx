import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Cable,
  RefreshCw,
  Database,
  Cpu,
  Zap,
  Activity,
  ToggleLeft,
  ToggleRight,
  Server,
  Brain,
  Mail,
  Info,
} from "lucide-react";
import RightSidebar from "../components/RightSidebar";
import { Button, Card, Badge, StatBlock, StatusDot } from "../components/ui";

const SERVICES = [
  {
    id: "annotator",
    label: "Annotator",
    url: "/api/annotator/health",
    port: 5050,
    description: "Vision-language annotation via local Ollama (LLaVA).",
  },
  {
    id: "converter",
    label: "Converter",
    url: "/api/converter/health",
    port: 5051,
    description: "DNG/NEF → .uniraw compression pipeline.",
  },
  {
    id: "previewer",
    label: "Previewer",
    url: "/api/previewer/health",
    port: 5053,
    description: "TrueColor JPG re-render from .uniraw + reference DNG.",
  },
];

export default function ApiPage({ health = {}, refreshHealth, focusReq }) {
  const [serviceData, setServiceData] = useState({});
  const cardRefs = useRef({});
  const [highlightedId, setHighlightedId] = useState(null);

  // When the header asks to focus a specific service card (focusReq
  // changes), scroll it into view and paint a brief ring. focusReq is
  // shaped { id, key } — `key` (a timestamp) makes repeat clicks on the
  // same service still re-trigger this effect.
  useEffect(() => {
    if (!focusReq?.id) return undefined;
    const node = cardRefs.current[focusReq.id];
    if (node && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setHighlightedId(focusReq.id);
    const t = setTimeout(() => setHighlightedId(null), 1800);
    return () => clearTimeout(t);
  }, [focusReq?.id, focusReq?.key]);
  const [tokenStats, setTokenStats] = useState({
    imageCount: 5,
    avgTokens: 2048,
    totalTokens: 10240,
    cost: 0.02,
  });
  const [sandboxMode, setSandboxMode] = useState(true);
  const [developerMode, setDeveloperMode] = useState(false);
  const [autoContext, setAutoContext] = useState(true);

  // Pull /health response bodies (more detail than the binary up/down)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = {};
      await Promise.all(
        SERVICES.map(async (s) => {
          try {
            const r = await fetch(s.url, { cache: "no-store" });
            if (!r.ok) return;
            next[s.id] = await r.json();
          } catch {
            /* ignore */
          }
        })
      );
      if (!cancelled) setServiceData(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [health]);

  const handleTokenChange = (key, value) => {
    setTokenStats((prev) => {
      const updated = { ...prev, [key]: Number(value) };
      updated.totalTokens = updated.imageCount * updated.avgTokens;
      updated.cost = updated.totalTokens * 0.000002;
      return updated;
    });
  };

  const okCount = useMemo(
    () => SERVICES.filter((s) => health[s.id] === "ok").length,
    [health]
  );

  return (
    <div className="flex h-full w-full overflow-hidden text-zinc-100">
      <main className="flex-1 relative z-10 overflow-y-auto custom-scrollbar">
        <div className="px-8 py-6 max-w-6xl mx-auto">
          {/* Page header */}
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Cable className="w-4 h-4 text-brand-hi" />
                <h1 className="text-xl font-semibold tracking-tight text-zinc-50">
                  API & Services
                </h1>
              </div>
              <p className="text-sm text-zinc-500">
                Live health and configuration for the Uniraw backend stack.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={refreshHealth}
              iconLeft={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          </div>

          {/* Service health cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {SERVICES.map((s) => {
              const status =
                health[s.id] === "ok"
                  ? "ok"
                  : health[s.id] === "loading"
                  ? "loading"
                  : "err";
              const data = serviceData[s.id];
              const isHighlighted = highlightedId === s.id;
              return (
              <div
                key={s.id}
                ref={(node) => {
                  if (node) cardRefs.current[s.id] = node;
                }}
                className={`rounded-xl transition-shadow duration-300 ${
                  isHighlighted
                    ? "ring-2 ring-brand-ring ring-offset-2 ring-offset-surface-0 shadow-glow"
                    : ""
                }`}
              >
                <Card
                  density="tight"
                  padded
                  header={
                    <header className="flex items-start justify-between gap-2 px-4 pt-3 pb-2 border-b border-surface-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Server className="w-3.5 h-3.5 text-zinc-500" />
                          <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
                            {s.label}
                          </h3>
                        </div>
                        <p className="mt-0.5 text-[11px] text-zinc-500">
                          {s.description}
                        </p>
                      </div>
                      <StatusDot status={status} />
                    </header>
                  }
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500">Port</span>
                    <span className="font-mono tabular-nums text-zinc-300">
                      {s.port}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] mt-1">
                    <span className="text-zinc-500">Status</span>
                    <Badge
                      color={
                        status === "ok"
                          ? "success"
                          : status === "loading"
                          ? "warning"
                          : "danger"
                      }
                      size="xs"
                    >
                      {status === "ok"
                        ? "Healthy"
                        : status === "loading"
                        ? "Probing"
                        : "Unreachable"}
                    </Badge>
                  </div>
                  {data?.version && (
                    <div className="flex items-center justify-between text-[11px] mt-1">
                      <span className="text-zinc-500">Version</span>
                      <span className="font-mono tabular-nums text-zinc-400">
                        {data.version}
                      </span>
                    </div>
                  )}
                  {/* Service-specific extras */}
                  {s.id === "annotator" && data?.model && (
                    <div className="flex items-center justify-between text-[11px] mt-1">
                      <span className="text-zinc-500">Model</span>
                      <span className="font-mono tabular-nums text-zinc-300">
                        {data.model}
                      </span>
                    </div>
                  )}
                  {s.id === "annotator" && (
                    <div className="flex items-center justify-between text-[11px] mt-1">
                      <span className="text-zinc-500">Ollama</span>
                      <Badge
                        color={data?.ollama_ok ? "success" : "danger"}
                        size="xs"
                      >
                        {data?.ollama_ok ? "online" : "offline"}
                      </Badge>
                    </div>
                  )}
                  {s.id === "converter" && (
                    <div className="flex items-center justify-between text-[11px] mt-1">
                      <span className="text-zinc-500">Palette</span>
                      <Badge
                        color={data?.palette_loaded ? "success" : "warning"}
                        size="xs"
                      >
                        {data?.palette_loaded ? "loaded" : "lazy"}
                      </Badge>
                    </div>
                  )}
                  {s.id === "previewer" && (
                    <div className="flex items-center justify-between text-[11px] mt-1">
                      <span className="text-zinc-500">TrueColor</span>
                      <Badge
                        color={
                          data?.truecolor_script_present ? "success" : "danger"
                        }
                        size="xs"
                      >
                        {data?.truecolor_script_present
                          ? "ready"
                          : "missing"}
                      </Badge>
                    </div>
                  )}
                </Card>
              </div>
              );
            })}
          </section>

          {/* KPI strip */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card padded density="tight">
              <StatBlock
                icon={<Activity className="w-3 h-3" />}
                label="Services Up"
                value={`${okCount} / ${SERVICES.length}`}
                hint={
                  okCount === SERVICES.length
                    ? "all healthy"
                    : okCount === 0
                    ? "stack offline"
                    : "degraded"
                }
              />
            </Card>
            <Card padded density="tight">
              <StatBlock
                icon={<Database className="w-3 h-3" />}
                label="Estimated Tokens"
                value={tokenStats.totalTokens.toLocaleString()}
                hint={`${tokenStats.imageCount} images × ${tokenStats.avgTokens}`}
              />
            </Card>
            <Card padded density="tight">
              <StatBlock
                icon={<Zap className="w-3 h-3" />}
                label="Estimated Cost"
                value={`$${tokenStats.cost.toFixed(4)}`}
                hint="@ $0.000002 / token"
              />
            </Card>
          </section>

          {/* Token calculator */}
          <Card
            title="Token Calculator"
            subtitle="Estimate token spend across the dataset"
            padded
            className="mb-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="text-xs text-zinc-400">
                    Images processed
                  </label>
                  <span className="text-xs font-mono tabular-nums text-zinc-200">
                    {tokenStats.imageCount}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={tokenStats.imageCount}
                  onChange={(e) =>
                    handleTokenChange("imageCount", e.target.value)
                  }
                  className="w-full accent-brand"
                />
              </div>
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <label className="text-xs text-zinc-400">
                    Avg tokens / image
                  </label>
                  <span className="text-xs font-mono tabular-nums text-zinc-200">
                    {tokenStats.avgTokens}
                  </span>
                </div>
                <input
                  type="range"
                  min="512"
                  max="8192"
                  step="128"
                  value={tokenStats.avgTokens}
                  onChange={(e) =>
                    handleTokenChange("avgTokens", e.target.value)
                  }
                  className="w-full accent-brand"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-500">
              <Info className="w-3 h-3" />
              <span>
                Cost numbers are illustrative. Local Ollama inference is free;
                only cloud APIs incur charges.
              </span>
            </div>
          </Card>

          {/* Advanced settings */}
          <Card title="Advanced" padded className="mb-6">
            {[
              {
                key: "sandbox",
                label: "Sandbox Mode",
                value: sandboxMode,
                set: setSandboxMode,
                hint: "All requests stay on this machine.",
              },
              {
                key: "dev",
                label: "Developer Mode",
                value: developerMode,
                set: setDeveloperMode,
                hint: "Verbose logging across services.",
              },
              {
                key: "autoctx",
                label: "Auto-link Context",
                value: autoContext,
                set: setAutoContext,
                hint: "Pass annotations alongside conversion calls.",
              },
            ].map((row, i, arr) => (
              <div
                key={row.key}
                className={`flex items-center justify-between py-2.5 ${
                  i < arr.length - 1 ? "border-b border-surface-3" : ""
                }`}
              >
                <div>
                  <div className="text-xs text-zinc-200 font-medium">
                    {row.label}
                  </div>
                  <div className="text-[10px] text-zinc-500">{row.hint}</div>
                </div>
                <button
                  onClick={() => row.set(!row.value)}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring rounded px-1 ${
                    row.value ? "text-brand-hi" : "text-zinc-500"
                  }`}
                  aria-pressed={row.value}
                >
                  {row.value ? (
                    <ToggleRight className="w-5 h-5" />
                  ) : (
                    <ToggleLeft className="w-5 h-5" />
                  )}
                  {row.value ? "On" : "Off"}
                </button>
              </div>
            ))}
          </Card>

          {/* Cloud connectors — explicitly demo-only */}
          <Card
            title="Cloud Connectors"
            subtitle="Optional — Uniraw runs fully offline"
            padded
            actions={
              <Badge color="warning" size="xs">
                Demo only
              </Badge>
            }
          >
            <p className="text-[11px] text-zinc-500 mb-3 flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              These OAuth flows are not implemented in this build. The Annotator
              uses your local Ollama instance.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled
                fullWidth
                iconLeft={<Mail className="w-4 h-4" />}
                title="Not implemented"
              >
                Connect Google
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled
                fullWidth
                iconLeft={<Brain className="w-4 h-4" />}
                title="Not implemented"
              >
                Connect OpenAI
              </Button>
            </div>
          </Card>
        </div>
      </main>

      {/* Right rail — sample requests reference */}
      <RightSidebar>
        <Card title="Endpoints" subtitle="Reference URLs" padded density="tight">
          <ul className="space-y-1.5 text-[11px]">
            {SERVICES.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-zinc-400">{s.label}</span>
                <code className="font-mono text-[10px] text-zinc-500 truncate">
                  {s.url}
                </code>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Try It" padded density="tight">
          <p className="text-[11px] text-zinc-500 mb-2 leading-relaxed">
            Probe a backend health endpoint manually from this host:
          </p>
          <pre className="text-[10px] font-mono bg-surface-1/60 border border-surface-3 rounded-md p-2 text-zinc-300 overflow-x-auto">
{(() => {
  const host =
    typeof window !== "undefined" ? window.location.hostname : "localhost";
  return `curl -s http://${host}:5050/health | jq
curl -s http://${host}:5051/health | jq
curl -s http://${host}:5053/health | jq`;
})()}
          </pre>
        </Card>

        <Card title="Notes" padded density="tight">
          <ul className="space-y-1.5 text-[11px] text-zinc-400">
            <li className="flex items-start gap-1.5">
              <span className="text-zinc-600 mt-0.5">•</span>
              <span>
                The header status dots poll <code className="font-mono text-zinc-300">/health</code> every 15 s.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-zinc-600 mt-0.5">•</span>
              <span>
                Annotator additionally probes Ollama
                <code className="font-mono text-zinc-300"> /api/tags</code>.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-zinc-600 mt-0.5">•</span>
              <span>
                Converter reports whether the 550 MB palette is currently
                resident in memory.
              </span>
            </li>
          </ul>
        </Card>
      </RightSidebar>
    </div>
  );
}
