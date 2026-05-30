import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-pmg-navy flex flex-col items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-4xl font-semibold mb-2">Welcome to</h1>
        <p className="text-pmg-orange font-semibold text-2xl mb-8">Peacocks Medical Group</p>
        <p className="text-white/70">Reception Kiosk — Phase 0 skeleton</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
