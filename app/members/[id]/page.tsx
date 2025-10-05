'use client';

import { useState, useEffect, use } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Users, Loader2, ArrowLeft, BookOpen, Edit, Calendar, Settings as SettingsIcon, Sparkles, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import type { TeamMember, Company, DiaryEntry } from '@/lib/types';
import { ErrorDialog } from '@/components/ui/ErrorDialog';
import { GeneratingStatus } from '@/components/ui/GeneratingStatus';
import { formatDistanceToNow, format } from 'date-fns';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });
const MarkdownPreview = dynamic(() => import('@uiw/react-markdown-preview'), { ssr: false });

function toLocalDateTimeInputValue(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const isNew = id === 'new';

  const [member, setMember] = useState<Partial<TeamMember>>({
    name: '',
    fullName: '',
    firstName: '',
    lastName: '',
    companyId: '',
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string; fix?: string } | null>(null);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [newDiaryContent, setNewDiaryContent] = useState('');
  const [todayDiaryId, setTodayDiaryId] = useState<string | null>(null);
  const [todayDiaryTimestamp, setTodayDiaryTimestamp] = useState<string | null>(null);
  const [todayDiaryCreatedAt, setTodayDiaryCreatedAt] = useState<string | null>(null);
  const [todayDiaryUpdatedAt, setTodayDiaryUpdatedAt] = useState<string | null>(null);
  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [editDiaryContent, setEditDiaryContent] = useState('');
  const [editDiaryTimestamp, setEditDiaryTimestamp] = useState('');
  const [generatingProfile, setGeneratingProfile] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<Date | null>(null);
  const [lastGeneratedLabel, setLastGeneratedLabel] = useState<string | null>(null);
  const [, bumpGeneratedTick] = useState(0);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualEntryContent, setManualEntryContent] = useState('');
  const [manualEntryTimestamp, setManualEntryTimestamp] = useState(() => toLocalDateTimeInputValue(new Date()));
  const [manualEntrySaving, setManualEntrySaving] = useState(false);
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');

  const combinedFirstLast = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
  const displayName = (member.fullName ?? '').trim() || combinedFirstLast || (member.name ?? '');
  const todaySavedDate = todayDiaryUpdatedAt
    ? new Date(todayDiaryUpdatedAt)
    : todayDiaryTimestamp
      ? new Date(todayDiaryTimestamp)
      : todayDiaryCreatedAt
        ? new Date(todayDiaryCreatedAt)
        : null;
  const todaySavedAbsolute = todaySavedDate && !Number.isNaN(todaySavedDate.getTime())
    ? format(todaySavedDate, 'PPpp')
    : null;
  const todaySavedRelative = todaySavedDate && !Number.isNaN(todaySavedDate.getTime())
    ? formatDistanceToNow(todaySavedDate, { addSuffix: true })
    : null;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setColorMode(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    if (isNew) {
      document.title = 'Pulseboard | New Team Member';
    } else if (displayName) {
      document.title = `Pulseboard | ${displayName}`;
    } else {
      document.title = 'Pulseboard | Team Member';
    }
  }, [displayName, isNew]);

  useEffect(() => {
    loadCompanies();
    if (!isNew) {
      loadMember();
      loadDiaries();
    }
  }, [id, isNew]);

  useEffect(() => {
    if (!lastGeneratedAt) {
      setLastGeneratedLabel(null);
      return;
    }

    const updateLabel = () => {
      setLastGeneratedLabel(formatDistanceToNow(lastGeneratedAt, { addSuffix: true }));
      bumpGeneratedTick(Date.now());
    };

    updateLabel();
    const interval = setInterval(updateLabel, 60000);
    return () => clearInterval(interval);
  }, [lastGeneratedAt]);

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
        if (data?.updatedAt) {
          const updated = new Date(data.updatedAt);
          if (!Number.isNaN(updated.getTime())) {
            setLastGeneratedAt(updated);
          }
        } else {
          setLastGeneratedAt(null);
        }
      }
    } catch (error) {
      console.error('Failed to load member:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveMember = async () => {
    const normalizedName = (member.fullName || combinedFirstLast || member.name || '').trim();
    if (!normalizedName || !member.companyId) {
      alert('Full name and company are required');
      return;
    }

    setSaving(true);
    try {
      const [primaryFirstName, ...remainingParts] = normalizedName.split(' ');
      const fallbackLastName = remainingParts.join(' ').trim();
      const rawEmail = member.email;
      const trimmedEmail = typeof rawEmail === 'string' ? rawEmail.trim() : undefined;
      const payload = {
        id: member.id,
        companyId: member.companyId,
        name: member.name?.trim() || normalizedName,
        fullName: member.fullName?.trim() || normalizedName,
        firstName: member.firstName?.trim() || primaryFirstName || normalizedName,
        lastName: member.lastName?.trim() || (fallbackLastName || undefined),
        email: rawEmail === undefined ? undefined : trimmedEmail,
        role: member.role || '',
        avatar: member.avatar,
        influence: member.influence || '',
        projectImpacts: member.projectImpacts || '',
        superpowers: member.superpowers || [],
        growthAreas: member.growthAreas || [],
      };
      const response = await fetch(
        isNew ? '/api/members' : `/api/members/${id}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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

  const isSameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  const loadDiaries = async () => {
    try {
      const response = await fetch(`/api/diaries?memberId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setDiaries(data);

        const today = new Date();
        const todaysEntry = data.find((entry: DiaryEntry) =>
          isSameDay(new Date(entry.timestamp), today)
        );

        if (todaysEntry) {
          setTodayDiaryId(todaysEntry.id);
          setTodayDiaryTimestamp(new Date(todaysEntry.timestamp).toISOString());
          setTodayDiaryCreatedAt(
            todaysEntry.createdAt
              ? new Date(todaysEntry.createdAt).toISOString()
              : new Date(todaysEntry.timestamp).toISOString()
          );
          setTodayDiaryUpdatedAt(
            todaysEntry.updatedAt
              ? new Date(todaysEntry.updatedAt).toISOString()
              : new Date(todaysEntry.timestamp).toISOString()
          );
          setNewDiaryContent(todaysEntry.content);
        } else {
          setTodayDiaryId(null);
          setTodayDiaryTimestamp(null);
          setTodayDiaryCreatedAt(null);
          setTodayDiaryUpdatedAt(null);
          setNewDiaryContent('');
        }
      }
    } catch (error) {
      console.error('Failed to load diaries:', error);
    }
  };

  const persistDiaryEntry = async () => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
      setAutoSaveTimeout(null);
    }
    if (!newDiaryContent.trim()) return;
    if (!member.companyId) return;

    setAutoSaving(true);
    try {
      const response = await fetch('/api/diaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: todayDiaryId || undefined,
          memberId: id,
          companyId: member.companyId,
          content: newDiaryContent,
          timestamp: todayDiaryTimestamp || new Date().toISOString(),
          createdAt: todayDiaryCreatedAt || new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const savedEntry = await response.json();
        setTodayDiaryId(savedEntry.id);
        setTodayDiaryTimestamp(new Date(savedEntry.timestamp).toISOString());
        setTodayDiaryCreatedAt(
          savedEntry.createdAt
            ? new Date(savedEntry.createdAt).toISOString()
            : new Date(savedEntry.timestamp).toISOString()
        );
        setTodayDiaryUpdatedAt(
          savedEntry.updatedAt
            ? new Date(savedEntry.updatedAt).toISOString()
            : new Date().toISOString()
        );
        await loadDiaries();
      }
    } catch (error) {
      console.error('Failed to add diary:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  const resetManualEntry = () => {
    setManualEntryContent('');
    setManualEntryTimestamp(toLocalDateTimeInputValue(new Date()));
  };

  const addManualDiary = async () => {
    if (!manualEntryContent.trim()) return;
    if (!manualEntryTimestamp) return;
    if (!member.companyId) {
      alert('Select a company before adding diary entries.');
      return;
    }

    const parsedTimestamp = new Date(manualEntryTimestamp);
    if (Number.isNaN(parsedTimestamp.getTime())) {
      alert('Please provide a valid date and time for the entry.');
      return;
    }

    setManualEntrySaving(true);
    try {
      const response = await fetch('/api/diaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: id,
          companyId: member.companyId,
          content: manualEntryContent,
          timestamp: parsedTimestamp.toISOString(),
        }),
      });

      if (response.ok) {
        resetManualEntry();
        setManualEntryOpen(false);
        await loadDiaries();
      } else {
        console.error('Failed to add manual diary entry');
      }
    } catch (error) {
      console.error('Failed to add manual diary:', error);
    } finally {
      setManualEntrySaving(false);
    }
  };

  const autoSaveDiary = (content: string) => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    const timeout = setTimeout(() => {
      if (content.trim() && content.trim().length > 10) {
        persistDiaryEntry();
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
        const now = new Date();
        const updatedMember = {
          ...member,
          influence: data.influence || member.influence,
          projectImpacts: data.projectImpacts || member.projectImpacts,
          superpowers: data.superpowers || member.superpowers,
          growthAreas: data.growthAreas || member.growthAreas,
          updatedAt: now,
        };
        setMember(updatedMember);
        setLastGeneratedAt(now);

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

  const pastDiaries = todayDiaryId
    ? diaries.filter((diary) => diary.id !== todayDiaryId)
    : diaries;

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
              {isNew ? 'New Team Member' : displayName || 'Team Member'}
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
                Full Name *
              </label>
              <input
                type="text"
                value={member.fullName || member.name || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const trimmed = value.trim();
                  let derivedFirst: string | undefined;
                  let derivedLast: string | undefined;

                  if (trimmed) {
                    const parts = trimmed.split(/\s+/);
                    derivedFirst = parts[0];
                    derivedLast = parts.length > 1 ? parts.slice(1).join(' ') : undefined;
                  }

                  setMember({
                    ...member,
                    name: value,
                    fullName: value,
                    firstName: derivedFirst,
                    lastName: derivedLast,
                  });
                }}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ada Lovelace"
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
                <div className="flex items-start justify-between mb-6 gap-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Profile Insights</h2>
                  <div className="flex flex-col items-end gap-2">
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
                    <GeneratingStatus isGenerating={generatingProfile} label="Generating" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Last generated: {lastGeneratedLabel ?? 'Never'}
                    </span>
                  </div>
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
                        <div className="flex flex-col gap-1 text-left sm:text-right">
                          <GeneratingStatus isGenerating={generatingProfile} label="AI Analysis" />
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Last generated: {lastGeneratedLabel ?? 'Never'}
                          </span>
                        </div>
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
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Today&apos;s Entry
                    </label>
                    <div className="flex flex-col sm:items-end gap-1 text-xs text-slate-600 dark:text-slate-400">
                      {autoSaving && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Saving...</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Last saved:</span>
                        {todaySavedAbsolute ? (
                          <>
                            <span>{todaySavedAbsolute}</span>
                            <span className="text-slate-400">({todaySavedRelative})</span>
                          </>
                        ) : (
                          <span className="italic">Not saved yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-300 dark:border-slate-600">
                    <MDEditor
                      value={newDiaryContent}
                      onChange={(value) => handleDiaryContentChange(value ?? '')}
                      onBlur={persistDiaryEntry}
                      height={220}
                      data-color-mode={colorMode}
                    />
                  </div>
                </div>

                <div className="border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Add entry for a previous day
                    </h3>
                    <button
                      type="button"
                      onClick={() => setManualEntryOpen((open) => !open)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {manualEntryOpen ? 'Close' : 'Add past entry'}
                    </button>
                  </div>

                  {manualEntryOpen && (
                    <div className="mt-4 space-y-4">
                      {manualEntrySaving && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Saving entry...
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Entry details
                        </label>
                        <div className={`rounded-lg border border-slate-300 dark:border-slate-600 ${manualEntrySaving ? 'opacity-60 pointer-events-none' : ''}`}>
                          <MDEditor
                            value={manualEntryContent}
                            onChange={(value) => setManualEntryContent(value ?? '')}
                            height={200}
                            data-color-mode={colorMode}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Entry date & time
                        </label>
                        <input
                          type="datetime-local"
                          value={manualEntryTimestamp}
                          onChange={(e) => setManualEntryTimestamp(e.target.value)}
                          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={manualEntrySaving}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={addManualDiary}
                          disabled={
                            manualEntrySaving ||
                            !manualEntryContent.trim() ||
                            !manualEntryTimestamp
                          }
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Save entry
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            resetManualEntry();
                            setManualEntryOpen(false);
                          }}
                          disabled={manualEntrySaving}
                          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg text-sm font-medium"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {diaries.length === 0 ? (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                    No diary entries yet. Add your first entry above.
                  </p>
                ) : pastDiaries.length === 0 ? (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-6">
                    No previous entries yet. Earlier days will appear here once logged.
                  </p>
                ) : (
                  pastDiaries.map((diary) => (
                    <div
                      key={diary.id}
                      className="border border-slate-200 dark:border-slate-700 rounded-lg p-4"
                    >
                      {editingDiaryId === diary.id ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            {autoSaving && (
                              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Saving...
                              </div>
                            )}
                            <div className="rounded-lg border border-slate-300 dark:border-slate-600">
                              <MDEditor
                                value={editDiaryContent}
                                onChange={(value) => handleEditDiaryContentChange(value ?? '')}
                                height={200}
                                data-color-mode={colorMode}
                              />
                            </div>
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
                          <div className="text-slate-900 dark:text-white md-preview">
                            <MarkdownPreview source={diary.content} data-color-mode={colorMode} />
                          </div>
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
