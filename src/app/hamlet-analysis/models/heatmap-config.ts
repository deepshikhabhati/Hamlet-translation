export interface HeatmapThreshold {
  min: number;
  max: number;
  level: 'critical' | 'low' | 'moderate' | 'good' | 'high';
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
}

/**
 * Meeting-approved Human Score Heatmap configuration.
 * Single-hue green color intensity communicating preservation levels:
 * Higher preservation -> deeper, darker shade.
 * Lower preservation -> lighter, softer tint with clear text distinction.
 * Initial defaults subject to academic confirmation.
 */
export const HUMAN_SCORE_HEATMAP: HeatmapThreshold[] = [
  {
    min: 0,
    max: 59,
    level: 'critical',
    label: '0–59',
    description: 'Critical / Low preservation',
    color: '#b91c1c',
    bgColor: '#fef2f2',
    textColor: '#991b1b'
  },
  {
    min: 60,
    max: 74,
    level: 'low',
    label: '60–74',
    description: 'Low preservation',
    color: '#d97706',
    bgColor: '#fffbeb',
    textColor: '#92400e'
  },
  {
    min: 75,
    max: 84,
    level: 'moderate',
    label: '75–84',
    description: 'Moderate preservation',
    color: '#15803d',
    bgColor: '#f0fdf4',
    textColor: '#166534'
  },
  {
    min: 85,
    max: 92,
    level: 'good',
    label: '85–92',
    description: 'Good preservation',
    color: '#166534',
    bgColor: '#dcfce7',
    textColor: '#14532d'
  },
  {
    min: 93,
    max: 100,
    level: 'high',
    label: '93–100',
    description: 'High preservation',
    color: '#14532d',
    bgColor: '#bbf7d0',
    textColor: '#052e16'
  }
];

export function getHeatmapThreshold(score: number | null | undefined): HeatmapThreshold | null {
  if (score === null || score === undefined || isNaN(score)) return null;
  const num = Math.round(score * 10) / 10;
  for (const t of HUMAN_SCORE_HEATMAP) {
    if (num >= t.min && num <= t.max) return t;
  }
  // Boundary cases
  if (num < 0) return HUMAN_SCORE_HEATMAP[0];
  if (num > 100) return HUMAN_SCORE_HEATMAP[HUMAN_SCORE_HEATMAP.length - 1];
  return null;
}

export function getScoreCssClass(score: number | null | undefined): string {
  const t = getHeatmapThreshold(score);
  if (!t) return 'score-cell--na';
  return `score-heatmap--${t.level}`;
}

export function formatHumanScore(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) return 'N/A';
  return (Math.round(score * 10) / 10).toString();
}
