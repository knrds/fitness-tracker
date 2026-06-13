import { WorkoutSession } from '../types';

export function formatDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function calculateStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;

  // Sort descending by startedAt
  const sorted = [...sessions].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  const today = new Date();
  const todayStr = formatDateLocal(today);

  const uniqueDates = new Set<string>();
  sorted.forEach((s) => {
    uniqueDates.add(formatDateLocal(s.startedAt));
  });

  const latestDate = new Date(sorted[0]!.startedAt);
  const latestStr = formatDateLocal(latestDate);

  // Find diff in days between today and latest session
  const tDate = new Date(todayStr);
  const lDate = new Date(latestStr);
  const diffDays = Math.floor((tDate.getTime() - lDate.getTime()) / (1000 * 3600 * 24));

  if (diffDays > 1) return 0; // Streak broken

  let streak = 0;
  const checkDate = new Date(tDate);
  if (!uniqueDates.has(formatDateLocal(checkDate))) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (uniqueDates.has(formatDateLocal(checkDate))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

export function calculateLongestStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;

  // Map to local date strings YYYY-MM-DD, get unique set and sort ascending
  const uniqueDates = Array.from(new Set(sessions.map((s) => formatDateLocal(s.startedAt)))).sort();

  let longestStreak = 0;
  let currentStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of uniqueDates) {
    const currentDate = new Date(dateStr);
    if (prevDate === null) {
      currentStreak = 1;
    } else {
      const diffTime = currentDate.getTime() - prevDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
      if (diffDays <= 1) {
        if (diffDays > 0) {
          currentStreak++;
        }
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }
    prevDate = currentDate;
  }
  longestStreak = Math.max(longestStreak, currentStreak);

  return longestStreak;
}
