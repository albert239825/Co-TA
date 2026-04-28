import { onGradeEvent } from "../../../../../lib/events";
import type { GradeStreamEvent } from "../../../../../contracts/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get("assignmentId");

  if (!assignmentId) {
    return Response.json(
      { error: "Missing assignmentId query parameter" },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Enqueue an SSE comment so the response body is non-empty.
      // Without this, Next.js dev mode holds the HTTP response until
      // data appears, which prevents the EventSource from connecting.
      controller.enqueue(encoder.encode(": ok\n\n"));

      cleanup = onGradeEvent(assignmentId, (event: GradeStreamEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      });
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
