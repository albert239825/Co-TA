import { z } from "zod";

// ─── Assignment template (portable rubric) ─────────────────────
//
// Shape of the JSON produced by "Export Template" on the assignment
// detail page and consumed by "Import template" on the new assignment
// page. It mirrors CreateAssignmentRequest minus selectedModelId and
// without any persisted IDs or computed fields.

export const assignmentTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  problems: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        sortOrder: z.number().int().min(0),
        criteria: z
          .array(
            z.object({
              description: z.string().min(1),
              points: z.number().min(0),
              sortOrder: z.number().int().min(0),
            })
          )
          .min(1),
      })
    )
    .min(1),
});

export type AssignmentTemplate = z.infer<typeof assignmentTemplateSchema>;
