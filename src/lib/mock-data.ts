import type {
  AssignmentResponse,
  SubmissionListItem,
  SubmissionDetailResponse,
} from "@/contracts/types";

// ─── IDs ──────────────────────────────────────────────────

const ASSIGNMENT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const PROBLEM_IDS = {
  q1: "p1000001-0000-0000-0000-000000000001",
  q2: "p2000002-0000-0000-0000-000000000002",
  q3: "p3000003-0000-0000-0000-000000000003",
} as const;

const CRITERION_IDS = {
  q1c1: "c1100001-0000-0000-0000-000000000001",
  q1c2: "c1100002-0000-0000-0000-000000000002",
  q1c3: "c1100003-0000-0000-0000-000000000003",
  q2c1: "c2200001-0000-0000-0000-000000000001",
  q2c2: "c2200002-0000-0000-0000-000000000002",
  q2c3: "c2200003-0000-0000-0000-000000000003",
  q3c1: "c3300001-0000-0000-0000-000000000001",
  q3c2: "c3300002-0000-0000-0000-000000000002",
  q3c3: "c3300003-0000-0000-0000-000000000003",
} as const;

const SUBMISSION_IDS = {
  sarah: "s0000001-0000-0000-0000-000000000001",
  james: "s0000002-0000-0000-0000-000000000002",
  maya: "s0000003-0000-0000-0000-000000000003",
  alex: "s0000004-0000-0000-0000-000000000004",
  priya: "s0000005-0000-0000-0000-000000000005",
  tom: "s0000006-0000-0000-0000-000000000006",
  emily: "s0000007-0000-0000-0000-000000000007",
  david: "s0000008-0000-0000-0000-000000000008",
  lina: "s0000009-0000-0000-0000-000000000009",
  marcus: "s0000010-0000-0000-0000-000000000010",
} as const;

const CRITERION_SCORE_IDS = {
  q1c1: "cs110001-0000-0000-0000-000000000001",
  q1c2: "cs110002-0000-0000-0000-000000000002",
  q1c3: "cs110003-0000-0000-0000-000000000003",
  q2c1: "cs220001-0000-0000-0000-000000000001",
  q2c2: "cs220002-0000-0000-0000-000000000002",
  q2c3: "cs220003-0000-0000-0000-000000000003",
  q3c1: "cs330001-0000-0000-0000-000000000001",
  q3c2: "cs330002-0000-0000-0000-000000000002",
  q3c3: "cs330003-0000-0000-0000-000000000003",
} as const;

// ─── Assignment ───────────────────────────────────────────

export const mockAssignment: AssignmentResponse = {
  id: ASSIGNMENT_ID,
  name: "HW4: Backpropagation and SGD",
  description:
    "This assignment covers the mathematical foundations of backpropagation, stochastic gradient descent, and regularization techniques in neural network training.",
  maxScore: 28,
  selectedModelId: null,
  problems: [
    {
      id: PROBLEM_IDS.q1,
      name: "Q1: Chain rule derivation",
      description:
        "Derive the gradient of cross-entropy loss with softmax activation using the chain rule.",
      sortOrder: 1,
      maxScore: 8,
      criteria: [
        {
          id: CRITERION_IDS.q1c1,
          description: "Correctly identifies softmax cross-entropy loss form",
          points: 3,
          sortOrder: 1,
        },
        {
          id: CRITERION_IDS.q1c2,
          description: "Applies chain rule correctly through log and softmax",
          points: 3,
          sortOrder: 2,
        },
        {
          id: CRITERION_IDS.q1c3,
          description: "Shows final gradient for both i=y and i!=y cases",
          points: 2,
          sortOrder: 3,
        },
      ],
    },
    {
      id: PROBLEM_IDS.q2,
      name: "Q2: SGD update rule",
      description:
        "Write the SGD update rule with momentum and explain convergence conditions.",
      sortOrder: 2,
      maxScore: 10,
      criteria: [
        {
          id: CRITERION_IDS.q2c1,
          description: "Writes correct vanilla SGD update",
          points: 3,
          sortOrder: 1,
        },
        {
          id: CRITERION_IDS.q2c2,
          description: "Derives momentum variant with velocity term",
          points: 4,
          sortOrder: 2,
        },
        {
          id: CRITERION_IDS.q2c3,
          description:
            "Explains convergence conditions and learning rate decay",
          points: 3,
          sortOrder: 3,
        },
      ],
    },
    {
      id: PROBLEM_IDS.q3,
      name: "Q3: Regularization effect",
      description:
        "Analyze L2 regularization and its effect on generalization.",
      sortOrder: 3,
      maxScore: 10,
      criteria: [
        {
          id: CRITERION_IDS.q3c1,
          description: "Defines L2 regularization term and modified loss",
          points: 2,
          sortOrder: 1,
        },
        {
          id: CRITERION_IDS.q3c2,
          description:
            "Shows gradient of regularized loss is grad L + lambda*w",
          points: 3,
          sortOrder: 2,
        },
        {
          id: CRITERION_IDS.q3c3,
          description:
            "Explains weight decay equivalence and effect on generalization",
          points: 5,
          sortOrder: 3,
        },
      ],
    },
  ],
  createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
};

