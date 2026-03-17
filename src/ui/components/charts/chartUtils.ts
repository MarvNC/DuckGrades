import type uPlot from 'uplot';
import type { DuckChartTheme } from './UPlotChart';

export type GPAChartConfig = {
  width: number;
  height: number;
  theme: DuckChartTheme;
  termLabels: string[];
  compactSkipInterval?: number;
};

export function createGPAChartOptions({
  width,
  height,
  theme,
  termLabels,
  compactSkipInterval = 6,
}: GPAChartConfig): uPlot.Options {
  const compact = width < 640;
  return {
    width,
    height,
    padding: compact ? [8, 8, 10, 26] : [12, 14, 20, 42],
    scales: {
      x: { time: false },
      y: { range: [0, 4.3] },
      students: { auto: true },
    },
    cursor: {
      drag: { x: false, y: false },
      focus: { prox: 30 },
      points: {
        size: compact ? 8 : 10,
        stroke: theme.chart1,
        fill: theme.chart1,
        width: 2,
      },
    },
    legend: { show: false },
    axes: [
      {
        stroke: theme.border,
        grid: { stroke: theme.border, width: 1 },
        values: (_self, splits) =>
          splits.map((split) => {
            const idx = Math.round(split);
            if (compact && idx % compactSkipInterval !== 0) {
              return '';
            }
            return termLabels[idx] ?? '';
          }),
        size: compact ? 26 : 46,
        labelSize: compact ? 0 : 10,
        labelGap: compact ? 0 : 8,
        labelFont: '600 11px Sora',
        label: compact ? '' : 'TERM',
        font: compact ? '600 9px Sora' : '600 10px Sora',
      },
      {
        stroke: theme.border,
        grid: { stroke: theme.border, width: 1 },
        size: compact ? 28 : 46,
        label: compact ? '' : 'MEAN GPA',
        labelSize: compact ? 0 : 10,
        labelGap: compact ? 0 : 8,
        font: compact ? '600 9px Sora' : '600 10px Sora',
      },
      {
        side: 1,
        scale: 'students',
        stroke: theme.border,
        grid: { show: false },
        size: compact ? 0 : 54,
        values: (_self: uPlot, splits: number[]) =>
          splits.map((value: number) =>
            compact
              ? ''
              : Number(value).toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })
          ),
        label: compact ? '' : 'STUDENTS',
        labelSize: compact ? 0 : 10,
        labelGap: compact ? 0 : 8,
        font: compact ? '600 9px Sora' : '600 10px Sora',
      },
    ],
    series: [
      {},
      {
        label: 'Mean GPA',
        scale: 'y',
        stroke: theme.chart1,
        width: compact ? 1.6 : 2,
        points: { size: compact ? 3 : 4, stroke: theme.chart1, fill: theme.chart1 },
      },
      {
        label: 'Students',
        scale: 'students',
        stroke: theme.chart3,
        width: compact ? 1.2 : 1.5,
        points: { show: false },
        dash: [6, 4],
      },
    ],
  };
}
