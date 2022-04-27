import React from "react";
import "./Home.css";
import VideoPlayer from "./playerjs/";
import Table from "react-bootstrap/Table";

export default function Home(props) {
  console.log("HOME", props);

  console.log("HOME Toke", props.token);

  const username = props.username;
  const token = props.token;

  const videoURL =
    "http://d2qohgpffhaffh.cloudfront.net/HLS/vanlife/withad/sdr_uncage_vanlife_admarker_60sec.m3u8";

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
  };

  return username && token ? (
    <div className="container">
      <h1 className="title">Simple Player JWT Token</h1>

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
