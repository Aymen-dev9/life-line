"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Search, UserRound, FileText, Printer, Database, Download, KeyRound } from "lucide-react";
import { useContent } from "./content-provider";
import { api, dateLabel, errorKey, normalizePhone } from "./client";
import type { ContentKey } from "./content";
import type { AdminUser, ClientReport, ClientSearchRow } from "./types";
import { PageHeading } from "./workspace";

async function report<T>(body: object): Promise<T> {
  const res = await api<{ data: T }>("/api/care/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.data;
}

// --- Clients: search by phone/name + full per-client report --------------------------------
export function ClientsPanel() {
  const { c } = useContent();
  const [query, setQuery] = useState(""), [rows, setRows] = useState<ClientSearchRow[]>([]);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState<ContentKey | null>(null), [searched, setSearched] = useState(false);
  const [detail, setDetail] = useState<ClientReport | null>(null);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null); setDetail(null);
    try { setRows(await report<ClientSearchRow[]>({ action: "searchClients", query: query.includes("@") ? query : normalizePhone(query) })); setSearched(true); }
    catch (error) { setMessage(errorKey(error)); } finally { setBusy(false); }
  }
  async function open(id: string) {
    setBusy(true); setMessage(null);
    try { setDetail(await report<ClientReport>({ action: "clientReport", clientId: id })); }
    catch (error) { setMessage(errorKey(error)); } finally { setBusy(false); }
  }

  if (detail?.client) return <><PageHeading title="clients.title" description="clients.description" />
    <div className="care-inline"><button className="care-secondary" onClick={() => setDetail(null)}>{c("common.back")}</button><button className="care-secondary" onClick={() => window.print()}><Printer size={16} />{c("clients.print")}</button></div>
    <section className="care-panel care-report">
      <h2><UserRound size={20} />{detail.client.fullName || c("common.notSpecified")}</h2>
      <dl className="care-facts"><div><dt>{c("field.phone")}</dt><dd dir="ltr">{detail.client.phone}</dd></div>{detail.client.gender && <div><dt>{c("clients.gender")}</dt><dd>{c(`field.${detail.client.gender}` as ContentKey)}</dd></div>}{detail.client.age != null && <div><dt>{c("clients.age")}</dt><dd>{detail.client.age}</dd></div>}<div><dt>{c("clients.requests")}</dt><dd>{detail.requests.length}</dd></div></dl>
    </section>
    <div className="care-admin-requests">{detail.requests.map(r => <article className="care-card" key={r.id}><div className="care-card-top"><span className="care-reference" dir="ltr">{r.reference}</span><span className={`care-status ${r.status}`}>{c(`status.${r.status}`)}</span></div><h3>{r.serviceName}{r.medicine ? ` · ${r.medicine}` : ""}</h3><p className="care-muted">{dateLabel(r.createdAt)}</p><dl className="care-facts"><div><dt>{c("admin.provider")}</dt><dd>{r.providerName || c("common.notSpecified")}</dd></div><div><dt>{c("admin.responsible")}</dt><dd>{r.ownerAdmin || c("common.notSpecified")}</dd></div><div><dt>{c("field.location")}</dt><dd>{r.formattedAddress || c("common.notSpecified")}</dd></div><div><dt>{c("field.notes")}</dt><dd>{r.details || c("common.notSpecified")}</dd></div></dl>{r.attachment && <a className="care-text-button" href={`/api/care/attachments/${r.id}`} target="_blank" rel="noreferrer">{c("pharmacy.attachment")}</a>}</article>)}</div>
  </>;

  return <><PageHeading title="clients.title" description="clients.description" />
    <form onSubmit={search} className="care-filters"><label className="care-search"><Search size={19} /><input aria-label={c("clients.search")} placeholder={c("clients.searchPlaceholder")} value={query} onChange={e => setQuery(e.target.value)} dir="ltr" /></label><button className="care-primary" disabled={busy || !query.trim()}>{c(busy ? "common.loading" : "clients.search")}</button></form>
    {message && <div role="alert" className="care-alert error">{c(message)}</div>}
    <div className="care-catalog-list">{rows.map(row => <article className="care-card" key={row.id}><div className="care-card-top"><h3>{row.fullName || c("common.notSpecified")}</h3><span className="care-status forwarded">{row.requestCount} {c("clients.requests")}</span></div><p className="care-muted" dir="ltr">{row.phone}</p>{row.lastAt && <p className="care-muted">{c("clients.lastRequest")}: {dateLabel(row.lastAt)}</p>}<button className="care-secondary" disabled={busy} onClick={() => void open(row.id)}><FileText size={16} />{c("clients.report")}</button></article>)}{searched && !rows.length && !message && <div className="care-empty">{c("clients.noResults")}</div>}</div>
  </>;
}

