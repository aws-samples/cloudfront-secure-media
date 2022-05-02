// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Home from "./Home";
import Amplify from "@aws-amplify/core";
import Auth from "@aws-amplify/auth";
import { withAuthenticator } from "@aws-amplify/ui-react";
import awsmobile from "../aws-exports";
import "@aws-amplify/ui-react/styles.css";

Amplify.configure(awsmobile);

function App(props) {
  const [username, setUsername] = useState();
  const [token, setToken] = useState();

  useEffect(() => {
    (async function () {
      try {
        await Auth.currentSession({ bypassCache: false }).then((session) => {
          console.log(
            "User name",
            session.accessToken.payload.username
            //session.accessToken.jwtToken // for Debug
          );
          setUsername(session.accessToken.payload.username);
          setToken(session.accessToken.jwtToken);
        });
      } catch (e) {
        console.error("Error, no logeeed user ", e);
      }
    })();
    console.log("Simple Player JWT Mounted");
  }, [username, token]);

  const signOut = async () => {
    try {
      await Auth.signOut();
      window.location.reload();
    } catch (err) {
      console.log("error signing out: ", err);
    }
  };

  return username ? (
    <Router>
      <div className="App">
        <Navbar bg="dark" variant="dark">
          <Container>
            <Navbar.Brand href="/">Simple Player</Navbar.Brand>
            <Nav>
              <Nav.Link>
                <Link to={"/"} className="nav-link" onClick={signOut}>
                  Logout
                </Link>
              </Nav.Link>
            </Nav>
          </Container>
        </Navbar>
        <Routes>
          <Route
            index
            element={<Home username={username} token={token} {...props} />}
          />
        </Routes>
      </div>
    </Router>
  ) : (
    <div>Loading...</div>
  );
}
export default withAuthenticator(App);
