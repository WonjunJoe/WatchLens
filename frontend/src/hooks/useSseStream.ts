import { useCallback, useRef } from "react";

interface SseEvent {
  event: string;
  data: any;
}

type SseHandler = (evt: SseEvent) => void;

export function useSseStream() {
  const abortRef = useRef<AbortController | null>(null);

  const stream = useCallback(
    async (
      url: string,
      handler: SseHandler,
      options?: { method?: string; body?: FormData | string; headers?: Record<string, string> },
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const res = await fetch(url, {
        method: options?.method ?? "GET",
        body: options?.body,
        headers: options?.headers,
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`SSE request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      try {
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";

          for (const block of blocks) {
            const eventMatch = block.match(/^event: (.+)$/m);
            const dataMatch = block.match(/^data: (.+)$/m);
            if (!eventMatch || !dataMatch) continue;
            try {
              handler({ event: eventMatch[1], data: JSON.parse(dataMatch[1]) });
            } catch {
              // skip malformed JSON
            }
          }
        }
      } finally {
        reader.cancel();
      }
    },
    [],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { stream, abort };
}
