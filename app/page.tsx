import Link from 'next/link';
import { Building2, Users, Settings, BarChart3 } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-16">
            <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-4">
              TeamCards
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300">
              AI-Powered Team Member Tracking & Insights
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              100% Offline • Local-First • Privacy-Focused
            </p>
          </header>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Link
              href="/companies"
              className="group p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
                    Companies
                  </h2>
                  <p className="text-slate-600 dark:text-slate-300">
                    Manage companies, define values, themes, and culture
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/members"
              className="group p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all border border-slate-200 dark:border-slate-700 hover:border-green-400 dark:hover:border-green-500"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                  <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
                    Team Members
                  </h2>
                  <p className="text-slate-600 dark:text-slate-300">
                    Track profiles, superpowers, growth areas, and work diaries
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/manager"
              className="group p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all border border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                  <BarChart3 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
                    Manager Dashboard
                  </h2>
                  <p className="text-slate-600 dark:text-slate-300">
                    Ask questions, get insights, find the best person for tasks
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href="/settings"
              className="group p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-all border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg group-hover:bg-slate-200 dark:group-hover:bg-slate-600 transition-colors">
                  <Settings className="w-8 h-8 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
                    Settings
                  </h2>
                  <p className="text-slate-600 dark:text-slate-300">
                    Configure Ollama, models, MCP servers, and features
                  </p>
                </div>
              </div>
            </Link>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              📋 Getting Started
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200">
              <li>Make sure Ollama is running: <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-sm">ollama serve</code></li>
              <li>Go to Settings to configure your models</li>
              <li>Create your first company and define its values</li>
              <li>Add team members and track their work</li>
              <li>Use the Manager Dashboard to get AI-powered insights</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
