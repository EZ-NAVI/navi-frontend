import React, {useState, useEffect, useContext} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
  ToastAndroid,
  ActivityIndicator,
} from 'react-native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {updateReport, getPresignedUrl} from '../api/reports';
import {WebSocketContext} from '../context/WebSocketContext';

type RootStackParamList = {
  ReportEdit: {
    reportId: string;
    category?: string;
    description?: string;
    image_url?: string;
    location_lat?: number;
    location_lng?: number;
  };
};

type ReportEditScreenRouteProp = RouteProp<RootStackParamList, 'ReportEdit'>;
type ReportEditScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ReportEdit'
>;

const CATEGORIES = [
  {label: '공사장', value: '공사장'},
  {label: '장애물', value: '장애물'},
  {label: '공포', value: '공포'},
  {label: '인도 없음', value: '인도 없음'},
  {label: '놀이터, 쉼터', value: '놀이터, 쉼터'},
];

export default function ReportEditScreen() {
  const navigation = useNavigation<ReportEditScreenNavigationProp>();
  const route = useRoute<ReportEditScreenRouteProp>();
  const {
    reportId,
    category: initialCategory,
    description: initialDescription,
    image_url: initialImageUrl,
  } = route.params;

  // WebSocket 컨텍스트
  const wsContext = useContext(WebSocketContext);
  const sendWebSocket = wsContext?.send;

  const [category, setCategory] = useState(initialCategory || '');
  const [description, setDescription] = useState(initialDescription || '');
  const [photo, setPhoto] = useState<string | null>(initialImageUrl || null);
  const [catOpen, setCatOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const notify = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const pickImage = async () => {
    if (Platform.OS === 'android') {
      try {
        const sdkInt = Platform.constants?.Version || 0;
        const readPermission =
          sdkInt >= 33
            ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
            : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        const granted = await PermissionsAndroid.request(
          readPermission as any,
          {
            title: '이미지 접근 권한',
            message: '제보에 사진을 첨부하려면 이미지 접근 권한이 필요합니다.',
            buttonPositive: '허용',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          notify('이미지 접근 권한이 필요합니다.');
          return;
        }
      } catch (e) {
        console.warn('권한 요청 중 오류', e);
      }
    }

    let pickerMod: any;
    try {
      pickerMod = require('react-native-image-picker');
      if (
        !pickerMod ||
        (typeof pickerMod === 'object' && Object.keys(pickerMod).length === 0)
      ) {
        notify('이미지 선택 기능이 초기화되지 않았습니다.');
        return;
      }
    } catch (e) {
      notify(
        '이미지 선택 기능을 사용하려면 react-native-image-picker를 설치하세요.',
      );
      return;
    }

    let launcher: any = null;
    if (typeof pickerMod === 'function') {
      launcher = pickerMod;
    } else if (typeof pickerMod.launchImageLibrary === 'function') {
      launcher = pickerMod.launchImageLibrary;
    } else if (pickerMod?.default && typeof pickerMod.default === 'function') {
      launcher = pickerMod.default;
    } else if (
      pickerMod?.default &&
      typeof pickerMod.default.launchImageLibrary === 'function'
    ) {
      launcher = pickerMod.default.launchImageLibrary;
    }

    if (typeof launcher !== 'function') {
      notify('이미지 선택 기능을 초기화할 수 없습니다.');
      return;
    }

    try {
      const options = {mediaType: 'photo', selectionLimit: 1};
      let result: any = await new Promise(resolve => {
        try {
          launcher(options, resolve);
        } catch (err) {
          resolve(undefined);
        }
      });

      if (
        result &&
        result.mediaType === options.mediaType &&
        result.selectionLimit === options.selectionLimit
      ) {
        try {
          const maybePromise = launcher(options);
          if (maybePromise && typeof maybePromise.then === 'function') {
            result = await maybePromise;
          }
        } catch (err) {
          console.warn('Promise-style launcher call failed', err);
        }
      }

      if (result?.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri || null;
        if (uri && typeof uri === 'string') {
          setPhoto(uri);
        }
      }
    } catch (e) {
      console.warn('pickImage error', e);
      notify('이미지 선택 중 오류가 발생했습니다.');
    }
  };

  const uploadImageToPresigned = async (uri: string): Promise<string> => {
    setIsUploadingImage(true);
    try {
      const fileName = uri.split('/').pop() || `photo_${Date.now()}.jpg`;
      const ext = fileName.split('.').pop() || 'jpg';
      let mime = 'image/jpeg';
      if (ext.toLowerCase() === 'png') {
        mime = 'image/png';
      } else if (ext.toLowerCase() === 'webp') {
        mime = 'image/webp';
      }

      const presigned = await getPresignedUrl(fileName, mime);
      let uploadUrl: string | undefined;
      let finalUrl: string | undefined;

      if (typeof presigned === 'string') {
        uploadUrl = presigned;
      } else if (presigned) {
        uploadUrl =
          presigned.url ||
          presigned.upload_url ||
          presigned.presigned_url ||
          presigned.put_url ||
          presigned.uploadUrl;
        finalUrl =
          presigned.final_url ||
          presigned.file_url ||
          presigned.object_url ||
          presigned.url_without_query;
      }

      if (!uploadUrl) {
        throw new Error('presigned url not returned from server');
      }

      const localFetch = await fetch(uri);
      const blob = await localFetch.blob();

      const headers: any = {'Content-Type': mime, 'x-amz-acl': 'public-read'};
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body: blob,
      });

      if (!putRes.ok) {
        const txt = await putRes.text().catch(() => '');
        throw new Error(
          `upload failed: ${putRes.status} ${putRes.statusText} ${txt}`,
        );
      }

      if (!finalUrl) {
        finalUrl =
          presigned.file_url ||
          presigned.final_url ||
          presigned.object_url ||
          uploadUrl;
      }

      if (!finalUrl) {
        throw new Error('Failed to get final image URL');
      }

      notify('사진 업로드 완료');
      return finalUrl;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!category || !description.trim()) {
      notify('카테고리와 제보 내용을 입력해 주세요.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: any = {
        category,
        description: description.trim(),
      };

      // 사진이 변경되었으면 업로드
      if (photo && photo !== initialImageUrl) {
        try {
          const finalUrl = await uploadImageToPresigned(photo);
          if (finalUrl) {
            payload.image_url = finalUrl;
          }
        } catch (e: any) {
          console.warn('upload photo failed', e);
          notify('사진 업로드에 실패했습니다.');
          setIsSubmitting(false);
          return;
        }
      }

      console.log('제보 수정 payload:', payload);
      const updatedReport = await updateReport(reportId, payload);

      console.log('✅ [API] 제보 수정 성공:', updatedReport);

      // 수정 성공 후 WebSocket으로 부모에게 알림 전송 (report.updated)
      if (sendWebSocket) {
        try {
          const websocketPayload = {
            eventType: 'report.updated',
            reportId,
            ...payload, // 수정된 category, description, image_url 포함
          };
          console.log(
            '📤 [WebSocket] 수정 알림 전송:',
            JSON.stringify(websocketPayload, null, 2),
          );
          sendWebSocket(websocketPayload);
          console.log('✅ [WebSocket] 수정 알림 전송 완료');
        } catch (wsError) {
          console.warn('❌ [WebSocket] 알림 전송 실패:', wsError);
        }
      } else {
        console.log(
          '⚠️ [WebSocket] WebSocketProvider가 없어서 알림을 전송하지 않습니다.',
        );
      }

      notify('제보가 수정되었습니다.');
      navigation.goBack();
    } catch (error: any) {
      console.error('제보 수정 실패:', error);
      const serverBody = error?.response?.data;
      if (serverBody) {
        const maybeMsg =
          typeof serverBody === 'string'
            ? serverBody
            : serverBody.message ||
              serverBody.error ||
              JSON.stringify(serverBody);
        notify(String(maybeMsg).slice(0, 200));
      } else {
        notify('제보 수정에 실패했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기">
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>제보 수정</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>카테고리</Text>
        <View style={{marginBottom: 20, position: 'relative'}}>
          <TouchableOpacity
            style={styles.dropdownHeader}
            onPress={() => setCatOpen(v => !v)}
            activeOpacity={0.7}>
            <Text style={styles.dropdownHeaderText}>
              {category ? category : '카테고리 선택'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={25} color="#666" />
          </TouchableOpacity>
          {catOpen && (
            <View style={styles.dropdownList}>
              <ScrollView
                style={{maxHeight: 140}}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setCategory(cat.value);
                      setCatOpen(false);
                    }}>
                    <Text style={styles.dropdownItemText}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>사진</Text>
        <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
          {photo ? (
            <Image
              source={{uri: photo}}
              style={styles.photoPreview}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.uploadEmpty}>
              <MaterialIcons name="cloud-upload" size={40} color="#888" />
              <Text style={styles.uploadEmptyText}>사진을 선택해주세요</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>제보 내용</Text>
        <TextInput
          placeholder="100자 이내로 입력해주세요"
          value={description}
          onChangeText={setDescription}
          style={styles.input}
          multiline
          maxLength={100}
          onFocus={() => setCatOpen(false)}
          blurOnSubmit={false}
        />
        <Text
          style={[
            styles.charCount,
            description.length > 100 && styles.charCountOver,
          ]}>
          {description.length}/100
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (isSubmitting || isUploadingImage) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || isUploadingImage}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>수정 완료</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  dropdownHeader: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F2F3F5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownHeaderText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  dropdownList: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#333',
  },
  uploadBox: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#F2F3F5',
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  uploadEmpty: {
    alignItems: 'center',
  },
  uploadEmptyText: {
    marginTop: 8,
    color: '#888',
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 15,
    backgroundColor: '#F9F9F9',
  },
  charCount: {
    alignSelf: 'flex-end',
    marginTop: 8,
    color: '#888',
    fontSize: 13,
  },
  charCountOver: {
    color: '#d00',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
