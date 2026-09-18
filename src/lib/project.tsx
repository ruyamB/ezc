"use client";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import { templateGraph } from "./graph";
import type { GenResult } from "./solidity";
import type { Engine } from "./ai";

// Cross-page studio state: canvas graph + generated code survive navigation
// between /config, /dashboard, /export and /deploy (persisted to localStorage).

export interface CompiledArtifact {
  abi: unknown;
  bytecode: string;
}

interface ProjectState {
  ready: boolean; // false until first hydration (localStorage or fresh template)
  nodes: Node[];
  edges: Edge[];
  contractName: string;
  gen: GenResult | null;
  engine: Engine | null;
  compiled: CompiledArtifact | null;
  setNodes: (n: Node[] | ((prev: Node[]) => Node[])) => void;
  setEdges: (e: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  setContractName: (n: string) => void;
  setResults: (gen: GenResult | null, engine: Engine | null) => void;
  setCompiled: (c: CompiledArtifact | null) => void;
  clearResults: () => void;
  ensureGraph: (template: string | null) => void;
  resetAll: () => void;
}

const Ctx = createContext<ProjectState | null>(null);
const LS_KEY = "ezc-project-v1";

function load(): { nodes: Node[]; edges: Edge[]; contractName: string; gen: GenResult | null; engine: Engine | null; compiled: CompiledArtifact | null } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!Array.isArray(p.nodes)) return null;
    return {
      nodes: p.nodes,
      edges: Array.isArray(p.edges) ? p.edges : [],
      contractName: typeof p.contractName === "string" ? p.contractName : "EZContract",
      gen: p.gen ?? null,
      engine: p.engine ?? null,
      compiled: p.compiled ?? null,
    };
  } catch {
    return null;
  }
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [nodes, setNodesState] = useState<Node[]>([]);
  const [edges, setEdgesState] = useState<Edge[]>([]);
  const [contractName, setContractNameState] = useState("EZContract");
  const [gen, setGenState] = useState<GenResult | null>(null);
  const [engine, setEngineState] = useState<Engine | null>(null);
  const [compiled, setCompiledState] = useState<CompiledArtifact | null>(null);

  // hydrate once
  useEffect(() => {
    const saved = load();
    if (saved) {
      setNodesState(saved.nodes);
      setEdgesState(saved.edges);
      setContractNameState(saved.contractName);
      setGenState(saved.gen);
      setEngineState(saved.engine);
      setCompiledState(saved.compiled);
    }
    setReady(true);
  }, []);

  // persist on change (after hydration)
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify({ nodes, edges, contractName, gen, engine, compiled }));
    } catch {
      /* storage full or private mode */
    }
  }, [ready, nodes, edges, contractName, gen, engine, compiled]);

  const setNodes = useCallback((n: Node[] | ((prev: Node[]) => Node[])) => {
    setNodesState((prev) => (typeof n === "function" ? (n as (p: Node[]) => Node[])(prev) : n));
  }, []);
  const setEdges = useCallback((e: Edge[] | ((prev: Edge[]) => Edge[])) => {
    setEdgesState((prev) => (typeof e === "function" ? (e as (p: Edge[]) => Edge[])(prev) : e));
  }, []);
  const setContractName = useCallback((n: string) => setContractNameState(n), []);
  const setResults = useCallback((g: GenResult | null, e: Engine | null) => {
    setGenState(g);
    setEngineState(e);
    setCompiledState(null);
  }, []);
  const setCompiled = useCallback((c: CompiledArtifact | null) => setCompiledState(c), []);
  const clearResults = useCallback(() => {
    setGenState(null);
    setEngineState(null);
    setCompiledState(null);
  }, []);

  const ensureGraph = useCallback((template: string | null) => {
    setNodesState((prev) => {
      if (prev.length > 0) return prev;
      // only seed when nothing was ever stored (ready + empty could be an intentional Clear)
      try {
        if (window.localStorage.getItem(LS_KEY)) return prev;
      } catch {
        /* ignore */
      }
      return templateGraph(template).nodes;
    });
    setEdgesState((prev) => {
      if (prev.length > 0) return prev;
      try {
        if (window.localStorage.getItem(LS_KEY)) return prev;
      } catch {
        /* ignore */
      }
      return templateGraph(template).edges;
    });
  }, []);

  const resetAll = useCallback(() => {
    setNodesState([]);
    setEdgesState([]);
    setGenState(null);
    setEngineState(null);
    setCompiledState(null);
  }, []);

  return (
    <Ctx.Provider
      value={{ ready, nodes, edges, contractName, gen, engine, compiled, setNodes, setEdges, setContractName, setResults, setCompiled, clearResults, ensureGraph, resetAll }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useProject(): ProjectState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useProject must be used inside ProjectProvider");
  return v;
}
