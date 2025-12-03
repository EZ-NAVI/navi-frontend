import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

export default function OnboardingScreen({ navigation }: any) {
  const [index, setIndex] = useState(0);

  const slides = [
    {
      title: "위험구역을\n제보할 수 있어요!",
      image: require("../asset/tutorial/tutorial_step1.png"),
      desc: "골목길, 막힌 길, 공사장…\n위험한 곳을 발견했다면 알려주세요!\n함께 안전한 길을 만들어요.",
    },
    {
      title: "NAVI가 안전한 길을\n알려줘요!",
      image: require("../asset/tutorial/tutorial_step2.png"),
      desc: "여러분의 제보가 모여,\nNAVI가 더 똑똑하게 안전한 길을 안내해드려요.",
    },
    {
      title: "모두의 제보를 함께\n살펴봐요!",
      image: require("../asset/tutorial/tutorial_step3.png"),
      desc: "다른 사람들이 올린 제보를 보고,\n댓글과 평가로 함께 이야기 나눠요.",
    },
    {
      title: "NAVI",
      image: require("../asset/tutorial/tutorial_last.png"),
      desc: "새로운 시선에서 출발하는\n배리어프리 지도",
      last: true,
    },
  ];

  const onScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / width));
  };

  const handleNext = async () => {
    if (index === slides.length - 1) {
      await AsyncStorage.setItem("has_seen_onboarding", "true");
      navigation.replace("Login");
      return;
    }
    scrollRef?.current?.scrollTo({ x: width * (index + 1), animated: true });
  };

  const scrollRef = React.useRef<any>(null);

  return (
    <View style={styles.container}>

      {/* 스크롤 영역 */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ref={scrollRef}
      >
        {slides.map((s, i) => {
          const isLast = s.last === true;

          return (
            <View key={i} style={styles.slide}>

              {isLast ? (
                <>
                  <Image
                    source={s.image}
                    style={styles.lastPageImage}
                    resizeMode="contain"
                  />

                  <Text style={styles.lastPageLogo}>NAVI</Text>

                  <Text style={styles.lastPageDesc}>{s.desc}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.logo}>NAVI</Text>

                  <Text style={styles.title}>{s.title}</Text>

                  <Image
                    source={s.image}
                    style={styles.image}
                    resizeMode="contain"
                  />

                  <Text style={styles.desc}>{s.desc}</Text>
                </>
              )}

            </View>
          );
        })}
      </ScrollView>

      {/* 하단 고정 영역 */}
      <View style={styles.bottomArea}>
        <View style={styles.dots}>
          {slides.map((_, d) => (
            <View
              key={d}
              style={[
                styles.dot,
                d === index ? styles.dotActive : null,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleNext}>
          <Text style={styles.btnText}>
            {index === slides.length - 1 ? "시작하기" : "다음"}
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  slide: {
    width,
    height: height * 0.78,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 70,
  },

  /* ---------------------------
   * 일반 페이지 스타일
   * --------------------------- */
  logo: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFDE59",
    marginBottom: 50,
  },

  title: {
    fontSize: 23,
    fontWeight: "800",
    color: "#000",
    textAlign: "center",
    marginBottom: 20,
  },

  image: {
    width: width * 0.6,
    height: width * 0.6,
    marginBottom: 20,
  },

  desc: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
    paddingHorizontal: 20,
    fontWeight: "600",
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
    fontWeight: "900",
    color: "#FFDE59",
    marginBottom: 10,
  },

  lastPageDesc: {
    fontSize: 16,
    color: "#000",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "600",
  },

  /* ---------------------------
   * 하단 영역
   * --------------------------- */
  bottomArea: {
    width,
    paddingBottom: 40,
    paddingTop: 10,
    alignItems: "center",
    backgroundColor: "#fff",
  },

  dots: {
    flexDirection: "row",
    marginBottom: 15,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ddd",
    marginHorizontal: 4,
  },

  dotActive: {
    backgroundColor: "#FFDE59",
  },

  btn: {
    backgroundColor: "#FFDE59",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 20,
  },

  btnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
});
