import { redirect } from "next/navigation";
// Client request tracking has no login; the public flow ends at the confirmation screen.
export default function Page() { redirect("/"); }
