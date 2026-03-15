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
  const rafRef = useRef<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastTooltipRef = useRef<{ idx: number; x: number; y: number; signature: string } | null>(
    null
  );
  const [width, setWidth] = useState(0);
  const [theme, setTheme] = useState<DuckChartTheme>(() => readChartTheme());
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    title: string;
    items: Array<{ label: string; value: string; color?: string }>;
  } | null>(null);

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
      setTheme(readChartTheme());
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
    const plot = new uPlot(options, data, mount);

    const over = plot.over;
    const clearTooltip = () => {
      lastTooltipRef.current = null;
      setTooltip(null);
    };

    const updateTooltip = () => {
      rafRef.current = null;
      const pointer = pointerRef.current;
      if (!pointer || !getTooltip) {
        return;
      }

      const idx = plot.posToIdx(pointer.x);
      const content = getTooltip({ idx, data });
      if (!content) {
        clearTooltip();
        return;
      }

      const nextX = plot.bbox.left + pointer.x + 16;
      const nextY = plot.bbox.top + pointer.y + 12;
      const signature = `${content.title}|${content.items
        .map((item) => `${item.label}:${item.value}`)
        .join('|')}`;

      const previous = lastTooltipRef.current;
      if (
        previous &&
        previous.idx === idx &&
        previous.signature === signature &&
        Math.abs(previous.x - nextX) < 6 &&
        Math.abs(previous.y - nextY) < 6
      ) {
        return;
      }

      lastTooltipRef.current = { idx, x: nextX, y: nextY, signature };
      setTooltip({
        x: nextX,
        y: nextY,
        title: content.title,
        items: content.items,
      });
    };

    const syncTooltip = (event: MouseEvent) => {
      if (!getTooltip) {
        return;
      }

      const bounds = over.getBoundingClientRect();
      pointerRef.current = {
        x: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
        y: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)),
      };

      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(updateTooltip);
      }
    };

    over.addEventListener('mousemove', syncTooltip, { passive: true });
    over.addEventListener('mouseleave', clearTooltip);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      pointerRef.current = null;
      lastTooltipRef.current = null;
      over.removeEventListener('mousemove', syncTooltip);
      over.removeEventListener('mouseleave', clearTooltip);
      plot.destroy();
    };
  }, [buildOptions, data, getTooltip, hasData, height, theme, width]);

  const tooltipWidth = Math.max(120, Math.min(220, width - 16));
  const estimatedTooltipHeight = tooltip ? 30 + tooltip.items.length * 18 : 0;
  const tooltipLeft = tooltip
    ? Math.max(8, Math.min(tooltip.x, Math.max(8, width - tooltipWidth - 8)))
    : 8;
  const tooltipTop = tooltip
    ? Math.max(8, Math.min(tooltip.y, Math.max(8, height - estimatedTooltipHeight - 8)))
    : 8;

  return (
    <div
      ref={hostRef}
      className={`relative overflow-y-hidden ${className ?? ''}`}
      aria-label={ariaLabel}
    >
      {hasData ? (
        <>
          <div ref={mountRef} />
          {tooltip ? (
            <div
              data-uplot-tooltip="true"
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
