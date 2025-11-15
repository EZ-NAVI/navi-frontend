import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  ScrollView,
  Modal,
  Platform,
  Alert,
  ToastAndroid,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { PermissionsAndroid } from 'react-native';

import { sendReport, ReportPayload, ReportResponse, getPresignedUrl } from '../api/reports';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEV_TOKEN } from '../config/dev';

console.log('🔍 [ReportModal] DEV_TOKEN:', DEV_TOKEN?.substring(0, 50) + '...');

type Location = { location_lat: number; location_lng: number };

type Props = {
  onClose?: () => void;
  onSubmitted?: (payload: any) => void;
  location?: Location | undefined;
};

export default function ReportModal({ onClose, onSubmitted, location }: Props) {
  useEffect(() => {
    MaterialIcons.loadFont();
  }, []);

  const [photo, setPhoto] = useState<string | null>(null);
  const [imgRatio, setImgRatio] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>("");
  const [catOpen, setCatOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  // Do not store a manual image-url fallback in state. We avoid exposing a
  // manual "image URL" input to users — uploads are done programmatically via
  // presigned URLs. If upload succeeds we return the final URL from the
  // upload helper and use it directly when sending the report.
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const CATEGORIES = [
    { label: "공사장", value: "공사장" },
    { label: "장애물", value: "장애물" },
    { label: "공포", value: "공포" },
    { label: "인도 없음", value: "인도 없음" },
    { label: "놀이터, 쉼터", value: "놀이터, 쉼터" },
  ];

  const notify = (msg: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
    else Alert.alert('', msg);
  };
  
  // Upload a local image URI to S3 using a presigned URL provided by the backend.
  // This is used to perform image upload immediately after selection, before /reports POST.
  async function uploadImageToPresigned(uri: string) {
    setIsUploadingImage(true);
    try {
      const fileName = uri.split('/').pop() || `photo_${Date.now()}.jpg`;
      const ext = fileName.split('.').pop() || 'jpg';
      let mime = 'image/jpeg';
      if (ext.toLowerCase() === 'png') mime = 'image/png';
      else if (ext.toLowerCase() === 'webp') mime = 'image/webp';

      // 개발용 임시 토큰 사용
      const currentToken = await AsyncStorage.getItem('access_token');
      const tokenToUse = currentToken || DEV_TOKEN;

      if (!tokenToUse) throw new Error('No auth token available for presign request');

      const presigned = await getPresignedUrl(fileName, mime, tokenToUse);
      let uploadUrl: string | undefined;
      let finalUrl: string | undefined;
      if (typeof presigned === 'string') uploadUrl = presigned;
      else if (presigned) {
        uploadUrl = presigned.url || presigned.upload_url || presigned.presigned_url || presigned.put_url || presigned.uploadUrl;
        finalUrl = presigned.final_url || presigned.file_url || presigned.object_url || presigned.url_without_query;
      }
      if (!uploadUrl) throw new Error('presigned url not returned from server');

      const localFetch = await fetch(uri);
      const blob = await localFetch.blob();

      // Build headers. Only include x-amz-acl when the presign response
      // indicates the server included ACL in the signature or explicitly
      // returned an ACL hint. Blindly adding x-amz-acl when the presign was
      // not created with that header causes a 403 (signature mismatch) OR,
      // if the account blocks public ACLs, S3 will reject with AccessDenied.
      // Backend updated to generate presigned PUT URLs allowing public ACLs.
      // Include x-amz-acl unconditionally so objects are uploaded with public-read.
      // If backend/infra later re-enables BlockPublicAcls, this will return 403.
      const headers: any = { 'Content-Type': mime, 'x-amz-acl': 'public-read' };
      console.log('Including x-amz-acl header for upload (unconditional)');
      const putRes = await fetch(uploadUrl, { method: 'PUT', headers, body: blob });
      console.log('upload PUT status:', putRes.status, putRes.statusText);
      if (!putRes.ok) {
        const txt = await putRes.text().catch(() => '');
        throw new Error(`upload failed: ${putRes.status} ${putRes.statusText} ${txt}`);
      }

      if (!finalUrl) {
        // Do NOT blindly strip the presigned query string and return a non-signed URL;
        // if the bucket/object is private this will produce a 403 when the client
        // later tries to GET the file. Prefer returning any server-provided GET URL
        // (final_url / file_url / object_url). If none is provided, fall back to
        // returning the original uploadUrl (with query) and warn — note: a PUT
        // presigned URL may authorize only uploads, not GETs. Best fix: have the
        // backend return a proper public file_url or a presigned GET URL after the
        // upload completes.
        finalUrl = presigned.file_url || presigned.final_url || presigned.object_url || uploadUrl;
        if (finalUrl === uploadUrl) {
          console.warn('presign response lacked a final GET URL; using uploadUrl as fallback. The stored URL may be inaccessible for GET (403).');
        }
      }
      if (Platform.OS === 'android') {
        // eslint-disable-next-line no-undef
        const ToastAndroid = require('react-native').ToastAndroid;
        ToastAndroid.show('사진 업로드 완료', ToastAndroid.SHORT);
      } else {
        // iOS Alert briefly
        // Alert.alert('', '사진 업로드 완료');
      }
      return finalUrl;
    } finally {
      setIsUploadingImage(false);
    }
  }

  // Try to acquire device location when the modal mounts (if location prop not provided)
  useEffect(() => {
    const acquire = async () => {
      if (location && location.location_lat != null && location.location_lng != null) return;

      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
            title: '위치 권한',
            message: '제보에 현재 위치를 포함하려면 위치 권한이 필요합니다.',
            buttonPositive: '허용',
          });
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Location permission denied');
            return;
          }
        }

        // Try multiple geolocation providers (community package or navigator fallback)
        const pos: any = await new Promise((resolve, reject) => {
          const options = { enableHighAccuracy: true, timeout: 8000, maximumAge: 1000 };
          // 1) try community package if installed
          try {
            // Prefer the native react-native-geolocation-service if installed (more reliable on Android/iOS)
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const geoPkg = require('react-native-geolocation-service');
            const getter = geoPkg?.getCurrentPosition ?? geoPkg?.default?.getCurrentPosition;
            if (typeof getter === 'function') {
              return getter((p: any) => resolve(p), (err: any) => reject(err), options);
            }
          } catch (e) {
            // fall through to other providers
          }

          // 2) navigator.geolocation (older RN or polyfilled). We intentionally avoid requiring
          //    @react-native-community/geolocation because Metro logs a fatal error when the
          //    optional package is absent, even if wrapped in try/catch.
          try {
            // @ts-ignore
            if (typeof navigator !== 'undefined' && navigator.geolocation && typeof navigator.geolocation.getCurrentPosition === 'function') {
              // @ts-ignore
              return navigator.geolocation.getCurrentPosition((p: any) => resolve(p), (err: any) => reject(err), options);
            }
          } catch (e) {
            // fall through
          }

          // 3) no geolocation provider available
          reject(new Error('Geolocation API unavailable'));
        });

        const lat = pos.coords?.latitude;
        const lng = pos.coords?.longitude;
        if (typeof lat === 'number' && typeof lng === 'number') {
          setCurrentLocation({ location_lat: lat, location_lng: lng });
          console.log('Acquired device location for report:', lat, lng);
        }
      } catch (e) {
        console.warn('Could not get current location', e);
        // no need to notify user loudly; location is optional
      }
    };

    acquire();
  }, []);

  const pickImage = async () => {
    // Request Android runtime permission for images if needed
    if (Platform.OS === 'android') {
      try {
        // Android 13+ uses READ_MEDIA_IMAGES, older uses READ_EXTERNAL_STORAGE
        const sdkInt = Platform.constants?.Version || 0;
        const readPermission = sdkInt >= 33 ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        const granted = await PermissionsAndroid.request(readPermission as any, {
          title: '이미지 접근 권한',
          message: '제보에 사진을 첨부하려면 이미지 접근 권한이 필요합니다.',
          buttonPositive: '허용',
        });
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          notify('이미지 접근 권한이 필요합니다. 설정에서 권한을 허용해주세요.');
          return;
        }
      } catch (e) {
        console.warn('권한 요청 중 오류', e);
      }
    }
    // dynamic require so project doesn't fail if package isn't installed
    let pickerMod: any;
    try {
      console.log('pickImage start');
      setIsPicking(true);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      pickerMod = require('react-native-image-picker');

      // Defensive: some environments return an empty object when the native
      // module isn't linked/available. Detect that early and show a helpful
      // message instead of proceeding to call into undefined internals which
      // produce "Requiring unknown module 'undefined'" errors.
      if (!pickerMod || (typeof pickerMod === 'object' && Object.keys(pickerMod).length === 0)) {
        console.warn('react-native-image-picker appears missing or not linked:', pickerMod);
        notify('이미지 선택 기능이 초기화되지 않았습니다. 패키지가 설치되어 있지 않거나 네이티브 모듈이 링크되지 않았습니다.\n설치: npm install react-native-image-picker 그리고 앱을 재빌드하세요.');
        setIsPicking(false);
        return;
      }
    } catch (e) {
      notify('이미지 선택 기능을 사용하려면 react-native-image-picker를 설치하세요.');
      return;
    }
    // Log module shape for debugging (helps when 'launcher is not a function')
    try {
      const keys = Object.keys(pickerMod || {});
      console.log('react-native-image-picker module keys:', keys);
      console.log('pickerMod.launchImageLibrary type:', typeof pickerMod.launchImageLibrary);
      console.log('pickerMod.default?.launchImageLibrary type:', typeof (pickerMod.default?.launchImageLibrary));
    } catch (e) {
      console.warn('pickerMod inspect failed', e);
    }

    // Resolve launcher across several possible module shapes:
    // - module is a function (some bundler/versions)
    // - module.launchImageLibrary is provided
    // - module.default is a function
    // - module.default.launchImageLibrary is provided
    let launcher: any = null;
    try {
      if (typeof pickerMod === 'function') {
        launcher = pickerMod;
        console.log('react-native-image-picker exported as function');
      } else if (typeof pickerMod.launchImageLibrary === 'function') {
        launcher = pickerMod.launchImageLibrary;
        console.log('react-native-image-picker.launchImageLibrary found');
      } else if (pickerMod?.default && typeof pickerMod.default === 'function') {
        launcher = pickerMod.default;
        console.log('react-native-image-picker.default is function');
      } else if (pickerMod?.default && typeof pickerMod.default.launchImageLibrary === 'function') {
        launcher = pickerMod.default.launchImageLibrary;
        console.log('react-native-image-picker.default.launchImageLibrary found');
      }
    } catch (e) {
      console.warn('launcher detection error', e);
    }

    if (typeof launcher !== 'function') {
      console.warn('No launcher function found on react-native-image-picker', pickerMod);
      notify('이미지 선택 기능을 초기화할 수 없습니다. react-native-image-picker가 설치되어 있고 네이티브 모듈이 링크(또는 iOS의 경우 Pod 설치)되었는지 확인하세요.\n설치: npm install react-native-image-picker\n(iOS) cd ios && pod install\n앱을 재빌드하세요.');
      return;
    }

    try {
      // launcher may be callback-based or return a Promise depending on version.
      const options = { mediaType: 'photo', selectionLimit: 1 };

      // Try callback-style first
      let result: any = await new Promise((resolve) => {
        try {
          launcher(options, resolve);
        } catch (err) {
          // If launcher throws synchronously, resolve to undefined so we can try promise-style below
          console.warn('launcher threw when called with callback-style', err);
          resolve(undefined);
        }
      });

      // If result looks like the options object (some bundlers return the options back), try promise-style
      if (result && result.mediaType === options.mediaType && result.selectionLimit === options.selectionLimit) {
        console.warn('Received picker options as result; retrying launcher as promise-style');
        try {
          const maybePromise = launcher(options);
          if (maybePromise && typeof maybePromise.then === 'function') {
            result = await maybePromise;
          }
        } catch (err) {
          console.warn('Promise-style launcher call failed', err);
        }
      }

      console.log('pickImage result:', result);

      if (result?.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri || null;
        if (uri && typeof uri === 'string') {
          setPhoto(uri);
          Image.getSize(uri, (w, h) => setImgRatio(w && h ? w / h : null), () => setImgRatio(null));
          // start immediate upload (don't block UI) — errors are logged but do not crash picker
          uploadImageToPresigned(uri).catch((e) => {
            console.warn('Immediate upload failed', e);
            // notify user but allow them to still try to send (handleSend will retry upload if needed)
            notify('사진 업로드에 실패했습니다. 전송 시 다시 시도됩니다.');
          });
        } else {
          // unexpected shape
          console.warn('pickImage: asset uri missing or invalid', result.assets[0]);
          notify('선택한 이미지가 유효하지 않습니다. 다시 시도해주세요.');
        }
      } else {
        // user cancelled or unexpected result; log for diagnostics
        console.log('pickImage no assets returned', result);
      }
    } catch (e) {
      console.warn('pickImage error', e);
      notify('이미지 선택 중 오류가 발생했습니다. 권한 또는 설치 상태를 확인하세요.');
    } finally {
      setIsPicking(false);
      console.log('pickImage end');
    }
  };

  const canSubmit = () => {
    return !!category && content.trim().length > 0; // 사진은 선택적으로 허용
  };

  // require explicit user action to send (guard against accidental programmatic calls)
  const handleSend = async (explicit = false) => {
    if (!explicit) {
      console.warn('handleSend aborted: caller did not indicate explicit user intent');
      return;
    }
    if (isPicking) {
      console.warn('handleSend aborted: image picker is active');
      notify('이미지 선택이 진행 중입니다. 선택이 끝난 후 다시 시도하세요.');
      return;
    }
    if (!canSubmit()) {
      notify('카테고리와 제보 내용을 입력해 주세요.');
      return;
    }
    try {
      setSubmitting(true);

      // Build base payload matching backend schema
      // Require a numeric location (either device-acquired or passed-in prop). Sending 0/0
      // previously caused backend validation errors (422) because required fields were
      // effectively missing/invalid. Abort early and notify user instead of sending bad data.
      const useLoc = currentLocation ?? location;
      if (!useLoc || typeof useLoc.location_lat !== 'number' || typeof useLoc.location_lng !== 'number') {
        notify('위치 정보를 얻을 수 없습니다. 위치 권한을 허용하거나 위치를 수동으로 입력해 주세요.');
        setSubmitting(false);
        return;
      }

      const payload: any = {
        location_lat: Number(useLoc.location_lat),
        location_lng: Number(useLoc.location_lng),
        image_url: undefined,
        category: category,
        description: content.trim(),
      };

      // If user attached a photo, prefer the already-uploaded image URL (uploaded on selection).
      // If immediate upload failed earlier, try to upload now as a fallback.
      if (photo) {
        try {
          // Ensure the photo is uploaded now; the upload helper returns the final URL.
          const finalUrl = await uploadImageToPresigned(photo);
          if (finalUrl) payload.image_url = finalUrl;
          else throw new Error('Image upload failed');
        } catch (e:any) {
          console.warn('upload photo failed', e);
          notify('사진 업로드에 실패했습니다. 네트워크를 확인하거나 나중에 다시 시도하세요.');
          setSubmitting(false);
          return;
        }
      }

      // Debug: log payload that will be sent so we can diagnose server validation errors
      try {
        console.log('Sending /reports payload:', JSON.stringify(payload));
      } catch (e) {
        console.log('Sending /reports payload (non-serializable)', payload);
      }

      // Sanity-check payload to avoid accidentally POSTing the wrong object (seen: picker options being sent)
      const keys = Object.keys(payload || {});
      console.log('payload keys:', keys);
      if (typeof payload.location_lat !== 'number' || typeof payload.location_lng !== 'number') {
        console.warn('Aborting send: payload missing numeric location_lat/location_lng', payload);
        notify('제보에 위치 정보가 포함되지 않았습니다. 위치 권한을 허용하거나 위치를 수동으로 입력해 주세요.');
        setSubmitting(false);
        return;
      }
      if (!payload.category || typeof payload.description !== 'string') {
        console.warn('Aborting send: payload missing category/description', payload);
        notify('카테고리와 제보 내용을 확인해 주세요.');
        setSubmitting(false);
        return;
      }

      // API 호출하여 제보 생성
      // 백엔드가 제보 생성 후 자동으로 RabbitMQ → Relay Server → 부모 WebSocket으로 알림 전송
      const res: ReportResponse = await sendReport(payload as any);
      console.log('✅ [API] 제보 생성 성공:', res);
      console.log('💡 백엔드가 RabbitMQ를 통해 부모에게 알림을 전송합니다.');

      notify('제보 요청이 등록되었습니다');

      const submittedPayload = { ...payload, serverId: res?.id };
      onSubmitted && onSubmitted(submittedPayload);
      onClose && onClose();
    } catch (e:any) {
      console.warn('sendReport error', e);
      // Try to surface server-provided error message when available
      const serverBody = e?.response?.data;
      if (serverBody) {
        console.warn('server response body:', serverBody);
        // If server returns { message: '...' } or similar, show it
        const maybeMsg = typeof serverBody === 'string' ? serverBody : (serverBody.message || serverBody.error || JSON.stringify(serverBody));
        notify(String(maybeMsg).slice(0, 200));
      } else {
        const message = e && (e.message || (e.response && e.response.statusText)) ? String(e.message || e.response.statusText) : '제출 중 문제가 발생했어요. 다시 시도해 주세요.';
        notify(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={true} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.modalWrapper}>
          {/* header image omitted - use title */}
          <View style={styles.modal}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom: 12}}>
              <Text style={styles.title}>제보하기</Text>

              <View style={{ marginBottom: 12, position: "relative" }}>
                <TouchableOpacity
                  style={styles.dropdownHeader}
                  onPress={() => setCatOpen((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownHeaderText}>
                    {category ? category : "카테고리 선택"}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" style={styles.dropdownChevron} size={25} color="#666" />
                </TouchableOpacity>
                {catOpen && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={{ maxHeight: 140 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                      {CATEGORIES.map((cat) => (
                        <TouchableOpacity key={cat.value} style={styles.dropdownItem} onPress={() => { setCategory(cat.value); setCatOpen(false); }}>
                          <Text style={styles.dropdownItemText}>{cat.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.uploadBox} onPress={() => { photo ? setEditorOpen(true) : pickImage(); }}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.thumbnailFixed} resizeMode="cover" />
                ) : (
                  <View style={{ alignItems: "center" }}>
                    <MaterialIcons name="cloud-upload" size={40} color="#888" />
                    <Text style={styles.uploadEmptyHint}>장소의 사진을 업로드 해주세요.</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>제보 내용</Text>
              <TextInput
                placeholder="100자 이내"
                value={content}
                onChangeText={setContent}
                style={styles.input}
                multiline
                onFocus={() => setCatOpen(false)}
                blurOnSubmit={false}
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={{ alignSelf: 'flex-end', marginTop: 4, color: content.length > 100 ? '#d00' : '#666' }}>{content.length}/100</Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}><Text style={{ fontWeight: 'bold' }}>취소</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.sendBtn, (!canSubmit() || submitting) ? { opacity: 0.6 } : null]} onPress={() => handleSend(true)} disabled={!canSubmit() || submitting}>
                  <Text style={{ fontWeight: 'bold' }}>{submitting ? '보내는 중…' : '보내기'}</Text>
                </TouchableOpacity>
              </View>

              <Modal visible={editorOpen} transparent animationType="fade" onRequestClose={() => setEditorOpen(false)}>
                <View style={styles.editorDim}>
                  <View style={styles.editorModal}>
                    {photo && <Image source={{ uri: photo }} style={styles.editorImage} resizeMode="contain" />}
                    <View style={styles.editorBtns}>
                      <TouchableOpacity style={styles.editorCancel} onPress={() => setEditorOpen(false)}><Text style={{ fontWeight: '700' }}>닫기</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.editorPick} onPress={async () => { await pickImage(); setEditorOpen(false); }}>
                        <Text style={{ fontWeight: '700', color: '#000' }}>다시 선택</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>

            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalWrapper: { position: 'relative', alignItems: 'center', width: '90%' },
  modal: { backgroundColor: '#fff', marginTop: 16, borderRadius: 24, padding: 20, width: '98%', alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4, overflow: 'visible' },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  dropdownHeader: { alignSelf: 'flex-start', height: 32, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#F2F3F5', borderColor: '#F2F3F5', borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownHeaderText: { fontSize: 14, color: '#222', fontWeight: '600' },
  dropdownChevron: { marginLeft: 4 },
  dropdownList: { position: 'absolute', top: 36, left: 0, right: undefined, width: 220, height: 140, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff', zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dropdownItemText: { fontSize: 15, color: '#222' },
  uploadBox: { borderWidth: 1, borderColor: '#ddd', borderRadius: 16, height: 220, justifyContent: 'center', alignItems: 'center', marginBottom: 12, backgroundColor: '#F2F3F5', overflow: 'hidden', alignSelf: 'stretch' },
  thumbnailFixed: { width: '100%', height: '100%', borderRadius: 16 },
  uploadEmptyHint: { marginTop: 8, color: '#9AA0A6', fontSize: 15 },
  fieldLabel: { fontWeight: '700', marginTop: 8, marginBottom: 6, color: '#111' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12, minHeight: 72, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#EDEDED', paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', marginRight: 8, height: 56, justifyContent: 'center' },
  sendBtn: { flex: 1, backgroundColor: '#FFD44C', paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', marginLeft: 8, height: 56, justifyContent: 'center' },
  editorDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  editorModal: { width: '92%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 16, padding: 12 },
  editorImage: { width: '100%', height: 300, borderRadius: 12 },
  editorBtns: { marginTop: 12, flexDirection: 'row', gap: 12 },
  editorCancel: { flex: 1, backgroundColor: '#eee', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  editorPick: { flex: 1, backgroundColor: '#FFD44C', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
