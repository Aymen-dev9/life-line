import { notFound } from "next/navigation";
import { CarePage } from "@/care/page-server";
export default async function Page({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section = [] } = await params;
  if (section.length > 1 || (section[0] && !["providers", "services", "content", "accounting"].includes(section[0]))) notFound();
  return <CarePage section={section[0] || "admin"} admin />;
}
