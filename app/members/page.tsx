'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Plus, Loader2, Building2 } from 'lucide-react';
import type { TeamMember, Company } from '@/lib/types';

export default function MembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadMembers();
  }, [selectedCompanyId]);

  useEffect(() => {
    document.title = 'Pulseboard | Team Members';
  }, []);

  const loadData = async () => {
    try {
      const companiesResponse = await fetch('/api/companies');
      const companiesData = await companiesResponse.json();
      setCompanies(companiesData);
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const url = selectedCompanyId
        ? `/api/members?companyId=${selectedCompanyId}`
        : '/api/members';
      const response = await fetch(url);
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company?.name || 'Unknown Company';
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-slate-700 dark:text-slate-300" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Team Members</h1>
          </div>

          <Link
            href="/members/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            <Plus className="w-5 h-5" />
            New Member
          </Link>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Filter by Company
          </label>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        {members.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-12 text-center border border-slate-200 dark:border-slate-700">
            <Users className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              No team members yet
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {selectedCompanyId
                ? 'No members found for this company'
                : 'Add your first team member to get started'}
            </p>
            {!selectedCompanyId && (
              <Link
                href="/members/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                <Plus className="w-5 h-5" />
                Add Team Member
              </Link>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member) => (
              <Link
                key={member.id}
                href={`/members/${member.id}`}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.fullName || member.name || 'Team member avatar'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {member.fullName || member.name}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {member.role}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Building2 className="w-4 h-4" />
                    {getCompanyName(member.companyId)}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {member.email && member.email.trim() !== '' ? member.email : 'Email not provided'}
                  </p>
                </div>

                {member.superpowers && member.superpowers.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Superpowers
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {member.superpowers.slice(0, 3).map((superpower, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded"
                        >
                          {superpower}
                        </span>
                      ))}
                      {member.superpowers.length > 3 && (
                        <span className="px-2 py-1 text-slate-600 dark:text-slate-400 text-xs">
                          +{member.superpowers.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
