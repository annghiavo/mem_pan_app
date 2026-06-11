import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, SafeAreaView, useColorScheme, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getRecentDecks, getDeck, getDeckProgress, getCurrentUser, getDecks, getTopPublicDecks, getMySubscription, normalizeSubscription } from '../../services/api';
import { PlusDeckBadge, isPlusDeck } from '../../components/ui/PlusDeckBadge';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#111111' : '#f8f9fa',
    surface: isDark ? '#1c1c1e' : '#ffffff',
    text: isDark ? '#f4f4f5' : '#111827',
    textMuted: isDark ? '#a1a1aa' : '#6b7280',
    border: isDark ? '#27272a' : '#f3f4f6',
    primary: '#5865F2',
  };

  const [studySessions, setStudySessions] = useState<any[]>([]);
  const [recentDecks, setRecentDecks] = useState<any[]>([]);
  const [topDecks, setTopDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [hasPlus, setHasPlus] = useState(false);

  const fetchData = useCallback(async () => {
    const studyDeckIds = new Set<string>();
    let recentSessionDecks: any[] = [];
    try {
      try {
        const subRes = await getMySubscription(true).catch(() => null);
        const sub = normalizeSubscription(subRes);
        setHasPlus(Boolean(sub?.active || sub?.status === 'active'));
      } catch (e) { }

      try {
        const res = await getRecentDecks();
        recentSessionDecks = res.decks || [];
        if (recentSessionDecks.length > 0) {
          const sessionPromises = recentSessionDecks.slice(0, 5).map(async (d: any) => {
            try {
              const deckRes = await getDeck(d.deckId);
              const progressRes = await getDeckProgress(d.deckId).catch(() => null);
              studyDeckIds.add(d.deckId);
              return {
                ...d,
                ...deckRes.deck,
                creatorUsername: deckRes.creatorUsername || '',
                creatorAvatar: deckRes.creatorAvatar || '',
                progress: progressRes
              };
            } catch (e) {
              return null;
            }
          });
          const details = await Promise.all(sessionPromises);
          setStudySessions(details.filter(d => d !== null));
        }
      } catch (error) {
        console.error('Error fetching study sessions', error);
      }

      // "Gần đây" merges the user's library with decks they've studied (including
      // public decks they don't own), so non-owned decks they've opened show up too.
      try {
        const [libRes, studiedDetails] = await Promise.all([
          getDecks(1, 6).catch(() => ({ decks: [] })),
          Promise.all(
            recentSessionDecks.slice(0, 10).map(async (d: any) => {
              try {
                const deckRes = await getDeck(d.deckId);
                return { ...d, ...deckRes.deck, creatorUsername: deckRes.creatorUsername || '' };
              } catch (e) {
                return null;
              }
            })
          ),
        ]);

        const enrichedLib = await Promise.all(
          (libRes.decks || []).slice(0, 6).map(async (d: any) => {
            try {
              const deckRes = await getDeck(d.deckId);
              return { ...d, ...deckRes.deck, creatorUsername: deckRes.creatorUsername || '' };
            } catch (e) {
              return d;
            }
          })
        );

        const studiedValid = studiedDetails.filter(d => d !== null);

        const seen = new Set<string>();
        const merged: any[] = [];
        for (const d of [...studiedValid, ...enrichedLib]) {
          if (!d?.deckId || seen.has(d.deckId)) continue;
          seen.add(d.deckId);
          merged.push(d);
        }
        setRecentDecks(merged.slice(0, 6));
      } catch (error) {
        console.error('Error fetching recent decks', error);
      }

      // "Được học nhiều nhất" — top public decks by learners (trending 7 days).
      try {
        const topRes = await getTopPublicDecks(20);
        const tops = (topRes.decks || [])
          .map((item: any) => ({ ...item.deck, learnerCount: item.learnerCount ?? 0 }))
          .filter((d: any) => d?.deckId);
        setTopDecks(tops);
      } catch (error) {
        console.error('Error fetching top decks', error);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    fetchData();
    const fetchUser = async () => {
      try {
        const data = await getCurrentUser();
        const u = data.user || data.data || data;
        if (u?.avatarUrl) setAvatarUrl(u.avatarUrl);
        if (u?.username) setUsername(u.username);

        const subRes = await getMySubscription(true).catch(() => null);
        const sub = normalizeSubscription(subRes);
        setHasPlus(Boolean(sub?.active || sub?.status === 'active'));
      } catch (e) { }
    };
    fetchUser();
  }, [fetchData]);



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Brand Header */}
        <View style={styles.brandRow}>
          <View style={styles.brandTitleContainer}>
            <Text style={[styles.brandText, { color: theme.text }]}>Mem Pan</Text>
            {hasPlus && (
              <View style={styles.plusBadge}>
                <Text style={styles.plusBadgeText}>Plus</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push('/(profile)' as any)}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : username ? (
              <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* Search row */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.searchContainer, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}
            onPress={() => router.push('/search' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="search" size={20} color={theme.textMuted} />
            <Text style={[styles.searchInput, { color: theme.textMuted }]}>Tìm kiếm</Text>
          </TouchableOpacity>
        </View>

        {/* Được học nhiều nhất - Top public decks by learners (2-row grid) */}
        {topDecks.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Được học nhiều nhất</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {Array.from({ length: Math.ceil(topDecks.length / 2) }).map((_, colIdx) => (
                <View key={`top-col-${colIdx}`} style={styles.recentColumn}>
                  {topDecks.slice(colIdx * 2, colIdx * 2 + 2).map((deck, rowIdx) => (
                    <TouchableOpacity key={`top-${colIdx}-${rowIdx}`} style={[styles.recentItemHorizontal, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} onPress={() => router.push(`/module/${deck.deckId}` as any)}>
                      <View style={[styles.recentIcon, { backgroundColor: isDark ? '#7c2d12' : '#ffedd5' }]}>
                        <Text style={{ color: isDark ? '#fdba74' : '#ea580c', fontWeight: 'bold', fontSize: 16 }}>{(deck.name || 'D').charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={styles.recentInfo}>
                        <View style={styles.deckTitleRow}>
                          <Text style={[styles.recentTitle, { color: theme.text }]} numberOfLines={1}>{deck.name}</Text>
                          {isPlusDeck(deck) ? <PlusDeckBadge compact /> : null}
                        </View>
                        <Text style={[styles.recentSubtitle, { color: theme.textMuted }]}>{deck.cardCount || 0} thẻ • {deck.learnerCount || 0} người học</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* Học tiếp - Study Sessions with Progress */}
        {studySessions.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Học tiếp</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {studySessions.map((session, idx) => {
                const progressPercent = session.progress?.totalCount > 0
                  ? Math.round((session.progress.memorizedCount / session.progress.totalCount) * 100)
                  : 0;
                return (
                  <TouchableOpacity key={`session-${idx}`} style={[styles.continueCard, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} onPress={() => router.push(`/module/${session.deckId}` as any)}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleGroup}>
                        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{session.name}</Text>
                        {isPlusDeck(session) ? <PlusDeckBadge compact /> : null}
                      </View>
                      <Ionicons name="ellipsis-vertical" size={20} color={theme.textMuted} />
                    </View>
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                      </View>
                    </View>
                    <Text style={[styles.progressText, { color: theme.textMuted }]}>Đã hoàn thành {progressPercent}% số thẻ</Text>
                    <TouchableOpacity style={styles.continueButton} onPress={() => router.push(`/quiz/${session.deckId}` as any)}>
                      <Text style={styles.continueButtonText}>Tiếp tục</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {/* Gần đây - Recent Decks from Library (2-row grid) */}
        {recentDecks.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Gần đây</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {Array.from({ length: Math.ceil(recentDecks.length / 2) }).map((_, colIdx) => (
                <View key={`col-${colIdx}`} style={styles.recentColumn}>
                  {recentDecks.slice(colIdx * 2, colIdx * 2 + 2).map((deck, rowIdx) => (
                    <TouchableOpacity key={`recent-${colIdx}-${rowIdx}`} style={[styles.recentItemHorizontal, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} onPress={() => router.push(`/module/${deck.deckId}` as any)}>
                      <View style={[styles.recentIcon, { backgroundColor: isDark ? '#115e59' : '#e0f2f1' }]}>
                        <Text style={{ color: isDark ? '#5eead4' : '#008080', fontWeight: 'bold', fontSize: 16 }}>{(deck.name || 'D').charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={styles.recentInfo}>
                        <View style={styles.deckTitleRow}>
                          <Text style={[styles.recentTitle, { color: theme.text }]} numberOfLines={1}>{deck.name}</Text>
                          {isPlusDeck(deck) ? <PlusDeckBadge compact /> : null}
                        </View>
                        <Text style={[styles.recentSubtitle, { color: theme.textMuted }]}>{deck.cardCount || 0} thẻ • Tác giả: {deck.creatorUsername === username ? 'Bạn' : (deck.creatorUsername || 'Bạn')}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* Cá nhân hóa nội dung cho bạn */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Cá nhân hóa nội dung cho bạn</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 10,
  },
  brandTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  plusBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  plusBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginRight: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5865F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  horizontalScroll: {
    paddingRight: 16,
  },
  continueCard: {
    width: 280,
    marginRight: 16,
    borderRadius: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  cardTitleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#5865F2',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    marginBottom: 16,
  },
  continueButton: {
    backgroundColor: '#5865F2',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recentColumn: {
    marginRight: 12,
  },
  recentItemHorizontal: {
    width: 300,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  recentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recentAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
  },
  recentInfo: {
    flex: 1,
  },
  deckTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  recentSubtitle: {
    fontSize: 14,
  },
});
