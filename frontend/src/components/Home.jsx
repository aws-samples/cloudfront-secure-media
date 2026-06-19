// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useState, useMemo } from "react";
import VideoCard from "./VideoCard";
import SourceControl from "./SourceControl";
import DiagnosticsPanel from "./DiagnosticsPanel";
import usePlayerStats from "../hooks/usePlayerStats";
import useSourceProbe from "../hooks/useSourceProbe";
import styles from "./Home.module.css";

const FALLBACK_URL = "https://REPLACE_ME.cloudfront.net/big_buck_bunny.m3u8";

export default function Home({ username, token, cfg }) {
  const defaultVideoURL = cfg?.cloudfront?.demoVideoUrl || FALLBACK_URL;
  const distributionUrl = cfg?.cloudfront?.distributionUrl;

  const [videoURL, setVideoURL] = useState(defaultVideoURL);
  const [activeURL, setActiveURL] = useState(defaultVideoURL);

  const { status, error, isPlaying, stats, onReady } = usePlayerStats();
  const debugInfo = useSourceProbe(activeURL, token, distributionUrl);

  // The token is deliberately NOT part of these options (nor their deps): it is
  // pushed to the player via the imperative effect below and read live by the XHR
  // hook. Keeping it out means a token refresh doesn't rebuild options and so
  // can't trigger a source reload — options change only when the URL changes.
  const videoJsOptions = useMemo(
    () => ({
      autoplay: true,
      // Browsers block autoplay with sound; muted lets the hero stage start
      // immediately. The viewer unmutes via the control bar.
      muted: true,
      controls: true,
      responsive: true,
      // Fill the container; the stage element controls the 16:9 box via CSS so
      // the player has a stable size before stream metadata loads.
      fill: true,
      preload: "auto",
      sources: [{ src: activeURL, type: "application/x-mpegURL" }],
    }),
    [activeURL]
  );

  // Note: the stream token is passed straight to VideoPlayer (seeded at player
  // creation and read live by the XHR hook via a ref), so no imperative
  // player.options({token}) sync is needed here.

  // Commit the typed URL; the activeURL -> options -> VideoPlayer path performs
  // the actual source switch (no imperative player.src() needed here).
  const handleSubmit = (e) => {
    e.preventDefault();
    setActiveURL(videoURL);
  };

  const statusLabel = error ? "Error" : isPlaying ? "Live" : status;

  return (
    <main className={styles.page}>
      <section className={styles.stage} style={{ animationDelay: "40ms" }}>
        <VideoCard options={videoJsOptions} token={token} onReady={onReady} />
        <div className={styles.stageBar}>
          <span
            className={`${styles.statusDot} ${
              error ? styles.dotErr : isPlaying ? styles.dotLive : styles.dotIdle
            }`}
          />
          <span className={styles.statusText}>{statusLabel}</span>
          <span className={styles.stageMeta}>
            {stats.currentBitrate ? `${stats.currentBitrate.toFixed(0)}k` : "—"}
          </span>
        </div>
      </section>

      <div className={styles.grid}>
        <div className={styles.item} style={{ animationDelay: "120ms" }}>
          <SourceControl
            value={videoURL}
            onChange={setVideoURL}
            onSubmit={handleSubmit}
            isPlaying={isPlaying}
          />
        </div>
        <div className={styles.item} style={{ animationDelay: "200ms" }}>
          <DiagnosticsPanel
            username={username}
            status={status}
            isPlaying={isPlaying}
            playerError={error}
            debugInfo={debugInfo}
            stats={stats}
            token={token}
          />
        </div>
      </div>
    </main>
  );
}
