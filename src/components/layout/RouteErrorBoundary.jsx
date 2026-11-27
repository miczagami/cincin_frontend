/**
 * RouteErrorBoundary: the router's errorElement. A screen that throws while
 * rendering lands here; the error is reported and the recovery screen shown.
 */

import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';
import { reportError } from '../../services/errorReporting';
import RecoveryScreen from './RecoveryScreen';

export default function RouteErrorBoundary() {
  const error = useRouteError();

  useEffect(() => {
    reportError(error, { source: 'route' });
  }, [error]);

  return <RecoveryScreen />;
}
