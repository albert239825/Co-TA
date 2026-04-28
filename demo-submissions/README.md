# Demo: Introduction to Python Functions

Use this data to manually test the Co-TA grading flow.

## Assignment details (enter in the UI)

**Name:** Introduction to Python Functions

**Description:** Students are asked to write Python functions demonstrating their understanding of basic function design, parameters, and return values.

---

## Problem 1 — Write a factorial function (10 pts)

Write a Python function `factorial(n)` that returns the factorial of a non-negative integer `n`. Your solution must handle the base case and use recursion.

### Rubric criteria

| Description | Points |
|---|---|
| Correct base case (`n == 0` or `n == 1` returns 1) | 3 |
| Correct recursive call | 4 |
| Student demonstrates clear understanding of why recursion terminates (explanation or comment required) | 3 |

---

## Problem 2 — Check for palindromes (10 pts)

Write a Python function `is_palindrome(s)` that returns `True` if the string `s` is a palindrome (reads the same forwards and backwards), `False` otherwise. It must be case-insensitive.

### Rubric criteria

| Description | Points |
|---|---|
| Lowercases the input before comparing | 3 |
| Correctly reverses/compares the string | 4 |
| Solution is reasonably efficient and avoids obviously redundant operations | 3 |

---

## Students

| File | Student ID | Expected outcome |
|---|---|---|
| chen_alice.txt | alice.chen | Full marks, clean code with comments |
| martinez_bob.txt | bob.martinez | Blank submission — 0 pts |
| kim_carol.txt | carol.kim | Correct code but no comments — AI should flag needsReview on "demonstrates understanding" criterion |
| patel_david.txt | david.patel | Palindrome works but double `.lower()` — AI should flag needsReview on efficiency criterion |
| johnson_emma.txt | emma.johnson | Unusual but correct approach (`reduce` + `lambda`) |

## Notes on needsReview

carol.kim and david.patel are intentionally designed to trigger the `needsReview` flag:
- Carol's factorial has no comments or explanation — the AI cannot infer whether she understands termination
- David's palindrome calls `.lower()` twice redundantly — the AI must judge whether this counts as "obviously redundant"

To see needsReview in the UI, `USE_REAL_GRADING=true` must be set and the grading prompt must instruct the LLM to emit the flag when uncertain.
