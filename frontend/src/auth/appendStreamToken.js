// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Append the stream token to a media URL as ?token=, preserving any existing
// query string. Shared by the player's XHR hook and the diagnostics probe so the
// two always build identical URLs.
export function appendStreamToken(url, token) {
  if (!token) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}
