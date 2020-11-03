import React, { Component } from 'react';
//import getToken from './gettoken';
//import './App.css';
import VideoPlayer from './player';
import Amplify, { Auth } from 'aws-amplify';
import awsmobile from "./aws-exports";
import jwt  from 'jsonwebtoken';
import Table from 'react-bootstrap/Table';




Amplify.configure(awsmobile);




class testplayer extends Component {


  constructor(props) {
    super(props);
    this.state = {
      token: 0,
      videoURL: "https://dtwq7j2a2lfi4.cloudfront.net/staticVideos/Big_Buck_Bunny_720_10s_5MB.mp4",
      showComponent: true,
    };
    //updateState = updateState.bind(this)
    this.handleURLset = this.handleURLset.bind(this);
  }

  componentDidMount() {

    //this.interval = setInterval(() => this.tick(), 1000000000);
   
    //this.getIVSToken()
    this.getCurrentUser()
    //console.log("time", this.interval);
  }
 
 
  componentWillUnmount() {
    //clearInterval(this.interval);
  }
 

getCurrentUser() {
  Auth.currentSession({ bypassCache: true }).then(session => {
    this.setState({
      session,
      //username: user.username,
      token: session.accessToken.jwtToken

    });
    console.log("User ALL", session);
    //console.log("Username", this.state.username);
    console.log("Access Token", this.state.token);
    var jwtToken = this.state.token;
    var decodedJwt = jwt.decode(jwtToken, {complete: true});
    console.log("Decoded Token", decodedJwt);
  });
};

getPlayerState(){
  console.log("player state", this);
  console.log("PROPS!", this.props);
  console.log("gett!!!!", this.playerState);
  //this.props.sendFunction();
};

handleURLset = (e) =>{
  e.preventDefault();
  const {videoURL} = this.state;
  console.log("URL", videoURL);
  this.setState({
    videoURL,
    showComponent: true
  })
  console.log("Player", this.state)
  this.playerShow()
} 

playerShow = () => {
  return (
    <div>{<VideoPlayer { ...{
      autoplay: false,
      controls: true,
      width: 720,
      height: 420,
      bigPlayButton: true,
      //token: this.getIVSToken(),
      //html5: html5Settings,
      token: this.state.token,
      cookie: "testOsmar",
      sources: [{
        src: this.state.videoURL,
        type: 'video/mp4',
      }]
    }}/>}</div>
  );
}
  


  render() {

    console.log("reder has been called");
    console.log(this.state);
    document.body.style = 'background: #262626;';
    const { token, showComponent } = this.state;
    console.log("tem token?", token)
    const { videoURL }  = this.state;

  

    const {videoJsOptions} = this.state;
    

    


    
    
    const videoJsOptionsB = {
      autoplay: false,
      controls: true,
      width: 720,
      height: 420,
      bigPlayButton: true,
      //token: this.getIVSToken(),
      //html5: html5Settings,
      token,
      cookie: "testOsmar",
      sources: [{
        src: `https://dc17l10byq54i.cloudfront.net/out/v1/98bd52858aac4fc79ad082122402d9e0/clear.m3u8?token=`,
        type: 'application/x-mpegURL',
      }]
    }

    const videoJsOptionsC = {
      autoplay: true,
      controls: true,
      width: 720,
      height: 420,
      bigPlayButton: false,
      //token: this.getIVSToken(),
      //html5: html5Settings,
      token,
      cookie: "testOsmar",
      headerplayer: "{cogtoken}",
      /*headers: {
        "Content-Type": "application/json",
        "ThisIsa-test" : "minhola"
      },*/
      sources: [{
        src: `https://d1c9o7kub5969p.cloudfront.net/output/HLS/video.m3u8`,
        type: 'application/x-mpegURL',
      }],

      options: [{ 
        headers: { Authorization: `${token}`}
      }] 
    }

    
    if (token === 0) {
      console.log("loadding");
      return (
        <div>Loading...</div>
      )
    } else{
      console.log("tem valor", token);
      return (
        
        <div className="App">
        <div className="container fluid" style={{backgroundColor: "#262626"}}>
            <div className="headerPlayer">
              <h1>Video Player (Video.JS for tests)</h1>
            </div>
            <div className="row">
            <div className="col-sm-1"></div>
            <div className="col-lg">

            
            <div className="form-group">
              <form className="form-URL">
              
                <label className="formLabel">
                  Video URL (.m3u8):
                      <input 
                        id="VideoURL" 
                        type="text"
                        width= "100%" 
                        value={this.state.videoURL}
                        className="formURL" 
                        aria-label="Sizing example input" 
                        aria-describedby="inputGroup-sizing-sm"
                        onChange={e => this.setState({ videoURL: e.target.value, showComponent: false})}
                        />
                      </label>
                    <button type="submit" className="formBot" onClick={this.handleURLset}>Play</button>
                
                </form>
                </div>
              </div>
            </div>

      
               
            
         


            <div className="player-wrapper">
          
            {showComponent && (
              <div>
              {this.playerShow()}
              </div>
            )}
            </div>

            <div className="DebugBOXger">
              <div className="DebugBOXtitle">
                <a>Info:</a>
              </div>
              <div className="DebugBOX">


              <Table className="DebugTable" variant="dark" responsive="lg" >
                  <tbody wordBreak='break-all'>
                    <tr>
                      <th width={100}>
                        URL:
                      </th>
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

          
            </div>
        </div>
      );
    }
  }
}

export default testplayer;

