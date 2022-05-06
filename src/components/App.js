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
import API from "@aws-amplify/api";
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
            session.idToken.payload.email
            //session.accessToken.jwtToken // for Debug
          );
          setUsername(session.idToken.payload.email);
        });
        if (username) {
          await getToken(username);
        }
      } catch (e) {
        console.error("Error, no logeeed user ", e);
      }
    })();
    console.log("Simple Player JWT Mounted");
  }, [username]);

  const signOut = async () => {
    try {
      await Auth.signOut();
      window.location.reload();
    } catch (err) {
      console.log("error signing out: ", err);
    }
  };

  const getToken = async (user) => {
    console.log("user", user);
    let apiName = "getToken";
    let path = `/token/${user}`;
    await API.get(apiName, path)
      .then((response) => {
        console.log("response", response);
        setToken(response);
      })
      .catch((error) => {
        console.log(error);
      });
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
