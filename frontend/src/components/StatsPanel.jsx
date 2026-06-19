// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";
import styles from "./StatsPanel.module.css";

const GRID_LINES = [25, 50, 75];

function Sparkline({ points, color, gradientId }) {
  return (
    <div className={styles.chart}>
      <svg
        className={styles.svg}
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {GRID_LINES.map((y) => (
          <line
            key={y}
            x1="0"
            y1={(y / 100) * 60}
            x2="100"
            y2={(y / 100) * 60}
            className={styles.gridLine}
          />
        ))}
        {points && (
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            points={points}
          />
        )}
      </svg>
    </div>
  );
}

export default function StatsPanel({ stats }) {
  const lastBuffer = stats.buffer[stats.buffer.length - 1] ?? 0;

  const bufferPoints = stats.buffer
    .map(
      (val, i) =>
        `${(i / Math.max(stats.buffer.length - 1, 1)) * 100},${
          60 - Math.min((val / 10) * 60, 60)
        }`
    )
    .join(" ");

  const maxBandwidth = Math.max(...stats.bandwidth, 1000);
  const bitratePoints = stats.bandwidth
    .map(
      (val, i) =>
        `${(i / Math.max(stats.bandwidth.length - 1, 1)) * 100},${
          60 - (val / maxBandwidth) * 60
        }`
    )
    .join(" ");

  return (
    <div className={styles.tiles}>
      <div className={styles.tile}>
        <div className={styles.head}>
          <span className={styles.metricLabel}>Buffer</span>
          <span className={styles.value}>{lastBuffer.toFixed(1)}s</span>
        </div>
        <Sparkline points={bufferPoints} color="var(--accent)" />
      </div>
      <div className={styles.tile}>
        <div className={styles.head}>
          <span className={styles.metricLabel}>Bitrate</span>
          <span className={styles.value}>
            {stats.currentBitrate ? `${stats.currentBitrate.toFixed(0)}k` : "0k"}
          </span>
        </div>
        <Sparkline points={bitratePoints} color="var(--ink-faint)" />
      </div>
    </div>
  );
}
