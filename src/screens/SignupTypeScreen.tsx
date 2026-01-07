// src/screens/SignupTypeScreen.tsx
import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function SignupTypeScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      {/* 왼쪽 상단 화살표 버튼 */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="뒤로가기">
        <Icon name="chevron-back" size={26} color="#333" />
      </TouchableOpacity>

      {/* 타이틀 */}
      <Text style={styles.title}>회원 유형을 선택하세요</Text>

      {/* 카드 영역 */}
      <View style={styles.cardContainer}>
        {/* 이상 */}
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate('SignupConsent', {userType: 'parent'})
          }
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="만 14세 이상 선택">
          <Text style={styles.cardText}>만 14세 이상</Text>
        </TouchableOpacity>

        {/* 미만 */}
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            navigation.navigate('SignupConsent', {userType: 'child'})
          }
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="만 14세 미만 선택">
          <Text style={styles.cardText}>만 14세 미만</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    padding: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 40,
  },
  cardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  card: {
    backgroundColor: '#FFDE59',
    borderRadius: 20,
    width: '47%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  subText: {
    color: '#000',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  cardText: {
    color: '#000',
    fontSize: 24,
    fontWeight: '800',
  },
});
