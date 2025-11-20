# 팀 통합 가이드 (팀원용)

이 문서는 팀에서 `navi-frontend`를 함께 개발할 때 필요한 절차와 규칙을 정리합니다. 로컬 개발 설정, 환경 변수 관리, 기기 연동, CI, 민감 정보 처리, Git 워크플로 등을 포함합니다.

목표
- 새 팀원이 빠르게 개발환경을 구성하고, 안전하게 연동하여 개발할 수 있도록 표준 절차를 제공합니다.

1) 필수 소프트웨어
- Node.js >= 18
- Java JDK 11+ (Android 빌드)
- Android Studio (SDK, AVD)
- Xcode (macOS에서 iOS 빌드 시)
- yarn 또는 npm

2) 리포지토리 복제 및 의존성 설치

```bash
git clone <REPO_URL>
cd navi-frontend
# npm 권장 (package-lock.json 사용)
npm ci
# 또는 yarn
yarn install
```

3) 브랜치 전략 (간단)
- `main`: 배포 가능한 상태만 머지
- `develop` 또는 `staging` (선택): 통합 테스트용
- 기능별 브랜치: `feat/<기능-짧은설명>`
- 버그: `fix/<이슈-번호>`

- PR 규칙: 제목에 이슈번호 포함, 변경 요약/테스트 방법/리뷰어 지정

4) 환경 변수(.env) 및 비밀 관리
- 레포에는 민감 정보가 포함되지 않습니다. `.env.example`를 참고해서 로컬에 `.env` 파일을 생성하세요.
- 절대 `.env`를 커밋하지 마세요 (`.gitignore`에 이미 포함되어 있음).
- 권장 방법:
  - 로컬 개발: `cp .env.example .env` 후 실제 개발 값 입력
  - CI: GitHub/GitLab 시크릿에 환경변수 저장 → 워크플로에 주입
  - 프로덕션: 클라우드 환경변수/시크릿 매니저 사용

예시 (.env 예시)
```
API_BASE_URL=http://dev-api.yourcompany.internal
WS_BASE_URL=ws://dev-ws.yourcompany.internal
```

5) Firebase / Google 서비스 파일
- `google-services.json`(Android) 및 `GoogleService-Info.plist`(iOS)는 레포에 포함되어 있지 않습니다.
- 각자 Firebase 콘솔에서 다운로드해서 아래 경로에 배치:
  - Android: `android/app/google-services.json`
  - iOS: `ios/<앱폴더>/GoogleService-Info.plist`

6) react-native-config 사용 권장
- 런타임에서 `.env` 값을 사용하려면 `react-native-config` 설치를 권장합니다.
- 설치(예시):
  ```bash
  yarn add react-native-config
  cd ios && pod install && cd ..
  ```
- 설치 후 네이티브 빌드가 필요합니다.

7) 로컬 실행(에뮬레이터)

```bash
npx react-native start
# 다른 터미널에서
npx react-native run-android
```

특정 디바이스 선택:
```
npx react-native run-android --deviceId <DEVICE_ID>
```

8) 실기기에서 Metro에 연결
- USB로 연결된 안드로이드 기기에서 Metro에 연결하려면 아래 실행:
```
adb reverse tcp:8081 tcp:8081
```

9) 로그 및 디버깅
- 여러 기기가 연결되어 있을 때 특정 기기 로그만 보고 싶으면 `adb -s <DEVICE_ID> logcat` 사용
- React Native 콘솔 로그는 `npx react-native log-android` 로도 확인 가능

10) CI(예: GitHub Actions) 통합 요령(요약)
- 비밀값: `Settings -> Secrets`에 저장
- 워크플로에서 env로 주입하거나, `base64`로 인코딩한 `google-services.json`을 디코드해서 파일로 생성할 수 있습니다.

워크플로 예시(간단):
```yaml
name: Android CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with: { node-version: '18' }
      - name: Install dependencies
        run: npm ci
      - name: Create google-services.json (from secret)
        if: ${{ secrets.FIREBASE_JSON_B64 != '' }}
        run: echo "${{ secrets.FIREBASE_JSON_B64 }}" | base64 --decode > android/app/google-services.json
      - name: Build Android
        run: npx react-native run-android --variant=release
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
          WS_BASE_URL: ${{ secrets.WS_BASE_URL }}
```

11) 보안 사고 대응(중요)
- 만약 민감 키(토큰, 서비스 계정 등)가 유출되었다면 즉시 해당 키/토큰을 폐기(rotate)하고, 필요한 경우 Git 히스토리에서 제거하는 작업을 진행하세요.
- Git 히스토리 제거 도구: `git filter-repo` 또는 BFG. 히스토리 재작성 후 강제 푸시 필요합니다(팀 합의).

12) 개발 편의 팁
- 개발 전용 토큰 사용 시 `src/config/dev.ts` 내의 `DEV_TOKEN`/`DEV_USER_ID` 사용을 내부적으로만 허용하고, 프로덕션에서는 절대 활성화되지 않도록 `__DEV__` 체크가 되어 있습니다.
- 디버그용 UI 요소는 기본적으로 숨기고 싶을 때 `.env` 값(`SHOW_DEV_UI=true`)으로 제어하는 패턴을 사용하세요.

13) 팀 규칙 제안
- PR 템플릿에 체크리스트 추가: 민감정보가 포함되었는지 확인
- 코드 리뷰 시 `dev` 또는 테스트용 토큰이 코드에 남아있는지 확인
- 민감 정보 관련 사고 발생 시 채널(예: Slack #security)과 담당자(예: 인프라팀)에게 즉시 알릴 것

추가: 이 파일의 내용은 팀 상황에 맞게 자유롭게 수정하세요. 원하시면 이 내용을 리포지토리 루트의 `CONTRIBUTING.md`로 옮기고 PR 템플릿/ISSUE 템플릿도 함께 생성해 드리겠습니다.
