import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useAppAlertStore} from '../stores/appAlertStore';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  fetchReportById,
  fetchReportComments,
  postReportComment,
  postReportEvaluation,
  postReportNotThere,
  deleteReportComment,
} from '../api/reports';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {TextInput} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import {getCurrentUserRole} from '../lib/authState';

import CustomAlert from '../components/CustomAlert';

export default function ReportDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const {reportId} = route.params ?? {};

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('알림');
  const [alertMsg, setAlertMsg] = useState('');
  const [alertConfirm, setAlertConfirm] = useState<null | (() => void)>(null);
  const [alertHideCancel, setAlertHideCancel] = useState(false);

  const openAlert = (title: string, msg: string) => {
    setAlertTitle(title);
    setAlertMsg(msg);
    setAlertVisible(true);
  };

  useEffect(() => {
    const role = getCurrentUserRole(); // ⭐ 현재 로그인된 역할 가져오기
    if (role === 'child') {
      openAlert(
        '댓글 안내',
        '댓글은 다른 사용자에게 영향을 줄 수 있어요.\n신중하게 작성해주세요.',
      );
    }
  }, []);

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [posting, setPosting] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const applyOptimisticEvaluation = (evalKey: 'good' | 'normal' | 'bad') => {
    setReport((prev: any) => {
      if (!prev) {
        return prev;
      }
      const current = prev.userEvaluation ?? null;
      if (current === evalKey) {
        return prev;
      }
      let bad = prev.badCount ?? 0;
      let normal = prev.normalCount ?? 0;
      let good = prev.goodCount ?? 0;
      let total = prev.totalFeedbacks ?? 0;
      if (current === 'bad') {
        bad = Math.max(0, bad - 1);
      }
      if (current === 'normal') {
        normal = Math.max(0, normal - 1);
      }
      if (current === 'good') {
        good = Math.max(0, good - 1);
      }
      if (evalKey === 'bad') {
        bad += 1;
      }
      if (evalKey === 'normal') {
        normal += 1;
      }
      if (evalKey === 'good') {
        good += 1;
      }
      const newTotal = current ? total : total + 1;
      return {
        ...prev,
        userEvaluation: evalKey,
        badCount: bad,
        normalCount: normal,
        goodCount: good,
        totalFeedbacks: newTotal,
      };
    });
  };

  useEffect(() => {
    try {
      MaterialIcons.loadFont();
    } catch (e) {}
    const load = async () => {
      if (!reportId) {
        Alert.alert('오류', '유효하지 않은 제보 ID입니다.');
        navigation.goBack();
        return;
      }
      setLoading(true);
      try {
        const devToken = __DEV__ ? null : null;
        const detail = await fetchReportById(
          String(reportId),
          devToken ?? undefined,
        );
        setReport(detail);
        try {
          const cs = await fetchReportComments(
            String(reportId),
            devToken ?? undefined,
          );
          setComments(Array.isArray(cs) ? cs : cs ? [cs] : []);
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
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!report) {
    return null;
  }
  const imageUrl =
    report.imageUrl ??
    report.image_url ??
    report.photoUrl ??
    report.photo_url ??
    report.file_url ??
    report.object_url ??
    null;

  return (
    <View style={{flex: 1}}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{padding: 16, paddingBottom: 110}}>
          <TouchableOpacity
            onPress={() => {
              const fromCluster = (route.params as any)?.fromCluster;
              const clusterId = (route.params as any)?.clusterId;
              if (navigation.canGoBack()) {
                navigation.goBack();
                if (fromCluster && clusterId) {
                  setTimeout(() => {
                    try {
                      navigation.navigate('SafeRoute', {
                        openClusterId: clusterId,
                        openClusterModal: true,
                      });
                    } catch (e) {}
                  }, 120);
                }
                return;
              }
              if (fromCluster && clusterId) {
                navigation.navigate('SafeRoute', {
                  openClusterId: clusterId,
                  openClusterModal: true,
                });
              } else {
                navigation.navigate('SafeRoute');
              }
            }}
            style={{marginBottom: 12}}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기">
            <Text style={{fontSize: 22, color: '#000'}}>{'<'}</Text>
          </TouchableOpacity>

          <View style={styles.detailHeaderRow}>
            <Text style={styles.title}>
              {report.category ?? report.title ?? '제보'}
            </Text>
            <TouchableOpacity
              style={styles.resolvedBtnInline}
              onPress={() => {
                const fromCluster = (route.params as any)?.fromCluster;
                const clusterId = (route.params as any)?.clusterId;
                (async () => {
                  // 토큰 체크: 없으면 CustomAlert 사용
                  let tokenCheck: string | null = null;
                  try {
                    tokenCheck = await AsyncStorage.getItem('access_token');
                  } catch (e) {
                    console.warn('token read failed', e);
                  }
                  if (!tokenCheck) {
                    openAlert(
                      '안내',
                      '체험해보기 상태에서는 이제 없어요 기능을 사용할 수 없어요!',
                    );
                    return;
                  }

                  // Use local CustomAlert confirm (consistent with community flow)
                  setAlertTitle('이제 없어요');
                  setAlertMsg('정말 더 이상 존재하지 않나요?');
                  setAlertHideCancel(false);
                  setAlertConfirm(() => async () => {
                    try {
                      try {
                        console.log(
                          '[NotThere] detail screen send for reportId=',
                          String(reportId),
                          'category=',
                          report?.category ?? report?.title ?? '제보',
                        );
                      } catch (logErr) {}
                      let token: string | null = null;
                      try {
                        token = await AsyncStorage.getItem('access_token');
                      } catch (e) {}
                      await postReportNotThere(
                        String(reportId),
                        token ?? undefined,
                      );
                      // On success: close alert
                      setAlertVisible(false);
                      setAlertConfirm(null);
                    } catch (e: any) {
                      console.warn('not-there failed', e);
                      // Standardize to single dismissible message
                      setAlertTitle('안내');
                      setAlertMsg('이미 누른 제보입니다.');
                      setAlertConfirm(null);
                      setAlertHideCancel(true);
                    }
                  });
                  setAlertVisible(true);
                })();
              }}>
              <Text style={{fontWeight: '700', color: '#000'}}>
                이제 없어요
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            {report.description ?? report.content ?? ''}
          </Text>
          {imageUrl ? (
            <Image
              source={{uri: imageUrl}}
              style={styles.image}
              resizeMode="cover"
            />
          ) : null}

          {/* Header row: 댓글 title on the left, emoji evaluation UI on the right (under image) */}
          <View
            style={{
              marginTop: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <Text style={{fontWeight: '700', color: '#000'}}>댓글</Text>
            <View style={{paddingRight: 0}}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                {(() => {
                  const role = getCurrentUserRole();
                  const renderInteractive = role !== 'parent';
                  if (!renderInteractive) {
                    return (
                      <>
                        <View
                          style={{alignItems: 'center', marginHorizontal: 2}}
                          accessible={true}
                          accessibilityRole="button"
                          accessibilityLabel={`좋음 ${Number(
                            report?.badCount ?? 0,
                          )}개`}
                          accessibilityHint="자녀만 선택 가능"
                          accessibilityState={{
                            selected: report?.userEvaluation === 'bad',
                          }}>
                          <Image
                            source={require('../asset/emoji_good.png')}
                            style={{width: 22, height: 22}}
                            resizeMode="contain"
                          />
                          <Text
                            style={{
                              fontSize: 11,
                              marginTop: 0,
                              fontWeight:
                                report?.userEvaluation === 'bad'
                                  ? '700'
                                  : '400',
                              color:
                                report?.userEvaluation === 'bad'
                                  ? '#000'
                                  : '#666',
                            }}>
                            좋음 {Number(report?.badCount ?? 0)}
                          </Text>
                        </View>
                        <View
                          style={{alignItems: 'center', marginHorizontal: 2}}
                          accessible={true}
                          accessibilityRole="button"
                          accessibilityLabel={`보통 ${Number(
                            report?.badCount ?? 0,
                          )}개`}
                          accessibilityHint="자녀만 선택 가능"
                          accessibilityState={{
                            selected: report?.userEvaluation === 'normal',
                          }}>
                          <Image
                            source={require('../asset/emoji_soso.png')}
                            style={{width: 22, height: 22}}
                            resizeMode="contain"
                          />
                          <Text
                            style={{
                              fontSize: 11,
                              marginTop: 0,
                              fontWeight:
                                report?.userEvaluation === 'normal'
                                  ? '700'
                                  : '400',
                              color:
                                report?.userEvaluation === 'normal'
                                  ? '#000'
                                  : '#666',
                            }}>
                            보통 {Number(report?.normalCount ?? 0)}
                          </Text>
                        </View>
                        <View
                          style={{alignItems: 'center', marginHorizontal: 2}}
                          accessible={true}
                          accessibilityRole="button"
                          accessibilityLabel={`아쉬움 ${Number(
                            report?.badCount ?? 0,
                          )}개`}
                          accessibilityHint="자녀만 선택 가능"
                          accessibilityState={{
                            selected: report?.userEvaluation === 'good',
                          }}>
                          <Image
                            source={require('../asset/emoji_bad.png')}
                            style={{width: 22, height: 22}}
                            resizeMode="contain"
                          />
                          <Text
                            style={{
                              fontSize: 11,
                              marginTop: 0,
                              fontWeight:
                                report?.userEvaluation === 'good'
                                  ? '700'
                                  : '400',
                              color:
                                report?.userEvaluation === 'good'
                                  ? '#000'
                                  : '#666',
                            }}>
                            아쉬움 {Number(report?.goodCount ?? 0)}
                          </Text>
                        </View>
                      </>
                    );
                  }
                  return (
                    <>
                      <TouchableOpacity
                        style={{
                          alignItems: 'center',
                          marginLeft: 2,
                          marginRight: 6,
                        }}
                        disabled={evaluating}
                        onPress={async () => {
                          if (!reportId || evaluating) {
                            return;
                          }
                          // 토큰 체크
                          let tokenCheck: string | null = null;
                          try {
                            tokenCheck = await AsyncStorage.getItem(
                              'access_token',
                            );
                          } catch (e) {
                            console.warn('token read failed', e);
                          }
                          if (!tokenCheck) {
                            openAlert(
                              '안내',
                              '체험해보기 상태에서는 평가 기능을 사용할 수 없어요!',
                            );
                            return;
                          }
                          try {
                            setEvaluating(true);
                            let token: string | null = null;
                            try {
                              token = await AsyncStorage.getItem(
                                'access_token',
                              );
                            } catch (e) {}
                            await postReportEvaluation(
                              String(reportId),
                              'bad',
                              token ?? undefined,
                            );
                            applyOptimisticEvaluation('bad');
                          } catch (e) {
                            console.warn(
                              'report evaluation failed (좋음->bad)',
                              e,
                            );
                            openAlert(
                              '전송 실패',
                              '피드백 전송에 실패했습니다.',
                            );
                          } finally {
                            setEvaluating(false);
                          }
                        }}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`좋음 ${Number(
                          report?.badCount ?? 0,
                        )}개`}
                        accessibilityHint="선택하면 이 제보에 좋음 공감 표시가 됩니다"
                        accessibilityState={{
                          selected: report?.userEvaluation === 'bad',
                        }}>
                        <Image
                          source={require('../asset/emoji_good.png')}
                          style={{width: 22, height: 22}}
                          resizeMode="contain"
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            marginTop: 0,
                            fontWeight:
                              report?.userEvaluation === 'bad' ? '700' : '400',
                            color:
                              report?.userEvaluation === 'bad'
                                ? '#000'
                                : '#666',
                          }}>
                          좋음 {Number(report?.badCount ?? 0)}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{alignItems: 'center', marginHorizontal: 2}}
                        disabled={evaluating}
                        onPress={async () => {
                          if (!reportId || evaluating) {
                            return;
                          }
                          // 토큰 체크
                          let tokenCheck: string | null = null;
                          try {
                            tokenCheck = await AsyncStorage.getItem(
                              'access_token',
                            );
                          } catch (e) {
                            console.warn('token read failed', e);
                          }
                          if (!tokenCheck) {
                            openAlert(
                              '안내',
                              '체험해보기 상태에서는 평가 기능을 사용할 수 없어요!',
                            );
                            return;
                          }
                          try {
                            setEvaluating(true);
                            let token: string | null = null;
                            try {
                              token = await AsyncStorage.getItem(
                                'access_token',
                              );
                            } catch (e) {}
                            await postReportEvaluation(
                              String(reportId),
                              'normal',
                              token ?? undefined,
                            );
                            applyOptimisticEvaluation('normal');
                          } catch (e) {
                            console.warn(
                              'report evaluation failed (보통->normal)',
                              e,
                            );
                            openAlert(
                              '전송 실패',
                              '피드백 전송에 실패했습니다.',
                            );
                          } finally {
                            setEvaluating(false);
                          }
                        }}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`보통 ${Number(
                          report?.badCount ?? 0,
                        )}개`}
                        accessibilityHint="선택하면 이 제보에 보통 공감 표시가 됩니다"
                        accessibilityState={{
                          selected: report?.userEvaluation === 'normal',
                        }}>
                        <Image
                          source={require('../asset/emoji_soso.png')}
                          style={{width: 22, height: 22}}
                          resizeMode="contain"
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            marginTop: 0,
                            fontWeight:
                              report?.userEvaluation === 'normal'
                                ? '700'
                                : '400',
                            color:
                              report?.userEvaluation === 'normal'
                                ? '#000'
                                : '#666',
                          }}>
                          보통 {Number(report?.normalCount ?? 0)}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{alignItems: 'center', marginHorizontal: 2}}
                        disabled={evaluating}
                        onPress={async () => {
                          if (!reportId || evaluating) {
                            return;
                          }
                          // 토큰 체크
                          let tokenCheck: string | null = null;
                          try {
                            tokenCheck = await AsyncStorage.getItem(
                              'access_token',
                            );
                          } catch (e) {
                            console.warn('token read failed', e);
                          }
                          if (!tokenCheck) {
                            openAlert(
                              '안내',
                              '체험해보기 상태에서는 평가 기능을 사용할 수 없어요!',
                            );
                            return;
                          }
                          try {
                            setEvaluating(true);
                            let token: string | null = null;
                            try {
                              token = await AsyncStorage.getItem(
                                'access_token',
                              );
                            } catch (e) {}
                            await postReportEvaluation(
                              String(reportId),
                              'good',
                              token ?? undefined,
                            );
                            applyOptimisticEvaluation('good');
                          } catch (e) {
                            console.warn(
                              'report evaluation failed (아쉬움->good)',
                              e,
                            );
                            openAlert(
                              '전송 실패',
                              '피드백 전송에 실패했습니다.',
                            );
                          } finally {
                            setEvaluating(false);
                          }
                        }}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`아쉬움 ${Number(
                          report?.badCount ?? 0,
                        )}개`}
                        accessibilityHint="선택하면 이 제보에 아쉬움 공감 표시가 됩니다"
                        accessibilityState={{
                          selected: report?.userEvaluation === 'good',
                        }}>
                        <Image
                          source={require('../asset/emoji_bad.png')}
                          style={{width: 22, height: 22}}
                          resizeMode="contain"
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            marginTop: 0,
                            fontWeight:
                              report?.userEvaluation === 'good' ? '700' : '400',
                            color:
                              report?.userEvaluation === 'good'
                                ? '#000'
                                : '#666',
                          }}>
                          아쉬움 {Number(report?.goodCount ?? 0)}
                        </Text>
                      </TouchableOpacity>
                    </>
                  );
                })()}
              </View>
            </View>
          </View>
          <View>
            {comments.length === 0 ? (
              <Text style={{color: '#666'}}>아직 댓글이 없습니다.</Text>
            ) : (
              comments.map((c: any, idx: number) => {
                const resolveCommentId = (cm: any) => {
                  if (!cm) {
                    return '';
                  }
                  return String(
                    cm.id ??
                      cm.comment_id ??
                      cm.id_str ??
                      cm.commentId ??
                      cm.commentID ??
                      cm._id ??
                      '',
                  );
                };
                const text =
                  typeof c === 'string'
                    ? c
                    : c.content ??
                      c.text ??
                      c.comment ??
                      c.body ??
                      JSON.stringify(c);
                const rawDate =
                  c.createdAt ?? c.created_at ?? c.created_at_raw ?? '';
                let dateOnly = '';
                try {
                  if (rawDate) {
                    const d = new Date(rawDate);
                    if (!isNaN(d.getTime())) {
                      dateOnly = d.toLocaleDateString();
                    } else {
                      dateOnly =
                        String(rawDate).split('T')[0] || String(rawDate);
                    }
                  }
                } catch (e) {
                  dateOnly = String(rawDate || '');
                }
                return (
                  <View key={idx} style={{marginBottom: 12}}>
                    <Text style={styles.commentText}>{text}</Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 6,
                      }}>
                      <Text style={{color: '#666', fontSize: 12}}>
                        {dateOnly}
                      </Text>
                      {getCurrentUserRole &&
                      getCurrentUserRole() === 'child' ? (
                        <TouchableOpacity
                          onPress={() => {
                            // show app-styled confirmation modal before deleting
                            useAppAlertStore.getState().show({
                              title: '댓글 삭제',
                              body: '정말 댓글을 삭제하시겠습니까?',
                              ctaText: '삭제',
                              cancelText: '취소',
                              onConfirm: async () => {
                                try {
                                  const commentId = resolveCommentId(c);
                                  if (!commentId) {
                                    console.warn(
                                      'delete comment aborted: comment id not found on object',
                                      c,
                                    );
                                    Alert.alert(
                                      '삭제 실패',
                                      '삭제할 댓글 ID를 찾을 수 없습니다.',
                                    );
                                    return;
                                  }
                                  console.log(
                                    'Attempting to delete comment with id=',
                                    commentId,
                                    'for report=',
                                    reportId,
                                  );
                                  let token: string | null = null;
                                  try {
                                    token = await AsyncStorage.getItem(
                                      'access_token',
                                    );
                                  } catch (e) {}
                                  await deleteReportComment(
                                    String(reportId),
                                    commentId,
                                    token ?? undefined,
                                  );
                                  // remove from local state
                                  setComments(prev =>
                                    Array.isArray(prev)
                                      ? prev.filter(x => {
                                          const idX = resolveCommentId(x);
                                          return idX !== commentId;
                                        })
                                      : [],
                                  );
                                } catch (err: any) {
                                  console.warn('delete comment failed', err);
                                  const status = err?.response?.status;
                                  const detail =
                                    err?.response?.data?.detail ||
                                    err?.response?.data?.message;
                                  if (status === 403) {
                                    try {
                                      useAppAlertStore.getState().show({
                                        title: '삭제 불가',
                                        body:
                                          detail ||
                                          '본인이 작성한 댓글만 삭제할 수 있습니다.',
                                        ctaText: '확인',
                                      });
                                    } catch (e) {
                                      Alert.alert(
                                        '삭제 불가',
                                        String(
                                          detail ||
                                            '본인이 작성한 댓글만 삭제할 수 있습니다.',
                                        ),
                                      );
                                    }
                                  } else {
                                    try {
                                      useAppAlertStore.getState().show({
                                        title: '삭제 실패',
                                        body: '댓글 삭제에 실패했습니다.',
                                        ctaText: '확인',
                                      });
                                    } catch (e) {
                                      Alert.alert(
                                        '삭제 실패',
                                        '댓글 삭제에 실패했습니다.',
                                      );
                                    }
                                  }
                                }
                              },
                            });
                          }}>
                          <Text style={{color: '#666', fontSize: 13}}>
                            삭제
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
        {(() => {
          const role = getCurrentUserRole();
          // Parents cannot post comments — hide the input area entirely.
          if (role === 'parent') {
            return null;
          }
          return (
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                padding: 12,
                borderTopWidth: 1,
                borderTopColor: '#eee',
                backgroundColor: '#fff',
              }}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <TextInput
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder="댓글을 입력하세요..."
                  placeholderTextColor="#999"
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: '#eee',
                    borderRadius: 24,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    marginRight: 8,
                  }}
                  editable={!posting}
                  returnKeyType="send"
                  onSubmitEditing={async () => {
                    if (!newComment.trim()) {
                      return;
                    }
                    try {
                      setPosting(true);
                      let token: string | null = null;
                      try {
                        token = await AsyncStorage.getItem('access_token');
                      } catch (e) {}
                      const created = await postReportComment(
                        String(reportId),
                        newComment.trim(),
                        token ?? undefined,
                      );
                      setComments(s =>
                        Array.isArray(s) ? [created, ...s] : [created],
                      );
                      setNewComment('');
                    } catch (e) {
                      console.warn('post comment failed', e);
                      openAlert(
                        '알림',
                        '체험하기 상태에서는 댓글을 달 수 없습니다!',
                      );
                    } finally {
                      setPosting(false);
                    }
                  }}
                />
                <TouchableOpacity
                  onPress={async () => {
                    if (!newComment.trim()) {
                      return Alert.alert(
                        '댓글 입력',
                        '댓글 내용을 입력해주세요.',
                      );
                    }
                    try {
                      setPosting(true);
                      let token: string | null = null;
                      try {
                        token = await AsyncStorage.getItem('access_token');
                      } catch (e) {}
                      const created = await postReportComment(
                        String(reportId),
                        newComment.trim(),
                        token ?? undefined,
                      );
                      setComments(s =>
                        Array.isArray(s) ? [created, ...s] : [created],
                      );
                      setNewComment('');
                    } catch (e) {
                      console.warn('post comment failed', e);
                      openAlert(
                        '알림',
                        '체험하기 상태에서는\n댓글을 달 수 없습니다!',
                      );
                    } finally {
                      setPosting(false);
                    }
                  }}
                  style={{
                    backgroundColor: '#FFD44C',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 20,
                  }}
                  disabled={posting}>
                  {posting ? (
                    <ActivityIndicator />
                  ) : (
                    <Text style={{fontWeight: '700'}}>전송</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMsg}
        onClose={() => setAlertVisible(false)}
        onConfirm={alertConfirm || undefined}
        hideCancel={alertHideCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  title: {fontSize: 20, fontWeight: '800', color: '#000', marginBottom: 6},
  description: {color: '#000', marginBottom: 12},
  image: {width: '100%', height: 220, borderRadius: 8, marginBottom: 12},
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  resolvedBtnInline: {
    backgroundColor: '#FFD44C',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
  },
  commentText: {color: '#000', marginBottom: 12, fontSize: 14},
});
