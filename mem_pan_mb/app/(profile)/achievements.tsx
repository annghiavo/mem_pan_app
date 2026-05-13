import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, useColorScheme, ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUserStats, getUserHeatmap, getUserDeckStats } from '../../services/api';

// ── Types ──────────────────────────────────────────────────────────────────

interface UserStatsData {
  totalCards: number;
  totalReviews: number;
  totalStudyTimeMs: number;
  currentStreak: number;
  longestStreak: number;
  totalCorrect: number;
  totalIncorrect: number;
}

interface HeatmapEntry {
  studyDate: string;
  reviewsCount: number;
}

interface DeckStatData {
  deckId: string;
  deckName: string;
  totalCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  masteredCards: number;
  dueToday: number;
}

type HeatCell = { date: string; count: number; isFuture: boolean };

// ── Helpers ────────────────────────────────────────────────────────────────

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatStudyTime = (ms: number) => {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}g ${m}p`;
  if (m > 0) return `${m} phút`;
  return '<1 phút';
};

const CELL = 12;
const GAP = 2;
const UNIT = CELL + GAP;
const NUM_WEEKS = 53;

const buildGrid = (entries: HeatmapEntry[]): HeatCell[][] => {
  const map = new Map<string, number>();
  for (const e of entries) map.set(e.studyDate, e.reviewsCount);

  const today = new Date();
  const todayStr = toLocalDateStr(today);

  const start = new Date(today);
  start.setDate(start.getDate() - (NUM_WEEKS - 1) * 7);
  start.setDate(start.getDate() - start.getDay()); // back to Sunday

  const weeks: HeatCell[][] = [];
  const cur = new Date(start);
  for (let w = 0; w < NUM_WEEKS; w++) {
    const week: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = toLocalDateStr(cur);
      const isFuture = date > todayStr;
      week.push({ date, count: isFuture ? 0 : (map.get(date) ?? 0), isFuture });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
};

const buildMonthLabels = (weeks: HeatCell[][]) => {
  const labels: { text: string; col: number }[] = [];
  let last = '';
  weeks.forEach((week, i) => {
    const d = new Date(week[0].date + 'T00:00:00');
    const m = d.toLocaleString('vi-VN', { month: 'short' });
    if (m !== last) { labels.push({ text: m, col: i }); last = m; }
  });
  return labels;
};

const heatColor = (count: number, isDark: boolean) => {
  if (count === 0) return isDark ? '#2a2a2d' : '#e5e7eb';
  if (count < 5)  return '#9da5f8';
  if (count < 15) return '#7b83f4';
  if (count < 30) return '#5865F2';
  return '#3b48e0';
};

// ── Sub-components ─────────────────────────────────────────────────────────

const StatCard = ({
  icon, iconColor, value, label, theme, isDark,
}: {
  icon: string; iconColor: string; value: string; label: string;
  theme: ReturnType<typeof buildTheme>; isDark: boolean;
}) => (
  <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
    <View style={[styles.statIconBox, { backgroundColor: isDark ? '#27272a' : '#f3f4f6' }]}>
      <Ionicons name={icon as any} size={20} color={iconColor} />
    </View>
    <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
  </View>
);

const DeckRow = ({
  deck, theme,
}: {
  deck: DeckStatData; theme: ReturnType<typeof buildTheme>;
}) => {
  const total = deck.totalCards;
  return (
    <View style={[styles.deckRow, { borderTopColor: theme.border }]}>
      <View style={styles.deckHeader}>
        <Text style={[styles.deckName, { color: theme.text }]} numberOfLines={1}>
          {deck.deckName}
        </Text>
        {deck.dueToday > 0 && (
          <View style={styles.dueBadge}>
            <Text style={styles.dueBadgeText}>{deck.dueToday} cần ôn</Text>
          </View>
        )}
      </View>

      {total > 0 ? (
        <View style={styles.progressBar}>
          <View style={{ flex: deck.newCards,       backgroundColor: '#3b82f6' }} />
          <View style={{ flex: deck.learningCards,  backgroundColor: '#f59e0b' }} />
          <View style={{ flex: deck.reviewCards,    backgroundColor: '#10b981' }} />
          <View style={{ flex: deck.masteredCards,  backgroundColor: '#8b5cf6' }} />
        </View>
      ) : (
        <View style={[styles.progressBar, { backgroundColor: theme.border }]} />
      )}

      <View style={styles.deckLegend}>
        {[
          { color: '#3b82f6', label: `${deck.newCards} mới` },
          { color: '#f59e0b', label: `${deck.learningCards} học` },
          { color: '#10b981', label: `${deck.reviewCards} ôn` },
          { color: '#8b5cf6', label: `${deck.masteredCards} thuần` },
        ].map(({ color, label }) => (
          <View key={label} style={styles.legendDot}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.legendDotLabel, { color: '#6b7280' }]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ── Theme helper ───────────────────────────────────────────────────────────

const buildTheme = (isDark: boolean) => ({
  background:  isDark ? '#111111' : '#f8f9fa',
  surface:     isDark ? '#1c1c1e' : '#ffffff',
  text:        isDark ? '#f4f4f5' : '#1f2937',
  textMuted:   isDark ? '#a1a1aa' : '#6b7280',
  border:      isDark ? '#27272a' : '#f3f4f6',
  primary:     '#5865F2',
});

// ── Screen ─────────────────────────────────────────────────────────────────

export default function AchievementsScreen() {
  const router   = useRouter();
  const isDark   = useColorScheme() === 'dark';
  const theme    = buildTheme(isDark);

  const [stats,   setStats]   = useState<UserStatsData | null>(null);
  const [grid,    setGrid]    = useState<HeatCell[][]>([]);
  const [decks,   setDecks]   = useState<DeckStatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(false);
      const today      = toLocalDateStr(new Date());
      const oneYearAgo = toLocalDateStr(new Date(Date.now() - 365 * 86_400_000));

      const [sRes, hRes, dRes] = await Promise.allSettled([
        getUserStats(),
        getUserHeatmap(oneYearAgo, today),
        getUserDeckStats(),
      ]);

      const allFailed = [sRes, hRes, dRes].every(r => r.status === 'rejected');
      if (allFailed) { setError(true); return; }

      if (sRes.status === 'fulfilled') {
        const s = sRes.value;
        setStats(s.stats ?? s);
      }
      if (hRes.status === 'fulfilled') {
        setGrid(buildGrid((hRes.value.entries ?? []) as HeatmapEntry[]));
      }
      if (dRes.status === 'fulfilled') {
        setDecks((dRes.value.decks ?? []) as DeckStatData[]);
      }
    } catch (e) {
      console.error('[Achievements] fetchAll error:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const accuracy = stats && stats.totalReviews > 0
    ? Math.round((stats.totalCorrect / stats.totalReviews) * 100)
    : null;

  const monthLabels = grid.length > 0 ? buildMonthLabels(grid) : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Thành tựu</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.errorText, { color: theme.textMuted }]}>Không thể tải dữ liệu</Text>
          <TouchableOpacity style={[styles.retryBtn, { borderColor: theme.primary }]} onPress={fetchAll}>
            <Text style={[styles.retryText, { color: theme.primary }]}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Streak banner */}
          <View style={[styles.streakBanner, { backgroundColor: theme.surface }]}>
            <View style={styles.streakMain}>
              <Text style={styles.streakFire}>🔥</Text>
              <Text style={[styles.streakCount, { color: theme.text }]}>
                {stats?.currentStreak ?? 0}
              </Text>
              <Text style={[styles.streakUnit, { color: theme.textMuted }]}>ngày liên tiếp</Text>
            </View>
            <View style={[styles.streakSep, { backgroundColor: theme.border }]} />
            <View style={styles.streakBest}>
              <Text style={[styles.streakBestVal, { color: theme.text }]}>
                {stats?.longestStreak ?? 0}
              </Text>
              <Text style={[styles.streakBestLabel, { color: theme.textMuted }]}>dài nhất</Text>
            </View>
          </View>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <StatCard icon="library-outline"          iconColor="#3b82f6" value={String(stats?.totalReviews ?? 0)}                           label="Lần ôn tập"    theme={theme} isDark={isDark} />
            <StatCard icon="layers-outline"            iconColor="#8b5cf6" value={String(stats?.totalCards ?? 0)}                             label="Thẻ đã tạo"    theme={theme} isDark={isDark} />
            <StatCard icon="time-outline"              iconColor="#f59e0b" value={stats ? formatStudyTime(stats.totalStudyTimeMs) : '0p'}     label="Thời gian học" theme={theme} isDark={isDark} />
            <StatCard icon="checkmark-circle-outline"  iconColor="#10b981" value={accuracy !== null ? `${accuracy}%` : '–'}                  label="Độ chính xác"  theme={theme} isDark={isDark} />
          </View>

          {/* Activity heatmap */}
          <View style={[styles.section, { backgroundColor: theme.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Hoạt động</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ width: grid.length * UNIT }}>
                {/* Month labels */}
                <View style={{ height: 18, position: 'relative' }}>
                  {monthLabels.map((ml) => (
                    <Text
                      key={ml.col}
                      style={[styles.monthLabel, { left: ml.col * UNIT, color: theme.textMuted }]}
                    >
                      {ml.text}
                    </Text>
                  ))}
                </View>
                {/* Day rows */}
                {Array.from({ length: 7 }, (_, dayIdx) => (
                  <View key={dayIdx} style={styles.heatRow}>
                    {grid.map((week, wi) => {
                      const cell = week[dayIdx];
                      return (
                        <View
                          key={wi}
                          style={[
                            styles.heatCell,
                            {
                              backgroundColor: cell.isFuture
                                ? 'transparent'
                                : heatColor(cell.count, isDark),
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                ))}
                {/* Legend */}
                <View style={styles.legendRow}>
                  <Text style={[styles.legendSide, { color: theme.textMuted }]}>Ít</Text>
                  {[0, 3, 10, 20, 35].map((v) => (
                    <View key={v} style={[styles.heatCell, { backgroundColor: heatColor(v, isDark) }]} />
                  ))}
                  <Text style={[styles.legendSide, { color: theme.textMuted }]}>Nhiều</Text>
                </View>
              </View>
            </ScrollView>
          </View>

          {/* Deck breakdown */}
          {decks.length > 0 && (
            <View style={[styles.section, { backgroundColor: theme.surface }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Tiến độ bộ thẻ</Text>
              {decks.map((deck) => (
                <DeckRow key={deck.deckId} deck={deck} theme={theme} />
              ))}
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:      { flex: 1 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    elevation: 2, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  headerTitle:    { fontSize: 18, fontWeight: 'bold' },
  errorText:      { fontSize: 15 },
  retryBtn:       { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5 },
  retryText:      { fontSize: 15, fontWeight: '600' },

  scrollContent:  { paddingHorizontal: 16, paddingTop: 16, gap: 12 },

  // Streak
  streakBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 20,
    elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  streakMain:     { flex: 1, alignItems: 'center', gap: 2 },
  streakFire:     { fontSize: 36 },
  streakCount:    { fontSize: 40, fontWeight: 'bold', lineHeight: 44 },
  streakUnit:     { fontSize: 13 },
  streakSep:      { width: 1, height: 60, marginHorizontal: 16 },
  streakBest:     { flex: 1, alignItems: 'center', gap: 4 },
  streakBestVal:  { fontSize: 28, fontWeight: 'bold' },
  streakBestLabel:{ fontSize: 13 },

  // Stats grid
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  statCard: {
    flex: 1, minWidth: '45%', borderRadius: 14, padding: 16, alignItems: 'flex-start',
    elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
    gap: 6,
  },
  statIconBox:    { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  statValue:      { fontSize: 22, fontWeight: 'bold' },
  statLabel:      { fontSize: 12 },

  // Section card
  section: {
    borderRadius: 16, padding: 16,
    elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  sectionTitle:   { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  // Heatmap
  monthLabel:     { position: 'absolute', fontSize: 10, top: 2 },
  heatRow:        { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  heatCell:       { width: CELL, height: CELL, borderRadius: 2 },
  legendRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  legendSide:     { fontSize: 10, marginHorizontal: 2 },

  // Deck rows
  deckRow:        { paddingTop: 14, borderTopWidth: 1, marginTop: 2 },
  deckHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  deckName:       { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  dueBadge:       { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  dueBadgeText:   { fontSize: 11, color: '#92400e', fontWeight: '600' },
  progressBar:    { height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row' },
  deckLegend:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  legendDot:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:            { width: 8, height: 8, borderRadius: 4 },
  legendDotLabel: { fontSize: 11 },
});
