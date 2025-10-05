import { promises as fs } from 'fs';
import path from 'path';
import type { Company, TeamMember, DiaryEntry, DiaryDraft } from '@/lib/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const COMPANIES_FILE = path.join(DATA_DIR, 'companies.json');
const MEMBERS_FILE = path.join(DATA_DIR, 'members.json');
const DIARIES_FILE = path.join(DATA_DIR, 'diaries.json');
const DIARY_DRAFTS_FILE = path.join(DATA_DIR, 'diary-drafts.json');

// Ensure data directory exists
async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

// Companies
export async function loadCompanies(): Promise<Company[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(COMPANIES_FILE, 'utf-8');
    return JSON.parse(data, (key, value) => {
      if (key === 'createdAt' || key === 'updatedAt') {
        return new Date(value);
      }
      return value;
    });
  } catch (error) {
    return [];
  }
}

export async function saveCompanies(companies: Company[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(COMPANIES_FILE, JSON.stringify(companies, null, 2));
}

export async function getCompany(id: string): Promise<Company | null> {
  const companies = await loadCompanies();
  return companies.find((c) => c.id === id) || null;
}

export async function upsertCompany(company: Company): Promise<Company> {
  const companies = await loadCompanies();
  const index = companies.findIndex((c) => c.id === company.id);

  if (index >= 0) {
    companies[index] = company;
  } else {
    companies.push(company);
  }

  await saveCompanies(companies);
  return company;
}

export async function deleteCompany(id: string): Promise<void> {
  const companies = await loadCompanies();
  const filtered = companies.filter((c) => c.id !== id);
  await saveCompanies(filtered);
}

// Team Members
export async function loadMembers(): Promise<TeamMember[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(MEMBERS_FILE, 'utf-8');
    return JSON.parse(data, (key, value) => {
      if (key === 'createdAt' || key === 'updatedAt') {
        return new Date(value);
      }
      return value;
    });
  } catch (error) {
    return [];
  }
}

export async function saveMembers(members: TeamMember[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(MEMBERS_FILE, JSON.stringify(members, null, 2));
}

export async function getMember(id: string): Promise<TeamMember | null> {
  const members = await loadMembers();
  return members.find((m) => m.id === id) || null;
}

export async function getMembersByCompany(companyId: string): Promise<TeamMember[]> {
  const members = await loadMembers();
  return members.filter((m) => m.companyId === companyId);
}

export async function upsertMember(member: TeamMember): Promise<TeamMember> {
  const members = await loadMembers();
  const index = members.findIndex((m) => m.id === member.id);

  if (index >= 0) {
    members[index] = member;
  } else {
    members.push(member);
  }

  await saveMembers(members);
  return member;
}

export async function deleteMember(id: string): Promise<void> {
  const members = await loadMembers();
  const filtered = members.filter((m) => m.id !== id);
  await saveMembers(filtered);
}

// Diary Entries
export async function loadDiaries(): Promise<DiaryEntry[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(DIARIES_FILE, 'utf-8');
    return JSON.parse(data, (key, value) => {
      if (key === 'timestamp' || key === 'createdAt' || key === 'updatedAt') {
        return new Date(value);
      }
      return value;
    });
  } catch (error) {
    return [];
  }
}

export async function loadDiaryDrafts(): Promise<DiaryDraft[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(DIARY_DRAFTS_FILE, 'utf-8');
    return JSON.parse(data, (key, value) => {
      if (key === 'createdAt' || key === 'updatedAt') {
        return new Date(value);
      }
      return value;
    });
  } catch (error) {
    return [];
  }
}

export async function saveDiaryDrafts(drafts: DiaryDraft[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DIARY_DRAFTS_FILE, JSON.stringify(drafts, null, 2));
}

export async function upsertDiaryDraft(draft: DiaryDraft): Promise<DiaryDraft> {
  const drafts = await loadDiaryDrafts();
  const index = drafts.findIndex((d) => d.id === draft.id);

  if (index >= 0) {
    drafts[index] = draft;
  } else {
    drafts.push(draft);
  }

  await saveDiaryDrafts(drafts);
  return draft;
}

export async function deleteDiaryDraft(id: string): Promise<void> {
  const drafts = await loadDiaryDrafts();
  const filtered = drafts.filter((d) => d.id !== id);
  await saveDiaryDrafts(filtered);
}

export async function saveDiaries(diaries: DiaryEntry[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DIARIES_FILE, JSON.stringify(diaries, null, 2));
}

export async function getDiary(id: string): Promise<DiaryEntry | null> {
  const diaries = await loadDiaries();
  return diaries.find((d) => d.id === id) || null;
}

export async function getDiariesByMember(memberId: string): Promise<DiaryEntry[]> {
  const diaries = await loadDiaries();
  return diaries.filter((d) => d.memberId === memberId).sort((a, b) =>
    b.timestamp.getTime() - a.timestamp.getTime()
  );
}

export async function upsertDiary(diary: DiaryEntry): Promise<DiaryEntry> {
  const diaries = await loadDiaries();
  const index = diaries.findIndex((d) => d.id === diary.id);

  if (index >= 0) {
    diaries[index] = diary;
  } else {
    diaries.push(diary);
  }

  await saveDiaries(diaries);
  return diary;
}

export async function deleteDiary(id: string): Promise<void> {
  const diaries = await loadDiaries();
  const filtered = diaries.filter((d) => d.id !== id);
  await saveDiaries(filtered);
}
