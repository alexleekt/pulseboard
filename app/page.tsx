"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Users, Settings, BarChart3, Loader2, Sparkles, Trash2, Plus } from 'lucide-react';
import type { Company, DiaryDraft, TeamMember, DiaryEntry } from '@/lib/types';
import { format, formatDistanceToNow, isSameDay } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });
const MarkdownPreview = dynamic(() => import('@uiw/react-markdown-preview'), { ssr: false });

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type MemberWithHandle = TeamMember & { handle: string };
type CompanyWithHandle = Company & { handle: string };

type QuickEntry = {
  id: string;
  content: string;
  saveState: SaveState;
  saveMessage: string;
  lastSavedAt: Date | null;
  lastClassifiedAt: Date | null;
  lastSavedContent: string;
};

const AUTOSAVE_DELAY_MS = 2_000;
const CLASSIFICATION_DELAY_MS = 5 * 60_000;

const slugifyHandle = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

type HandleOptions = {
  marker?: string;
  slugPrefix?: string;
};

function createHandle(
  name: string,
  id: string,
  options: HandleOptions | undefined,
  used: Set<string>
) {
  let base = slugifyHandle(name);
  if (!base) {
    base = id.slice(0, 6).toLowerCase();
  }
  const handleBase = options?.slugPrefix ? `${options.slugPrefix}-${base}` : base;
  const marker = options?.marker ?? '@';
  let handle = `${marker}${handleBase}`;
  let suffix = 1;
  while (used.has(handle.toLowerCase())) {
    handle = `${marker}${handleBase}-${suffix++}`;
  }
  used.add(handle.toLowerCase());
  return handle;
}

function withHandles<T extends { id: string }>(
  items: T[],
  getName: (item: T) => string,
  options?: HandleOptions
): Array<T & { handle: string }> {
  const used = new Set<string>();
  return items.map((item) => ({
    ...item,
    handle: createHandle(getName(item), item.id, options, used),
  }));
}

const createQuickEntry = (): QuickEntry => ({
  id: uuidv4(),
  content: '',
  saveState: 'idle',
  saveMessage: '',
  lastSavedAt: null,
  lastClassifiedAt: null,
  lastSavedContent: '',
});

