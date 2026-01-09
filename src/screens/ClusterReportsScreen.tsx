import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useAppAlertStore} from '../stores/appAlertStore';
import {useNavigation} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  fetchReportsByCluster,
  fetchReportComments,
  postReportEvaluation,
  fetchReportById,
  postReportNotThere,
} from '../api/reports';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getCurrentUserRole} from '../lib/authState';
import {useReportStore} from '../stores/reportStore';
import CustomAlert from '../components/CustomAlert';

type Props = {
  clusterId: string | number;
  onClose: () => void;
  // If provided, these reports will be shown instead of fetching by clusterId
  nearbyReports?: any[] | null;
  // Optional callback when a report in the list is selected. If provided,
  // callers can close the modal and show the report on the map / open detail.
  onSelect?: (report: any) => void;
};

export default function ClusterReportsScreen({
  clusterId,
  onClose,
  nearbyReports,
  onSelect,
}: Props) {
  const navigation = useNavigation<any>();
  React.useEffect(() => {
    try {
      MaterialIcons.loadFont();
    } catch (e) {}
  }, []);

  const reportsFromStore = useReportStore(state => state.reports);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [evaluatingIds, setEvaluatingIds] = useState<Record<string, boolean>>(
    {},
  );

  /** ⭐ CustomAlert 전용 state */
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertConfirm, setAlertConfirm] = useState<null | (() => void)>(null);
  const [alertHideCancel, setAlertHideCancel] = useState(false);

  const openAlert = (title: string, body: string) => {
    useAppAlertStore.getState().show({
      title,
      body,
      ctaText: '확인',
    });
  };

  const applyOptimisticEvaluation = (
    rid: string,
    evalKey: 'good' | 'normal' | 'bad',
  ) => {
    setItems(prev =>
      prev.map(p => {
        const pid = String(p.reportId ?? p.id ?? '');
        if (pid !== rid) {
          return p;
        }
        const current = p.userEvaluation ?? null;
        if (current === evalKey) {
          return p;
        }
        let bad = p.badCount ?? 0;
        let normal = p.normalCount ?? 0;
        let good = p.goodCount ?? 0;
        let total = p.totalFeedbacks ?? 0;
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
          ...p,
          userEvaluation: evalKey,
          badCount: bad,
          normalCount: normal,
          goodCount: good,
          totalFeedbacks: newTotal,
        };
      }),
    );
  };

  const submitEvaluation = async (
    rid: string,
    evalKey: 'good' | 'normal' | 'bad',
  ) => {
    if (!rid || evaluatingIds[rid]) {
      return;
    }

    const tokenCheck = await AsyncStorage.getItem('access_token');
    if (!tokenCheck) {
      // Use local CustomAlert UI (consistent with '이제 없어요' flow)
      setAlertTitle('안내');
      setAlertMsg('체험해보기 상태에서는 평가 기능을 사용할 수 없어요!');
      setAlertHideCancel(true);
      setAlertConfirm(null);
      setAlertVisible(true);
      return;
    }

    try {
      setEvaluatingIds(m => ({...m, [rid]: true}));
      let token: string | null = null;
      try {
        token = await AsyncStorage.getItem('access_token');
      } catch (e) {}
      await postReportEvaluation(rid, evalKey, token ?? undefined);
      applyOptimisticEvaluation(rid, evalKey);
    } catch (e) {
      console.warn('Cluster evaluation failed', e);
      Alert.alert('전송 실패', '피드백 전송에 실패했습니다.');
    } finally {
      setEvaluatingIds(m => ({...m, [rid]: false}));
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let initialList: any[] = [];
        if (Array.isArray(nearbyReports) && nearbyReports.length > 0) {
          console.log(
            'ClusterReportsScreen: using nearbyReports directly, count=',
            nearbyReports.length,
          );
          // filter out unwanted category '도로폐쇄'
          const filteredNearby = nearbyReports.filter((r: any) => {
            const cat = (r.category ?? r.type ?? '').toString();
            return cat.trim() !== '도로폐쇄';
          });
          setItems(filteredNearby);
          return;
        }
        // try to use stored token if any (dev fallback handled in API too)
        let token: string | null = null;
        try {
          token = await AsyncStorage.getItem('access_token');
        } catch (e) {}

        const data =
          initialList.length > 0
            ? initialList
            : await fetchReportsByCluster(
                String(clusterId),
                token ?? undefined,
              );

        let resolved: any[] = [];
        if (Array.isArray(data)) {
          resolved = data;
        } else if (data && Array.isArray((data as any).results)) {
          resolved = (data as any).results;
        } else if (data && Array.isArray((data as any).reports)) {
          resolved = (data as any).reports;
        } else if (data && Array.isArray((data as any).data)) {
          resolved = (data as any).data;
        }

        const filtered = (resolved || []).filter((r: any) => {
          const cat = (r.category ?? r.type ?? '').toString();
          return cat.trim() !== '도로폐쇄';
        });

        setItems(filtered);

        try {
          const cats = Array.from(
            new Set(filtered.map((r: any) => r.category ?? r.type ?? '미분류')),
          );
          const catsNoRoadClosure = cats.filter(
            (c: any) => (c?.toString?.() ?? '').trim() !== '도로폐쇄',
          );
          setCategories(['전체', ...catsNoRoadClosure]);
          setSelectedCategory('전체');
        } catch (e) {}

        (async () => {
          try {
            const listToInspect = Array.isArray(filtered)
              ? filtered.slice(0, 30)
              : [];
            for (const it of listToInspect) {
              const rid = String(it.reportId ?? it.id ?? '');
              if (!rid) {
                continue;
              }

              try {
                const detail = await fetchReportById(rid, token ?? undefined);
                if (detail && detail.userEvaluation) {
                  setItems(prev =>
                    prev.map(p => {
                      const pid = String(p.reportId ?? p.id ?? '');
                      if (pid === rid) {
                        return {...p, userEvaluation: detail.userEvaluation};
                      }
                      return p;
                    }),
                  );
                }
              } catch (e) {}

              const comments = await fetchReportComments(
                rid,
                token ?? undefined,
              );

              setItems(prev =>
                prev.map(p => {
                  const pid = String(p.reportId ?? p.id ?? '');
                  if (pid === rid) {
                    try {
                      return {...p, comments};
                    } catch (e) {
                      return p;
                    }
                  }
                  return p;
                }),
              );
            }
          } catch (e) {}
        })();
      } catch (e) {
        console.warn('cluster list load failed', e);
        Alert.alert('불러오기 실패', '클러스터 제보를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clusterId]);

  // reportStore의 제보 리스트가 변경되면 items도 업데이트 (WebSocket 실시간 반영)
  useEffect(() => {
    if (reportsFromStore.length > 0 && items.length > 0) {
      const updatedItems = items.map(item => {
        const itemId = String(item.reportId ?? item.id ?? '');
        const updated = reportsFromStore.find(
          r => String(r.reportId ?? r.id ?? '') === itemId,
        );
        return updated ? {...item, ...updated} : item;
      });
      setItems(updatedItems);
      console.log('📡 [ClusterReportsScreen] reportStore 업데이트 감지');
    }
  }, [reportsFromStore]);

  /** ⭐ 여기서 "이제 없어요" 버튼 동작 수정됨 */
  const renderCard = ({item}: {item: any}) => {
    const imageUrl =
      item.imageUrl ??
      item.photoUrl ??
      item.image_url ??
      item.photo_url ??
      null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          const rid = String(item.reportId ?? item.id ?? '');
          if (rid) {
            try {
              navigation.navigate('SafeRoute', {
                openClusterModal: true,
                openClusterId: String(clusterId),
              });
            } catch (e) {}
            try {
              onClose();
            } catch (e) {}
            navigation.navigate('ReportDetail', {
              reportId: rid,
              fromCluster: true,
              clusterId: String(clusterId),
            });
          }
        }}>
        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>
              {item.category ?? item.title ?? '제보'}
            </Text>

            <TouchableOpacity
              style={styles.resolvedBtnInline}
              onPress={() => {
                const rid = String(item.reportId ?? item.id ?? '');
                if (!rid) {
                  return;
                }

                const tokenCheck = await AsyncStorage.getItem('access_token');
                if (!tokenCheck) {
                  setAlertTitle('안내');
                  setAlertMsg(
                    "체험해보기 상태에서는 '이제 없어요' 기능을 사용할 수 없어요!",
                  );
                  setAlertHideCancel(true);
                  setAlertConfirm(null);
                  setAlertVisible(true);
                  return;
                }

                setAlertTitle('이제 없어요');
                setAlertMsg('정말 더 이상 존재하지 않나요?');
                setAlertHideCancel(true);
                setAlertConfirm(() => async () => {
                  try {
                    let token: string | null = null;
                    try {
                      token = await AsyncStorage.getItem('access_token');
                    } catch (e) {}
                    await postReportNotThere(rid, token ?? undefined);
                  } catch (e: any) {
                    // Standardize message to '이미 누른 제보입니다.' and prevent retry
                    setAlertTitle('안내');
                    setAlertMsg('이미 누른 제보입니다.');
                    setAlertHideCancel(true);
                    setAlertConfirm(null);
                  }
                });
                setAlertVisible(true);
              }}>
              <Text style={{fontWeight: '700', color: '#000'}}>
                이제 없어요
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.cardText}>
            {item.userComment ?? item.comment ?? item.description ?? ''}
          </Text>

          {imageUrl ? (
            <Image
              source={{uri: imageUrl}}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : null}

          <View style={styles.cardFooter}>
            <View style={{flex: 1}}>
              <Text style={styles.commentLabel}>댓글</Text>
              {(() => {
                const commentsArr: any[] = Array.isArray(item.comments)
                  ? item.comments
                  : [];
                if (commentsArr.length === 0) {
                  return (
                    <Text style={{color: '#666', marginBottom: 12}}>
                      아직 댓글이 없습니다.
                    </Text>
                  );
                }
                const toShow = commentsArr
                  .slice(0, 3)
                  .map((c: any) =>
                    typeof c === 'string'
                      ? c
                      : c.content ??
                        c.text ??
                        c.comment ??
                        c.body ??
                        JSON.stringify(c),
                  );
                return (
                  <View>
                    {toShow.map((txt: string, idx: number) => (
                      <Text key={idx} style={styles.cardTextSmall}>
                        {txt}
                      </Text>
                    ))}
                    {commentsArr.length > 3 ? (
                      <Text style={{color: '#666', fontSize: 12}}>
                        외 {commentsArr.length - 3}개의 댓글
                      </Text>
                    ) : null}
                  </View>
                );
              })()}
            </View>

            <View style={styles.rightArea}>
              <View style={styles.emojisRow}>
                {/* 좋음 → bad */}
                {(() => {
                  const rid = String(item.reportId ?? item.id ?? '');
                  const selected = (item.userEvaluation ?? null) === 'bad';
                  const count = Number(item.badCount ?? 0);
                  const role = getCurrentUserRole();
                  if (role === 'parent') {
                    return (
                      <View
                        style={[styles.emojiBtn, {opacity: 1, marginRight: 6}]}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`좋음 ${count}개`}
                        accessibilityHint="자녀만 선택 가능"
                        accessibilityState={{selected}}>
                        <Image
                          source={require('../asset/emoji_good.png')}
                          style={{width: 28, height: 28}}
                          accessible={false}
                        />
                        <Text
                          style={[
                            styles.emojiLabel,
                            selected && styles.emojiLabelSelected,
                          ]}
                          accessible={false}>
                          좋음 {count}
                        </Text>
                      </View>
                    );
                  }
                  return (
                    <TouchableOpacity
                      style={[styles.emojiBtn, {marginRight: 6}]}
                      disabled={!!evaluatingIds[rid]}
                      onPress={() => submitEvaluation(rid, 'bad')}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`좋음 ${count}개`}
                      accessibilityHint="선택하면 이 제보에 좋음 공감 표시가 됩니다"
                      accessibilityState={{selected}}>
                      <Image
                        source={require('../asset/emoji_good.png')}
                        style={{width: 28, height: 28}}
                      />
                      <Text
                        style={[
                          styles.emojiLabel,
                          selected && styles.emojiLabelSelected,
                        ]}>
                        좋음 {count}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}
                {/* 보통 -> normal */}
                {(() => {
                  const rid = String(item.reportId ?? item.id ?? '');
                  const selected = (item.userEvaluation ?? null) === 'normal';
                  const count = Number(item.normalCount ?? 0);
                  const role = getCurrentUserRole();
                  if (role === 'parent') {
                    return (
                      <View
                        style={[styles.emojiBtn, {opacity: 1}]}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`보통 ${count}개`}
                        accessibilityHint="자녀만 선택 가능"
                        accessibilityState={{selected}}>
                        <Image
                          source={require('../asset/emoji_soso.png')}
                          style={{width: 28, height: 28}}
                        />
                        <Text
                          style={[
                            styles.emojiLabel,
                            selected && styles.emojiLabelSelected,
                          ]}>
                          보통 {count}
                        </Text>
                      </View>
                    );
                  }
                  return (
                    <TouchableOpacity
                      style={styles.emojiBtn}
                      disabled={!!evaluatingIds[rid]}
                      onPress={() => submitEvaluation(rid, 'normal')}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`보통 ${count}개`}
                      accessibilityHint="선택하면 이 제보에 보통 공감 표시가 됩니다"
                      accessibilityState={{selected}}>
                      <Image
                        source={require('../asset/emoji_soso.png')}
                        style={{width: 28, height: 28}}
                      />
                      <Text
                        style={[
                          styles.emojiLabel,
                          selected && styles.emojiLabelSelected,
                        ]}>
                        보통 {count}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}
                {/* 아쉬움 -> good */}
                {(() => {
                  const rid = String(item.reportId ?? item.id ?? '');
                  const selected = (item.userEvaluation ?? null) === 'good';
                  const count = Number(item.goodCount ?? 0);
                  const role = getCurrentUserRole();
                  if (role === 'parent') {
                    return (
                      <View
                        style={[styles.emojiBtn, {opacity: 1}]}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`보통 ${count}개`}
                        accessibilityHint="자녀만 선택 가능"
                        accessibilityState={{selected}}>
                        <Image
                          source={require('../asset/emoji_bad.png')}
                          style={{width: 28, height: 28}}
                        />
                        <Text
                          style={[
                            styles.emojiLabel,
                            selected && styles.emojiLabelSelected,
                          ]}>
                          아쉬움 {count}
                        </Text>
                      </View>
                    );
                  }
                  return (
                    <TouchableOpacity
                      style={styles.emojiBtn}
                      disabled={!!evaluatingIds[rid]}
                      onPress={() => submitEvaluation(rid, 'good')}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`아쉬움 ${count}개`}
                      accessibilityHint="선택하면 이 제보에 아쉬움 공감 표시가 됩니다"
                      accessibilityState={{selected}}>
                      <Image
                        source={require('../asset/emoji_bad.png')}
                        style={{width: 28, height: 28}}
                      />
                      <Text
                        style={[
                          styles.emojiLabel,
                          selected && styles.emojiLabelSelected,
                        ]}>
                        아쉬움 {count}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onClose()}
          style={{padding: 8}}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="상세 화면 줄이기">
          <MaterialIcons name="keyboard-arrow-down" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>커뮤니티</Text>
        <View style={{width: 60}} />
      </View>
      {/* category tabs */}
      {categories && categories.length > 0 ? (
        <View style={styles.tabsRow}>
          {categories.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setSelectedCategory(c)}
              style={[
                styles.tabBtn,
                selectedCategory === c ? styles.tabBtnActive : null,
              ]}>
              <Text
                style={[
                  styles.tabText,
                  selectedCategory === c ? styles.tabTextActive : null,
                ]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {loading ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={
            selectedCategory === '전체'
              ? items
              : items.filter(
                  it =>
                    (it.category ?? it.type ?? '미분류') === selectedCategory,
                )
          }
          keyExtractor={(i: any, idx) => String(i.reportId ?? i.id ?? idx)}
          renderItem={renderCard}
          contentContainerStyle={{padding: 16}}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontWeight: '800',
    fontSize: 16,
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardImage: {width: '100%', height: 180},
  cardBody: {padding: 12},
  cardTitle: {fontSize: 16, fontWeight: '800', marginBottom: 6},
  cardText: {color: '#000', marginBottom: 10},
  cardTextSmall: {color: '#000', marginBottom: 6, fontSize: 14},
  commentLabel: {fontWeight: '700', marginBottom: 8, color: '#000'},
  cardFooter: {flexDirection: 'row', justifyContent: 'space-between'},

  rightArea: {alignItems: 'flex-end', marginLeft: 12},
  emojisRow: {flexDirection: 'row', alignItems: 'center', marginTop: 6},

  emojiBtn: {alignItems: 'center', marginHorizontal: 2},
  emojiLabel: {fontSize: 12, marginTop: 4, color: '#666'},
  emojiLabelSelected: {
    fontSize: 12,
    marginTop: 4,
    color: '#000',
    fontWeight: '700',
  },

  cardHeaderRow: {
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

  tabsRow: {flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10},
  tabBtn: {
    marginRight: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  tabBtnActive: {backgroundColor: '#FFD44C', borderColor: '#FFD44C'},
  tabText: {color: '#333'},
  tabTextActive: {color: '#000', fontWeight: '700'},
});
