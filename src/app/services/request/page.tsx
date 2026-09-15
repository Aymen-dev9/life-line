import { PublicRequest } from "@/care/public";
import { getPublicServices } from "@/care/server/public-data";
export default async function Page() {
  const services = await getPublicServices();
  return <PublicRequest kind="medical" services={services} />;
}