export const mockAssignments: AssignmentResponse[] = [mockAssignment];

// ─── Submissions list ─────────────────────────────────────

function scores(
  q1: number,
  q2: number,
  q3: number
): {
  totalScore: number;
  problemScores: SubmissionListItem["problemScores"];
  needsReviewCount: number;
} {
  return {
    totalScore: q1 + q2 + q3,
    needsReviewCount: 0,
    problemScores: [
      {
        problemId: PROBLEM_IDS.q1,
        problemName: "Q1: Chain rule derivation",
        score: q1,
        maxScore: 8,
      },
      {
        problemId: PROBLEM_IDS.q2,
        problemName: "Q2: SGD update rule",
        score: q2,
        maxScore: 10,
      },
      {
        problemId: PROBLEM_IDS.q3,
        problemName: "Q3: Regularization effect",
        score: q3,
        maxScore: 10,
      },
    ],
  };
}

export const mockSubmissions: SubmissionListItem[] = [
  {
    id: SUBMISSION_IDS.sarah,
    studentIdentifier: "Sarah Chen",
    fileName: "hw4_chen_sarah.pdf",
    status: "reviewed",
    maxScore: 28,
    ...scores(8, 9, 10),
  },
  {
    id: SUBMISSION_IDS.james,
    studentIdentifier: "James Park",
    fileName: "hw4_park_james.pdf",
    status: "reviewed",
    maxScore: 28,
    ...scores(5, 10, 7),
  },
  {
    id: SUBMISSION_IDS.maya,
    studentIdentifier: "Maya Rodriguez",
    fileName: "hw4_rodriguez_maya.pdf",
    status: "reviewed",
    maxScore: 28,
    ...scores(8, 8, 10),
  },
  {
    id: SUBMISSION_IDS.alex,
    studentIdentifier: "Alex Thompson",
    fileName: "hw4_thompson_alex.pdf",
    status: "graded",
    maxScore: 28,
    ...scores(8, 6, 8),
  },
  {
    id: SUBMISSION_IDS.priya,
    studentIdentifier: "Priya Patel",
    fileName: "hw4_patel_priya.pdf",
    status: "graded",
    maxScore: 28,
    ...scores(3, 7, 5),
  },
  {
    id: SUBMISSION_IDS.tom,
    studentIdentifier: "Tom Nguyen",
    fileName: "hw4_nguyen_tom.pdf",
    status: "graded",
    maxScore: 28,
    ...scores(5, 10, 8),
  },
  {
    id: SUBMISSION_IDS.emily,
    studentIdentifier: "Emily Watson",
    fileName: "hw4_watson_emily.pdf",
    status: "graded",
    maxScore: 28,
    ...scores(8, 4, 10),
  },
  {
    id: SUBMISSION_IDS.david,
    studentIdentifier: "David Kim",
    fileName: "hw4_kim_david.pdf",
    status: "grading",
    totalScore: null,
    maxScore: 28,
    needsReviewCount: 0,
    problemScores: [
      {
        problemId: PROBLEM_IDS.q1,
        problemName: "Q1: Chain rule derivation",
        score: 0,
        maxScore: 8,
      },
      {
        problemId: PROBLEM_IDS.q2,
        problemName: "Q2: SGD update rule",
        score: 4,
        maxScore: 10,
      },
      {
        problemId: PROBLEM_IDS.q3,
        problemName: "Q3: Regularization effect",
        score: 0,
        maxScore: 10,
      },
    ],
  },
  {
    id: SUBMISSION_IDS.lina,
    studentIdentifier: "Lina Zhao",
    fileName: "hw4_zhao_lina.pdf",
    status: "pending",
    totalScore: null,
    maxScore: 28,
    needsReviewCount: 0,
    problemScores: [],
  },
  {
    id: SUBMISSION_IDS.marcus,
    studentIdentifier: "Marcus Brown",
    fileName: "hw4_brown_marcus.pdf",
    status: "pending",
    totalScore: null,
    maxScore: 28,
    needsReviewCount: 0,
    problemScores: [],
  },
];

