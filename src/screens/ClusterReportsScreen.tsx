import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { fetchReportsByCluster } from '../api/reports';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = {
  clusterId: string | number;
  onClose: () => void;
};

export default function ClusterReportsScreen({ clusterId, onClose }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // try to use stored token if any (dev fallback handled in API too)
        let token: string | null = null;
        try { token = await AsyncStorage.getItem('access_token'); } catch (e) { /* ignore */ }
        const data = await fetchReportsByCluster(String(clusterId), token ?? undefined);
        if (Array.isArray(data)) setItems(data);
        else if (data && Array.isArray((data as any).results)) setItems((data as any).results);
        else setItems([]);
      } catch (e) {
        console.warn('cluster list load failed', e);
        Alert.alert('불러오기 실패', '클러스터 제보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clusterId]);

  const renderCard = ({ item }: { item: any }) => {
    const imageUrl = item.imageUrl ?? item.photoUrl ?? item.image_url ?? item.photo_url ?? null;
    return (
      <View style={styles.card}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
        ) : null}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.category ?? item.title ?? '제보'}</Text>
          <Text style={styles.cardText}>{item.userComment ?? item.comment ?? item.description ?? ''}</Text>

          <View style={styles.cardFooter}>
            <View style={{ flex: 1 }}>
              <Text style={styles.commentLabel}>댓글</Text>
              <Text style={styles.cardTextSmall}>{item.userComment ?? item.comment ?? item.description ?? ''}</Text>
            </View>

            <View style={styles.rightArea}>
              <View style={styles.emojisRow}>
                <TouchableOpacity style={styles.emojiBtn} onPress={() => { /* TODO: send feedback */ }}>
                  <Text style={styles.emoji}>😊</Text>
                  <Text style={styles.emojiLabel}>좋음</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.emojiBtn} onPress={() => { }}>
                  <Text style={styles.emoji}>😐</Text>
                  <Text style={styles.emojiLabel}>보통</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.emojiBtn} onPress={() => { }}>
                  <Text style={styles.emoji}>☹️</Text>
                  <Text style={styles.emojiLabel}>아쉬움</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.resolvedBtn} onPress={() => { /* TODO: mark resolved */ }}>
                <Text style={{ fontWeight: '700', color: '#000' }}>이제 없어요</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onClose()}>
          <Text style={styles.closeText}>닫기</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>클러스터 제보</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i: any, idx) => String(i.reportId ?? i.id ?? idx)}
          renderItem={renderCard}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  closeText: { color: '#007AFF' },
  headerTitle: { fontWeight: '800', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: '#eee' },
  cardImage: { width: '100%', height: 180 },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  cardText: { color: '#333', marginBottom: 10 },
  cardTextSmall: { color: '#222', marginBottom: 6 },
  commentLabel: { fontWeight: '700', marginBottom: 8, color: '#000' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rightArea: { alignItems: 'flex-end', marginLeft: 12, justifyContent: 'space-between' },
  emojisRow: { flexDirection: 'row', alignItems: 'center' },
  emojiBtn: { alignItems: 'center', marginLeft: 6 },
  emoji: { fontSize: 28 },
  emojiLabel: { fontSize: 12, marginTop: 4 },
  resolvedBtn: { backgroundColor: '#FFD44C', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginTop: 8 },
});
