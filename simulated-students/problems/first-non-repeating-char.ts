import type { SimProblem } from "../types";

// The case-study problem (a classic CS1 exercise). Optimal solution is
// O(n) via a single frequency pass — the efficiency rubrics key off that.
export const firstNonRepeatingChar: SimProblem = {
  id: "first-non-repeating-char",
  assignmentDescription:
    "CS1 string-processing assignment. Students implement a Python function " +
    "that locates the first unique character in a string, demonstrating " +
    "correct logic, optimal linear-time complexity, and clean Python style.",
  problemName: "First Non-Repeating Character",
  problemDescription:
    "Write a Python function `first_uniq_char(s)` that returns the index of " +
    "the first non-repeating character in the string `s`. If every character " +
    "repeats (or the string is empty), return -1. The expected optimal time " +
    "complexity is O(n).",
};