export default function Home() {
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');
  const [entries, setEntries] = useState<QuickEntry[]>(() => [createQuickEntry()]);
  const [drafts, setDrafts] = useState<DiaryDraft[]>([]);
  const [members, setMembers] = useState<MemberWithHandle[]>([]);
  const [companies, setCompanies] = useState<CompanyWithHandle[]>([]);
  const [assigning, setAssigning] = useState<Record<string, boolean>>({});
  const [classifyingDrafts, setClassifyingDrafts] = useState<Record<string, boolean>>({});
  const [draftSelections, setDraftSelections] = useState<Record<string, string[]>>({});
  const [recentEntries, setRecentEntries] = useState<DiaryEntry[]>([]);
  const [showingTodayEntries, setShowingTodayEntries] = useState(false);

  const autoSaveTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const classifyTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const entriesRef = useRef<QuickEntry[]>(entries);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const dark = document.documentElement.classList.contains('dark');
      setColorMode(dark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      if (document.documentElement.classList.contains('dark')) {
        setColorMode('dark');
      } else {
        setColorMode('light');
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  useEffect(() => {
    document.title = "Pulseboard | Today's Activity";
  }, []);

  useEffect(
    () => () => {
      autoSaveTimers.current.forEach((timer) => clearTimeout(timer));
      classifyTimers.current.forEach((timer) => clearTimeout(timer));
    },
    []
  );

  const fetchDrafts = useCallback(async () => {
    try {
      const response = await fetch('/api/diaries/quick', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      setDrafts(data.drafts || []);
      setDraftSelections((prev) => {
        const next = { ...prev };
        (data.drafts || []).forEach((draft: DiaryDraft) => {
          if (!next[draft.id]) {
            if (draft.suggestedMemberId) {
              next[draft.id] = [draft.suggestedMemberId];
            } else if (draft.mentionedMemberIds?.length) {
              next[draft.id] = draft.mentionedMemberIds;
            } else {
              next[draft.id] = [];
            }
          }
        });
        return next;
      });
    } catch (error) {
      console.error('Failed to load drafts:', error);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch('/api/members', { cache: 'no-store' });
      if (!response.ok) return;
      const data: TeamMember[] = await response.json();
      setMembers(withHandles(data || [], (member) => member.fullName || member.name));
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await fetch('/api/companies', { cache: 'no-store' });
      if (!response.ok) return;
      const data: Company[] = await response.json();
      setCompanies(withHandles(data || [], (company) => company.name, { marker: '^' }));
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  }, []);

  const fetchRecentEntries = useCallback(async () => {
    try {
      const response = await fetch('/api/diaries', { cache: 'no-store' });
      if (!response.ok) {
        setRecentEntries([]);
        setShowingTodayEntries(false);
        return;
      }
      const data: DiaryEntry[] = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        setRecentEntries([]);
        setShowingTodayEntries(false);
        return;
      }

      const sorted = [...data].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const today = new Date();
      const todaysEntries = sorted.filter((entry) =>
        isSameDay(new Date(entry.timestamp), today)
      );
      if (todaysEntries.length > 0) {
        setRecentEntries(todaysEntries);
        setShowingTodayEntries(true);
      } else {
        setRecentEntries(sorted.slice(0, 3));
        setShowingTodayEntries(false);
      }
    } catch (error) {
      console.error('Failed to load recent entries:', error);
      setRecentEntries([]);
      setShowingTodayEntries(false);
    }
  }, []);

  useEffect(() => {
    fetchDrafts();
    fetchMembers();
    fetchCompanies();
    fetchRecentEntries();
  }, [fetchDrafts, fetchMembers, fetchCompanies, fetchRecentEntries]);

  const memberHandleMap = useMemo(() => {
    const map = new Map<string, MemberWithHandle>();
    members.forEach((member) => map.set(member.handle.toLowerCase(), member));
    return map;
  }, [members]);

  const companyHandleMap = useMemo(() => {
    const map = new Map<string, CompanyWithHandle>();
    companies.forEach((company) => map.set(company.handle.toLowerCase(), company));
    return map;
  }, [companies]);

  const memberIdMap = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members]
  );
  const companyIdMap = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies]
  );

  const analyzeMentions = useCallback(
    (content: string) => {
      const mentionRegex = /([@^])([a-z0-9][a-z0-9-_]*)/gi;
      const memberIds = new Set<string>();
      const companyIds = new Set<string>();
      const unknownHandles = new Set<string>();

      let match: RegExpExecArray | null;
      while ((match = mentionRegex.exec(content)) !== null) {
        const marker = match[1];
        const slug = match[2].toLowerCase();
        const handle = `${marker}${slug}`;
        if (marker === '@' && memberHandleMap.has(handle)) {
          memberIds.add(memberHandleMap.get(handle)!.id);
        } else if (marker === '^' && companyHandleMap.has(handle)) {
          companyIds.add(companyHandleMap.get(handle)!.id);
        } else {
          unknownHandles.add(handle);
        }
      }

      return {
        memberIds: Array.from(memberIds),
        companyIds: Array.from(companyIds),
        unknownHandles: Array.from(unknownHandles),
      };
    },
    [memberHandleMap, companyHandleMap]
  );

  const clearTimersForEntry = useCallback((id: string) => {
    const autoTimer = autoSaveTimers.current.get(id);
    if (autoTimer) {
      clearTimeout(autoTimer);
      autoSaveTimers.current.delete(id);
    }
    const classifyTimer = classifyTimers.current.get(id);
    if (classifyTimer) {
      clearTimeout(classifyTimer);
      classifyTimers.current.delete(id);
    }
  }, []);

  const classifyEntry = useCallback(
    async (id: string) => {
      const entry = entriesRef.current.find((item) => item.id === id);
      if (!entry) return;

      const trimmed = entry.content.trim();
      if (!trimmed) {
        clearTimersForEntry(id);
        return;
      }

      const existingTimer = classifyTimers.current.get(id);
      if (existingTimer) {
        clearTimeout(existingTimer);
        classifyTimers.current.delete(id);
      }

      setEntries((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                saveState: 'saving',
                saveMessage: 'Classifying entry...',
              }
            : item
        )
      );

      const mentions = analyzeMentions(trimmed);

      try {
        const response = await fetch('/api/diaries/quick', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: trimmed,
            mentionMemberIds: mentions.memberIds,
            mentionCompanyIds: mentions.companyIds,
          }),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

       const data = await response.json();
       const now = new Date();

        if (data.status === 'assigned') {
          const name = data.member?.name || 'a team member';
          setEntries((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    content: '',
                    lastSavedContent: '',
                    saveState: 'saved',
                    saveMessage:
                      data.reasoning || `Entry routed to ${data.member?.handle || name}.`,
                    lastSavedAt: now,
                    lastClassifiedAt: now,
                  }
                : item
            )
          );
          await fetchRecentEntries();
        } else if (Array.isArray(data.entries) && data.entries.length > 0) {
          const names = data.entries
            .map((entry: any) => entry.handle || entry.name)
            .filter(Boolean)
            .join(', ');
          setEntries((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    content: '',
                    lastSavedContent: '',
                    saveState: 'saved',
                    saveMessage: data.reasoning || `Entry routed to ${names || 'selected members'}.`,
                    lastSavedAt: now,
                    lastClassifiedAt: now,
                  }
                : item
            )
          );
          await fetchRecentEntries();
        } else {
          setEntries((prev) =>
            prev.map((item) =>
              item.id === id
                ? {
                    ...item,
                    content: '',
                    lastSavedContent: '',
                    saveState: 'saved',
                    saveMessage:
                      data.reasoning ||
                      'Entry stored as draft. Assign it when you are ready.',
                    lastSavedAt: now,
                    lastClassifiedAt: now,
                  }
                : item
            )
          );
          fetchDrafts();
          await fetchRecentEntries();
        }

        clearTimersForEntry(id);
      } catch (error) {
        console.error('Failed to classify entry:', error);
        setEntries((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  saveState: 'error',
                  saveMessage: 'Classification failed. Will retry in 5 minutes.',
                }
              : item
          )
        );
        const retryTimer = setTimeout(() => classifyEntry(id), CLASSIFICATION_DELAY_MS);
        classifyTimers.current.set(id, retryTimer);
        return;
      }

      fetchDrafts();
      classifyTimers.current.delete(id);
    },
    [analyzeMentions, clearTimersForEntry, fetchDrafts]
  );

  const scheduleClassification = useCallback(
    (id: string) => {
      const entry = entriesRef.current.find((item) => item.id === id);
      if (!entry) return;
      const trimmed = entry.content.trim();
      const existingTimer = classifyTimers.current.get(id);
      if (existingTimer) {
        clearTimeout(existingTimer);
        classifyTimers.current.delete(id);
      }
      if (!trimmed) return;
      const timer = setTimeout(() => classifyEntry(id), CLASSIFICATION_DELAY_MS);
      classifyTimers.current.set(id, timer);
    },
    [classifyEntry]
  );

  const saveEntry = useCallback(
    (id: string, rawContent: string) => {
      const entry = entriesRef.current.find((item) => item.id === id);
      if (!entry) return;

      const trimmed = rawContent.trim();
      const autoTimer = autoSaveTimers.current.get(id);
      if (autoTimer) {
        clearTimeout(autoTimer);
        autoSaveTimers.current.delete(id);
      }

      if (!trimmed) {
        clearTimersForEntry(id);
        setEntries((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  saveState: 'idle',
                  saveMessage: '',
                  lastSavedAt: null,
                  lastClassifiedAt: null,
                  lastSavedContent: '',
                }
              : item
          )
        );
        return;
      }

      if (entry.lastSavedContent === trimmed) {
        setEntries((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  saveState: 'saved',
                  saveMessage: 'Awaiting classification (about 5 minutes)...',
                  lastSavedAt: item.lastSavedAt ?? new Date(),
                }
              : item
          )
        );
      } else {
        const now = new Date();
        setEntries((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  saveState: 'saved',
                  saveMessage: 'Saved locally. Classification will run in about 5 minutes.',
                  lastSavedAt: now,
                  lastSavedContent: trimmed,
                }
              : item
          )
        );
      }

      scheduleClassification(id);
    },
    [clearTimersForEntry, scheduleClassification]
  );

  const scheduleAutoSave = useCallback(
    (id: string, content: string) => {
      const existingTimer = autoSaveTimers.current.get(id);
      if (existingTimer) {
        clearTimeout(existingTimer);
        autoSaveTimers.current.delete(id);
      }

      const trimmed = content.trim();
      if (!trimmed) {
        saveEntry(id, content);
        return;
      }

      const timer = setTimeout(() => saveEntry(id, content), AUTOSAVE_DELAY_MS);
      autoSaveTimers.current.set(id, timer);
    },
    [saveEntry]
  );

  const handleContentChange = useCallback(
    (id: string, value: string) => {
      setEntries((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                content: value,
                saveState: value.trim() ? 'saving' : 'idle',
                saveMessage: value.trim() ? 'Auto-saving...' : '',
              }
            : item
        )
      );
      scheduleAutoSave(id, value);
    },
    [scheduleAutoSave]
  );

  const handleBlur = useCallback(
    (id: string) => {
      const entry = entriesRef.current.find((item) => item.id === id);
      if (!entry) return;
      saveEntry(id, entry.content);
    },
    [saveEntry]
  );

  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, createQuickEntry()]);
  }, []);

  const removeEntry = useCallback(
    (id: string) => {
      if (entriesRef.current.length === 1) {
        clearTimersForEntry(id);
        setEntries([createQuickEntry()]);
        return;
      }
      clearTimersForEntry(id);
      setEntries((prev) => prev.filter((item) => item.id !== id));
    },
    [clearTimersForEntry]
  );

