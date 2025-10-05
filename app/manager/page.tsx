'use client';

import { useEffect } from 'react';

export default function ManagerPage() {
  useEffect(() => {
    document.title = 'Pulseboard | Manager Dashboard';
  }, []);
  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Manager Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400">
          AI-powered insights dashboard - Coming soon
        </p>
      </div>
    </div>
  );
}
