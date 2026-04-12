import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "../../../../../../db";
import * as schema from "../../../../../../db/schema";
import type {
  MarkReviewedResponse,
  ApiError,
} from "../../../../../../contracts/types";

// PATCH /api/submissions/[id]/review — mark a submission as reviewed
export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const submissionId = params.id;

    const submission = db
      .select()
      .from(schema.submissions)
      .where(eq(schema.submissions.id, submissionId))
      .get();

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" } satisfies ApiError,
        { status: 404 }
      );
    }

    if (submission.status !== "graded") {
      return NextResponse.json(
        {
          error: `Can only review submissions with status 'graded', current status is '${submission.status}'`,
        } satisfies ApiError,
        { status: 400 }
      );
    }

    db.update(schema.submissions)
      .set({ status: "reviewed" })
      .where(eq(schema.submissions.id, submissionId))
      .run();

    const response: MarkReviewedResponse = {
      submissionId,
      status: "reviewed",
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("PATCH /api/submissions/[id]/review error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      } satisfies ApiError,
      { status: 500 }
    );
  }
}
