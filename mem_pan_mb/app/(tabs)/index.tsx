import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, SafeAreaView, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getRecentDecks, getDeck, getDeckProgress, getCurrentUser } from '../../services/api';

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

  const [recentDecks, setRecentDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState('M');

  React.useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await getRecentDecks();
        if (res.decks && res.decks.length > 0) {
          const deckDetailsPromises = res.decks.slice(0, 5).map(async (d: any) => {
            try {
              const deckRes = await getDeck(d.deckId);
              const progressRes = await getDeckProgress(d.deckId).catch(() => null);
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
          const details = await Promise.all(deckDetailsPromises);
          setRecentDecks(details.filter(d => d !== null));
        }
      } catch (error) {
        console.error('Error fetching recent decks', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
    const fetchUser = async () => {
      try {
        const data = await getCurrentUser();
        const u = data.user || data.data || data;
        if (u?.avatarUrl) setAvatarUrl(u.avatarUrl);
        if (u?.username) setUsername(u.username);
      } catch (e) {}
    };
    fetchUser();
  }, []);

  const continueDeck = recentDecks.length > 0 ? recentDecks[0] : null;
  const continueProgressPercent = continueDeck && continueDeck.progress?.totalCount > 0
    ? Math.round((continueDeck.progress.memorizedCount / continueDeck.progress.totalCount) * 100)
    : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.searchContainer, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
            <Ionicons name="search" size={20} color={theme.textMuted} />
            <TextInput placeholder="Tìm kiếm" placeholderTextColor={theme.textMuted} style={[styles.searchInput, { color: theme.text }]} />
          </View>
          <TouchableOpacity style={styles.avatarContainer} onPress={() => router.push('/(settings)' as any)}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{(username || 'M').charAt(0).toUpperCase()}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Học tiếp (Continue Learning) */}
        {continueDeck ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Học tiếp</Text>
            <TouchableOpacity style={[styles.continueCard, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} onPress={() => router.push(`/module/${continueDeck.deckId}` as any)}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{continueDeck.name}</Text>
                <Ionicons name="ellipsis-vertical" size={20} color={theme.textMuted} />
              </View>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                  <View style={[styles.progressBarFill, { width: `${continueProgressPercent}%` }]} />
                </View>
              </View>
              <Text style={[styles.progressText, { color: theme.textMuted }]}>Đã hoàn thành {continueProgressPercent}% số thẻ</Text>
              <TouchableOpacity style={styles.continueButton} onPress={() => router.push(`/module/${continueDeck.deckId}` as any)}>
                <Text style={styles.continueButtonText}>Tiếp tục</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </>
        ) : null}

        {/* Gần đây (Recent) */}
        {recentDecks.length > 1 ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Gần đây</Text>
            {recentDecks.slice(1).map((deck, idx) => (
              <TouchableOpacity key={idx} style={[styles.recentItem, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} onPress={() => router.push(`/module/${deck.deckId}` as any)}>
                {deck.creatorAvatar ? (
                  <Image source={{ uri: deck.creatorAvatar }} style={styles.recentAvatarImage} />
                ) : (
                  <View style={[styles.recentIcon, { backgroundColor: isDark ? '#115e59' : '#e0f2f1' }]}>
                    <Text style={{ color: isDark ? '#5eead4' : '#008080', fontWeight: 'bold', fontSize: 16 }}>{(deck.creatorUsername || 'U').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.recentInfo}>
                  <Text style={[styles.recentTitle, { color: theme.text }]}>{deck.name}</Text>
                  <Text style={[styles.recentSubtitle, { color: theme.textMuted }]}>{(deck.cardCount || deck.progress?.totalCount || 0)} thẻ • {deck.creatorUsername || 'Bạn'}</Text>
                </View>
              </TouchableOpacity>
            ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
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
  continueCard: {
    borderRadius: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 24,
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
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
  recentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recentSubtitle: {
    fontSize: 14,
  },
});
