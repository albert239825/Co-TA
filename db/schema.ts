import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Assignments ────────────────────────────────────────────

export const assignments = sqliteTable("assignments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description").notNull(), // the assignment prompt students received
  // nullable: falls back to DEFAULT_MODEL_ID from contracts/models.ts when unset.
  selectedModelId: text("selected_model_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Problems ───────────────────────────────────────────────

export const problems = sqliteTable("problems", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  assignmentId: text("assignment_id")
    .notNull()
    .references(() => assignments.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. "Problem 2a"
  description: text("description").notNull(), // what the problem asks
  sortOrder: integer("sort_order").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Rubric criteria ────────────────────────────────────────

export const rubricCriteria = sqliteTable("rubric_criteria", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  problemId: text("problem_id")
    .notNull()
    .references(() => problems.id, { onDelete: "cascade" }),
  description: text("description").notNull(), // e.g. "Correctly applies chain rule to softmax"
  points: integer("points").notNull(), // awarded if earned (binary)
  sortOrder: integer("sort_order").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Submissions ────────────────────────────────────────────

export const submissions = sqliteTable("submissions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  assignmentId: text("assignment_id")
    .notNull()
    .references(() => assignments.id, { onDelete: "cascade" }),
  studentIdentifier: text("student_identifier").notNull(), // name, pennid, etc.
  fileName: text("file_name").notNull(),
  fileContent: text("file_content").notNull(), // extracted text the AI reads
  status: text("status", {
    enum: ["pending", "grading", "graded", "reviewed"],
  })
    .notNull()
    .default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ─── Grading results ────────────────────────────────────────

export const gradingResults = sqliteTable("grading_results", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  submissionId: text("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  modelUsed: text("model_used").notNull().default("gpt-5-mini"),
  gradedAt: integer("graded_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  uniqueSubmission: uniqueIndex("grading_results_submission_id_unique").on(table.submissionId),
}));

// ─── Criterion scores ───────────────────────────────────────

export const criterionScores = sqliteTable("criterion_scores", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  gradingResultId: text("grading_result_id")
    .notNull()
    .references(() => gradingResults.id, { onDelete: "cascade" }),
  criterionId: text("criterion_id")
    .notNull()
    .references(() => rubricCriteria.id, { onDelete: "cascade" }),
  earned: integer("earned", { mode: "boolean" }).notNull(), // binary: did they earn it?
  aiFeedback: text("ai_feedback").notNull(), // AI's explanation
  overrideScore: integer("override_score"), // nullable — TA override (0 to criterion.points)
  taComment: text("ta_comment"), // nullable — TA's note on override
  // Binary confidence flag: true = grader flagged this criterion for manual
  // review. UI renders a yellow state and clamps earned=false for flagged rows.
  needsReview: integer("needs_review", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  uniqueCriterionPerResult: uniqueIndex("criterion_scores_result_criterion_unique").on(
    table.gradingResultId,
    table.criterionId,
  ),
}));

// ─── Type exports (inferred from schema) ────────────────────

export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;

export type Problem = typeof problems.$inferSelect;
export type NewProblem = typeof problems.$inferInsert;

export type RubricCriterion = typeof rubricCriteria.$inferSelect;
export type NewRubricCriterion = typeof rubricCriteria.$inferInsert;

export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;

export type GradingResult = typeof gradingResults.$inferSelect;
export type NewGradingResult = typeof gradingResults.$inferInsert;

export type CriterionScore = typeof criterionScores.$inferSelect;
export type NewCriterionScore = typeof criterionScores.$inferInsert;
