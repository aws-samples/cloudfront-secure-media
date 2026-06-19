// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { useState, useEffect } from "react";
import { appendStreamToken } from "../auth/appendStreamToken";

const originOf = (url) => {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
};

/**
 * Probes an HLS source URL (with the JWT appended) and tracks response code,
 * headers, load time and errors. Re-runs whenever the url or token changes.
 * Extracted verbatim in behavior from the original Home component.
 */
export default function useSourceProbe(url, token, distributionUrl) {
  const [info, setInfo] = useState({
    responseCode: null,
    responseHeaders: {},
    loadTime: null,
    error: null,
    lastChecked: null,
    cloudFrontUrl: distributionUrl || originOf(url),
  });

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const startTime = Date.now();

    setInfo((prev) => ({ ...prev, responseCode: "checking..." }));

    (async () => {
      try {
        const urlWithToken = appendStreamToken(url, token);
        const response = await fetch(urlWithToken, { method: "GET", mode: "cors" });
        const loadTime = Date.now() - startTime;

        const headers = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        if (cancelled) return;
        setInfo((prev) => ({
          ...prev,
          responseCode: response.status,
          responseHeaders: headers,
          loadTime,
          error: response.ok ? null : response.statusText,
          lastChecked: new Date().toLocaleTimeString(),
        }));
      } catch (error) {
        if (cancelled) return;
        setInfo((prev) => ({
          ...prev,
          responseCode: "failed",
          responseHeaders: {},
          loadTime: Date.now() - startTime,
          error: error.message,
          lastChecked: new Date().toLocaleTimeString(),
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, token, distributionUrl]);

  return info;
}
