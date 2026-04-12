export interface ExtractedName {
  studentName: string;
  patternDetected: string | null; // description of pattern, null if no pattern found
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function stripExtension(fileName: string): string {
  const dotIdx = fileName.lastIndexOf(".");
  return dotIdx > 0 ? fileName.substring(0, dotIdx) : fileName;
}

/**
 * Find which value appears in >50% of the array.
 * Returns that value or null if none qualifies.
 */
function findCommonValue(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  for (const [val, count] of counts) {
    if (count / values.length > 0.5) return val;
  }
  return null;
}

export function extractStudentNames(fileNames: string[]): ExtractedName[] {
  if (fileNames.length === 0) return [];

  // Split each filename (without extension) by underscore
  const basenames = fileNames.map(stripExtension);
  const splits = basenames.map((b) => b.split("_"));

  // Pattern 1: prefix_last_first.ext
  // All files have 3+ parts, first part is common across >50%
  if (splits.every((s) => s.length >= 3)) {
    const firstParts = splits.map((s) => s[0]);
    const commonPrefix = findCommonValue(firstParts);
    if (commonPrefix !== null) {
      const patternDetected = `${commonPrefix}_[last]_[first]`;
      return splits.map((parts) => ({
        studentName: `${capitalize(parts[2])} ${capitalize(parts[1])}`,
        patternDetected,
      }));
    }
  }

  // Pattern 2: first_last_prefix.ext
  // All files have 3+ parts, last part (before extension) is common across >50%
  if (splits.every((s) => s.length >= 3)) {
    const lastParts = splits.map((s) => s[s.length - 1]);
    const commonSuffix = findCommonValue(lastParts);
    if (commonSuffix !== null) {
      const patternDetected = `[first]_[last]_${commonSuffix}`;
      return splits.map((parts) => ({
        studentName: `${capitalize(parts[0])} ${capitalize(parts[1])}`,
        patternDetected,
      }));
    }
  }

  // Pattern 3: last_first.ext
  // All files have exactly 2 parts
  if (splits.every((s) => s.length === 2)) {
    const patternDetected = `[last]_[first]`;
    return splits.map((parts) => ({
      studentName: `${capitalize(parts[1])} ${capitalize(parts[0])}`,
      patternDetected,
    }));
  }

  // Fallback: use filename without extension
  return basenames.map((b) => ({
    studentName: b,
    patternDetected: null,
  }));
}