// ─── Submission detail (Priya Patel) ──────────────────────

export const mockSubmissionDetail: SubmissionDetailResponse = {
  id: SUBMISSION_IDS.priya,
  studentIdentifier: "Priya Patel",
  fileName: "hw4_patel_priya.pdf",
  fileContent:
    "Q1: Chain rule derivation\n\nGiven L = -log(softmax(z)_y), we need\nto find dL/dz_i.\n\nUsing quotient rule on softmax:\n  softmax(z)_i = exp(z_i) / sum_j exp(z_j)\n\nFor i = y:\n  dL/dz_y = softmax(z)_y - 1\n\nFor i != y:\n  dL/dz_i = softmax(z)_i\n\n[Note: student applied quotient rule\n instead of the log-sum-exp trick.\n Result is correct but derivation\n path is non-standard.]\n\nQ2: SGD update rule\n\nw_{t+1} = w_t - eta * grad_L(w_t)\n\nWith momentum beta:\n  v_{t+1} = beta * v_t + grad_L(w_t)\n  w_{t+1} = w_t - eta * v_{t+1}\n\nLearning rate schedule:\n  eta_t = eta_0 / (1 + alpha * t)\n\nQ3: Regularization effect\n\nL_reg = L + (lambda/2)||w||^2\n\nGradient: grad L_reg = grad L + lambda * w\n\nThis penalizes large weights, encouraging\nthe model to find simpler solutions.",
  status: "graded",
  totalScore: 15,
  maxScore: 28,
  gradingResult: {
    id: "gr000001-0000-0000-0000-000000000001",
    modelUsed: "gpt-4o",
    gradedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    problems: [
      {
        problemId: PROBLEM_IDS.q1,
        problemName: "Q1: Chain rule derivation",
        problemDescription:
          "Derive the gradient of cross-entropy loss with softmax activation using the chain rule.",
        score: 3,
        maxScore: 8,
        criteria: [
          {
            criterionScoreId: CRITERION_SCORE_IDS.q1c1,
            criterionId: CRITERION_IDS.q1c1,
            description:
              "Correctly identifies softmax cross-entropy loss form",
            points: 3,
            earned: true,
            aiFeedback:
              "Student correctly wrote L = -log(softmax(z)_y) and identified the components.",
            overrideScore: null,
            taComment: null,
            needsReview: false,
            effectiveScore: 3,
          },
          {
            criterionScoreId: CRITERION_SCORE_IDS.q1c2,
            criterionId: CRITERION_IDS.q1c2,
            description:
              "Applies chain rule correctly through log and softmax",
            points: 3,
            earned: false,
            aiFeedback:
              "Used quotient rule on softmax directly rather than decomposing via chain rule through log(sum(exp)). Final answer is correct but derivation skips the required chain rule step.",
            overrideScore: null,
            taComment: null,
            needsReview: false,
            effectiveScore: 0,
          },
          {
            criterionScoreId: CRITERION_SCORE_IDS.q1c3,
            criterionId: CRITERION_IDS.q1c3,
            description:
              "Shows final gradient for both i=y and i!=y cases",
            points: 2,
            earned: false,
            aiFeedback:
              "Both cases shown and correct, but derivation path is incomplete since chain rule was skipped.",
            overrideScore: 2,
            taComment: "Final answers are correct, awarding full credit.",
            needsReview: false,
            effectiveScore: 2,
          },
        ],
      },
      {
        problemId: PROBLEM_IDS.q2,
        problemName: "Q2: SGD update rule",
        problemDescription:
          "Write the SGD update rule with momentum and explain convergence conditions.",
        score: 7,
        maxScore: 10,
        criteria: [
          {
            criterionScoreId: CRITERION_SCORE_IDS.q2c1,
            criterionId: CRITERION_IDS.q2c1,
            description: "Writes correct vanilla SGD update",
            points: 3,
            earned: true,
            aiFeedback: "Correct: w_{t+1} = w_t - eta * grad L(w_t).",
            overrideScore: null,
            taComment: null,
            needsReview: false,
            effectiveScore: 3,
          },
          {
            criterionScoreId: CRITERION_SCORE_IDS.q2c2,
            criterionId: CRITERION_IDS.q2c2,
            description: "Derives momentum variant with velocity term",
            points: 4,
            earned: true,
            aiFeedback:
              "Both velocity accumulation and weight update steps correct with beta parameter.",
            overrideScore: null,
            taComment: null,
            needsReview: false,
            effectiveScore: 4,
          },
          {
            criterionScoreId: CRITERION_SCORE_IDS.q2c3,
            criterionId: CRITERION_IDS.q2c3,
            description:
              "Explains convergence conditions and learning rate decay",
            points: 3,
            earned: false,
            aiFeedback:
              "Provided the decay formula but did not explain why decay is needed for convergence or connect to Robbins-Monro conditions.",
            overrideScore: null,
            taComment: null,
            needsReview: false,
            effectiveScore: 0,
          },
        ],
      },
      {
        problemId: PROBLEM_IDS.q3,
        problemName: "Q3: Regularization effect",
        problemDescription:
          "Analyze L2 regularization and its effect on generalization.",
        score: 5,
        maxScore: 10,
        criteria: [
          {
            criterionScoreId: CRITERION_SCORE_IDS.q3c1,
            criterionId: CRITERION_IDS.q3c1,
            description: "Defines L2 regularization term and modified loss",
            points: 2,
            earned: true,
            aiFeedback: "Correctly wrote L_reg = L + (lambda/2)||w||^2.",
            overrideScore: null,
            taComment: null,
            needsReview: false,
            effectiveScore: 2,
          },
          {
            criterionScoreId: CRITERION_SCORE_IDS.q3c2,
            criterionId: CRITERION_IDS.q3c2,
            description:
              "Shows gradient of regularized loss is grad L + lambda*w",
            points: 3,
            earned: true,
            aiFeedback: "Derivation is clean and correct.",
            overrideScore: null,
            taComment: null,
            needsReview: false,
            effectiveScore: 3,
          },
          {
            criterionScoreId: CRITERION_SCORE_IDS.q3c3,
            criterionId: CRITERION_IDS.q3c3,
            description:
              "Explains weight decay equivalence and effect on generalization",
            points: 5,
            earned: false,
            aiFeedback:
              "Mentions large weights are penalized but does not connect to weight decay update rule w=(1-eta*lambda)*w - eta*grad L nor explain bias-variance tradeoff.",
            overrideScore: null,
            taComment: null,
            needsReview: false,
            effectiveScore: 0,
          },
        ],
      },
    ],
  },
};
