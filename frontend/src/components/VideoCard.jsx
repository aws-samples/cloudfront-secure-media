// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";
import VideoPlayer from "./player";
import styles from "./VideoCard.module.css";

export default function VideoCard({ options, token, onReady }) {
  return (
    <div className={styles.card}>
      <VideoPlayer options={options} token={token} onReady={onReady} />
    </div>
  );
}
