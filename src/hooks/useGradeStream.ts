"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { GradeStreamEvent } from "@/contracts/types";

type EventHandler = (event: GradeStreamEvent) => void;

interface UseGradeStreamOptions {
  onStatusChange?: EventHandler;
  onScoreReady?: EventHandler;
  onBatchComplete?: EventHandler;
  onError?: EventHandler;
}

interface UseGradeStreamReturn {
  isStreaming: boolean;
  startStream: (streamUrl: string) => void;
  stopStream: () => void;
}

// Real SSE EventSource hook for grade streaming
export function useGradeStream(
  options: UseGradeStreamOptions
): UseGradeStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    (streamUrl: string) => {
      stopStream();
      setIsStreaming(true);

      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data: GradeStreamEvent = JSON.parse(event.data);
          switch (data.type) {
            case "status_change":
              optionsRef.current.onStatusChange?.(data);
              break;
            case "score_ready":
              optionsRef.current.onScoreReady?.(data);
              break;
            case "batch_complete":
              optionsRef.current.onBatchComplete?.(data);
              stopStream();
              break;
            case "error":
              optionsRef.current.onError?.(data);
              break;
          }
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        setIsStreaming(false);
      };
    },
    [stopStream]
  );

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  return { isStreaming, startStream, stopStream };
}
