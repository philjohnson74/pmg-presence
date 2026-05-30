import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-pmg-navy text-white px-8 py-4 flex items-center gap-4">
        <span className="font-semibold text-xl">PMG Presence</span>
        <span className="text-pmg-orange font-semibold text-sm uppercase tracking-widest">Admin</span>
      </header>
      <main className="px-8 py-12">
        <h1 className="text-3xl font-semibold text-pmg-navy mb-2">Admin Portal</h1>
        <p className="text-gray-600">Phase 0 skeleton — implementation starting in Phase 1.</p>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
