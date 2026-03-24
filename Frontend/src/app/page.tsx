'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState<{
    backend: boolean | null;
    database: boolean | null;
    loading: boolean;
    error: string | null;
  }>({
    backend: null,
    database: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function checkHealth() {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/health');
        if (!response.ok) throw new Error('Backend failed to respond');
        const data = await response.json();
        setStatus({
          backend: data.backend,
          database: data.database,
          loading: false,
          error: null,
        });
      } catch (err: any) {
        setStatus({
          backend: false,
          database: false,
          loading: false,
          error: err.message,
        });
      }
    }
    checkHealth();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white font-sans">
      <div className="max-w-md w-full p-8 rounded-2xl bg-gray-800 shadow-2xl border border-gray-700">
        <h1 className="text-3xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          Smart Travel System
        </h1>
        <p className="text-gray-400 mb-8 italic">Food Recommendation Connection Monitor</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-700/50 backdrop-blur-sm">
            <span className="font-semibold text-gray-200">Backend API (FastAPI)</span>
            {status.loading ? (
              <span className="text-blue-400 animate-pulse">Checking...</span>
            ) : status.backend ? (
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-bold border border-green-500/30">ONLINE</span>
            ) : (
              <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-bold border border-red-500/30">OFFLINE</span>
            )}
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-700/50 backdrop-blur-sm">
            <span className="font-semibold text-gray-200">Database (PostgreSQL)</span>
            {status.loading ? (
              <span className="text-blue-400 animate-pulse">Checking...</span>
            ) : status.database ? (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-bold border border-emerald-500/30">CONNECTED</span>
            ) : (
              <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-bold border border-red-500/30">DISCONNECTED</span>
            )}
          </div>
        </div>

        {status.error && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            <strong>Error:</strong> {status.error}
          </div>
        )}

        <div className="mt-8 text-xs text-gray-500 text-center">
          Monitoring API status at 127.0.0.1:8000
        </div>
      </div>
    </div>
  );
}
