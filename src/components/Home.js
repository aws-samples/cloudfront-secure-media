// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useState, useRef } from "react";
import "./Home.css";
import VideoPlayer from "./playerjs/";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

export default function Home(props) {
  console.log("HOME", props);

  console.log("HOME Toke", props.token);

  const username = props.username;
  const token = props.token;
  const playerRef = useRef(null);

  const [videoURL, setvideoURL] = useState(
    "http://d2qohgpffhaffh.cloudfront.net/HLS/vanlife/withad/sdr_uncage_vanlife_admarker_60sec.m3u8"
  );

  const videoJsOptions = {
    autoplay: "muted", //mute audio when page loads, but auto play video
    controls: true,
    responsive: true,
    fluid: true,
    width: 896,
    height: 504,
    token: token,
    sources: [
      {
        src: videoURL,
        type: "application/x-mpegURL",
      },
    ],
  };

  const handlePlayerReady = (player) => {
    player.on("waiting", () => {
      console.log("player is waiting");
    });

    player.on("dispose", () => {
      console.log("player will dispose");
    });

    player.on("playing", () => {
      console.log("player playing");
    });

    playerRef.current = player;
  };

  const handlePlay = (e) => {
    e.preventDefault();
    console.log("New URL is", videoURL);
    playerRef.current.src(videoURL);
  };

  return username && token ? (
    <div className="container">
      <h1 className="title">Simple Player JWT Token</h1>

      <Form>
        <Form.Group className="mb-3" controlId="formBasicEmail">
          <Form.Control
            className="form-custom"
            type="text"
            value={videoURL}
            onChange={(e) => setvideoURL(e.target.value)}
          />
          <Button
            variant="primary"
            type="submit"
            onClick={(e) => handlePlay(e)}
          >
            Play
          </Button>
        </Form.Group>
        <Form.Text className="text-muted">
          This need to be a HTTP video type, such as HLS, otherwise change the
          videoJsOptions
        </Form.Text>
      </Form>

      <div className="videoborder">
        <VideoPlayer
          className="video"
          options={videoJsOptions}
          onReady={handlePlayerReady}
        />
      </div>

      <div className="DebugBOX">
        <Table className="DebugTable" variant="dark" responsive="lg">
          <tbody>
            <tr>
              <th width={100}>URL:</th>
              <td>{videoURL}</td>
            </tr>
            <tr>
              <th>Playing:</th>
              <td>True</td>
            </tr>
            <tr>
              <th> Token:</th>
              <td>{token}</td>
            </tr>
          </tbody>
        </Table>
      </div>
    </div>
  ) : (
    <div>No username, or token</div>
  );
}
