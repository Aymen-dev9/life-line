"use client";

import Link from "next/link";
import { useState, useEffect, type FormEvent } from "react";
import { ArrowLeft, HeartPulse, Mail, MessageCircle, KeyRound, ShieldCheck, Stethoscope, Pill } from "lucide-react";
import { useContent } from "./content-provider";
import { api, errorKey, normalizePhone } from "./client";
import styles from "../app/login/login.module.css";

export function Login() {
  const { c } = useContent();
  const [channel, setChannel] = useState<"email" | "whatsapp" | "password">("email");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const isPassword = channel === "password";
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown(n => n - 1), 1000); return () => clearTimeout(timer); }, [cooldown]);
  async function send(action: "send" | "verify") {
    setBusy(true); setMessage("");
    try {
      const response = await api<{ redirect?: string }>("/api/care/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, channel, identifier: channel === "whatsapp" ? normalizePhone(identifier) : identifier.trim(), ...(action === "verify" ? { token: normalizePhone(token) } : {}) }) });
      if (response.redirect) window.location.assign(response.redirect);
      else { setSent(true); setCooldown(60); setMessage(c("login.sent")); }
    } catch (error) { setMessage(c(errorKey(error))); }
    finally { setBusy(false); }
  }
  async function passwordLogin() {
    setBusy(true); setMessage("");
    try {
      const response = await api<{ redirect?: string }>("/api/care/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "password", email: identifier.trim(), password }) });
      if (response.redirect) window.location.assign(response.redirect);
    } catch (error) { setMessage(c(errorKey(error))); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (isPassword) void passwordLogin(); else void send(sent ? "verify" : "send"); }
  function pick(value: "email" | "whatsapp" | "password") { setChannel(value); setIdentifier(""); setPassword(""); setToken(""); setSent(false); setMessage(""); }
  return <main className={`${styles.page} care-login`} dir="rtl" lang="ar">
    <header className={styles.header}><Link href="/" className={styles.brand}><span className={styles.mark}><HeartPulse aria-hidden="true" /></span><strong>{c("brand.name")}</strong></Link><span className={styles.headerNote}>{c("brand.tagline")}</span></header>
    <div className={styles.layout}>
      <section className={styles.formPanel} aria-labelledby="login-title">
        <span className={styles.eyebrow}>{c("login.welcome")}</span><h1 id="login-title">{c("login.title")}</h1><p className={styles.description}>{c("login.description")}</p>
        <fieldset className={styles.channels} disabled={busy || sent}><legend>{c("login.choose")}</legend>{(["email", "whatsapp", "password"] as const).map(value => <label key={value} className={channel === value ? styles.selected : ""}><input type="radio" name="channel" checked={channel === value} onChange={() => pick(value)} />{value === "email" ? <Mail size={19} aria-hidden="true" /> : value === "whatsapp" ? <MessageCircle size={19} aria-hidden="true" /> : <KeyRound size={19} aria-hidden="true" />}{c(value === "password" ? "login.passwordChannel" : `login.${value}`)}</label>)}</fieldset>
        <form onSubmit={submit} className={styles.form}>
          <label htmlFor="identifier">{c(isPassword ? "login.email" : `login.${channel}`)}</label><input id="identifier" type={channel === "whatsapp" ? "tel" : "email"} autoComplete={channel === "whatsapp" ? "tel" : "email"} dir="ltr" required disabled={sent || busy} maxLength={254} value={identifier} placeholder={c(channel === "whatsapp" ? "login.phonePlaceholder" : "login.emailPlaceholder")} onChange={event => setIdentifier(event.target.value)} aria-describedby="login-hint" />
          <p id="login-hint" className={styles.hint}>{c(isPassword ? "login.passwordHint" : channel === "email" ? "login.emailHint" : "login.phoneHint")}</p>
          {isPassword && <><label htmlFor="password">{c("login.password")}</label><input id="password" type="password" autoComplete="current-password" dir="ltr" required disabled={busy} maxLength={200} value={password} onChange={event => setPassword(event.target.value)} /></>}
          {sent && !isPassword && <><label htmlFor="otp">{c("login.code")}</label><input id="otp" inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={10} dir="ltr" value={token} onChange={event => setToken(event.target.value)} autoFocus /><p className={styles.hint}>{c("login.codeHint")}</p></>}
          <button className={styles.submit} disabled={busy} type="submit">{c(busy ? "common.loading" : isPassword ? "login.passwordSubmit" : sent ? "login.verify" : "login.send")} <ArrowLeft size={20} aria-hidden="true" /></button>
          {sent && !isPassword && <div className="care-inline"><button type="button" className="care-text-button" disabled={busy} onClick={() => { setSent(false); setToken(""); setMessage(""); }}>{c("login.change")}</button><button type="button" className="care-text-button" disabled={busy || cooldown > 0} onClick={() => void send("send")}>{c("login.resend")}{cooldown > 0 ? ` (${cooldown})` : ""}</button></div>}
          <p role="status" className={message ? styles.notice : styles.empty}>{message}</p>
        </form>
        <div className={styles.privacy}><ShieldCheck size={22} aria-hidden="true" /><p>{c("login.noPassword")}<br /><span>{c("login.privacy")}</span></p></div>
      </section>
      <aside className={styles.aside}><span className={styles.asideLabel}>{c("login.asideLabel")}</span><h2>{c("login.asideTitle")}</h2><p>{c("login.asideDescription")}</p><div className={styles.service}><Stethoscope aria-hidden="true" /><div><h3>{c("login.medicalTitle")}</h3><p>{c("login.medicalDescription")}</p></div></div><div className={styles.service}><Pill aria-hidden="true" /><div><h3>{c("login.pharmacyTitle")}</h3><p>{c("login.pharmacyDescription")}</p></div></div><div className={styles.asideFooter}>{c("login.asideFooter")}</div></aside>
    </div><footer className={styles.footer}>{c("brand.name")} · {c("brand.footer")}</footer>
  </main>;
}
