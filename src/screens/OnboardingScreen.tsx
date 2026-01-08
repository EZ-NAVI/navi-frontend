import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  AccessibilityInfo,
  findNodeHandle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {width, height} = Dimensions.get('window');

export default function OnboardingScreen({navigation, route}: any) {
  const [index, setIndex] = useState(0);
  const logoRef = useRef<any>(null);
  const lastImageRef = useRef<any>(null);

  const slides = [
    {
      title: '위험구역을\n제보할 수 있어요!',
      image: require('../asset/tutorial/tutorial_step1.png'),
      imageAlt: '위험구역',
      desc: '골목길, 막힌 길, 공사장…\n위험한 곳을 발견했다면 알려주세요!\n자녀의 제보는 부모의 승인이 필요해요.\n함께 안전한 길을 만들어봐요.',
    },
    {
      title: 'NAVI가 안전한 길을\n알려줘요!',
      image: require('../asset/tutorial/tutorial_step2.png'),
      imageAlt: '지도',
      desc: '여러분의 제보가 모여,\nNAVI가 더 똑똑하게 안전한 길을 안내해드려요.',
    },
    {
      title: '모두의 제보를 함께\n살펴봐요!',
      image: require('../asset/tutorial/tutorial_step3.png'),
      imageAlt: 'NAVI 앱을 사용하는 아이',
      desc: '다른 사람들이 올린 제보를 보고,\n댓글과 평가로 함께 이야기 나눠요.',
    },
    {
      title: 'NAVI',
      image: require('../asset/tutorial/tutorial_last.png'),
      imageAlt: 'NAVI 캐릭터',
      desc: '새로운 시선에서 출발하는\n배리어프리 지도',
      last: true,
    },
  ];

  // 페이지 진입 및 인덱스 변경 시 포커스: 일반은 NAVI 로고, 마지막은 캐릭터 이미지
  useEffect(() => {
    const target =
      index === slides.length - 1 ? lastImageRef.current : logoRef.current;
    const node = findNodeHandle(target);
    if (!node) {
      return;
    }
    const timer = setTimeout(() => {
      AccessibilityInfo.setAccessibilityFocus(node);
    }, 120);
    return () => clearTimeout(timer);
  }, [index, slides.length]);

  const handleNext = async () => {
    if (index === slides.length - 1) {
      if (route?.params?.from === 'mypage') {
        navigation.goBack();
        return;
      }
      await AsyncStorage.setItem('has_seen_onboarding', 'true');
      navigation.replace('Login');
      return;
    }
    setIndex(prev => Math.min(prev + 1, slides.length - 1));
  };

  const handlePrev = () => {
    if (index === 0) {
      return;
    }
    setIndex(prev => Math.max(prev - 1, 0));
  };

  const currentSlide = slides[index];
  const isLast = currentSlide.last === true;

  const nextPageLabel =
    index === slides.length - 1
      ? '시작하기'
      : `다음, ${Math.min(index + 2, slides.length)}번째 페이지로 이동`;

  return (
    <View style={styles.container}>
      {/* 단일 페이지 렌더링 (슬라이드/스크롤 제거) */}
      <View style={styles.slide}>
        {isLast ? (
          <>
            <Image
              ref={lastImageRef}
              source={currentSlide.image}
              style={styles.lastPageImage}
              resizeMode="contain"
              accessible={true}
              accessibilityRole="image"
              accessibilityLabel={currentSlide.imageAlt}
            />

            <Text
              style={styles.lastPageLogo}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel="NAVI 튜토리얼 로고">
              NAVI
            </Text>

            <Text style={styles.lastPageDesc}>{currentSlide.desc}</Text>
          </>
        ) : (
          <>
            <Text
              ref={logoRef}
              style={styles.logo}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel="NAVI 튜토리얼 로고">
              NAVI
            </Text>

            <Text style={styles.title}>{currentSlide.title}</Text>

            <Image
              source={currentSlide.image}
              style={styles.image}
              resizeMode="contain"
              accessible={true}
              accessibilityRole="image"
              accessibilityLabel={currentSlide.imageAlt}
            />

            <Text style={styles.desc}>{currentSlide.desc}</Text>
          </>
        )}
      </View>

      {/* 하단 고정 영역 */}
      <View style={styles.bottomArea}>
        {index > 0 ? (
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.prevBtn]}
              onPress={handlePrev}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`이전, ${Math.min(
                index,
                slides.length,
              )}번째 페이지로 이동`}>
              <Text style={[styles.btnText, styles.prevBtnText]}>이전</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.nextBtn]}
              onPress={handleNext}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={nextPageLabel}>
              <Text style={styles.btnText}>
                {index === slides.length - 1 ? '시작하기' : '다음'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.btn}
            onPress={handleNext}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`다음, ${Math.min(
              index + 2,
              slides.length,
            )}번째 페이지로 이동`}>
            <Text style={styles.btnText}>다음</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},

  slide: {
    width,
    height: height * 0.78,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 70,
  },

  /* ---------------------------
   * 일반 페이지 스타일
   * --------------------------- */
  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFDE59',
    marginBottom: 50,
  },

  title: {
    fontSize: 23,
    fontWeight: '800',
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
  },

  image: {
    width: width * 0.6,
    height: width * 0.6,
    marginBottom: 20,
  },

  desc: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    paddingHorizontal: 20,
    fontWeight: '600',
  },

  lastPageImage: {
    width: width * 0.65,
    height: width * 0.65,
    marginBottom: -40,
    marginTop: 90,
    marginLeft: 5,
  },

  lastPageLogo: {
    fontSize: 47,
    fontWeight: '900',
    color: '#FFDE59',
    marginBottom: 10,
  },

  lastPageDesc: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600',
  },

  /* ---------------------------
   * 하단 영역
   * --------------------------- */
  bottomArea: {
    width,
    paddingBottom: 40,
    paddingTop: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },

  btnRow: {flexDirection: 'row', gap: 12},

  btn: {
    backgroundColor: '#FFDE59',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 20,
  },

  prevBtn: {backgroundColor: '#eee'},

  prevBtnText: {color: '#000'},

  nextBtn: {backgroundColor: '#FFDE59'},

  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
