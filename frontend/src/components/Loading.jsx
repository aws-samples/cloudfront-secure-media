// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";
import styles from "./Loading.module.css";

export default function Loading() {
  return (
    <div className={styles.screen}>
      <span className={styles.brand}>Secure Media</span>
      <div className={styles.bar} role="status" aria-label="Loading">
        <span className={styles.fill} />
      </div>
    </div>
  );
}
