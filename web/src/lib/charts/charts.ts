import type { ChartConfiguration } from "chart.js";

import { t } from "$lib/I18n";
import { COLORS } from "$lib/Shared/Constants";
import {
  connectionLabel,
  countryLabel,
  formatBucket,
  formatMs,
} from "$lib/Shared/Format";
import type { BreakdownRow, RangeKey, SeriesPoint } from "$lib/Shared/Types";

export function timingChart(
  series: SeriesPoint[],
  range: RangeKey,
): ChartConfiguration {
  const timingSeries = [
    { key: "pageLoad" as const, label: t("charts.pageLoad"), color: COLORS[0] },
    { key: "ttfb" as const, label: t("charts.ttfb"), color: COLORS[1] },
    {
      key: "startRender" as const,
      label: t("charts.startRender"),
      color: COLORS[2],
    },
    { key: "lcp" as const, label: t("charts.lcp"), color: COLORS[3] },
    { key: "inp" as const, label: t("charts.inp"), color: COLORS[4] },
  ];

  return {
    type: "line",
    data: {
      labels: series.map((point) => formatBucket(point.start, range)),
      datasets: timingSeries.map(({ key, label, color }) => ({
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
    : [t("charts.noData")];
  const values = rows.length ? rows.map((row) => row.sessions) : [0];
  const isBar = type === "bar";

  return {
    type,
    data: {
      labels,
      datasets: [
        {
          label: t("charts.sessions"),
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
