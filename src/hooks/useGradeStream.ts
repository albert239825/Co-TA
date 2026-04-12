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

// Mock implementation: simulates SSE events with setTimeout
// Swap to real EventSource at integration time by replacing startStream internals
export function useGradeStream(
  options: UseGradeStreamOptions
): UseGradeStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    (streamUrl: string) => {
      stopStream();
      setIsStreaming(true);

      // Try real EventSource first; fall back to mock if connection fails
      if (typeof window !== "undefined" && streamUrl.startsWith("/api/")) {
        try {
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
            // If EventSource fails immediately, fall back to mock
            es.close();
            eventSourceRef.current = null;
            runMockStream();
          };

          return;
        } catch {
          // fall through to mock
        }
      }

      runMockStream();

      function runMockStream() {
        // Mock SSE: simulate grading for pending submissions
        const mockPendingIds = [
          "s0000009-0000-0000-0000-000000000009", // Lina
          "s0000010-0000-0000-0000-000000000010", // Marcus
        ];

        const mockScores = [
          { q1: 6, q2: 8, q3: 9 }, // Lina
          { q1: 4, q2: 7, q3: 6 }, // Marcus
        ];

        let delay = 500;

        mockPendingIds.forEach((subId, idx) => {
          // status_change → grading
          const t1 = setTimeout(() => {
            optionsRef.current.onStatusChange?.({
              type: "status_change",
              submissionId: subId,
              status: "grading",
              timestamp: new Date().toISOString(),
            });
          }, delay);
          timeoutsRef.current.push(t1);
          delay += 1500;

          // score_ready
          const s = mockScores[idx];
          const t2 = setTimeout(() => {
            optionsRef.current.onScoreReady?.({
              type: "score_ready",
              submissionId: subId,
              status: "graded",
              totalScore: s.q1 + s.q2 + s.q3,
              problemScores: [
                {
                  problemId: "p1000001-0000-0000-0000-000000000001",
                  problemName: "Q1: Chain rule derivation",
                  score: s.q1,
                  maxScore: 8,
                },
                {
                  problemId: "p2000002-0000-0000-0000-000000000002",
                  problemName: "Q2: SGD update rule",
                  score: s.q2,
                  maxScore: 10,
                },
                {
                  problemId: "p3000003-0000-0000-0000-000000000003",
                  problemName: "Q3: Regularization effect",
                  score: s.q3,
                  maxScore: 10,
                },
              ],
              timestamp: new Date().toISOString(),
            });
          }, delay);
          timeoutsRef.current.push(t2);
          delay += 1000;
        });

        // batch_complete
        const t3 = setTimeout(() => {
          optionsRef.current.onBatchComplete?.({
            type: "batch_complete",
            submissionId: "",
            timestamp: new Date().toISOString(),
          });
          setIsStreaming(false);
        }, delay);
        timeoutsRef.current.push(t3);
      }
    },
    [stopStream]
  );

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  return { isStreaming, startStream, stopStream };
}
