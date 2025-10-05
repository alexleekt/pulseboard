'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, Plus, Loader2, Edit } from 'lucide-react';
import type { Company } from '@/lib/types';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      const data = await response.json();
      setCompanies(data);
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-slate-700 dark:text-slate-300" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Companies</h1>
          </div>

          <Link
            href="/companies/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            <Plus className="w-5 h-5" />
            New Company
          </Link>
        </div>

        {companies.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-12 text-center border border-slate-200 dark:border-slate-700">
            <Building2 className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              No companies yet
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Create your first company to start tracking team members
            </p>
            <Link
              href="/companies/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              <Plus className="w-5 h-5" />
              Create Company
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <div
                key={company.id}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {company.name}
                    </h3>
                  </div>
                </div>

                {company.values && (
                  <div className="mb-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                      {company.values}
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Link
                    href={`/companies/${company.id}`}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium w-full"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
