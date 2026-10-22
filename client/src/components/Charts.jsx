import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

/** Read chart colours from CSS tokens and re-read them when the theme changes. */
function useChartTheme() {
  const read = () => {
    const css = getComputedStyle(document.documentElement);
    const v = (n) => css.getPropertyValue(n).trim();
    return {
      series: [v('--chart-1'), v('--chart-2'), v('--chart-3'), v('--chart-4')],
      ink: v('--chart-ink'),
      brand: v('--brand'),
      grid: v('--chart-grid'),
      axis: v('--chart-axis'),
      text: v('--ink-2'),
      surface: v('--paper-2'),
    };
  };
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const update = () => setTheme(read());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    window.addEventListener('themechange', update);
    mq.addEventListener('change', update);
    return () => {
      window.removeEventListener('themechange', update);
      mq.removeEventListener('change', update);
    };
  }, []);
  return theme;
}

const baseFont = { family: "'Geist Mono', ui-monospace, monospace", size: 11 };

export function BarChart({ labels, values, label, color = 'ink', horizontal = false }) {
  const t = useChartTheme();
  const valueAxis = {
    beginAtZero: true,
    ticks: { precision: 0, color: t.axis, font: baseFont },
    grid: { color: t.grid },
    border: { display: false },
  };
  const catAxis = { ticks: { color: t.text, font: baseFont }, grid: { display: false }, border: { color: t.grid } };
  return (
    <div className="chart-box">
      <Bar
        data={{
          labels,
          datasets: [
            {
              label,
              data: values,
              backgroundColor: t[color] || t.series[0],
              borderRadius: 0,
              borderSkipped: 'start',
              maxBarThickness: 26,
            },
          ],
        }}
        options={{
          indexAxis: horizontal ? 'y' : 'x',
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { intersect: false, mode: 'index' } },
          scales: horizontal ? { x: valueAxis, y: catAxis } : { x: catAxis, y: valueAxis },
        }}
      />
    </div>
  );
}

export function DoughnutChart({ labels, values }) {
  const t = useChartTheme();
  return (
    <div className="chart-box">
      <Doughnut
        data={{
          labels,
          datasets: [{ data: values, backgroundColor: t.series.slice(0, labels.length), borderColor: t.surface, borderWidth: 2 }],
        }}
        options={{
          maintainAspectRatio: false,
          cutout: '64%',
          plugins: {
            legend: { position: 'bottom', labels: {
              color: t.text,
              font: baseFont,
              boxWidth: 10,
              // Counts in the legend so identity and value never rely on colour alone.
              generateLabels: (chart) =>
                ChartJS.overrides.doughnut.plugins.legend.labels.generateLabels(chart).map((l, i) => ({ ...l, text: `${l.text.toUpperCase()} · ${values[i]}` })),
            } },
          },
        }}
      />
    </div>
  );
}
