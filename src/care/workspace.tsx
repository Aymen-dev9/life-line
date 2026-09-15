"use client";

import Link from "next/link";
import { useState } from "react";
import { HeartPulse, Home, Stethoscope, Pill, ClipboardList, UserRound, LayoutDashboard, UsersRound, Settings2, Type, Wallet, LogOut, ArrowLeft, CheckCircle2, Clock3, Menu, X, Contact, ShieldCheck, Database } from "lucide-react";
import type { ContentKey } from "./content";
import type { WorkspaceData, RequestRecord } from "./types";
import { useContent } from "./content-provider";
import { api, dateLabel, errorKey } from "./client";
import { RequestForm, ProfileForm } from "./request-form";
import { AdminRequests, CatalogEditor, Accounting } from "./admin-panels";
import { ClientsPanel, AdminUsersPanel, BackupPanel } from "./ops-panels";
import { ContentEditor } from "./text-editor";
import { SiteFooter } from "./footer";

export type Mutate = (body: object) => Promise<boolean>;
const patientLinks = [
  ["home", "/", "nav.home", Home], ["medical", "/services/request", "nav.medical", Stethoscope], ["pharmacy", "/pharmacy/request", "nav.pharmacy", Pill], ["requests", "/requests", "nav.requests", ClipboardList], ["profile", "/profile", "nav.profile", UserRound],
] as const;
const adminLinks = [
  ["admin", "/admin", "nav.admin", LayoutDashboard], ["clients", "/admin/clients", "nav.clients", Contact], ["providers", "/admin/providers", "nav.providers", UsersRound], ["services", "/admin/services", "nav.services", Settings2], ["accounting", "/admin/accounting", "nav.accounting", Wallet], ["admins", "/admin/admins", "nav.admins", ShieldCheck], ["content", "/admin/content", "nav.content", Type], ["backup", "/admin/backup", "nav.backup", Database],
] as const;

