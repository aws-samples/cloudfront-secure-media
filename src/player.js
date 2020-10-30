import React from 'react';
import videojs from 'video.js';
//import './player.scss';
import  'video.js/dist/video-js.css'



export default class VideoPlayer extends React.Component {
  
  constructor(props) {
    super(props);
    this.functionToPass = this.functionToPass.bind(this);
  }

  functionToPass () {
    // do something
    this.playerState = "OSMAR!!!!!!!!!!!!!!!!!!!!!!";
    console.log("cheguei aqui")
  }
  
  componentDidMount() {
    videojs.Hls.xhr.beforeRequest = function (options) {
      options.uri = `${options.uri}?token=${videojs.getAllPlayers()[0].options().token}`;
      //options.headers = options.headers || {}
      //options.headers.Authorization = `${videojs.getAllPlayers()[0].options().token}`
      return options;
    };
    this.player = videojs(this.videoNode, this.props,function onPlayerReady() {
      console.log('onPlayerReady', this)
      //console.log('PlayerState', playerState)
      //this.props.playerState(' My New name')
      //this.playerState = React.createRef();
      //this.props.playerState();
    });
  }

  componentWillUnmount() {
    if (this.player) {
      this.player.dispose();
    }
  }

  

  

  render() {
  
    return (
      <div>
        <div data-vjs-player>
        <video ref={ node => this.videoNode = node } className="video-js"></video>
        </div>
      </div>
    );
  }
}

