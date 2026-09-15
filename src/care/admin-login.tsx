"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, HeartPulse, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { useContent } from "./content-provider";
import { api, errorKey } from "./client";
import styles from "../app/login/login.module.css";

// Admin-only sign-in. Clients never see this — they book publicly from the home page.
export function AdminLogin() {
  const { c } = useContent();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await api<{ redirect?: string }>("/api/care/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin", username: username.trim(), password }),
      });
      if (response.redirect) window.location.assign(response.redirect);
    } catch (error) { setMessage(c(errorKey(error))); }
    finally { setBusy(false); }
  }

  return <main className={`${styles.page} care-login`} dir="rtl" lang="ar">
    <header className={styles.header}><Link href="/" className={styles.brand}><span className={styles.mark}><HeartPulse aria-hidden="true" /></span><strong>{c("brand.name")}</strong></Link><span className={styles.headerNote}>{c("adminLogin.badge")}</span></header>
    <div className={styles.layout}>
      <section className={styles.formPanel} aria-labelledby="admin-login-title">
        <span className={styles.eyebrow}>{c("adminLogin.badge")}</span><h1 id="admin-login-title">{c("adminLogin.title")}</h1><p className={styles.description}>{c("adminLogin.description")}</p>
        <form onSubmit={submit} className={styles.form}>
          <label htmlFor="admin-username">{c("adminLogin.username")}</label>
          <input id="admin-username" type="text" autoComplete="username" dir="ltr" required disabled={busy} maxLength={254} value={username} placeholder={c("adminLogin.usernamePlaceholder")} onChange={event => setUsername(event.target.value)} />
          <label htmlFor="admin-password">{c("adminLogin.password")}</label>
          <input id="admin-password" type="password" autoComplete="current-password" dir="ltr" required disabled={busy} maxLength={200} value={password} onChange={event => setPassword(event.target.value)} />
          <label className={styles.remember}><input type="checkbox" checked={remember} disabled={busy} onChange={event => setRemember(event.target.checked)} />{c("adminLogin.remember")}</label>
          <button className={styles.submit} disabled={busy} type="submit">{c(busy ? "common.loading" : "adminLogin.submit")} <ArrowLeft size={20} aria-hidden="true" /></button>
          <p role="status" className={message ? styles.notice : styles.empty}>{message}</p>
        </form>
        <div className={styles.privacy}><ShieldCheck size={22} aria-hidden="true" /><p>{c("adminLogin.security")}<br /><Link className="care-text-button" href="/">{c("adminLogin.back")}</Link></p></div>
      </section>
      <aside className={styles.aside}><span className={styles.asideLabel}>{c("adminLogin.badge")}</span><h2>{c("adminLogin.asideTitle")}</h2><p>{c("adminLogin.asideDescription")}</p><div className={styles.service}><UserRound aria-hidden="true" /><div><h3>{c("adminLogin.asideOwnershipTitle")}</h3><p>{c("adminLogin.asideOwnershipDescription")}</p></div></div><div className={styles.service}><KeyRound aria-hidden="true" /><div><h3>{c("adminLogin.asideSecureTitle")}</h3><p>{c("adminLogin.asideSecureDescription")}</p></div></div></aside>
    </div><footer className={styles.footer}>{c("brand.name")} · {c("brand.footer")}<br />© {new Date().getFullYear()} {c("brand.rights")}</footer>
  </main>;
}
