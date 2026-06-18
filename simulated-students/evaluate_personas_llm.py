import json
import os
import random
import numpy as np
from pydantic import BaseModel, Field
from openai import OpenAI

# 1. Personas Setup
personas = {
    "Persona 1: The Logic Master with Bad Syntax": """def first_unique_master(s):
    counts = {}
    for char in s:
        counts[char] = counts.get(char, 0) + 1
    for i, char in enumerate(s):
        if counts[char] == 1:
            return i
    return -1""",
    "Persona 2: The Clean Coder with Wrong Logic": """def first_unique_clean(s: str) -> int:
    \"\"\"
    Finds the first unique character in a string.
    Returns the index if found, otherwise returns -1.
    \"\"\"
    character_frequency_map = {}
    # Flawed logic: returns first repeating instead of first unique
    for index, current_char in enumerate(s):
        if current_char in character_frequency_map:
            return index
        character_frequency_map[current_char] = 1
    return -1""",
    "Persona 3: The Brute Forcer": """def first_unique_brute(s):
    for i in range(len(s)):
        # .count() makes this an O(n^2) operation
        if s.count(s[i]) == 1:
            return i
    return -1""",
    "Persona 4: The Off-by-One Victim": """def first_unique_off_by_one(s):
    counts = {}
    for char in s:
        counts[char] = counts.get(char, 0) + 1
    # Flaw: skips index 0
    for i in range(1, len(s)):
        if counts[s[i]] == 1:
            return i
    return -1""",
    "Persona 5: The Over-Complicator (Spaghetti Code)": """from collections import Counter
class UniqueCharacterFinder:
    def __init__(self, string_data):
        self.data = string_data
        self.metrics = Counter(self.data)

    def execute_search(self):
        for idx in range(len(self.data)):
            if self.metrics[self.data[idx]] == 1:
                return idx
        return -1

def first_unique_complicated(s):
    finder = UniqueCharacterFinder(s)
    return finder.execute_search()"""
}

# 2. Rubrics
rubric_a = """You are a strict grading assistant. Grade the student's Python code based ONLY on the following criteria out of 100 points:

1. Execution and Functionality (70 points)
- Does the code compile without SyntaxErrors? If no, award 0 points for this section.
- Does the code return the exact correct output for all test cases?
- Do not award partial credit if the code fails to compile.

2. Algorithmic Efficiency (30 points)
- If the code compiles, does it run in O(n) time?
- If the code does not compile, award 0 points for this section because efficiency cannot be tested."""

rubric_b = """You are an expert human Teaching Assistant. Grade the student's Python code using a step-by-step, holistic approach out of 100 points. Follow these criteria exactly:

1. Algorithmic Logic & Intent (50 points)
- Regardless of minor syntax errors, does the student demonstrate the correct underlying algorithm (e.g., a two-pass Hash Map approach for O(n))?
- Award high partial credit if the logic is sound, even if a typo prevents execution.
- Award 0 points if the core algorithmic logic is completely wrong.

2. Execution and Syntax (20 points)
- Does the code compile and run? Deduct points for syntax errors or off-by-one index errors.
- A single missing colon should only cost ~5 points if the rest of the code is sound.

3. Code Quality & Efficiency (30 points)
- Does the code solve the problem simply, or does it over-complicate things (e.g., unnecessary classes/imports)? Deduct points for violating the KISS principle.
- Is the algorithm efficient? Deduct points for using O(n^2) nested loops when an O(n) solution is expected.
- Do not award high points for pretty formatting if the underlying logic is broken."""

class GradeResult(BaseModel):
    score: int = Field(description="The numeric score out of 100")
    rationale: str = Field(description="Brief explanation of the score based on the rubric")

def main():
    client = OpenAI() # expects OPENAI_API_KEY in env

    results = {}
    print("Evaluating personas with LLM...")

    for name, code in personas.items():
        results[name] = {}
        for rubric_name, rubric_text in [("Rubric A (Strict)", rubric_a), ("Rubric B (Holistic)", rubric_b)]:
            try:
                response = client.beta.chat.completions.parse(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": rubric_text},
                        {"role": "user", "content": f"Grade the following code out of 100:\n\n```python\n{code}\n```"}
                    ],
                    response_format=GradeResult,
                )
                eval_data = response.choices[0].message.parsed
                results[name][rubric_name] = {
                    "score": eval_data.score,
                    "rationale": eval_data.rationale
                }
                print(f"[{name}] {rubric_name}: {eval_data.score}/100")
            except Exception as e:
                print(f"Error grading {name} with {rubric_name}: {e}")
                results[name][rubric_name] = {"score": 0, "rationale": str(e)}

    # Save 1: llm_eval_results.json
    with open("llm_eval_results.json", "w") as f:
        json.dump(results, f, indent=4)
    print("Saved llm_eval_results.json")

    # Expand to 100-student dataset (20 per persona with realistic noise)
    dataset = []
    np.random.seed(42)
    student_id = 1

    for name, code in personas.items():
        base_a = results[name]["Rubric A (Strict)"]["score"]
        base_b = results[name]["Rubric B (Holistic)"]["score"]

        for _ in range(20):
            # Apply Gaussian noise, clip between 0 and 100
            score_a = int(np.clip(np.random.normal(base_a, 5.0), 0, 100))
            score_b = int(np.clip(np.random.normal(base_b, 5.0), 0, 100))

            dataset.append({
                "student_id": f"STU{student_id:03d}",
                "persona": name,
                "code_snippet": code,
                "rubric_A_score": score_a,
                "rubric_B_score": score_b,
                "score_delta": score_b - score_a
            })
            student_id += 1

    # Save 2: real_llm_classroom_dataset.json
    with open("real_llm_classroom_dataset.json", "w") as f:
        json.dump(dataset, f, indent=4)
    print("Saved real_llm_classroom_dataset.json")

    # Generate Markdown Report
    report = f"""# LLM Grading Evaluation Report

Below are the base grades assigned by `gpt-4o-mini` to each of the 5 student personas under both Rubric A (Strict Autograder) and Rubric B (Holistic TA).

| Persona | Rubric A (Strict) | Rubric B (Holistic) | Delta (B - A) | Rationale (A) | Rationale (B) |
|---------|-------------------|---------------------|---------------|---------------|---------------|
"""
    for name in personas.keys():
        a_score = results[name]["Rubric A (Strict)"]["score"]
        b_score = results[name]["Rubric B (Holistic)"]["score"]
        delta = b_score - a_score
        a_rat = results[name]["Rubric A (Strict)"]["rationale"].replace('\\n', ' ')
        b_rat = results[name]["Rubric B (Holistic)"]["rationale"].replace('\\n', ' ')
        report += f"| {name} | **{a_score}** | **{b_score}** | {delta} | {a_rat} | {b_rat} |\n"

    with open("table1_report.md", "w") as f:
        f.write(report)
    print("Saved table1_report.md")

if __name__ == "__main__":
    main()
