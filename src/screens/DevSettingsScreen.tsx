import React from 'react';
import { View, Button, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// 개발용 설정/디버그 화면
// 추후 필요 없으면 삭제 가능
const DevSettingsScreen: React.FC = () => {
	const navigation = useNavigation();

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<View style={styles.group}>
				<Button
					title="FCM 토큰 등록 디버그 화면 열기"
					onPress={() => navigation.navigate('DebugNotification' as never)}
				/>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: 16,
		gap: 16,
	},
	group: {
		gap: 12,
	},
});

export default DevSettingsScreen;

