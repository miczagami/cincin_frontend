/**
 * AppErrorBoundary: the last line of defence around the whole app. Anything
 * the router's own boundary doesn't catch (including a failure of that
 * boundary) is reported and shows the recovery screen instead of a blank app.
 * Errors thrown in event handlers or async callbacks never reach a React
 * boundary; reporting those needs global error handlers.
 */

import { Component } from 'react';
import { reportError } from '../../services/errorReporting';
import RecoveryScreen from './RecoveryScreen';

export default class AppErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    reportError(error, { source: 'app' });
  }

  render() {
    return this.state.failed ? <RecoveryScreen /> : this.props.children;
  }
}
