// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useEffect, useState } from "react";
import { getCurrentUser, signOut as amplifySignOut, fetchAuthSession } from "aws-amplify/auth";
import { withAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import "../amplify-theme.css";
import TopBar from "./TopBar";
import Loading from "./Loading";
import Home from "./Home";
import { getStreamToken, msUntilRefresh } from "../auth/streamToken";

// The authenticated app. Receives the loaded runtime config so it can pick the
// right stream-token scheme for the deployed edge-auth mode.
function AuthenticatedApp({ cfg, ...props }) {
  const [username, setUsername] = useState();
  const [streamToken, setStreamToken] = useState();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timer;
    let cancelled = false;

    const resolveToken = async () => {
      const session = await fetchAuthSession();
      const tokens = {
        accessToken: session.tokens.accessToken.toString(),
        idToken: session.tokens.idToken.toString(),
      };
      // lambda-edge mode uses the Cognito access token directly; cloudfront-function
      // mode exchanges the ID token at the token-vending API for an HS256 token.
      setStreamToken(await getStreamToken(cfg, tokens));
    };

    // CloudFront Functions mode mints short-lived tokens — reschedule from the
    // token's own exp (not a hardcoded interval) so the cadence tracks whatever
    // TTL the token-vending Lambda is configured with. The refreshed token flows
    // through Home into the player options automatically.
    const scheduleRefresh = () => {
      if (cfg.authMode !== "cloudfront-function") return;
      const delay = msUntilRefresh();
      if (delay == null || cancelled) return;
      timer = setTimeout(async () => {
        try {
          await resolveToken();
        } catch (e) {
          console.error("Token refresh failed", e);
        }
        scheduleRefresh();
      }, delay);
    };

    (async function () {
      try {
        const user = await getCurrentUser();
        setUsername(user.username);
        await resolveToken();
        scheduleRefresh();
      } catch (e) {
        console.error("Error, no logged user ", e);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [cfg]);

  const signOut = async () => {
    try {
      await amplifySignOut();
      window.location.reload();
    } catch (err) {
      console.log("error signing out: ", err);
    }
  };

  if (loading || !username || !streamToken) {
    return <Loading />;
  }

  return (
    <>
      <TopBar username={username} onSignOut={signOut} />
      <Home username={username} token={streamToken} cfg={cfg} {...props} />
    </>
  );
}

const AuthenticatedAppWithUI = withAuthenticator(AuthenticatedApp);

// App receives the runtime config (loaded + Amplify configured in index.js) and
// passes it through the authenticator to the authenticated app.
export default function App({ cfg }) {
  return <AuthenticatedAppWithUI cfg={cfg} />;
}
