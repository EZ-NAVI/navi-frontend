import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { fetchReportById, fetchReportComments, postReportComment, postReportEvaluation, postReportNotThere } from '../api/reports';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextInput } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function ReportDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { reportId } = route.params ?? {};
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [posting, setPosting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const applyOptimisticEvaluation = (evalKey: 'good' | 'normal' | 'bad') => {
    setReport((prev: any) => {
      if (!prev) return prev;
      const current = prev.userEvaluation ?? null;
      if (current === evalKey) return prev;
      let bad = prev.badCount ?? 0;
      let normal = prev.normalCount ?? 0;
      let good = prev.goodCount ?? 0;
      let total = prev.totalFeedbacks ?? 0;
      if (current === 'bad') bad = Math.max(0, bad - 1);
      if (current === 'normal') normal = Math.max(0, normal - 1);
      if (current === 'good') good = Math.max(0, good - 1);
      if (evalKey === 'bad') bad += 1;
      if (evalKey === 'normal') normal += 1;
      if (evalKey === 'good') good += 1;
      const newTotal = current ? total : (total + 1);
      return { ...prev, userEvaluation: evalKey, badCount: bad, normalCount: normal, goodCount: good, totalFeedbacks: newTotal };
    });
  };

  useEffect(() => {
    try { MaterialIcons.loadFont(); } catch (e) {}
    const load = async () => {
      if (!reportId) {
        Alert.alert('오류', '유효하지 않은 제보 ID입니다.');
        navigation.goBack();
        return;
      }
      setLoading(true);
      try {
        const devToken = __DEV__ ? null : null;
        const detail = await fetchReportById(String(reportId), devToken ?? undefined);
        setReport(detail);
        try {
          const cs = await fetchReportComments(String(reportId), devToken ?? undefined);
          setComments(Array.isArray(cs) ? cs : (cs ? [cs] : []));
        } catch (e) {
          console.warn('ReportDetailScreen: fetchReportComments failed', e);
          setComments([]);
        }
      } catch (e) {
        console.warn('ReportDetailScreen: fetchReportById failed', e);
        Alert.alert('불러오기 실패', '해당 제보를 불러오지 못했습니다.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reportId]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!report) return null;
  const imageUrl = report.imageUrl ?? report.image_url ?? report.photoUrl ?? report.photo_url ?? report.file_url ?? report.object_url ?? null;

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
          <TouchableOpacity onPress={() => {
            const fromCluster = (route.params as any)?.fromCluster;
            const clusterId = (route.params as any)?.clusterId;
            if (navigation.canGoBack()) {
              navigation.goBack();
              if (fromCluster && clusterId) {
                setTimeout(() => {
                  try { navigation.navigate('SafeRoute', { openClusterId: clusterId, openClusterModal: true }); } catch (e) {}
                }, 120);
              }
              return;
            }
            if (fromCluster && clusterId) {
              navigation.navigate('SafeRoute', { openClusterId: clusterId, openClusterModal: true });
            } else {
              navigation.navigate('SafeRoute');
            }
          }} style={{ marginBottom: 12 }} accessibilityLabel="back-to-list">
            <Text style={{ fontSize: 22, color: '#000' }}>{'<'}</Text>
          </TouchableOpacity>

          <View style={styles.detailHeaderRow}>
            <Text style={styles.title}>{report.category ?? report.title ?? '제보'}</Text>
            <TouchableOpacity
              style={styles.resolvedBtnInline}
              onPress={() => {
                const fromCluster = (route.params as any)?.fromCluster;
                const clusterId = (route.params as any)?.clusterId;
                Alert.alert('이제 없어요', '정말 더 이상 존재하지 않나요?', [
                  { text: '취소', style: 'cancel' },
                  { text: '확인', onPress: async () => {
                      try {
                        try {
                          console.log('[NotThere] detail screen send for reportId=', String(reportId), 'category=', report?.category ?? report?.title ?? '제보');
                        } catch (logErr) {}
                        let token: string | null = null;
                        try { token = await AsyncStorage.getItem('access_token'); } catch (e) {}
                        await postReportNotThere(String(reportId), token ?? undefined);
                      } catch (e: any) {
                        console.warn('not-there failed', e);
                        const errorMsg = e?.response?.data?.detail || e?.response?.data?.message || e?.message || '상태 전송에 실패했습니다.';
                        if (errorMsg.includes('이미') && errorMsg.includes('이제 없어요')) {
                          Alert.alert('알림', '이미 누른 제보입니다.');
                        } else {
                          Alert.alert('처리 실패', errorMsg);
                        }
                      }
                  } }
                ]);
              }}
            >
              <Text style={{ fontWeight: '700', color: '#000' }}>이제 없어요</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>{report.description ?? report.content ?? ''}</Text>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : null}

          <View style={{ marginTop: 12 }}>
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>댓글</Text>
            {comments.length === 0 ? (
              <Text style={{ color: '#666' }}>아직 댓글이 없습니다.</Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  {comments.map((c: any, idx: number) => {
                    const text = typeof c === 'string' ? c : c.content ?? c.text ?? c.comment ?? JSON.stringify(c);
                    const rawDate = c.createdAt ?? c.created_at ?? c.created_at_raw ?? '';
                    let dateOnly = '';
                    try {
                      if (rawDate) {
                        const d = new Date(rawDate);
                        if (!isNaN(d.getTime())) dateOnly = d.toLocaleDateString();
                        else dateOnly = String(rawDate).split('T')[0] || String(rawDate);
                      }
                    } catch (e) { dateOnly = String(rawDate || ''); }
                    return (
                      <View key={idx} style={{ marginBottom: 12 }}>
                        <Text style={styles.commentText}>{text}</Text>
                        <Text style={{ color: '#666', fontSize: 12, marginTop: 6 }}>{dateOnly}</Text>
                      </View>
                    );
                  })}
                </View>
                <View style={{ alignItems: 'flex-end', marginLeft: 12, justifyContent: 'space-between', alignSelf: 'flex-start', marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      style={{ alignItems: 'center', marginLeft: 6 }}
                      disabled={evaluating}
                      onPress={async () => {
                        if (!reportId || evaluating) return;
                        try {
                          setEvaluating(true);
                          let token: string | null = null;
                          try { token = await AsyncStorage.getItem('access_token'); } catch (e) {}
                          await postReportEvaluation(String(reportId), 'bad', token ?? undefined);
                          applyOptimisticEvaluation('bad');
                        } catch (e) {
                          console.warn('report evaluation failed (좋음->bad)', e);
                          Alert.alert('전송 실패', '피드백 전송에 실패했습니다.');
                        } finally { setEvaluating(false); }
                      }}
                    >
                      <Text style={{ fontSize: 28 }}>😊</Text>
                      <Text style={{ fontSize: 12, marginTop: 4, fontWeight: report?.userEvaluation === 'bad' ? '700' : '400', color: report?.userEvaluation === 'bad' ? '#000' : '#666' }}>좋음 {Number(report?.badCount ?? 0)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ alignItems: 'center', marginLeft: 6 }}
                      disabled={evaluating}
                      onPress={async () => {
                        if (!reportId || evaluating) return;
                        try {
                          setEvaluating(true);
                          let token: string | null = null;
                          try { token = await AsyncStorage.getItem('access_token'); } catch (e) {}
                          await postReportEvaluation(String(reportId), 'normal', token ?? undefined);
                          applyOptimisticEvaluation('normal');
                        } catch (e) {
                          console.warn('report evaluation failed (보통->normal)', e);
                          Alert.alert('전송 실패', '피드백 전송에 실패했습니다.');
                        } finally { setEvaluating(false); }
                      }}
                    >
                      <Text style={{ fontSize: 28 }}>😐</Text>
                      <Text style={{ fontSize: 12, marginTop: 4, fontWeight: report?.userEvaluation === 'normal' ? '700' : '400', color: report?.userEvaluation === 'normal' ? '#000' : '#666' }}>보통 {Number(report?.normalCount ?? 0)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ alignItems: 'center', marginLeft: 6 }}
                      disabled={evaluating}
                      onPress={async () => {
                        if (!reportId || evaluating) return;
                        try {
                          setEvaluating(true);
                          let token: string | null = null;
                          try { token = await AsyncStorage.getItem('access_token'); } catch (e) {}
                          await postReportEvaluation(String(reportId), 'good', token ?? undefined);
                          applyOptimisticEvaluation('good');
                        } catch (e) {
                          console.warn('report evaluation failed (아쉬움->good)', e);
                          Alert.alert('전송 실패', '피드백 전송에 실패했습니다.');
                        } finally { setEvaluating(false); }
                      }}
                    >
                      <Text style={{ fontSize: 28 }}>☹️</Text>
                      <Text style={{ fontSize: 12, marginTop: 4, fontWeight: report?.userEvaluation === 'good' ? '700' : '400', color: report?.userEvaluation === 'good' ? '#000' : '#666' }}>아쉬움 {Number(report?.goodCount ?? 0)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              value={newComment}
              onChangeText={setNewComment}
              placeholder="댓글을 입력하세요..."
              placeholderTextColor="#999"
              style={{ flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 }}
              editable={!posting}
              returnKeyType="send"
              onSubmitEditing={async () => {
                if (!newComment.trim()) return;
                try {
                  setPosting(true);
                  let token: string | null = null;
                  try { token = await AsyncStorage.getItem('access_token'); } catch (e) {}
                  const created = await postReportComment(String(reportId), newComment.trim(), token ?? undefined);
                  setComments((s) => Array.isArray(s) ? [created, ...s] : [created]);
                  setNewComment('');
                } catch (e) {
                  console.warn('post comment failed', e);
                  Alert.alert('댓글 추가 실패', '댓글 전송에 실패했습니다.');
                } finally { setPosting(false); }
              }}
            />
            <TouchableOpacity
              onPress={async () => {
                if (!newComment.trim()) return Alert.alert('댓글 입력', '댓글 내용을 입력해주세요.');
                try {
                  setPosting(true);
                  let token: string | null = null;
                  try { token = await AsyncStorage.getItem('access_token'); } catch (e) {}
                  const created = await postReportComment(String(reportId), newComment.trim(), token ?? undefined);
                  setComments((s) => Array.isArray(s) ? [created, ...s] : [created]);
                  setNewComment('');
                } catch (e) {
                  console.warn('post comment failed', e);
                  Alert.alert('댓글 추가 실패', '댓글 전송에 실패했습니다.');
                } finally { setPosting(false); }
              }}
              style={{ backgroundColor: '#FFD44C', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 }}
              disabled={posting}
            >
              {posting ? <ActivityIndicator /> : <Text style={{ fontWeight: '700' }}>전송</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '800', color: '#000', marginBottom: 6 },
  description: { color: '#000', marginBottom: 12 },
  image: { width: '100%', height: 220, borderRadius: 8, marginBottom: 12 },
  detailHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  resolvedBtnInline: { backgroundColor: '#FFD44C', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18 },
  commentText: { color: '#000', marginBottom: 12, fontSize: 14 },
});
