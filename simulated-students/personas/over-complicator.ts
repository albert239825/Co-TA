import type { Persona } from "../types";

// Probes: the principle of simplicity. Correct and O(n), but wraps a
// two-line solution in a stateful custom class. Only a rubric that
// rewards simplicity should dock points.
export const overComplicator: Persona = {
  id: "over-complicator",
  name: "Over-Complicator",
  summary:
    "Correct and O(n), but buries it in an unnecessary stateful class. Tests whether the rubric enforces simplicity.",
  source: "manual",
  category: "competence",
  groundTruth: {
    correctness: "good",
    execution: "good",
    efficiency: "good",
    completeness: "good",
    simplicity: "bad", // needless class/abstraction
    readability: "partial", // verbose, harder to scan
    explanation: "good",
  },
  submissionText: `class CharacterFrequencyAnalyzer:
    """Encapsulates frequency analysis for a single input string."""

    def __init__(self, text):
        self._text = text
        self._frequency_table = {}
        self._build_frequency_table()

    def _build_frequency_table(self):
        for character in self._text:
            self._frequency_table[character] = (
                self._frequency_table.get(character, 0) + 1
            )

    def find_first_unique_index(self):
        for index, character in enumerate(self._text):
            if self._frequency_table[character] == 1:
                return index
        return -1


def first_uniq_char(s):
    analyzer = CharacterFrequencyAnalyzer(s)
    return analyzer.find_first_unique_index()
`,
};
