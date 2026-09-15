"use client";

import { useContent } from "./content-provider";

// Brand footer with a dynamic (non-hardcoded) year. Rendered on public and admin surfaces.
export function SiteFooter({ className }: { className?: string }) {
  const { c } = useContent();
  const year = new Date().getFullYear();
  return <footer className={className}>
    <span>{c("brand.name")} · {c("brand.footer")}</span>
    <span className="care-rights">© {year} {c("brand.rights")}</span>
  </footer>;
}
