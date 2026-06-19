// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";
import styles from "./SourceControl.module.css";

export default function SourceControl({ value, onChange, onSubmit, isPlaying }) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>Source</h2>
      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="hls-url">
            HLS stream URL
          </label>
          <input
            id="hls-url"
            type="url"
            className={styles.input}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.cloudfront.net/stream.m3u8"
          />
        </div>
        <button type="submit" className={styles.action}>
          {isPlaying ? "Change source" : "Play"}
        </button>
      </form>
      <p className={styles.help}>
        The demo stream loads automatically. Enter your own HLS URL to play a
        different source.
      </p>
      <div className={styles.note}>
        CloudFront must finish deploying before streaming works. Verify with:
        <code className={styles.code}>
          aws cloudfront get-distribution --id &lt;DISTRIBUTION_ID&gt; --query
          'Distribution.Status' --output text
        </code>
        Status should read <strong>Deployed</strong>, not <strong>InProgress</strong>.
      </div>
    </section>
  );
}
