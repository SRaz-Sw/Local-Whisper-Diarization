/**
 * Generates a consistent color map for speakers based on their labels
 */
export function generateSpeakerColorMap(
  segments: Array<{ label: string }>,
): Map<string, string> {
  const colors = [
    "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200",
    "bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    "bg-orange-200 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    "bg-pink-200 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    "bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  ];

  // Get unique speakers in order of appearance
  const uniqueSpeakers: string[] = [];
  const seen = new Set<string>();
  for (const segment of segments) {
    if (segment.label !== "NO_SPEAKER" && !seen.has(segment.label)) {
      uniqueSpeakers.push(segment.label);
      seen.add(segment.label);
    }
  }

  // Map each speaker to a color
  const map = new Map<string, string>();
  uniqueSpeakers.forEach((speaker, index) => {
    map.set(speaker, colors[index % colors.length]);
  });

  return map;
}

/**
 * Gets the color class for a speaker label
 */
export function getSpeakerColor(
  label: string,
  colorMap: Map<string, string>,
): string {
  return (
    colorMap.get(label) ||
    "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  );
}
