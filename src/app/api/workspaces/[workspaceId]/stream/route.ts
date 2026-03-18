import { getWorkspaceSnapshot } from "@/lib/runtime/engine";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;
  let closed = false;
  let snapshotInterval: ReturnType<typeof setInterval> | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  const encoder = new TextEncoder();

  const stop = () => {
    if (closed) {
      return;
    }

    closed = true;
    if (snapshotInterval) {
      clearInterval(snapshotInterval);
      snapshotInterval = null;
    }
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };

  const stream = new ReadableStream({
    start(controller) {
      const safeEnqueue = (payload: string) => {
        if (closed) {
          return;
        }

        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          stop();
        }
      };

      const pushSnapshot = async () => {
        if (closed) {
          return;
        }

        try {
          const snapshot = await getWorkspaceSnapshot(workspaceId);
          safeEnqueue(`data: ${JSON.stringify(snapshot)}\n\n`);
        } catch (cause) {
          const message =
            cause instanceof Error
              ? cause.message
              : "Failed to load workspace snapshot";
          safeEnqueue(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
          stop();
          try {
            controller.close();
          } catch {
            // Stream already closed by client disconnect.
          }
        }
      };

      void pushSnapshot();

      snapshotInterval = setInterval(() => {
        void pushSnapshot();
      }, 1000);

      heartbeatInterval = setInterval(() => {
        safeEnqueue(": heartbeat\n\n");
      }, 15000);

      request.signal.addEventListener("abort", () => {
        stop();
        try {
          controller.close();
        } catch {
          // Stream already closed by runtime.
        }
      });
    },
    cancel() {
      stop();
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
