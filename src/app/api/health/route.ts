export async function GET() {
  return Response.json({ status: "ok", service: "care-platform-web", timestamp: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}

