// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useState } from "react";
import StatsPanel from "./StatsPanel";
import styles from "./DiagnosticsPanel.module.css";

export default function DiagnosticsPanel({
  username,
  status,
  isPlaying,
  playerError,
  debugInfo,
  stats,
  token,
}) {
  const [copied, setCopied] = useState(false);

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(token || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const code = debugInfo.responseCode;
  const codeOk = typeof code === "number" && code >= 200 && code < 400;
  const codeFailed = code === "failed" || (typeof code === "number" && code >= 400);
  const headers = Object.entries(debugInfo.responseHeaders || {});

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h2 className={styles.title}>Diagnostics</h2>
        {username && <span className={styles.user}>{username}</span>}
      </header>

      <div className={styles.badges}>
        <span
          className={`${styles.badge} ${
            isPlaying ? styles.badgeOk : styles.badgeAccent
          }`}
        >
          {status}
        </span>
        <span
          className={`${styles.badge} ${
            codeFailed ? styles.badgeErr : codeOk ? styles.badgeNeutral : styles.badgeNeutral
          }`}
        >
          {code ?? "—"}
        </span>
        <span className={styles.timing}>
          {debugInfo.loadTime ? `${debugInfo.loadTime}ms` : "N/A"}
        </span>
      </div>

      <StatsPanel stats={stats} />

      {playerError && (
        <p className={styles.error}>
          <span className={styles.rowLabel}>Player error</span>
          {playerError}
        </p>
      )}

      <div className={styles.row}>
        <span className={styles.rowLabel}>CloudFront</span>
        <span className={styles.mono}>{debugInfo.cloudFrontUrl || "N/A"}</span>
      </div>

      {debugInfo.error && (
        <p className={styles.error}>
          <span className={styles.rowLabel}>Error</span>
          {debugInfo.error}
        </p>
      )}

      <details className={styles.details}>
        <summary className={styles.summary}>
          Response headers{headers.length ? ` (${headers.length})` : ""}
        </summary>
        <div className={styles.well}>
          {headers.length > 0 ? (
            headers.map(([key, value]) => (
              <div key={key} className={styles.headerLine}>
                <span className={styles.headerKey}>{key}</span>
                {value}
              </div>
            ))
          ) : (
            <span className={styles.muted}>No headers</span>
          )}
        </div>
      </details>

      <div className={styles.tokenBlock}>
        <div className={styles.tokenHead}>
          <span className={styles.rowLabel}>JWT access token</span>
          <button type="button" className={styles.copy} onClick={copyToken}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className={`${styles.well} ${styles.tokenWell}`}>
          {token || "No token"}
        </div>
      </div>
    </section>
  );
}
