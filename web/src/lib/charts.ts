import type { ChartConfiguration } from "chart.js";

import { COLORS } from "$lib/constants";
import {
  connectionLabel,
  countryLabel,
  formatBucket,
  formatMs,
} from "$lib/format";
import type { BreakdownRow, RangeKey, SeriesPoint } from "$lib/types";

const TIMING_SERIES = [
  { key: "pageLoad" as const, label: "Page load", color: COLORS[0] },
  { key: "ttfb" as const, label: "TTFB", color: COLORS[1] },
  { key: "startRender" as const, label: "Start render", color: COLORS[2] },
];

export function timingChart(
  series: SeriesPoint[],
  range: RangeKey,
): ChartConfiguration {
  return {
    type: "line",
    data: {
      labels: series.map((point) => formatBucket(point.start, range)),
      datasets: TIMING_SERIES.map(({ key, label, color }) => ({
        label,
        data: series.map((point) => point[key]),
        borderColor: color,
        backgroundColor: color,
        spanGaps: true,
        tension: 0.25,
        pointRadius: 2,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (value) => formatMs(Number(value)) },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (item) =>
              `${item.dataset.label}: ${formatMs(item.parsed.y)}`,
          },
        },
      },
    },
  };
}

export function doughnutChart(
  rows: BreakdownRow[],
  labelFn: (key: string) => string = (key) => key,
): ChartConfiguration {
  return breakdownChart(rows, { type: "doughnut", labelFn });
}

export function barChart(
  rows: BreakdownRow[],
  labelFn: (key: string) => string = (key) => key,
): ChartConfiguration {
  return breakdownChart(rows, { type: "bar", labelFn });
}

export function osChart(rows: BreakdownRow[]): ChartConfiguration {
  return barChart(rows);
}

export function connectionChart(rows: BreakdownRow[]): ChartConfiguration {
  return barChart(rows, connectionLabel);
}

export function countryChart(rows: BreakdownRow[]): ChartConfiguration {
  return barChart(rows, countryLabel);
}

function breakdownChart(
  rows: BreakdownRow[],
  {
    type,
    labelFn,
  }: { type: "bar" | "doughnut"; labelFn: (key: string) => string },
): ChartConfiguration {
  const labels = rows.length
    ? rows.map((row) => labelFn(row.key))
    : ["No data"];
  const values = rows.length ? rows.map((row) => row.sessions) : [0];
  const isBar = type === "bar";

  return {
    type,
    data: {
      labels,
      datasets: [
        {
          label: "Sessions",
          data: values,
          backgroundColor: isBar
            ? COLORS[0]
            : labels.map((_, index) => COLORS[index % COLORS.length]),
          borderRadius: isBar ? 4 : 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: isBar ? "y" : "x",
      plugins: { legend: { display: !isBar, position: "bottom" } },
      scales: isBar
        ? { x: { beginAtZero: true, ticks: { precision: 0 } } }
        : {},
    },
  };
}
