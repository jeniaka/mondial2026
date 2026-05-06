import type { ApiMatch } from '@/lib/api';

export type Match = {
  id: string;
  utcDate: string;
  status: 'SCHEDULED' | 'TIMED' | 'LIVE' | 'IN_PLAY' | 'PAUSED' | 'FINISHED';
  homeTeam: string;
  homeTeamHe: string;
  homeTla: string;
  homeIso2: string;
  awayTeam: string;
  awayTeamHe: string;
  awayTla: string;
  awayIso2: string;
  homeScore: number | null;
  awayScore: number | null;
  competition: string;
  minute?: number | null;
};

const TOURNAMENT_FROM = '2026-06-11';
const TOURNAMENT_TO   = '2026-07-20';

function toMatch(m: ApiMatch): Match {
  return {
    id:          m.id,
    utcDate:     m.kickoff_utc ?? '',
    status:      (m.status as Match['status']) ?? 'SCHEDULED',
    homeTeam:    m.home?.name_en ?? 'TBD',
    homeTeamHe:  m.home?.name_he ?? m.home?.name_en ?? 'TBD',
    homeTla:     m.home?.tla ?? '',
    homeIso2:    m.home?.iso2 ?? '',
    awayTeam:    m.away?.name_en ?? 'TBD',
    awayTeamHe:  m.away?.name_he ?? m.away?.name_en ?? 'TBD',
    awayTla:     m.away?.tla ?? '',
    awayIso2:    m.away?.iso2 ?? '',
    homeScore:   m.score?.ft_home ?? m.score?.home ?? null,
    awayScore:   m.score?.ft_away ?? m.score?.away ?? null,
    competition: m.stage ?? m.group ?? m.competition ?? 'World Cup 2026',
    minute:      m.minute ?? null,
  };
}

export async function getMatches(): Promise<{ matches: Match[]; source: 'live' | 'demo' }> {
  try {
    const res = await fetch(
      `/api/matches?from=${TOURNAMENT_FROM}&to=${TOURNAMENT_TO}`,
      { credentials: 'include', headers: { 'X-Requested-With': 'fetch' } },
    );
    if (!res.ok) throw new Error('fetch failed');
    const raw: ApiMatch[] = await res.json();
    return { matches: raw.map(toMatch), source: 'live' };
  } catch {
    return { matches: [], source: 'demo' };
  }
}

export async function getMatch(id: string): Promise<Match | null> {
  try {
    const res = await fetch(`/api/matches/${id}`, {
      credentials: 'include',
      headers: { 'X-Requested-With': 'fetch' },
    });
    if (!res.ok) return null;
    const raw: ApiMatch = await res.json();
    return toMatch(raw);
  } catch {
    return null;
  }
}
