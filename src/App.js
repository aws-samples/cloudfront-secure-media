import React, { Component } from 'react';
import './App.css';
import logo from './img/aws.png';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';
import player from './player';
import testplayer from './testplayer';
import Amplify from 'aws-amplify';
import { withAuthenticator } from '@aws-amplify/ui-react'
import awsmobile from './aws-exports';

Amplify.configure(awsmobile);

class App extends Component {
  render() {
    return (
    <Router>
        <div>
          <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
          <ul className="navbar-nav mr-auto">
          <a class="navbar-brand" href="#">
            <img src={logo} alt={logo} width="65"/>
          </a>
            <li><Link to={'/'} className="nav-link">TestPlayer</Link></li>
          </ul>
             <ul id="nav-mobile" className="right navbar-nav">
            <li className="float-right">
                  <a className="nav-link float-right" href="/" >Logout</a>
            </li>
          </ul>
          </nav>
          <hr />
          <Switch>
              <Route exact path='/player' component={player} />
              <Route exact path='/' component={testplayer} />
          </Switch>
          <div>
           </div>

        </div>
      </Router>
    );
  }
}
export default withAuthenticator(App);
