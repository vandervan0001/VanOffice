import { getWorkspaceSnapshot } from "@/lib/runtime/engine";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const pushSnapshot = async () => {
        const snapshot = await getWorkspaceSnapshot(workspaceId);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`),
        );
      };

      void pushSnapshot();

      const interval = setInterval(() => {
        if (closed) {
          return;
        }

        void pushSnapshot();
      }, 1000);

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 15000);

      return () => {
        clearInterval(interval);
        clearInterval(heartbeat);
      };
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
