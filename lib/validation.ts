import { z } from "zod";
import { NextResponse } from "next/server";
import type { ApiError } from "../contracts/types";

// ─── Zod schemas derived from contracts/types.ts ───────────────

const createCriterionInputSchema = z.object({
  description: z.string().min(1, "Criterion description is required"),
  points: z.number().int().min(0, "Points must be non-negative"),
  sortOrder: z.number().int().min(0),
});

const createProblemInputSchema = z.object({
  name: z.string().min(1, "Problem name is required"),
  description: z.string().min(1, "Problem description is required"),
  sortOrder: z.number().int().min(0),
  criteria: z
    .array(createCriterionInputSchema)
    .min(1, "At least one criterion is required"),
});

export const createAssignmentSchema = z.object({
  name: z.string().min(1, "Assignment name is required"),
  description: z.string().min(1, "Assignment description is required"),
  problems: z
    .array(createProblemInputSchema)
    .min(1, "At least one problem is required"),
});

const submissionFileInputSchema = z.object({
  studentIdentifier: z.string().min(1, "Student identifier is required"),
  fileName: z.string().min(1, "File name is required"),
  fileContent: z.string().min(1, "File content is required"),
});

export const uploadSubmissionsSchema = z.object({
  assignmentId: z.string().uuid("Invalid assignment ID"),
  files: z
    .array(submissionFileInputSchema)
    .min(1, "At least one file is required"),
});

export const batchGradeRequestSchema = z.object({
  assignmentId: z.string().uuid("Invalid assignment ID"),
  submissionIds: z.array(z.string().uuid("Invalid submission ID")),
});

export const updateCriterionScoreSchema = z.object({
  overrideScore: z.number().int().min(0).nullable(),
  taComment: z.string().nullable().optional(),
});

export const exportQuerySchema = z.object({
  assignmentId: z.string().uuid("Invalid assignment ID"),
  format: z.literal("csv"),
});

// ─── Parse helpers ─────────────────────────────────────────────

/**
 * Parse and validate a JSON request body against a Zod schema.
 * Returns { data } on success or { error: NextResponse<ApiError> } on failure.
 */
export async function parseBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<
  { data: T; error?: never } | { data?: never; error: NextResponse<ApiError> }
> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      error: NextResponse.json(
        { error: "Invalid JSON body" } satisfies ApiError,
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return {
      error: NextResponse.json(
        { error: "Validation failed", details } satisfies ApiError,
        { status: 400 }
      ),
    };
  }

  return { data: result.data };
}

/**
 * Parse and validate URL search params against a Zod schema.
 * Returns { data } on success or { error: NextResponse<ApiError> } on failure.
 */
export function parseQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { data: T; error?: never } | { data?: never; error: NextResponse<ApiError> } {
  const raw: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });

  const result = schema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return {
      error: NextResponse.json(
        { error: "Validation failed", details } satisfies ApiError,
        { status: 400 }
      ),
    };
  }

  return { data: result.data };
}
