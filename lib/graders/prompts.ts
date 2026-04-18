// Shared prompt builders so the OpenAI and Anthropic graders stay in
// lockstep. Any change to the grading contract (e.g. adding a new field
// to the JSON output) happens here once and propagates to both.

import type { GradeProblemPromptInput } from "../../contracts/types";

export const SYSTEM_PROMPT = `You are a teaching assistant grading a student submission.
Grade the following problem against the provided rubric criteria.

For each criterion, return:
- "earned": true if the student clearly earned the points, false otherwise.
- "needsReview": true if you are NOT confident in your decision and the criterion should be flagged for human review (ambiguous evidence, partial answer, unclear reasoning, off-topic but adjacent, etc). Otherwise false.
- "feedback": specific, concrete feedback about the student's work on this criterion.

Prefer "needsReview": true over guessing. When "needsReview" is true, the system will treat the criterion as not-earned by default and surface it to the TA for manual review; the TA can then override.

Return JSON matching this exact schema:
{
  "scores": [
    {
      "criterionId": "<the criterion ID>",
      "earned": true/false,
      "needsReview": true/false,
      "feedback": "<specific feedback about the student's work>"
    }
  ]
}`;

export function buildUserPrompt(input: GradeProblemPromptInput): string {
  return `## Assignment
${input.assignmentDescription}

## Problem: ${input.problemName}
${input.problemDescription}

## Rubric Criteria
${input.criteria
  .map((c) => `- [${c.criterionId}] ${c.description} (${c.points} points)`)
  .join("\n")}

## Student Submission
${input.submissionText}`;
}
