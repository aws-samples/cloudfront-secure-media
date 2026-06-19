// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";
import styles from "./TopBar.module.css";

function LockMark() {
  return (
    <svg
      className={styles.mark}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="10" width="16" height="11" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function TopBar({ username, onSignOut }) {
  return (
    <header className={styles.bar}>
      <div className={styles.brand}>
        <LockMark />
        <span className={styles.name}>Secure Media</span>
      </div>
      <div className={styles.right}>
        {username && <span className={styles.user}>{username}</span>}
        <button type="button" className={styles.signOut} onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}
