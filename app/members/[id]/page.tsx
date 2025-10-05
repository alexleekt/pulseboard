'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Loader2, ArrowLeft, BookOpen, Edit, Calendar, Settings as SettingsIcon, Sparkles, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import type { TeamMember, Company, DiaryEntry } from '@/lib/types';
import { ErrorDialog } from '@/components/ui/ErrorDialog';
import { GeneratingStatus } from '@/components/ui/GeneratingStatus';

export default function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const isNew = id === 'new';

  const [member, setMember] = useState<Partial<TeamMember>>({
    name: '',
    companyId: '',
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string; fix?: string } | null>(null);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [newDiaryContent, setNewDiaryContent] = useState('');
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [editDiaryContent, setEditDiaryContent] = useState('');
  const [editDiaryTimestamp, setEditDiaryTimestamp] = useState('');
  const [generatingProfile, setGeneratingProfile] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadCompanies();
    if (!isNew) {
      loadMember();
      loadDiaries();
    }
  }, [id, isNew]);

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

  const saveMember = async () => {
    if (!member.name || !member.companyId) {
      alert('Name and company are required');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        isNew ? '/api/members' : `/api/members/${id}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...member,
            email: member.email || `${member.name?.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            role: member.role || '',
            influence: member.influence || '',
            projectImpacts: member.projectImpacts || '',
            superpowers: member.superpowers || [],
            growthAreas: member.growthAreas || [],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (isNew) {
          router.push(`/members/${data.id}`);
        } else {
          await loadMember();
        }
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

  const loadDiaries = async () => {
    try {
      const response = await fetch(`/api/diaries?memberId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setDiaries(data);
      }
    } catch (error) {
      console.error('Failed to load diaries:', error);
    }
  };

  const addDiary = async () => {
    if (!newDiaryContent.trim()) return;

    setAutoSaving(true);
    try {
      const response = await fetch('/api/diaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: id,
          companyId: member.companyId,
          content: newDiaryContent,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setNewDiaryContent('');
        await loadDiaries();
      }
    } catch (error) {
      console.error('Failed to add diary:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  const autoSaveDiary = (content: string) => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    const timeout = setTimeout(() => {
      if (content.trim() && content.trim().length > 10) {
        addDiary();
      }
    }, 3000); // Auto-save after 3 seconds of inactivity

    setAutoSaveTimeout(timeout);
  };

  const handleDiaryContentChange = (content: string) => {
    setNewDiaryContent(content);
    autoSaveDiary(content);
  };

  const startEditDiary = (diary: DiaryEntry) => {
    setEditingDiaryId(diary.id);
    setEditDiaryContent(diary.content);
    setEditDiaryTimestamp(new Date(diary.timestamp).toISOString().slice(0, 16));
  };

  const updateDiary = async (silent = false) => {
    if (!editingDiaryId || !editDiaryContent.trim()) return;

    if (!silent) setAutoSaving(true);
    try {
      const response = await fetch(`/api/diaries/${editingDiaryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editDiaryContent,
          timestamp: editDiaryTimestamp || new Date().toISOString(),
        }),
      });

      if (response.ok && !silent) {
        setEditingDiaryId(null);
        setEditDiaryContent('');
        setEditDiaryTimestamp('');
        await loadDiaries();
      } else if (response.ok) {
        await loadDiaries();
      }
    } catch (error) {
      console.error('Failed to update diary:', error);
    } finally {
      if (!silent) setAutoSaving(false);
    }
  };

  const autoSaveEditDiary = (content: string) => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    const timeout = setTimeout(async () => {
      if (content.trim()) {
        await updateDiary(true);
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    setAutoSaveTimeout(timeout);
  };

  const handleEditDiaryContentChange = (content: string) => {
    setEditDiaryContent(content);
    autoSaveEditDiary(content);
  };

  const cancelEditDiary = () => {
    setEditingDiaryId(null);
    setEditDiaryContent('');
    setEditDiaryTimestamp('');
  };

  const deleteDiaryEntry = async (diaryId: string) => {
    if (!confirm('Are you sure you want to delete this diary entry?')) return;

    try {
      const response = await fetch(`/api/diaries/${diaryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadDiaries();
      }
    } catch (error) {
      console.error('Failed to delete diary:', error);
    }
  };

  const generateProfile = async () => {
    setGeneratingProfile(true);
    try {
      const response = await fetch('/api/generate/member-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: id }),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedMember = {
          ...member,
          influence: data.influence || member.influence,
          projectImpacts: data.projectImpacts || member.projectImpacts,
          superpowers: data.superpowers || member.superpowers,
          growthAreas: data.growthAreas || member.growthAreas,
        };
        setMember(updatedMember);

        // Auto-save the generated profile
        try {
          const saveResponse = await fetch(`/api/members/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedMember),
          });

          if (saveResponse.ok) {
            await loadMember();
          }
        } catch (saveError) {
          console.error('Failed to save generated profile:', saveError);
        }
      } else {
        const errorData = await response.json();
        setError({
          message: errorData.error || 'Profile generation failed',
          details: errorData.details,
          fix: errorData.fix
        });
      }
    } catch (error) {
      console.error('Profile generation error:', error);
      setError({
        message: 'Network error',
        details: 'Could not connect to the server.',
        fix: 'Check your internet connection and try again.'
      });
    } finally {
      setGeneratingProfile(false);
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
          href="/members"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Team Members
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-slate-700 dark:text-slate-300" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {isNew ? 'New Team Member' : member.name}
            </h1>
          </div>

          {!isNew && (
            <Link
              href={`/members/${id}/settings`}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium"
            >
              <SettingsIcon className="w-5 h-5" />
              Settings
            </Link>
          )}
        </div>

        {isNew ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700 space-y-6">
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

            <div className="flex items-center gap-4 pt-4">
              <button
                onClick={saveMember}
                disabled={saving}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5" />
                    Create Team Member
                  </>
                )}
              </button>

              <Link
                href="/members"
                className="px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg font-medium"
              >
                Cancel
              </Link>
            </div>
          </div>
        ) : (
          <>
            {member.influence || member.projectImpacts || (member.superpowers && member.superpowers.length > 0) || (member.growthAreas && member.growthAreas.length > 0) ? (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Profile Insights</h2>
                  {diaries.length > 0 && (
                    <button
                      onClick={generateProfile}
                      disabled={generatingProfile}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {generatingProfile ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3" />
                          Refresh
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  {member.influence && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Influence</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{member.influence}</p>
                    </div>
                  )}

                  {member.projectImpacts && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Project Impacts</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{member.projectImpacts}</p>
                    </div>
                  )}

                  {member.superpowers && member.superpowers.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Superpowers</h3>
                      <div className="flex flex-wrap gap-2">
                        {member.superpowers.map((superpower, index) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-lg"
                          >
                            {superpower}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {member.growthAreas && member.growthAreas.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Growth Areas</h3>
                      <div className="flex flex-wrap gap-2">
                        {member.growthAreas.map((area, index) => (
                          <span
                            key={index}
                            className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-sm rounded-lg"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              diaries.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-900 dark:text-blue-100 mb-3">
                        Generate profile insights from work diary entries
                      </p>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={generateProfile}
                          disabled={generatingProfile}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {generatingProfile ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Generate Profile from Diary
                            </>
                          )}
                        </button>
                        <GeneratingStatus isGenerating={generatingProfile} label="AI Analysis" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-6">
                <BookOpen className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Work Diary</h2>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      New Entry
                    </label>
                    {autoSaving && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Saving...
                      </div>
                    )}
                  </div>
                  <textarea
                    value={newDiaryContent}
                    onChange={(e) => handleDiaryContentChange(e.target.value)}
                    onBlur={addDiary}
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="What did you work on today? (Auto-saves after 3 seconds)"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {diaries.length === 0 ? (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                    No diary entries yet. Add your first entry above.
                  </p>
                ) : (
                  diaries.map((diary) => (
                    <div
                      key={diary.id}
                      className="border border-slate-200 dark:border-slate-700 rounded-lg p-4"
                    >
                      {editingDiaryId === diary.id ? (
                        <div className="space-y-4">
                          <div>
                            {autoSaving && (
                              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-2">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Saving...
                              </div>
                            )}
                            <textarea
                              value={editDiaryContent}
                              onChange={(e) => handleEditDiaryContentChange(e.target.value)}
                              rows={4}
                              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex items-end gap-4">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Date & Time
                              </label>
                              <input
                                type="datetime-local"
                                value={editDiaryTimestamp}
                                onChange={(e) => setEditDiaryTimestamp(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateDiary(false)}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                              >
                                Done
                              </button>
                              <button
                                onClick={cancelEditDiary}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg text-sm font-medium"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                              <Calendar className="w-4 h-4" />
                              {new Date(diary.timestamp).toLocaleString()}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEditDiary(diary)}
                                className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteDiaryEntry(diary.id)}
                                className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-slate-900 dark:text-white whitespace-pre-wrap">
                            {diary.content}
                          </p>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