// --- Admin users: roster (read) + self password change -------------------------------------
export function AdminUsersPanel() {
  const { c } = useContent();
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState<ContentKey | null>(null);
  const [password, setPassword] = useState(""), [busy, setBusy] = useState(false), [changed, setChanged] = useState(false);
  useEffect(() => { void report<AdminUser[]>({ action: "admins" }).then(setRows).catch(() => setMessage("error.UNAVAILABLE")); }, []);
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (password.length < 8) { setMessage("admins.passwordShort"); return; }
    setBusy(true); setMessage(null); setChanged(false);
    try { await api("/api/care/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "changePassword", password }) }); setChanged(true); setPassword(""); }
    catch (error) { setMessage(errorKey(error)); } finally { setBusy(false); }
  }
  return <><PageHeading title="admins.title" description="admins.description" />
    {message && <div role="alert" className={`care-alert ${message.startsWith("error.") || message === "admins.passwordShort" ? "error" : ""}`}>{c(message)}</div>}
    <div className="care-table-wrap"><table><thead><tr>{(["admins.name", "admins.username", "admins.status", "admins.lastLogin", "admins.activeRequests", "admins.completedRequests"] as const).map(k => <th key={k}>{c(k)}</th>)}</tr></thead><tbody>{rows.map(a => <tr key={a.id}><td>{a.name}</td><td dir="ltr">{a.username || "—"}</td><td><span className={`care-status ${a.active ? "completed" : "pending"}`}>{c(a.active ? "common.active" : "common.inactive")}</span></td><td>{a.lastLoginAt ? dateLabel(a.lastLoginAt) : c("admins.never")}</td><td>{a.activeRequests.toLocaleString("ar-IQ")}</td><td>{a.completedRequests.toLocaleString("ar-IQ")}</td></tr>)}</tbody></table>{!rows.length && <div className="care-empty">{c("common.empty")}</div>}</div>
    <section className="care-panel care-form" style={{ marginTop: 22 }}><h2><KeyRound size={20} />{c("admins.changePassword")}</h2><p className="care-help">{c("admins.selfNote")}</p><form onSubmit={changePassword}><label>{c("admins.newPassword")}<input type="password" autoComplete="new-password" dir="ltr" minLength={8} maxLength={200} value={password} onChange={e => setPassword(e.target.value)} required /></label>{changed && <p className="care-paid">{c("admins.passwordChanged")}</p>}<button className="care-primary" disabled={busy || password.length < 8}>{c(busy ? "common.saving" : "admins.passwordSubmit")}</button></form></section>
  </>;
}

// --- Backup: download a secrets-free system export -----------------------------------------
export function BackupPanel() {
  const { c } = useContent();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState<ContentKey | null>(null), [at, setAt] = useState("");
  async function backup() {
    setBusy(true); setMessage(null);
    try {
      const data = await report<{ exportedAt: string }>({ action: "backup" });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `lifeline-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click();
      URL.revokeObjectURL(url); setAt(data.exportedAt);
    } catch (error) { setMessage(errorKey(error)); } finally { setBusy(false); }
  }
  return <><PageHeading title="backup.title" description="backup.description" />
    {message && <div role="alert" className="care-alert error">{c(message)}</div>}
    <section className="care-panel"><h2><Database size={20} />{c("backup.title")}</h2><p className="care-help">{c("backup.excludes")}</p><button className="care-primary" disabled={busy} onClick={() => void backup()}><Download size={18} />{c(busy ? "common.loading" : "backup.create")}</button>{at && <p className="care-paid" style={{ marginTop: 14 }}>{c("backup.generatedAt")}: {dateLabel(at)}</p>}</section>
  </>;
}
