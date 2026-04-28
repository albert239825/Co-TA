// ─── SSE event emitter singleton ────────────────────────────────
//
// Used by batch grading to emit progress events and by the SSE
// stream route to forward them to connected clients.
//
// Events are buffered per-assignment so that SSE clients that
// connect after grading has already started can replay missed
// events (fixes the race between fire-and-forget grading and the
// client opening an EventSource).
//
// Pattern: gradeEvents.emit(`grade:${assignmentId}`, event)
//          gradeEvents.on(`grade:${assignmentId}`, handler)
// ─────────────────────────────────────────────────────────────────

import { EventEmitter } from "events";
import type { GradeStreamEvent } from "../contracts/types";

// Increase max listeners since multiple clients may connect
const gradeEvents = new EventEmitter();
gradeEvents.setMaxListeners(100);

export { gradeEvents };

// Per-assignment event buffer for late-connecting SSE clients.
const eventBuffers = new Map<string, GradeStreamEvent[]>();

/**
 * Clear the event buffer for an assignment.
 * Call at the start of a new batch so stale events aren't replayed.
 */
export function clearGradeEventBuffer(assignmentId: string): void {
  eventBuffers.delete(`grade:${assignmentId}`);
}

/**
 * Emit a grading event for a specific assignment.
 * The event is also pushed into the per-assignment buffer.
 */
export function emitGradeEvent(
  assignmentId: string,
  event: GradeStreamEvent
): void {
  const key = `grade:${assignmentId}`;

  let buf = eventBuffers.get(key);
  if (!buf) {
    buf = [];
    eventBuffers.set(key, buf);
  }
  buf.push(event);

  gradeEvents.emit(key, event);
}

/**
 * Type-safe subscription to grading events for a specific assignment.
 *
 * Buffered events are replayed **asynchronously** (via setTimeout) so
 * the HTTP response / ReadableStream transport is established before
 * data is written.  Live events that arrive between subscription and
 * replay are queued and delivered in order after the replay finishes.
 *
 * Returns a cleanup function to remove the listener.
 */
export function onGradeEvent(
  assignmentId: string,
  handler: (event: GradeStreamEvent) => void
): () => void {
  const key = `grade:${assignmentId}`;

  // Snapshot buffered events *before* subscribing so we know exactly
  // which events to replay.
  const snapshot = eventBuffers.get(key);
  const toReplay = snapshot ? [...snapshot] : [];

  // If there are buffered events, hold live events in a queue until
  // the replay is delivered so ordering is preserved.
  let replayDone = toReplay.length === 0;
  const liveQueue: GradeStreamEvent[] = [];

  const wrappedHandler = (event: GradeStreamEvent) => {
    if (replayDone) {
      handler(event);
    } else {
      liveQueue.push(event);
    }
  };

  gradeEvents.on(key, wrappedHandler);

  if (toReplay.length > 0) {
    // Deliver buffered events on the next tick so the stream
    // transport (HTTP response) is ready to flush data.
    setTimeout(() => {
      for (const event of toReplay) {
        handler(event);
      }
      replayDone = true;
      for (const event of liveQueue) {
        handler(event);
      }
    }, 0);
  }

  return () => {
    gradeEvents.removeListener(key, wrappedHandler);
  };
}
