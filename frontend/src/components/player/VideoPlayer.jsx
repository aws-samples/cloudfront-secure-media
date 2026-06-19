// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";
import styles from "./VideoPlayer.module.css";
import { appendStreamToken } from "../../auth/appendStreamToken";

// Video.js is loaded as a global via a <script> tag in index.html (vjs.zencdn.net),
// not bundled. Resolve it lazily from window at use time (the CDN script may not
// have evaluated when this ES module is first imported).
const getVideojs = () => window.videojs;

// Module-level holder for the current stream token. The global VHS beforeRequest
// hook reads this live, so token refreshes are picked up automatically.
let currentToken = null;
let hookRegistered = false;

// Register the token-injecting hook ONCE, globally, BEFORE the first player is
// created. Two reasons this must be global + early:
//   1. VHS issues the first manifest request synchronously during player creation,
//      so a per-player hook registered after creation (on "xhr-hooks-ready") races
//      and misses it — that request reaches the edge tokenless and returns 401.
//   2. `videojs.Vhs.xhr.onRequest()` is the supported global hook; the older
//      `xhr.beforeRequest = fn` assignment is deprecated in Video.js 8.
// Registered lazily (not at module load) because the CDN video.min.js may not have
// populated videojs.Vhs yet at import time.
function ensureTokenHook() {
  const videojs = getVideojs();
  if (hookRegistered || !videojs?.Vhs?.xhr?.onRequest) return;
  videojs.Vhs.xhr.onRequest((requestOptions) => {
    requestOptions.uri = appendStreamToken(requestOptions.uri, currentToken);
    return requestOptions;
  });
  hookRegistered = true;
}

function VideoPlayer({ options, token, onReady }) {
  const containerRef = React.useRef(null);
  const playerRef = React.useRef(null);

  // Keep the module-level token current before the player (and its first manifest
  // request) is created, and on every refresh.
  currentToken = token;

  React.useEffect(() => {
    // Initialize the player once. Following the official video.js 8 React
    // pattern: create the <video-js> element imperatively and append it to a
    // container ref so the element stays inside the component under React 18
    // StrictMode (double-mount).
    if (!playerRef.current) {
      const container = containerRef.current;
      if (!container) return;

      // Register the global token hook before creating the player so it catches
      // the very first manifest request.
      ensureTokenHook();

      const videojs = getVideojs();
      const videoElement = document.createElement("video-js");
      videoElement.classList.add("vjs-big-play-centered");
      container.appendChild(videoElement);

      const player = (playerRef.current = videojs(videoElement, options, () => {
        onReady && onReady(player);
      }));
    } else {
      // Reuse the existing player on options change. Only reload the source when
      // the URL actually changed — a token refresh updates options identity but
      // must NOT tear down and re-buffer the current stream (the token is read
      // live by the XHR hook above).
      const player = playerRef.current;
      player.autoplay(options.autoplay);
      const nextSrc = options.sources?.[0]?.src;
      if (nextSrc && nextSrc !== player.currentSrc() && nextSrc !== player.src()) {
        player.src(options.sources);
      }
    }
  }, [options]);

  // Dispose the Video.js player when the component unmounts.
  React.useEffect(() => {
    return () => {
      const player = playerRef.current;
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} className={styles.player} data-vjs-player />;
}

export default VideoPlayer;
