'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Save, Loader2, ArrowLeft, Trash2, AlertTriangle, Plus, X } from 'lucide-react';
import Link from 'next/link';
import type { TeamMember, Company } from '@/lib/types';
import { ErrorDialog } from '@/components/ui/ErrorDialog';

export default function MemberSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [member, setMember] = useState<Partial<TeamMember>>({
    name: '',
    email: '',
    role: '',
    avatar: '',
    companyId: '',
    influence: '',
    projectImpacts: '',
    superpowers: [],
    growthAreas: [],
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string; fix?: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [newSuperpower, setNewSuperpower] = useState('');
  const [newGrowthArea, setNewGrowthArea] = useState('');

  useEffect(() => {
    loadCompanies();
    loadMember();
  }, [id]);

  useEffect(() => {
    if (member.name) {
      document.title = `Pulseboard | ${member.name} Settings`;
    } else {
      document.title = 'Pulseboard | Member Settings';
    }
  }, [member.name]);

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      const data = await response.json();
      setCompanies(data);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  const loadMember = async () => {
    try {
      const response = await fetch(`/api/members/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMember(data);
      }
    } catch (error) {
      console.error('Failed to load member:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSuperpower = () => {
    if (!newSuperpower.trim()) return;
    const superpowers = member.superpowers || [];
    if (superpowers.length >= 5) {
      alert('Maximum 5 superpowers allowed');
      return;
    }
    setMember({ ...member, superpowers: [...superpowers, newSuperpower.trim()] });
    setNewSuperpower('');
  };

  const removeSuperpower = (index: number) => {
    const superpowers = member.superpowers || [];
    setMember({
      ...member,
      superpowers: superpowers.filter((_, i) => i !== index),
    });
  };

  const addGrowthArea = () => {
    if (!newGrowthArea.trim()) return;
    const growthAreas = member.growthAreas || [];
    if (growthAreas.length >= 5) {
      alert('Maximum 5 growth areas allowed');
      return;
    }
    setMember({ ...member, growthAreas: [...growthAreas, newGrowthArea.trim()] });
    setNewGrowthArea('');
  };

  const removeGrowthArea = (index: number) => {
    const growthAreas = member.growthAreas || [];
    setMember({
      ...member,
      growthAreas: growthAreas.filter((_, i) => i !== index),
    });
  };

  const saveMember = async () => {
    if (!member.name || !member.companyId) {
      alert('Name and company are required');
      return;
    }

    setSaving(true);
    try {
      const rawEmail = member.email;
      const payload = {
        ...member,
        email: typeof rawEmail === 'string' ? rawEmail.trim() : rawEmail,
      };

      const response = await fetch(`/api/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push(`/members/${id}`);
      } else {
        alert('Failed to save team member');
      }
    } catch (error) {
      console.error('Failed to save member:', error);
      alert('Failed to save team member');
    } finally {
      setSaving(false);
    }
  };

  const deleteMember = async () => {
    if (!member.name || deleteConfirmation !== member.name) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/members/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/members');
      } else {
        setError({
          message: 'Failed to delete team member',
          details: 'Unable to delete team member. Please try again.',
        });
      }
    } catch (error) {
      console.error('Failed to delete member:', error);
      setError({
        message: 'Failed to delete team member',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setDeleting(false);
    }
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
      <ErrorDialog
        error={error?.message || null}
        details={error?.details}
        fix={error?.fix}
        onClose={() => setError(null)}
      />
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/members/${id}`}
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {member.name}
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8 text-slate-700 dark:text-slate-300" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Member Settings
          </h1>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={member.name || ''}
                onChange={(e) => setMember({ ...member, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email (optional)
              </label>
              <input
                type="email"
                value={member.email || ''}
                onChange={(e) => setMember({ ...member, email: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Company *
              </label>
              <select
                value={member.companyId || ''}
                onChange={(e) => setMember({ ...member, companyId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Role
              </label>
              <input
                type="text"
                value={member.role || ''}
                onChange={(e) => setMember({ ...member, role: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Software Engineer"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Avatar URL
            </label>
            <input
              type="text"
              value={member.avatar || ''}
              onChange={(e) => setMember({ ...member, avatar: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Influence
            </label>
            <textarea
              value={member.influence || ''}
              onChange={(e) => setMember({ ...member, influence: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="How does this person influence the team and organization?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Project Impacts
            </label>
            <textarea
              value={member.projectImpacts || ''}
              onChange={(e) => setMember({ ...member, projectImpacts: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What impact has this person had on projects?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Superpowers (3-5)
            </label>
            <div className="space-y-2">
              {(member.superpowers || []).map((superpower, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={superpower}
                    readOnly
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <button
                    onClick={() => removeSuperpower(index)}
                    className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSuperpower}
                  onChange={(e) => setNewSuperpower(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSuperpower()}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add a superpower..."
                />
                <button
                  onClick={addSuperpower}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Growth Areas (3-5)
            </label>
            <div className="space-y-2">
              {(member.growthAreas || []).map((area, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={area}
                    readOnly
                    className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <button
                    onClick={() => removeGrowthArea(index)}
                    className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newGrowthArea}
                  onChange={(e) => setNewGrowthArea(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addGrowthArea()}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add a growth area..."
                />
                <button
                  onClick={addGrowthArea}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              onClick={saveMember}
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
                  Save Settings
                </>
              )}
            </button>

            <Link
              href={`/members/${id}`}
              className="px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium"
            >
              Cancel
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-red-200 dark:border-red-900 mt-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h2 className="text-xl font-bold text-red-900 dark:text-red-100">Danger Zone</h2>
          </div>

          <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
            Deleting this team member will permanently remove all associated data, including diary entries. This action cannot be undone.
          </p>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <label className="block text-sm font-medium text-red-900 dark:text-red-100 mb-2">
              Type <span className="font-mono font-bold">{member.name}</span> to confirm deletion:
            </label>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
              placeholder={member.name}
            />

            <button
              onClick={deleteMember}
              disabled={deleting || deleteConfirmation !== member.name}
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
                  Delete Team Member Permanently
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
