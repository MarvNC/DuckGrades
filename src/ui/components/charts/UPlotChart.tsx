import { useEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

export type DuckChartTheme = {
  fg: string;
  muted: string;
  border: string;
  surface: string;
  focus: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  level100: string;
  level200: string;
  level300: string;
  level400: string;
  level500: string;
};

function readChartTheme(): DuckChartTheme {
  const style = window.getComputedStyle(document.documentElement);
  const value = (token: string, fallback: string) => {
    const resolved = style.getPropertyValue(token).trim();
    return resolved || fallback;
  };

  return {
    fg: value('--duck-fg', '#182116'),
    muted: value('--duck-muted', '#5f6f5d'),
    border: value('--duck-border', '#d4e2ca'),
    surface: value('--duck-surface', '#ffffff'),
    focus: value('--duck-focus', '#4d8152'),
    chart1: value('--duck-chart-1', '#4f6e3d'),
    chart2: value('--duck-chart-2', '#7dbf8a'),
    chart3: value('--duck-chart-3', '#88a7c6'),
    chart4: value('--duck-chart-4', '#c7b182'),
    chart5: value('--duck-chart-5', '#c98f90'),
    level100: value('--duck-level-100', '#8e6c8a'),
    level200: value('--duck-level-200', '#6d8f6a'),
    level300: value('--duck-level-300', '#5f84a4'),
    level400: value('--duck-level-400', '#b07a5d'),
    level500: value('--duck-level-500', '#8b6fb3'),
  };
}

type UPlotChartProps = {
  data: uPlot.AlignedData;
  height: number;
  className?: string;
  ariaLabel: string;
  buildOptions: (params: { width: number; height: number; theme: DuckChartTheme }) => uPlot.Options;
  getTooltip?: (params: { idx: number; data: uPlot.AlignedData }) => {
    title: string;
    items: Array<{ label: string; value: string; color?: string }>;
  } | null;
};

export function UPlotChart({
  data,
  height,
  className,
  ariaLabel,
  buildOptions,
  getTooltip,
}: UPlotChartProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [, setThemeVersion] = useState(0);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    title: string;
    items: Array<{ label: string; value: string; color?: string }>;
  } | null>(null);

  const theme = readChartTheme();
  const hasData = data.length > 1 && data[0] && data[0].length > 0;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const update = () => {
      setWidth(Math.max(0, Math.floor(host.getBoundingClientRect().width)));
    };

    update();
    const observer = new ResizeObserver(() => {
      update();
    });
    observer.observe(host);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setThemeVersion((value) => value + 1);
    });
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme', 'style'] });
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || width < 40 || !hasData) {
      return;
    }

    const options = buildOptions({ width, height, theme });
    const baseHooks = options.hooks ?? {};
    const hookList = baseHooks.setCursor ?? [];

    options.hooks = {
      ...baseHooks,
      setCursor: [
        ...hookList,
        (plot) => {
          if (!getTooltip) {
            return;
          }

          const idx = plot.cursor.idx;
          if (idx === null || idx === undefined) {
            setTooltip(null);
            return;
          }

          const content = getTooltip({ idx, data });
          if (!content) {
            setTooltip(null);
            return;
          }

          setTooltip({
            x: plot.bbox.left + Math.max(0, plot.cursor.left ?? 0) + 16,
            y: plot.bbox.top + Math.max(0, plot.cursor.top ?? 0) + 12,
            title: content.title,
            items: content.items,
          });
        },
      ],
    };

    const clearTooltip = () => {
      setTooltip(null);
    };
    mount.addEventListener('mouseleave', clearTooltip);

    const plot = new uPlot(options, data, mount);
    return () => {
      mount.removeEventListener('mouseleave', clearTooltip);
      plot.destroy();
    };
  }, [buildOptions, data, getTooltip, hasData, height, theme, width]);

  const tooltipWidth = Math.max(120, Math.min(220, width - 16));
  const tooltipLeft = tooltip
    ? Math.max(8, Math.min(tooltip.x, Math.max(8, width - tooltipWidth - 8)))
    : 8;
  const tooltipTop = tooltip ? Math.max(8, tooltip.y) : 8;

  return (
    <div ref={hostRef} className={`relative ${className ?? ''}`} aria-label={ariaLabel}>
      {hasData ? (
        <>
          <div ref={mountRef} />
          {tooltip ? (
            <div
              className="pointer-events-none absolute z-20 rounded-xl border border-[var(--duck-border-strong)] bg-[var(--duck-surface)]/95 px-3 py-2 text-xs text-[var(--duck-fg)] shadow-md backdrop-blur"
              style={{ left: tooltipLeft, top: tooltipTop, maxWidth: tooltipWidth }}
            >
              <p className="font-semibold tracking-[0.06em] text-[var(--duck-muted)] uppercase">
                {tooltip.title}
              </p>
              <div className="mt-1 space-y-0.5">
                {tooltip.items.map((item) => (
                  <p key={`${item.label}-${item.value}`} className="font-medium">
                    <span
                      className="font-semibold"
                      style={item.color ? { color: item.color } : undefined}
                    >
                      {item.label}
                    </span>{' '}
                    <span className="text-[var(--duck-muted-strong)]">{item.value}</span>
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-[var(--duck-muted)]">No chart data.</p>
      )}
    </div>
  );
}
