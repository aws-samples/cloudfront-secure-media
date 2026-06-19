// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useCallback } from "react";

const INITIAL_STATS = {
  buffer: [],
  bandwidth: [],
  currentBitrate: 0,
  droppedFrames: 0,
};

/**
 * Wires Video.js player events and a 1s stats-polling loop (buffer + bitrate).
 * Returns the live player status/error/stats plus an `onReady` handler to pass
 * to the player. Behavior is preserved from the original Home component.
 */
export default function usePlayerStats() {
  const [status, setStatus] = useState("ready");
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stats, setStats] = useState(INITIAL_STATS);

  const onReady = useCallback((player) => {
    player.on("play", () => {
      setIsPlaying(true);
      setStatus("playing");
      setError(null);
    });
    player.on("pause", () => {
      setIsPlaying(false);
      setStatus("paused");
    });
    player.on("ended", () => {
      setIsPlaying(false);
      setStatus("ended");
    });
    player.on("error", () => {
      setIsPlaying(false);
      setStatus("error");
      const err = player.error();
      setError(err ? `${err.code}: ${err.message}` : "Unknown error");
    });
    player.on("loadstart", () => {
      setStatus("loading");
      setError(null);
    });
    player.on("canplay", () => {
      setStatus("ready");
    });

    const updateStats = () => {
      if (!player || player.isDisposed()) return;
      try {
        const buffered = player.buffered();
        const currentTime = player.currentTime();

        let bufferLevel = 0;
        for (let i = 0; i < buffered.length; i++) {
          if (currentTime >= buffered.start(i) && currentTime <= buffered.end(i)) {
            bufferLevel = buffered.end(i) - currentTime;
            break;
          }
        }

        let bandwidth = 0;
        let currentBitrate = 0;
        const tech = player.tech({ IWillNotUseThisInPlugins: true });
        if (tech && tech.vhs) {
          const vhs = tech.vhs;
          bandwidth = vhs.bandwidth || 0;
          if (vhs.playlists && vhs.playlists.media()) {
            currentBitrate = vhs.playlists.media().attributes?.BANDWIDTH || 0;
          }
          if (!currentBitrate && vhs.stats && vhs.stats.bandwidth) {
            currentBitrate = vhs.stats.bandwidth;
          }
        }

        const droppedFrames =
          player.getVideoPlaybackQuality?.().droppedVideoFrames || 0;

        setStats((prev) => ({
          buffer: [...prev.buffer.slice(-19), bufferLevel],
          bandwidth: [...prev.bandwidth.slice(-19), bandwidth / 1000],
          currentBitrate: currentBitrate / 1000,
          droppedFrames,
        }));
      } catch (e) {
        console.log("Stats update error:", e);
      }
    };

    const statsInterval = setInterval(updateStats, 1000);
    player.on("dispose", () => clearInterval(statsInterval));
  }, []);

  return { status, error, isPlaying, stats, onReady };
}
