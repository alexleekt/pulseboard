'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Save, Loader2, ArrowLeft, Sparkles, RefreshCw, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import type { Company } from '@/lib/types';
import { ErrorDialog } from '@/components/ui/ErrorDialog';
import { GeneratingStatus } from '@/components/ui/GeneratingStatus';

export default function CompanyEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const isNew = id === 'new';

  const [company, setCompany] = useState<Partial<Company>>({
    name: '',
    values: '',
    themes: '',
    decisionMaking: '',
    culture: '',
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; details?: string; fix?: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isNew) {
      loadCompany();
    }
  }, [id, isNew]);

  const loadCompany = async () => {
    try {
      const response = await fetch(`/api/companies/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCompany(data);
      }
    } catch (error) {
      console.error('Failed to load company:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateField = async (field: 'values' | 'themes' | 'decisionMaking' | 'culture') => {
    if (!company.name) {
      alert('Please enter a company name first');
      return;
    }

    setGenerating(field);
    try {
      const response = await fetch('/api/generate/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          companyName: company.name,
          existingData: {
            values: company.values,
            themes: company.themes,
            decisionMaking: company.decisionMaking,
            culture: company.culture,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCompany({ ...company, [field]: data.content });
      } else {
        const errorData = await response.json();
        setError({
          message: errorData.error || 'Generation failed',
          details: errorData.details,
          fix: errorData.fix
        });
      }
    } catch (error) {
      console.error('Generation error:', error);
      setError({
        message: 'Network error',
        details: 'Could not connect to the server.',
        fix: 'Check your internet connection and try again.'
      });
    } finally {
      setGenerating(null);
    }
  };

  const generateAll = async () => {
    if (!company.name) {
      alert('Please enter a company name first');
      return;
    }

    setGenerating('all');
    try {
      const response = await fetch('/api/generate/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: 'all',
          companyName: company.name,
          existingData: {},
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCompany({
          ...company,
          values: data.values || '',
          themes: data.themes || '',
          decisionMaking: data.decisionMaking || '',
          culture: data.culture || '',
        });
      } else {
        const errorData = await response.json();
        setError({
          message: errorData.error || 'Generation failed',
          details: errorData.details,
          fix: errorData.fix
        });
      }
    } catch (error) {
      console.error('Generation error:', error);
      setError({
        message: 'Network error',
        details: 'Could not connect to the server.',
        fix: 'Check your internet connection and try again.'
      });
    } finally {
      setGenerating(null);
    }
  };

  const saveCompany = async () => {
    if (!company.name) {
      alert('Company name is required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        isNew ? '/api/companies' : `/api/companies/${id}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(company),
        }
      );

      if (response.ok) {
        router.push('/companies');
      } else {
        alert('Failed to save company');
      }
    } catch (error) {
      console.error('Failed to save company:', error);
      alert('Failed to save company');
    } finally {
      setSaving(false);
    }
  };

  const deleteCompany = async () => {
    if (!company.name || deleteConfirmation !== company.name) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/companies');
      } else {
        setError({
          message: 'Failed to delete company',
          details: 'Unable to delete company. Please try again.',
        });
      }
    } catch (error) {
      console.error('Failed to delete company:', error);
      setError({
        message: 'Failed to delete company',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <ErrorDialog
        error={error?.message || null}
        details={error?.details}
        fix={error?.fix}
        onClose={() => setError(null)}
      />
      <div className="max-w-4xl mx-auto">
        <Link
          href="/companies"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Companies
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Building2 className="w-8 h-8 text-slate-700 dark:text-slate-300" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {isNew ? 'New Company' : 'Edit Company'}
          </h1>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={company.name || ''}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Acme Corporation"
            />
          </div>

          {company.name && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-900 dark:text-blue-100 mb-3">
                    Let AI help you define your company profile
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={generateAll}
                      disabled={generating !== null}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {generating === 'all' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Auto-Generate All Fields
                        </>
                      )}
                    </button>
                    <GeneratingStatus isGenerating={generating === 'all'} label="AI Generation" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Company Values
                </label>
                {generating === 'values' && <GeneratingStatus isGenerating={true} label="" />}
              </div>
              <button
                onClick={() => generateField('values')}
                disabled={!company.name || generating !== null}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generate with AI"
              >
                {generating === 'values' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {generating === 'values' ? 'Generating...' : 'AI Generate'}
              </button>
            </div>
            <textarea
              value={company.values || ''}
              onChange={(e) => setCompany({ ...company, values: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What are the core values this company upholds?"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Themes
                </label>
                {generating === 'themes' && <GeneratingStatus isGenerating={true} label="" />}
              </div>
              <button
                onClick={() => generateField('themes')}
                disabled={!company.name || generating !== null}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generate with AI"
              >
                {generating === 'themes' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {generating === 'themes' ? 'Generating...' : 'AI Generate'}
              </button>
            </div>
            <textarea
              value={company.themes || ''}
              onChange={(e) => setCompany({ ...company, themes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What themes define this company's mission and work?"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Decision Making
                </label>
                {generating === 'decisionMaking' && <GeneratingStatus isGenerating={true} label="" />}
              </div>
              <button
                onClick={() => generateField('decisionMaking')}
                disabled={!company.name || generating !== null}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generate with AI"
              >
                {generating === 'decisionMaking' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {generating === 'decisionMaking' ? 'Generating...' : 'AI Generate'}
              </button>
            </div>
            <textarea
              value={company.decisionMaking || ''}
              onChange={(e) => setCompany({ ...company, decisionMaking: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="How does the company make decisions?"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Culture
                </label>
                {generating === 'culture' && <GeneratingStatus isGenerating={true} label="" />}
              </div>
              <button
                onClick={() => generateField('culture')}
                disabled={!company.name || generating !== null}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generate with AI"
              >
                {generating === 'culture' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {generating === 'culture' ? 'Generating...' : 'AI Generate'}
              </button>
            </div>
            <textarea
              value={company.culture || ''}
              onChange={(e) => setCompany({ ...company, culture: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the company culture and work environment"
            />
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              onClick={saveCompany}
              disabled={saving}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Company
                </>
              )}
            </button>

            <Link
              href="/companies"
              className="px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium"
            >
              Cancel
            </Link>
          </div>
        </div>

        {!isNew && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-red-200 dark:border-red-900 mt-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              <h2 className="text-xl font-bold text-red-900 dark:text-red-100">Danger Zone</h2>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
              Deleting this company will permanently remove all associated data, including team members and diary entries. This action cannot be undone.
            </p>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <label className="block text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                Type <span className="font-mono font-bold">{company.name}</span> to confirm deletion:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
                placeholder={company.name}
              />

              <button
                onClick={deleteCompany}
                disabled={deleting || deleteConfirmation !== company.name}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Delete Company Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
