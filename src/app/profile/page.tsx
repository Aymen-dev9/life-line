import { redirect } from "next/navigation";
// Clients have no account/profile in the public model.
export default function Page() { redirect("/"); }