export function Workspace({ initial, section }: { initial: WorkspaceData; section: string }) {
  const { c } = useContent();
  const [data, setData] = useState(initial);
  const [message, setMessage] = useState<ContentKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdminPage = adminLinks.some(link => link[0] === section);
  async function mutate(body: object) {
    if (busy) return false;
    setBusy(true); setMessage(null);
    try { setData(await api<WorkspaceData>("/api/care/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })); setMessage("common.saved"); return true; }
    catch (error) { setMessage(errorKey(error)); return false; }
    finally { setBusy(false); }
  }
  async function logout() {
    try { await api("/api/care/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }); window.location.assign("/admin/login"); }
    catch (error) { setMessage(errorKey(error)); }
  }
  return <div className="care-app" dir="rtl" lang="ar">
    {menuOpen && <div className="care-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
    <aside className={`care-sidebar${menuOpen ? " open" : ""}`}>
      <div className="care-sidebar-head"><Link className="care-logo" href={isAdminPage ? "/admin" : "/"} onClick={() => setMenuOpen(false)}><span><HeartPulse /></span><div><strong>{c("brand.name")}</strong><small>{c("brand.tagline")}</small></div></Link><button className="care-drawer-close" onClick={() => setMenuOpen(false)} aria-label={c("common.cancel")}><X size={22} /></button></div>
      <nav aria-label={c(isAdminPage ? "nav.admin" : "nav.home")}>{(isAdminPage ? adminLinks : patientLinks).map(([key, href, label, Icon]) => <Link key={key} href={href} onClick={() => setMenuOpen(false)} className={section === key ? "selected" : ""} aria-current={section === key ? "page" : undefined}><Icon size={21} /><span>{c(label)}</span></Link>)}</nav>
      <div className="care-sidebar-bottom">{data.user.role === "admin" && <Link href={isAdminPage ? "/" : "/admin"} onClick={() => setMenuOpen(false)}><LayoutDashboard size={18} />{c(isAdminPage ? "nav.patient" : "nav.admin")}</Link>}<button onClick={() => void logout()}><LogOut size={18} />{c("nav.logout")}</button></div>
    </aside>
    <div className="care-main-column"><header className="care-top"><div className="care-top-start"><button className="care-menu-toggle" onClick={() => setMenuOpen(true)} aria-label={c("nav.admin")}><Menu size={22} /></button><span>{c(isAdminPage ? "nav.admin" : "brand.tagline")}</span></div><div className="care-user"><span>{data.user.name || c(isAdminPage ? "nav.admin" : "nav.profile")}</span><span className="care-avatar"><UserRound size={19} /></span></div></header>
      {data.user.demo && <div className="care-demo-banner">{c("demo.notice")}</div>}
      <main className="care-main" key={section}>
        {message && <div role="status" className={`care-alert ${message.startsWith("error.") ? "error" : ""}`}>{c(message)}</div>}
        {section === "home" && <><PageHeading eyebrow="home.eyebrow" title="home.title" description="home.description" /><section className="care-choice-grid"><Link href="/services/request" className="care-choice medical"><span className="care-choice-icon"><Stethoscope size={31} /></span><h2>{c("nav.medical")}</h2><p>{c("home.medicalDescription")}</p><span className="care-choice-action">{c("home.request")}<ArrowLeft size={19} /></span></Link><Link href="/pharmacy/request" className="care-choice pharmacy"><span className="care-choice-icon"><Pill size={31} /></span><h2>{c("nav.pharmacy")}</h2><p>{c("home.pharmacyDescription")}</p><span className="care-choice-action">{c("home.request")}<ArrowLeft size={19} /></span></Link></section><div className="care-section-heading"><h2>{c("home.latest")}</h2><Link href="/requests">{c("home.viewAll")}<ArrowLeft size={16} /></Link></div><RequestList requests={data.requests.slice(0, 3)} /></>}
        {(section === "medical" || section === "pharmacy") && <RequestForm kind={section} data={data} />}
        {section === "profile" && <ProfileForm profile={data.user} mutate={mutate} busy={busy} />}
        {section === "requests" && <><PageHeading title="requests.title" description="requests.description" /><RequestList requests={data.requests} /></>}
        {section === "admin" && <AdminRequests data={data} mutate={mutate} busy={busy} />}
        {(section === "providers" || section === "services") && <CatalogEditor kind={section} data={data} mutate={mutate} busy={busy} />}
        {section === "clients" && <ClientsPanel />}
        {section === "admins" && <AdminUsersPanel />}
        {section === "backup" && <BackupPanel />}
        {section === "content" && <ContentEditor />}
        {section === "accounting" && <Accounting data={data} />}
      </main><SiteFooter className="care-footer" />
    </div>
  </div>;
}
export function PageHeading({ eyebrow, title, description }: { eyebrow?: ContentKey; title: ContentKey; description: ContentKey }) {
  const { c } = useContent(); return <header className="care-heading">{eyebrow && <p className="care-eyebrow">{c(eyebrow)}</p>}<h1>{c(title)}</h1><p>{c(description)}</p></header>;
}
export function Status({ value }: { value: RequestRecord["status"] }) {
  const { c } = useContent(); return <span className={`care-status ${value}`}>{value === "completed" ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}{c(`status.${value}`)}</span>;
}
export function RequestList({ requests }: { requests: RequestRecord[] }) {
  const { c } = useContent();
  if (!requests.length) return <div className="care-empty"><ClipboardList size={35} /><h3>{c("home.empty")}</h3><p>{c("home.emptyHint")}</p></div>;
  return <div className="care-request-list">{requests.map(request => <article className="care-card" key={request.id}><div className="care-card-top"><span dir="ltr" className="care-reference">{request.reference}</span><Status value={request.status} /></div><h3>{request.serviceName}{request.medicine ? ` · ${request.medicine}` : ""}</h3><p className="care-muted">{dateLabel(request.createdAt)}</p><details><summary>{c("common.details")}</summary><dl className="care-facts"><div><dt>{c("field.name")}</dt><dd>{request.name}</dd></div><div><dt>{c("field.phone")}</dt><dd dir="ltr">{request.phone}</dd></div><div><dt>{c("field.location")}</dt><dd>{request.formattedAddress || request.address || c("common.notSpecified")}{request.latitude != null && request.longitude != null && <> · <a className="care-text-button" href={`https://www.google.com/maps?q=${request.latitude},${request.longitude}`} target="_blank" rel="noreferrer">{c("field.openMap")}</a></>}</dd></div>{request.locationNotes && <div><dt>{c("field.landmark")}</dt><dd>{request.locationNotes}</dd></div>}<div><dt>{c("field.notes")}</dt><dd>{request.details || c("common.notSpecified")}</dd></div></dl>{request.attachment && <a className="care-text-button" href={`/api/care/attachments/${request.id}`} target="_blank" rel="noreferrer">{c("pharmacy.attachment")}</a>}</details></article>)}</div>;
}
