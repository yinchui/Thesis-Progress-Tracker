import React from 'react';
import {ErrorBoundary} from './src/components/ErrorBoundary';
import {AppNavigator} from './src/navigation/AppNavigator';

function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <AppNavigator />
    </ErrorBoundary>
  );
}

export default App;
