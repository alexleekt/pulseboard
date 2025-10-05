'use client';

import Link from 'next/link';
import { BookOpen, Github, Settings, Activity } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              href="/sitemap"
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Sitemap
            </Link>
            <Link
              href="/status"
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <Activity className="w-4 h-4" />
              Status
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>

          <div className="text-sm text-slate-600 dark:text-slate-400">
            <p>TeamCards • Built with Next.js 15 & Ollama</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
