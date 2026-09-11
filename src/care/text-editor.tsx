"use client";

import { useEffect, useState } from "react";
import { Search, RotateCcw, Save, Type } from "lucide-react";
import { defaultContent, type ContentKey, type ContentMap, type ContentState } from "./content";
import { useContent } from "./content-provider";
import { api, errorKey } from "./client";
import { PageHeading } from "./workspace";

export function ContentEditor() {
  const content = useContent(), { c } = content;
  const [draft, setDraft] = useState<ContentMap>(content.values), [revision, setRevision] = useState(content.revision);
  const [baseline, setBaseline] = useState(content.values);
  const [search, setSearch] = useState(""), [group, setGroup] = useState("");
  const [busy, setBusy] = useState(false), [message, setMessage] = useState<ContentKey | null>(null);
  const keys = Object.keys(defaultContent) as ContentKey[];
  const groups = [...new Set(keys.map(key => key.split(".")[0]!))];
  const dirty = keys.some(key => draft[key] !== baseline[key]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", prevent); return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  const visible = keys.filter(key => (!group || key.startsWith(`${group}.`)) && `${key} ${defaultContent[key]} ${draft[key]}`.toLowerCase().includes(search.toLowerCase()));
  async function save() {
    setBusy(true); setMessage(null);
    try { const result = await api<ContentState>("/api/care/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: draft, revision }) }); content.update(result); setDraft(result.values); setBaseline(result.values); setRevision(result.revision); setMessage("common.saved"); }
    catch (error) { setMessage(errorKey(error)); } finally { setBusy(false); }
  }
  return <><PageHeading title="content.title" description="content.description" /><div className="care-content-toolbar"><div className="care-filters"><label className="care-search"><Search size={19} /><input aria-label={c("common.search")} value={search} onChange={event => setSearch(event.target.value)} placeholder={c("content.searchPlaceholder")} /></label><label>{c("content.group")}<select value={group} onChange={event => setGroup(event.target.value)}><option value="">{c("common.all")}</option>{groups.map(value => <option key={value} value={value}>{c(`content.group.${value}` as ContentKey)}</option>)}</select></label></div><div className="care-inline"><button className="care-primary" disabled={busy || !dirty || keys.some(key => !draft[key].trim())} onClick={() => void save()}><Save size={18} />{c(busy ? "common.saving" : "common.save")}</button>{dirty && <span className="care-unsaved">{c("content.unsaved")}</span>}</div>{message && <p role="status" className={`care-alert ${message.startsWith("error.") ? "error" : ""}`}>{c(message)}</p>}</div>
    <div className="care-content-grid">{visible.map(key => <article key={key} className="care-text-card"><div className="care-card-top"><code>{key}</code><button className="care-text-button" onClick={() => setDraft(previous => ({ ...previous, [key]: defaultContent[key] }))}><RotateCcw size={14} />{c("content.restore")}</button></div><label htmlFor={`copy-${key}`}>{c("content.original")}<span>{defaultContent[key]}</span></label><textarea id={`copy-${key}`} value={draft[key]} rows={draft[key].length > 100 ? 4 : 2} maxLength={4000} required onChange={event => setDraft(previous => ({ ...previous, [key]: event.target.value }))} />{key === "whatsapp.template" && <p className="care-help">{c("content.whatsappHint")}</p>}<div className="care-copy-preview"><Type size={14} /><span>{draft[key]}</span></div></article>)}</div>{!visible.length && <div className="care-empty">{c("common.empty")}</div>}
  </>;
}
