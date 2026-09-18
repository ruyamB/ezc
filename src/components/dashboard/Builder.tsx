"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import { BLOCKS, CATEGORIES, findBlock, type BlockCategory, type BlockKind } from "@/lib/blocks";
import { makeNode, templateGraph, chain, TEMPLATES } from "@/lib/graph";
import { generateWithAi } from "@/lib/ai";
import { describeToGraph, layoutNodes, type TemplateKey } from "@/lib/plan";
import { useProject } from "@/lib/project";
import { useWallet, GOOGLE_FAUCET_URL } from "@/lib/wallet";
import { useTheme } from "@/components/ThemeProvider";
import {
  Play, Trash, DownloadSimple, RocketLaunch, Eraser, Plus, Brain,
  MagnifyingGlass, ArrowsOut, ArrowsIn, CaretDown, CaretUp, Sparkle, X, Wallet, ArrowClockwise,
} from "@phosphor-icons/react";

export type EZData = {
  kind: BlockKind;
  label: string;
  params: Record<string, string>;
};

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function EZNode({ data, selected }: { data: EZData; selected?: boolean }) {
  const def = findBlock(data.kind);
  const paramBits = Object.entries(data.params ?? {})
    .filter(([, v]) => v)
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${String(v).slice(0, 14)}`);
  return (
    <div
      className={`w-[210px] rounded-2xl border-2 bg-white px-3.5 py-3 shadow-[0_14px_40px_-18px_rgba(18,55,42,0.45)] transition-all dark:bg-panel dark:shadow-[0_14px_40px_-18px_rgba(0,0,0,0.8)] ${
        selected ? "border-ink dark:border-mist" : def?.color.split(" ")[1] ?? "border-line"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !border-white !bg-ink" />
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${def?.dot ?? "bg-stone-400"}`} />
        <p className="text-[13px] font-bold leading-tight">{data.label}</p>
      </div>
      <p className="mt-1 text-[11.5px] leading-snug text-muted dark:text-fog">{def?.plain ?? data.kind}</p>
      {paramBits.length > 0 && (
        <p className="mt-1.5 truncate font-mono2 text-[10.5px] text-inksoft dark:text-fog">{paramBits.join(" · ")}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-white !bg-accent" />
    </div>
  );
}

const nodeTypes = { ez: EZNode };

const EXAMPLES = [
  "ERC-20 coin for my running club with 1 million supply",
  "NFT art collection I can pause in an emergency",
  "Escrow to pay a freelancer when I approve the work",
];

function BalancePill() {
  const wallet = useWallet();
  if (!wallet.address) {
    return (
      <a
        href="/config"
        className="ez-btn flex items-center gap-1.5 border border-line bg-white px-3.5 py-1.5 text-[12px] font-bold hover:border-ink/30 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30"
      >
        <Wallet size={14} weight="duotone" /> Set up wallet
      </a>
    );
  }
  const low = wallet.hasEnough === false;
  return (
    <div className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-bold ${low ? "border-amber-300 bg-amber-50 dark:border-amber-300/25 dark:bg-amber-400/10" : "border-line bg-white dark:border-white/10 dark:bg-white/5"}`}>
      <button onClick={wallet.refresh} title="Refresh balance" className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${low ? "bg-amber-500" : "bg-accent"}`} />
        <span className="font-mono2">{short(wallet.address)}</span>
        <span className="font-mono2 text-muted dark:text-fog">{wallet.balanceEth === null ? "…" : `${Number(wallet.balanceEth).toFixed(4)} ETH`}</span>
        <ArrowClockwise size={13} weight="regular" className="text-muted dark:text-fog" />
      </button>
      {low && (
        <a href={GOOGLE_FAUCET_URL} target="_blank" rel="noreferrer" className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-bold text-white dark:bg-mist dark:text-ink">
          Free ETH ↗
        </a>
      )}
    </div>
  );
}

function InnerBuilder({ initialTemplate }: { initialTemplate: string | null }) {
  const ref = useRef<HTMLDivElement>(null); // canvas drop coords
  const wsRef = useRef<HTMLDivElement>(null); // fullscreen workspace
  const router = useRouter();
  const project = useProject();
  const { nodes, edges, contractName, gen, engine } = project;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [running, setRunning] = useState(false);
  const [query, setQuery] = useState("");
  const [dockCat, setDockCat] = useState<"All" | BlockCategory>("All");
  const [dockOpen, setDockOpen] = useState(true);
  const [isFs, setIsFs] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [planning, setPlanning] = useState(false);
  const { theme } = useTheme();

  // seed the canvas once (template query param or restored project)
  useEffect(() => {
    project.ensureGraph(initialTemplate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const h = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  const toggleFs = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wsRef.current?.requestFullscreen();
    } catch {
      wsRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const selected = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);

  const dockItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BLOCKS.filter((b) => {
      if (dockCat !== "All" && b.category !== dockCat) return false;
      if (q && !`${b.label} ${b.plain} ${b.kind}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, dockCat]);

  const onNodesChange = useCallback((c: NodeChange[]) => setNodes((n) => applyNodeChanges(c, n) as Node[]), []);
  const onEdgesChange = useCallback((c: EdgeChange[]) => setEdges((e) => applyEdgeChanges(c, e) as Edge[]), []);
  const onConnect = useCallback((c: Connection) => setEdges((e) => addEdge({ ...c, animated: true }, e)), []);

  const onDragOver = useCallback((ev: React.DragEvent) => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((ev: React.DragEvent) => {
    ev.preventDefault();
    const kind = ev.dataTransfer.getData("application/ez-block") as BlockKind;
    if (!kind || !findBlock(kind)) return;
    const bounds = ref.current?.getBoundingClientRect();
    const x = ev.clientX - (bounds?.left ?? 0) - 105;
    const y = ev.clientY - (bounds?.top ?? 0) - 40;
    setNodes((n) => [...n, makeNode(kind, x, y)]);
  }, []);

  const addBlock = useCallback((kind: BlockKind) => {
    setNodes((n) => [...n, makeNode(kind, 120 + Math.random() * 420, 80 + Math.random() * 260)]);
  }, []);

  const updateParam = useCallback(
    (key: string, value: string) => {
      if (!selectedId) return;
      setNodes((ns) =>
        ns.map((n) =>
          n.id === selectedId
            ? { ...n, data: { ...(n.data as object), params: { ...((n.data as unknown as EZData).params ?? {}), [key]: value } } }
            : n
        )
      );
    },
    [selectedId]
  );

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    setNodes((ns) => ns.filter((n) => n.id !== selectedId));
    setEdges((es) => es.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const { setNodes, setEdges, setContractName, setResults, clearResults } = project;

  const resetOutput = useCallback(() => {
    clearResults();
  }, [clearResults]);

  const loadTemplate = useCallback((t: string) => {
    const g = templateGraph(t);
    setNodes(g.nodes);
    setEdges(g.edges);
    setSelectedId(null);
    setNotice("");
    clearResults();
  }, [setNodes, setEdges, clearResults]);

  const runOn = useCallback(async (ns: Node[], es: Edge[], name: string) => {
    const { result, engine: eng, notice: nt } = await generateWithAi(ns, es, name);
    setResults(result, eng);
    return { result, eng, nt: nt ?? "" };
  }, [setResults]);

  const run = useCallback(async () => {
    setRunning(true);
    try {
      const { nt } = await runOn(nodes, edges, contractName);
      setNotice(nt);
    } finally {
      setRunning(false);
    }
  }, [nodes, edges, contractName, runOn]);

  const describe = useCallback(async () => {
    const text = prompt.trim();
    if (text.length < 8 || planning) return;
    setPlanning(true);
    setNotice("");
    try {
      const r = await describeToGraph(text, contractName);
      if (r.name) setContractName(r.name);
      let ns: Node[];
      let es: Edge[];
      let head: string;
      if (r.mode === "ai" && r.blocks?.length) {
        const { nodes: placed, indexIds } = layoutNodes(r.blocks);
        ns = placed;
        es = (r.edges ?? [])
          .filter(([a, b]) => indexIds[a] && indexIds[b])
          .map(([a, b], i) => ({ id: `pe${Date.now()}_${i}`, source: indexIds[a], target: indexIds[b], animated: true }));
        if (!es.length && ns.length > 1) es = chain(ns);
        head = r.summary?.length ? `Planned: ${r.summary.slice(0, 3).join(" · ")}. ` : "Blocks placed from your words. ";
      } else {
        const g = templateGraph((r.template ?? "starter") as TemplateKey);
        ns = g.nodes;
        es = g.edges;
        head = `${r.notice ?? "Started from a template."} `;
      }
      setNodes(ns);
      setEdges(es);
      setSelectedId(null);
      const { eng, nt } = await runOn(ns, es, r.name ?? contractName);
      setNotice(`${head}${nt || `Code ready (${eng === "groq" ? "Groq AI" : "local engine"}). Tweaks? Edit blocks and Run again.`}`);
    } finally {
      setPlanning(false);
    }
  }, [prompt, planning, contractName, runOn]);

  const selDef = selected ? findBlock((selected.data as unknown as EZData).kind) : undefined;
  const selData = selected ? (selected.data as unknown as EZData) : undefined;

  return (
    <div>
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[20px] border border-line bg-card p-4 dark:border-white/10 dark:bg-panel">
        <div className="flex items-center gap-2">
          <label className="font-mono2 text-[11px] uppercase tracking-[0.16em] text-muted dark:text-fog">Contract</label>
          <input
            value={contractName}
            onChange={(e) => setContractName(e.target.value)}
            className="ez-input w-44 border border-line bg-paper px-3 py-2 font-mono2 text-[13px] font-bold outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
            placeholder="EZContract"
          />
        </div>
        <div className="mx-1 hidden h-6 w-px bg-line dark:bg-white/10 sm:block" />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono2 text-[11px] uppercase tracking-[0.16em] text-muted dark:text-fog">Templates:</span>
          {TEMPLATES.map(([k, l]) => (
            <button key={k} onClick={() => loadTemplate(k)} className="ez-btn border border-line bg-white px-3.5 py-1.5 text-[12.5px] font-bold hover:border-ink/30 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30">
              {l}
            </button>
          ))}
          <button
            onClick={() => { setNodes([]); setEdges([]); setSelectedId(null); resetOutput(); }}
            className="ez-btn flex items-center gap-1 border border-line bg-white px-3.5 py-1.5 text-[12.5px] font-bold hover:border-red-300 hover:text-red-600 dark:border-white/10 dark:bg-white/5 dark:hover:border-red-300/40 dark:hover:text-red-300"
          >
            <Eraser size={14} weight="regular" /> Clear
          </button>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            onClick={run}
            disabled={running || planning}
            className="ez-btn group flex items-center gap-2 bg-accent px-6 py-2.5 text-[14px] font-bold text-white transition-all hover:bg-accent-deep active:scale-[0.98] disabled:opacity-60"
          >
            {running ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Play size={15} weight="fill" />}
            {running ? "Writing code…" : "Run → get code"}
          </button>
          <button
            onClick={() => router.push("/export")}
            title={gen ? "Open code, ABI and downloads" : "Run first, then export"}
            className="ez-btn flex items-center gap-1.5 border border-line bg-white px-4 py-2.5 text-[13.5px] font-bold hover:border-ink/30 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30"
            disabled={!gen}
          >
            <DownloadSimple size={15} weight="regular" /> Export
          </button>
          <button
            onClick={() => router.push("/deploy")}
            title={gen ? "Deploy this contract" : "Run first, then deploy"}
            disabled={!gen}
            className="ez-btn flex items-center gap-1.5 bg-ink px-4 py-2.5 text-[13.5px] font-bold text-white transition-all hover:bg-forest active:scale-[0.98] disabled:opacity-40 dark:bg-mist dark:text-ink dark:hover:bg-emerald-200"
          >
            <RocketLaunch size={15} weight="duotone" /> Deploy
          </button>
        </div>
      </div>

      {/* describe → blocks + code */}
      <div className="mt-4 rounded-[20px] border border-line bg-card p-4 dark:border-white/10 dark:bg-panel">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft dark:bg-emerald-400/10">
            <Sparkle size={18} weight="duotone" className="text-accent-deep dark:text-emerald-400" />
          </span>
          <div>
            <p className="font-display text-[15px] font-bold tracking-tight">Describe it, get blocks and code</p>
            <p className="text-[12.5px] text-muted dark:text-fog">Plain English in, canvas plus Solidity out. Then tweak and Run again.</p>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2 lg:flex-row">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) describe(); }}
            placeholder="e.g. An ERC-20 coin for my running club, 1 million supply, only I can mint more…"
            rows={2}
            className="ez-input min-h-[64px] flex-1 border border-line bg-paper px-3.5 py-2.5 text-[14px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
          />
          <button
            onClick={describe}
            disabled={planning || prompt.trim().length < 8}
            className="ez-btn flex items-center justify-center gap-2 bg-ink px-6 py-2.5 text-[14px] font-bold text-white transition-all hover:bg-forest active:scale-[0.98] disabled:opacity-40 dark:bg-mist dark:text-ink dark:hover:bg-emerald-200 lg:w-48"
          >
            {planning ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Sparkle size={16} weight="duotone" />}
            {planning ? "Planning…" : "Generate"}
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setPrompt(ex)}
              className="rounded-full border border-line bg-white px-3 py-1 text-[12px] font-semibold text-inksoft transition-colors hover:border-accent hover:text-accent-deep dark:border-white/10 dark:bg-white/5 dark:text-fog dark:hover:border-emerald-300/40 dark:hover:text-emerald-300"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <p className="mt-3 rounded-xl bg-paper px-4 py-2.5 text-[13px] font-semibold text-inksoft dark:bg-white/[0.04] dark:text-fog">{notice}</p>
      )}

      {/* ============ LANDSCAPE WORKSPACE ============ */}
      <div
        ref={wsRef}
        className={`mt-4 overflow-hidden rounded-[20px] border border-line bg-white dark:border-white/10 dark:bg-panel ${isFs ? "flex h-full flex-col bg-paper p-4 dark:bg-night" : ""}`}
      >
        {/* workspace header: stats · balance · controls */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-white px-4 py-2.5 dark:border-white/10 dark:bg-panel">
          <p className="font-mono2 text-[11px] uppercase tracking-[0.16em] text-muted dark:text-fog">
            workspace · {nodes.length} blocks · {edges.length} connections
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <BalancePill />
            <button
              onClick={() => setDockOpen(!dockOpen)}
              title={dockOpen ? "Collapse tool dock" : "Expand tool dock"}
              className="ez-btn flex items-center gap-1 border border-line bg-white px-3 py-1.5 text-[12px] font-bold hover:border-ink/30 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30"
            >
              Blocks {dockOpen ? <CaretUp size={13} weight="regular" /> : <CaretDown size={13} weight="regular" />}
            </button>
            <button
              onClick={toggleFs}
              title={isFs ? "Exit fullscreen" : "Open workspace fullscreen"}
              className="ez-btn flex items-center gap-1.5 bg-ink px-3.5 py-1.5 text-[12px] font-bold text-white hover:bg-forest dark:bg-mist dark:text-ink dark:hover:bg-emerald-200"
            >
              {isFs ? <ArrowsIn size={14} weight="regular" /> : <ArrowsOut size={14} weight="regular" />}
              {isFs ? "Exit" : "Fullscreen"}
            </button>
          </div>
        </div>

        {/* canvas + floating inspector */}
        <div className={`relative ${isFs ? "min-h-0 flex-1" : "h-[62vh] min-h-[480px]"}`}>
          <div ref={ref} className="xyflow-wrapper absolute inset-0" onDragOver={onDragOver} onDrop={onDrop}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, n) => setSelectedId(n.id)}
              onPaneClick={() => setSelectedId(null)}
              fitView
              colorMode={theme === "dark" ? "dark" : "light"}
            >
              <Background gap={22} size={1.5} />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>

          {!selected && (
            <p className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-ink/70 px-3.5 py-1.5 font-mono2 text-[11px] font-bold text-white backdrop-blur">
              drag blocks in · connect top → bottom · click a block to edit
            </p>
          )}

          {selected && selDef && selData && (
            <div className="absolute right-3 top-3 z-10 max-h-[calc(100%-24px)] w-[300px] max-w-[calc(100%-24px)] overflow-y-auto rounded-2xl border border-line bg-card p-4 shadow-[0_24px_60px_-24px_rgba(18,55,42,0.5)] dark:border-white/10 dark:bg-panel dark:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)]">
              <div className="flex items-center justify-between">
                <p className="font-display text-[15px] font-bold">Settings</p>
                <button
                  onClick={() => setSelectedId(null)}
                  aria-label="Close settings"
                  className="rounded-full p-1.5 text-muted hover:bg-line dark:text-fog dark:hover:bg-white/10"
                >
                  <X size={15} weight="regular" />
                </button>
              </div>
              <div className={`mt-2 rounded-2xl border p-3.5 ${selDef.color}`}>
                <p className="flex items-center gap-2 text-[14px] font-bold"><span className={`h-2.5 w-2.5 rounded-full ${selDef.dot}`} />{selData.label}</p>
                <p className="mt-0.5 text-[12.5px] opacity-75">{selDef.plain}</p>
              </div>
              {selDef.fields.length === 0 && (
                <p className="mt-3 rounded-xl bg-paper px-3.5 py-2.5 text-[12.5px] text-muted dark:bg-white/[0.04] dark:text-fog">No settings. This block just works.</p>
              )}
              <div className="mt-3 space-y-3">
                {selDef.fields.map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-[13px] font-bold">{f.label}</span>
                    {f.multiline ? (
                      <textarea
                        value={(selData.params ?? {})[f.key] ?? ""}
                        onChange={(e) => updateParam(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        rows={3}
                        spellCheck={false}
                        className="ez-input mt-1 w-full border border-line bg-white px-3 py-2 font-mono2 text-[12.5px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
                      />
                    ) : (
                      <input
                        value={(selData.params ?? {})[f.key] ?? ""}
                        onChange={(e) => updateParam(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        spellCheck={false}
                        className="ez-input mt-1 w-full border border-line bg-white px-3 py-2 text-[13.5px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
                      />
                    )}
                    <span className="mt-1 block text-[12px] text-muted dark:text-fog">{f.hint}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={removeSelected}
                className="ez-btn mt-4 flex w-full items-center justify-center gap-1.5 border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-bold text-red-600 hover:bg-red-100 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-300 dark:hover:bg-red-400/20"
              >
                <Trash size={14} weight="regular" /> Remove block
              </button>
            </div>
          )}
        </div>

        {/* bottom tool dock */}
        <div className="border-t border-line bg-card dark:border-white/10 dark:bg-panel">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
            <button onClick={() => setDockOpen(!dockOpen)} className="flex items-center gap-1.5 text-[13.5px] font-bold">
              {dockOpen ? <CaretUp size={14} weight="regular" /> : <CaretDown size={14} weight="regular" />}
              Tool dock
              <span className="rounded-full bg-paper px-2 py-0.5 font-mono2 text-[11px] text-muted dark:bg-white/5 dark:text-fog">{dockItems.length}</span>
            </button>
            <div className="flex flex-wrap items-center gap-1">
              {(["All", ...CATEGORIES.map((c) => c.name)] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setDockCat(c)}
                  className={`rounded-full px-3 py-1 text-[12px] font-bold transition-colors ${dockCat === c ? "bg-ink text-white dark:bg-mist dark:text-ink" : "bg-paper text-muted hover:text-ink dark:bg-white/5 dark:text-fog dark:hover:text-mist"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="relative ml-auto">
              <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted dark:text-fog" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search blocks…"
                className="ez-input w-44 border border-line bg-paper py-1.5 pl-8 pr-3 text-[12.5px] outline-none focus:border-accent dark:border-white/10 dark:bg-white/5"
              />
            </div>
          </div>
          {dockOpen && (
            <div className="flex gap-2.5 overflow-x-auto px-4 pb-3.5">
              {dockItems.map((b) => (
                <div
                  key={b.kind}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("application/ez-block", b.kind)}
                  onClick={() => addBlock(b.kind)}
                  title={`${b.plain} (drag or click to add)`}
                  className={`w-[210px] shrink-0 cursor-grab rounded-xl border px-3 py-2.5 transition-transform hover:scale-[1.03] active:cursor-grabbing ${b.color}`}
                >
                  <span className="flex items-center gap-2 text-[13px] font-bold">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${b.dot}`} />
                    <span className="truncate">{b.label}</span>
                    <Plus size={13} weight="regular" className="ml-auto shrink-0 opacity-50" />
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-snug opacity-70">{b.plain}</span>
                  <span className="mt-1 block font-mono2 text-[10px] uppercase tracking-[0.12em] opacity-50">{b.category}</span>
                </div>
              ))}
              {!dockItems.length && <p className="py-3 text-[13px] text-muted">No blocks match.</p>}
            </div>
          )}
        </div>
      </div>

      {/* flow summary strip */}
      {gen && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[20px] bg-forest px-5 py-3.5 text-white">
          <p className="flex items-center gap-1.5 font-mono2 text-[10.5px] uppercase tracking-[0.16em] text-white/55">
            {engine === "groq" && <Brain size={13} weight="duotone" className="text-emerald-300" />}
            {engine === "groq" ? "groq ai" : "local engine"}
          </p>
          <p className="text-[12.5px] font-semibold text-white/90">{gen.summary.slice(0, 4).join(" · ")}</p>
          <p className="ml-auto font-mono2 text-[11px] text-emerald-200">{gen.functionList.slice(0, 6).join("  ")}</p>
        </div>
      )}

    </div>
  );
}

export default function Builder({ initialTemplate }: { initialTemplate: string | null }) {
  return (
    <ReactFlowProvider>
      <InnerBuilder initialTemplate={initialTemplate} />
    </ReactFlowProvider>
  );
}
