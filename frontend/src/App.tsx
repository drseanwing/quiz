/**
 * @file        Main App component
 * @description Root application component with routing
 */

import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="app">
          <h1>REdI Quiz Platform</h1>
          <p>Coming soon...</p>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
