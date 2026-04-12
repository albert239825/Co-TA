// ─── SSE event emitter singleton ────────────────────────────────
//
// Used by batch grading to emit progress events and by the SSE
// stream route to forward them to connected clients.
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

/**
 * Emit a grading event for a specific assignment.
 */
export function emitGradeEvent(
  assignmentId: string,
  event: GradeStreamEvent
): void {
  gradeEvents.emit(`grade:${assignmentId}`, event);
}

/**
 * Type-safe subscription to grading events for a specific assignment.
 * Returns a cleanup function to remove the listener.
 */
export function onGradeEvent(
  assignmentId: string,
  handler: (event: GradeStreamEvent) => void
): () => void {
  gradeEvents.on(`grade:${assignmentId}`, handler);
  return () => {
    gradeEvents.removeListener(`grade:${assignmentId}`, handler);
  };
}