const assignDraft = useCallback(
  async (draftId: string, memberIds: string[]) => {
      const unique = Array.from(new Set(memberIds.filter(Boolean)));
      if (unique.length === 0) return;
      setAssigning((prev) => ({ ...prev, [draftId]: true }));
      try {
        const response = await fetch(`/api/diaries/quick/${draftId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ memberIds: unique }),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        await fetchDrafts();
        await fetchRecentEntries();
        setDraftSelections((prev) => {
          const next = { ...prev };
          delete next[draftId];
          return next;
        });
      } catch (error) {
        console.error('Failed to assign draft:', error);
      } finally {
        setAssigning((prev) => ({ ...prev, [draftId]: false }));
      }
  },
  [fetchDrafts]
);

const deleteDraft = useCallback(async (draftId: string) => {
    setAssigning((prev) => ({ ...prev, [draftId]: true }));
    try {
      const response = await fetch(`/api/diaries/quick/${draftId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      await fetchDrafts();
      await fetchRecentEntries();
      setDraftSelections((prev) => {
        const next = { ...prev };
        delete next[draftId];
        return next;
      });
    } catch (error) {
      console.error('Failed to delete draft:', error);
    } finally {
      setAssigning((prev) => ({ ...prev, [draftId]: false }));
    }
  }, [fetchDrafts]);

  const forceClassifyDraft = useCallback(
    async (draft: DiaryDraft) => {
      setClassifyingDrafts((prev) => ({ ...prev, [draft.id]: true }));
      try {
        const response = await fetch('/api/diaries/quick', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: draft.content,
            mentionMemberIds: draft.mentionedMemberIds || [],
            mentionCompanyIds: draft.mentionedCompanyIds || [],
          }),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'assigned' || (Array.isArray(data.entries) && data.entries.length > 0)) {
          await fetchDrafts();
          await fetchRecentEntries();
        } else {
          await fetchDrafts();
        }
      } catch (error) {
        console.error('Failed to classify draft immediately:', error);
      } finally {
        setClassifyingDrafts((prev) => {
          const next = { ...prev };
          delete next[draft.id];
          return next;
        });
      }
    },
    [fetchDrafts, fetchRecentEntries]
  );

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto space-y-12">
          <header className="text-center">
            <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Pulseboard
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300">
              AI-Powered Team Member Tracking & Insights
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              100% Offline • Local-First • Privacy-Focused
            </p>
          </header>

          <section className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 space-y-6">
            <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-blue-500 dark:text-blue-300 mt-1" />
            <div className="flex-1 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                      Quick Diary Capture
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Drop ideas, updates, or wins. We will route them to the right teammate automatically after 5 minutes of inactivity.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  {members.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-600 dark:text-slate-300">Teammate handles:</span>
                      {members.slice(0, 6).map((member) => (
                        <code key={member.id} className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">
                          {member.handle}
                        </code>
                      ))}
                      {members.length > 6 && <span>…</span>}
                    </div>
                  )}
                  {companies.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-600 dark:text-slate-300">Company handles:</span>
                      {companies.slice(0, 6).map((company) => (
                        <code key={company.id} className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">
                          {company.handle}
                        </code>
                      ))}
                      {companies.length > 6 && <span>…</span>}
                    </div>
                  )}
                  <p>
                    Use <code className="px-1 bg-slate-200 dark:bg-slate-700 rounded">@handle</code> in your note to tag specific teammates or companies.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {entries.map((entry, index) => {
                const mentions = analyzeMentions(entry.content);
                const lastSavedDisplay = entry.lastSavedAt
                  ? {
                      absolute: format(entry.lastSavedAt, 'PPpp'),
                      relative: formatDistanceToNow(entry.lastSavedAt, { addSuffix: true }),
                    }
                  : null;
                const statusClass =
                  entry.saveState === 'error'
                    ? 'text-red-500'
                    : 'text-slate-500 dark:text-slate-400';

                return (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-4 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {entries.length > 1 ? `Entry #${index + 1}` : 'Current entry'}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Autosaves every few seconds. We wait 5 minutes after your last edit before classifying it with AI.
                        </p>
                      </div>
                      {entries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          className="text-slate-400 hover:text-red-500"
                          title="Remove entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {lastSavedDisplay && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-slate-600 dark:text-slate-300">Last saved:</span>{' '}
                        {lastSavedDisplay.absolute}{' '}
                        <span className="text-slate-400">({lastSavedDisplay.relative})</span>
                      </div>
                    )}

                    <div
                      className={`rounded-lg border border-slate-300 dark:border-slate-600 ${
                        entry.saveState === 'saving' ? 'ring-1 ring-blue-500/40' : ''
                      }`}
                    >
                      <MDEditor
                        value={entry.content}
                        onChange={(val) => handleContentChange(entry.id, val ?? '')}
                        onBlur={() => handleBlur(entry.id)}
                        height={220}
                        data-color-mode={colorMode}
                        textareaProps={{
                        placeholder:
                            'What happened today? Mention teammates like @alex or companies like ^acme.',
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className={statusClass}>{entry.saveMessage}</span>
                      {entry.saveState === 'saving' && (
                        <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                      )}
                    </div>

                    {(mentions.memberIds.length > 0 ||
                      mentions.companyIds.length > 0 ||
                      mentions.unknownHandles.length > 0) && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        {mentions.memberIds.length > 0 && (
                          <span>
                            Tagged members:
                            {mentions.memberIds.map((memberId) => {
                              const member = memberIdMap.get(memberId);
                              return member ? (
                                <code
                                  key={memberId}
                                  className="ml-1 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded"
                                >
                                  {member.handle}
                                </code>
                              ) : null;
                            })}
                          </span>
                        )}
                        {mentions.companyIds.length > 0 && (
                          <span>
                            Tagged companies:
                            {mentions.companyIds.map((companyId) => {
                              const company = companyIdMap.get(companyId);
                              return company ? (
                                <code
                                  key={companyId}
                                  className="ml-1 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded"
                                >
                                  {company.handle}
                                </code>
                              ) : null;
                            })}
                          </span>
                        )}
                        {mentions.unknownHandles.length > 0 && (
                          <span>
                            Unknown handles:
                            {mentions.unknownHandles.map((handle) => (
                              <code
                                key={handle}
                                className="ml-1 px-2 py-0.5 bg-amber-200 dark:bg-amber-700/60 rounded text-amber-800 dark:text-amber-200"
                              >
                                {handle}
                              </code>
                            ))}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addEntry}
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add another entry
            </button>

            {drafts.length > 0 && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Drafts awaiting assignment
                </h3>
                <div className="space-y-4">
                  {drafts.map((draft) => {
                    const suggestedMember = draft.suggestedMemberId
                      ? memberIdMap.get(draft.suggestedMemberId)
                      : undefined;
                    const created = format(new Date(draft.createdAt), 'PPpp');
                    const relative = formatDistanceToNow(new Date(draft.createdAt), {
                      addSuffix: true,
                    });
                    return (
                      <div
                        key={draft.id}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                              Captured {created}{' '}
                              <span className="text-slate-400">({relative})</span>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <MarkdownPreview source={draft.content} data-color-mode={colorMode} />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteDraft(draft.id)}
                            className="text-slate-400 hover:text-red-500"
                            title="Delete draft"
                            disabled={assigning[draft.id]}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-medium text-slate-600 dark:text-slate-300">LLM reasoning:</span>{' '}
                          {draft.reasoning || 'No reasoning provided.'}
                        </div>
                        {(draft.mentionedMemberIds?.length || draft.mentionedCompanyIds?.length) && (
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            {draft.mentionedMemberIds?.length ? (
                              <span>
                                Tagged members:
                                {draft.mentionedMemberIds.map((memberId) => {
                                  const member = memberIdMap.get(memberId);
                                  return member ? (
                                    <code
                                      key={memberId}
                                      className="ml-1 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded"
                                    >
                                      {member.handle}
                                    </code>
                                  ) : null;
                                })}
                              </span>
                            ) : null}
                            {draft.mentionedCompanyIds?.length ? (
                              <span>
                                Tagged companies:
                                {draft.mentionedCompanyIds.map((companyId) => {
                                  const company = companyIdMap.get(companyId);
                                  return company ? (
                                    <code
                                      key={companyId}
                                      className="ml-1 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded"
                                    >
                                      {company.handle}
                                    </code>
                                  ) : null;
                                })}
                              </span>
                            ) : null}
                          </div>
                        )}
                        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Assign to teammates
                            </label>
                            <select
                              multiple
                              size={Math.min(6, Math.max(3, members.length))}
                              value={draftSelections[draft.id] || []}
                              onChange={(e) => {
                                const options = Array.from(e.target.selectedOptions).map((option) => option.value);
                                setDraftSelections((prev) => ({ ...prev, [draft.id]: options }));
                              }}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm"
                              disabled={assigning[draft.id]}
                            >
                              {members.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.handle} — {member.fullName || member.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => assignDraft(draft.id, draftSelections[draft.id] || [])}
                              disabled={assigning[draft.id] || !(draftSelections[draft.id] || []).length}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Assign selected
                            </button>
                            {suggestedMember && (
                              <button
                                type="button"
                                onClick={() => assignDraft(draft.id, [suggestedMember.id])}
                                disabled={assigning[draft.id]}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white text-sm font-medium rounded-lg"
                              >
                                Assign to {suggestedMember.handle}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => forceClassifyDraft(draft)}
                              disabled={classifyingDrafts[draft.id]}
                              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {classifyingDrafts[draft.id] ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Forcing…
                                </span>
                              ) : (
                                'Force classify now'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  Recent Captures
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {showingTodayEntries
                    ? 'Entries captured today across the team.'
                    : 'Latest entries from the team.'}
                </p>
              </div>
            </div>

            {recentEntries.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No diary entries captured yet.
              </p>
            ) : (
              <div className="space-y-4">
                {recentEntries.map((entry) => {
                  const member = memberIdMap.get(entry.memberId);
                  const memberName = member?.fullName || member?.name || 'Unknown member';
                  const memberHandle = member?.handle;
                  const timestamp = format(new Date(entry.timestamp), 'PPpp');
                  const relative = formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true });
                  const company = member?.companyId ? companyIdMap.get(member.companyId) : undefined;

                  return (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-900/30 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {memberName}{' '}
                            {memberHandle && (
                              <code className="ml-1 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs">
                                {memberHandle}
                              </code>
                            )}
                          </div>
                          {company && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {company.name}{' '}
                              <code className="ml-1 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded">
                                {company.handle}
                              </code>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 text-right">
                          <div>{timestamp}</div>
                          <div className="text-slate-400">({relative})</div>
                        </div>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownPreview source={entry.content} data-color-mode={colorMode} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <div className="grid md:grid-cols-2 gap-6">
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
          </section>
        </div>
      </div>
    </div>
  );
}
