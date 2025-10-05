'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Circle, AlertCircle, XCircle, CheckCircle, RefreshCw, Download, Cpu, HardDrive } from 'lucide-react';
import type { SystemStatus } from '@/app/api/status/route';

interface RunningModel {
  name: string;
  model: string;
  size: number;
  size_vram: number;
  digest: string;
  expires_at: string;
}

interface OllamaResourceStats {
  models: RunningModel[];
}

export default function StatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [pullingModels, setPullingModels] = useState<Set<string>>(new Set());
  const [fixError, setFixError] = useState<string | null>(null);
  const [resourceStats, setResourceStats] = useState<OllamaResourceStats | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/status');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setStatus(data);
          setLastChecked(new Date());

          // Also load resource stats if Ollama is operational
          if (data.dependencies.ollama.status === 'operational') {
            loadResourceStats();
          }
        } else {
          console.error('Status API returned non-JSON response');
        }
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadResourceStats = async () => {
    try {
      const settingsResponse = await fetch('/api/settings');
      if (!settingsResponse.ok) return;

      const settings = await settingsResponse.json();
      const psResponse = await fetch(`${settings.ollama.host}/api/ps`);

      if (psResponse.ok) {
        const contentType = psResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await psResponse.json();
          setResourceStats(data);
        }
      }
    } catch (error) {
      console.error('Failed to load resource stats:', error);
    }
  };

  useEffect(() => {
    loadStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const pullModel = async (modelName: string) => {
    setPullingModels(prev => new Set(prev).add(modelName));
    setFixError(null);

    try {
      const response = await fetch('/api/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pull-model', model: modelName }),
      });

      const data = await response.json();

      if (data.success) {
        // Reload status after successful pull
        await loadStatus();
      } else {
        setFixError(data.error || 'Failed to pull model');
      }
    } catch (error) {
      console.error('Failed to pull model:', error);
      setFixError('Network error while pulling model');
    } finally {
      setPullingModels(prev => {
        const newSet = new Set(prev);
        newSet.delete(modelName);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status: 'operational' | 'degraded' | 'down') => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'operational' | 'degraded' | 'down') => {
    switch (status) {
      case 'operational':
        return 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20';
      case 'degraded':
        return 'border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-900/20';
      case 'down':
        return 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20';
    }
  };

  const getStatusTextColor = (status: 'operational' | 'degraded' | 'down') => {
    switch (status) {
      case 'operational':
        return 'text-green-900 dark:text-green-100';
      case 'degraded':
        return 'text-yellow-900 dark:text-yellow-100';
      case 'down':
        return 'text-red-900 dark:text-red-100';
    }
  };

  if (loading && !status) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">System Status</h1>
          <button
            onClick={loadStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {status && (
          <>
            {/* Overall Status */}
            <div className={`rounded-lg shadow-md p-6 border mb-8 ${getStatusColor(status.overall)}`}>
              <div className="flex items-center gap-3 mb-2">
                {getStatusIcon(status.overall)}
                <h2 className={`text-2xl font-bold ${getStatusTextColor(status.overall)}`}>
                  {status.overall.charAt(0).toUpperCase() + status.overall.slice(1)}
                </h2>
              </div>
              {lastChecked && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Last checked: {lastChecked.toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Fix Error */}
            {fixError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                      Auto-fix failed
                    </p>
                    <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                      {fixError}
                    </p>
                  </div>
                  <button
                    onClick={() => setFixError(null)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Dependencies */}
            <div className="space-y-6">
              {/* Ollama */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  {getStatusIcon(status.dependencies.ollama.status)}
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ollama</h3>
                </div>
                {status.dependencies.ollama.message && (
                  <div className="mb-2">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {status.dependencies.ollama.message}
                    </p>
                    {status.dependencies.ollama.details && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {status.dependencies.ollama.details}
                      </p>
                    )}
                  </div>
                )}

                {/* Resource Stats */}
                {resourceStats && resourceStats.models && resourceStats.models.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      Running Models
                    </h4>
                    <div className="space-y-3">
                      {resourceStats.models.map((model, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-mono text-sm text-slate-900 dark:text-white">
                                {model.name}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                Model: {model.model}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="flex items-center gap-2">
                              <HardDrive className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <div>
                                <p className="text-slate-600 dark:text-slate-400">RAM</p>
                                <p className="font-medium text-slate-900 dark:text-white">
                                  {(model.size / 1024 / 1024 / 1024).toFixed(2)} GB
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              <div>
                                <p className="text-slate-600 dark:text-slate-400">VRAM</p>
                                <p className="font-medium text-slate-900 dark:text-white">
                                  {(model.size_vram / 1024 / 1024 / 1024).toFixed(2)} GB
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resourceStats && (!resourceStats.models || resourceStats.models.length === 0) && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      No models currently loaded in memory
                    </p>
                  </div>
                )}
              </div>

              {/* Models */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Models</h3>
                <div className="space-y-4">
                  {/* Primary Model */}
                  <div className="flex items-start gap-3">
                    {getStatusIcon(status.dependencies.models.primary.status)}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 dark:text-white">
                            Primary Model
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">
                            {status.dependencies.models.primary.modelName}
                          </p>
                          {status.dependencies.models.primary.message && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {status.dependencies.models.primary.message}
                            </p>
                          )}
                          {status.dependencies.models.primary.details && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              {status.dependencies.models.primary.details}
                            </p>
                          )}
                        </div>
                        {status.dependencies.models.primary.status === 'down' &&
                          status.dependencies.models.primary.message === 'Model not found' && (
                            <button
                              onClick={() => pullModel(status.dependencies.models.primary.modelName)}
                              disabled={pullingModels.has(status.dependencies.models.primary.modelName)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              {pullingModels.has(status.dependencies.models.primary.modelName) ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Pulling...
                                </>
                              ) : (
                                <>
                                  <Download className="w-3 h-3" />
                                  Auto-Fix
                                </>
                              )}
                            </button>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Judge Model (if enabled) */}
                  {status.dependencies.models.judge && (
                    <div className="flex items-start gap-3">
                      {getStatusIcon(status.dependencies.models.judge.status)}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 dark:text-white">
                              Judge Model
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">
                              {status.dependencies.models.judge.modelName}
                            </p>
                            {status.dependencies.models.judge.message && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                {status.dependencies.models.judge.message}
                              </p>
                            )}
                            {status.dependencies.models.judge.details && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                {status.dependencies.models.judge.details}
                              </p>
                            )}
                          </div>
                          {status.dependencies.models.judge.status === 'down' &&
                            status.dependencies.models.judge.message === 'Model not found' && (
                              <button
                                onClick={() => pullModel(status.dependencies.models.judge.modelName)}
                                disabled={pullingModels.has(status.dependencies.models.judge.modelName)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                {pullingModels.has(status.dependencies.models.judge.modelName) ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Pulling...
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-3 h-3" />
                                    Auto-Fix
                                  </>
                                )}
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Embedding Model */}
                  <div className="flex items-start gap-3">
                    {getStatusIcon(status.dependencies.models.embedding.status)}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 dark:text-white">
                            Embedding Model
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">
                            {status.dependencies.models.embedding.modelName}
                          </p>
                          {status.dependencies.models.embedding.message && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {status.dependencies.models.embedding.message}
                            </p>
                          )}
                          {status.dependencies.models.embedding.details && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              {status.dependencies.models.embedding.details}
                            </p>
                          )}
                        </div>
                        {status.dependencies.models.embedding.status === 'down' &&
                          status.dependencies.models.embedding.message === 'Model not found' && (
                            <button
                              onClick={() => pullModel(status.dependencies.models.embedding.modelName)}
                              disabled={pullingModels.has(status.dependencies.models.embedding.modelName)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                              {pullingModels.has(status.dependencies.models.embedding.modelName) ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Pulling...
                                </>
                              ) : (
                                <>
                                  <Download className="w-3 h-3" />
                                  Auto-Fix
                                </>
                              )}
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ChromaDB */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  {getStatusIcon(status.dependencies.chromadb.status)}
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">ChromaDB</h3>
                </div>
                {status.dependencies.chromadb.message && (
                  <div className="mb-2">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {status.dependencies.chromadb.message}
                    </p>
                    {status.dependencies.chromadb.details && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {status.dependencies.chromadb.details}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  {getStatusIcon(status.dependencies.settings.status)}
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h3>
                </div>
                {status.dependencies.settings.message && (
                  <div className="mb-2">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {status.dependencies.settings.message}
                    </p>
                    {status.dependencies.settings.details && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {status.dependencies.settings.details}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-3">
                Troubleshooting Guide
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Ollama Issues
                  </h4>
                  <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                    <li>• Start Ollama: <code className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">ollama serve</code></li>
                    <li>• Pull missing models: <code className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">ollama pull &lt;model-name&gt;</code></li>
                    <li>• List installed models: <code className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">ollama list</code></li>
                    <li>• Update your <Link href="/settings" className="underline font-medium">Settings</Link> if Ollama is running on a different host</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    ChromaDB Issues
                  </h4>
                  <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                    <li>• ChromaDB runs in-process (no separate server needed)</li>
                    <li>• Requires Ollama to be operational for embeddings</li>
                    <li>• Check that the <code className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">data/chroma</code> directory is writable</li>
                    <li>• If persisting errors, try: <code className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">bun add chromadb</code></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Model Recommendations
                  </h4>
                  <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                    <li>• Primary: <code className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">qwen2.5:14b</code> or <code className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">llama3.1:8b</code></li>
                    <li>• Embedding: <code className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">nomic-embed-text</code></li>
                    <li>• Smaller/faster: <code className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">llama3.2:3b</code></li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
