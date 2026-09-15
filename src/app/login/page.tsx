import { redirect } from "next/navigation";
// Legacy client login route — clients no longer authenticate. Send stragglers to admin login.
export default function LoginPage() { redirect("/admin/login"); }
