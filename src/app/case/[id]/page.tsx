import { CaseView } from "./view";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseView requestId={id} />;
}

