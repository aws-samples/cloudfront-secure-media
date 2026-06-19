// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/global.css";
import App from "./components/App";
import Loading from "./components/Loading";
import { loadRuntimeConfig } from "./config/runtimeConfig";
import { configureAmplify } from "./amplify";

const root = createRoot(document.getElementById("root"));

// Load runtime config (Cognito IDs, CloudFront URL, auth mode) and configure
// Amplify BEFORE rendering — withAuthenticator needs Amplify configured first.
(async function bootstrap() {
  root.render(<Loading />);
  try {
    const cfg = await loadRuntimeConfig();
    configureAmplify(cfg);
    root.render(
      <React.StrictMode>
        <App cfg={cfg} />
      </React.StrictMode>
    );
  } catch (err) {
    console.error("Failed to initialize app:", err);
    root.render(
      <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <h2>Configuration error</h2>
        <p>{err.message}</p>
        <p>
          Deploy the foundation stack to generate <code>/runtime-config.json</code>:{" "}
          <code>cd foundation && npm run deploy</code>
        </p>
      </div>
    );
  }
})();
