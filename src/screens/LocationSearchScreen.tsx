import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useRouteData} from '../context/RouteContext';

type Poi = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address?: string;
};

type RouteParams = {type: 'start' | 'end'};

const TMAP_APP_KEY = 'JT4qeFOp7e438Wx4rsj419607dvmdw3X3SOhcBKy';

export default function LocationSearchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const {type} = (route.params || {}) as RouteParams;
  const {setStart, setEnd} = useRouteData();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Poi[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  // LocationSearch에서는 하단 제보 버튼을 표시하지 않습니다.

  const search = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const url =
        'https://apis.openapi.sk.com/tmap/pois?version=1&count=15&searchKeyword=' +
        encodeURIComponent(q);

      const res = await fetch(url, {headers: {appKey: TMAP_APP_KEY}});
      const json = await res.json();

      const poisRaw = json?.searchPoiInfo?.pois?.poi ?? [];
      const mapped: Poi[] = poisRaw.map((p: any) => ({
        id: String(p.id ?? p.poiId ?? Math.random()),
        name: p.name,
        lat: Number(p.frontLat ?? p.noorLat ?? p.lat),
        lon: Number(p.frontLon ?? p.noorLon ?? p.lon),
        address:
          p.upperAddrName && p.middleAddrName
            ? `${p.upperAddrName} ${p.middleAddrName} ${
                p.roadName ?? ''
              }`.trim()
            : p.roadName ?? '',
      }));
      setResults(mapped);
    } catch (e) {
      console.warn('TMAP search error', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => search(query), 300);
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [query]);

  // (제거) 제보 버튼 관련 애니메이션은 더 이상 사용하지 않습니다.

  const onSelect = (poi: Poi) => {
    Keyboard.dismiss();
    if (type === 'start') {
      setStart({name: poi.name, lat: poi.lat, lon: poi.lon});
    } else {
      setEnd({name: poi.name, lat: poi.lat, lon: poi.lon});
    }
    navigation.navigate('SafeRoute');
  };

  const placeholder = type === 'end' ? '도착지 검색' : '출발지 검색';

  const clearQuery = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{paddingRight: 6}}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기">
          <Icon name="chevron-back" size={26} color="#333" />
        </TouchableOpacity>

        <Text style={styles.title}>{placeholder}하세요</Text>
      </View>

      {/* ✅ 검색창 (돋보기 + X 포함) */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="default"
          returnKeyType="search"
          onSubmitEditing={() => search(query)}
          placeholderTextColor="#aaa"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearQuery} style={{marginRight: 8}}>
            <Icon name="close-circle" size={20} color="#777" />
          </TouchableOpacity>
        )}
        <Icon name="search-outline" size={20} color="#444" />
      </View>

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator />
        </View>
      )}

      {/* ✅ 검색 결과 리스트 */}
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({item}) => (
          <Pressable style={styles.row} onPress={() => onSelect(item)}>
            <Icon
              name="location-outline"
              size={20}
              color="#f7d23e"
              style={{marginRight: 8}}
            />
            <View>
              <Text style={styles.name}>{item.name}</Text>
              {!!item.address && (
                <Text style={styles.addr}>{item.address}</Text>
              )}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading && query.length > 0 ? (
            <Text style={styles.empty}>검색 결과가 없어요</Text>
          ) : null
        }
      />

      {/* LocationSearch 화면에서는 하단 제보(FAB) UI를 제거했습니다. 필요하면 다른 화면에서 제보 기능을 사용하세요. */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff', paddingTop: 16},

  // 🔥 추가된 헤더
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 10,
  },

  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },

  // ✅ 아이콘 포함 검색창
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },

  input: {flex: 1, fontSize: 15, color: '#111', paddingVertical: 0},

  loading: {padding: 12, marginHorizontal: 20},
  sep: {height: 1, backgroundColor: '#eee', marginLeft: 20},

  // ✅ 결과 리스트
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  name: {fontSize: 15, color: '#111', fontWeight: '600', marginBottom: 2},
  addr: {fontSize: 12, color: '#666'},
  empty: {padding: 20, color: '#777', textAlign: 'center'},
});
