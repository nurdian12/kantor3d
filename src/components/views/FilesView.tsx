"use client";
import { useMemo, useState } from "react";
import { agentMeta } from "@/lib/agentsMeta";
import { FILES } from "@/lib/mockData";
import { AgentDot, card, relTime } from "./ui";

interface Node { name: string; path: string; children: Map<string, Node>; file?: (typeof FILES)[number] }

function buildTree() {
  const root: Node = { name: "outputs", path: "", children: new Map() };
  for (const f of FILES) {
    let cur = root;
    f.path.split("/").forEach((part, i, arr) => {
      const path = arr.slice(0, i + 1).join("/");
      if (!cur.children.has(part)) cur.children.set(part, { name: part, path, children: new Map() });
      cur = cur.children.get(part)!;
      if (i === arr.length - 1) cur.file = f;
    });
  }
  return root;
}
const size = (s: string) => { const b = new Blob([s]).size; return b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`; };
const icon = (n: Node) => (n.file ? (n.name.endsWith(".md") ? "📝" : n.name.endsWith(".csv") ? "📊" : n.name.endsWith(".json") ? "🧾" : n.name.endsWith(".log") ? "📜" : "📄") : "📁");

function Row({ node, depth, open, toggle, selected, select }: { node: Node; depth: number; open: Set<string>; toggle: (p: string) => void; selected: string | null; select: (p: string) => void }) {
  const isDir = !node.file;
  const isOpen = open.has(node.path);
  const kids = [...node.children.values()].sort((a, b) => Number(!!a.file) - Number(!!b.file) || a.name.localeCompare(b.name));
  return (
    <li role="treeitem" aria-expanded={isDir ? isOpen : undefined} aria-selected={selected === node.path}>
      <button onClick={() => (isDir ? toggle(node.path) : select(node.path))} style={{ paddingLeft: 8 + depth * 14 }}
        className={`flex w-full items-center gap-2 rounded-md py-1 pr-2 text-left text-sm ${selected === node.path ? "bg-indigo-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
        {isDir && <span className="w-3 text-[10px] opacity-60">{isOpen ? "▾" : "▸"}</span>}
        <span>{depth === 1 && isDir ? "🧑‍💻" : icon(node)}</span>
        <span className="truncate">{depth === 1 && isDir ? agentMeta(node.name).name : node.name}</span>
      </button>
      {isDir && isOpen && <ul role="group">{kids.map((k) => <Row key={k.path} node={k} depth={depth + 1} open={open} toggle={toggle} selected={selected} select={select} />)}</ul>}
    </li>
  );
}

export default function FilesView() {
  const tree = useMemo(buildTree, []);
  const [open, setOpen] = useState<Set<string>>(() => new Set(["manager", "creator", "manager/reports"]));
  const [selected, setSelected] = useState<string | null>(FILES[0].path);
  const file = FILES.find((f) => f.path === selected);
  const toggle = (p: string) => setOpen((s) => { const n = new Set(s); if (n.has(p)) n.delete(p); else n.add(p); return n; });
  const download = () => {
    if (!file) return;
    const url = URL.createObjectURL(new Blob([file.content], { type: "text/plain" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: file.path.split("/").pop() });
    a.click(); URL.revokeObjectURL(url);
  };
  const crumbs = file ? file.path.split("/") : [];

  return (
    <div className="grid h-full grid-cols-1 gap-4 overflow-auto p-4 lg:grid-cols-[320px_1fr]">
      <aside className={`${card} min-h-0 overflow-auto p-2`}>
        <h2 className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Output agen</h2>
        <ul role="tree" aria-label="File output agen">
          {[...tree.children.values()].map((n) => <Row key={n.path} node={n} depth={1} open={open} toggle={toggle} selected={selected} select={setSelected} />)}
        </ul>
      </aside>
      <section className={`${card} flex min-h-[320px] min-w-0 flex-col p-4`}>
        {file ? (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <nav aria-label="Lokasi file" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                {crumbs.map((c, i) => <span key={i} className="flex items-center gap-1">{i > 0 && "/"}<span className={i === crumbs.length - 1 ? "font-semibold text-slate-800 dark:text-slate-100" : ""}>{i === 0 ? agentMeta(c).name : c}</span></span>)}
              </nav>
              <button onClick={download} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">⬇ Unduh</button>
            </div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] text-slate-500"><AgentDot id={file.agentId} />{agentMeta(file.agentId).name} · {size(file.content)} · diubah {relTime(file.modified)}</p>
            <pre className="min-h-0 flex-1 overflow-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200">{file.content}</pre>
          </>
        ) : <p className="m-auto text-sm text-slate-500">Pilih file untuk melihat isinya.</p>}
      </section>
    </div>
  );
}
