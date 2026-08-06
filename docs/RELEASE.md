# 앱 출시 가이드 — iOS(App Store) · Android(Google Play)

"오늘의 쉼"은 순수 HTML/CSS/JS PWA예요. **Capacitor**로 웹 코드를 그대로 감싸 두 스토어에 올립니다.
웹 자산은 `www/`에 모여 **iOS·Android가 똑같이 공유**해요 — 한 번 만든 UI가 양쪽에 그대로 갑니다.

> 백엔드가 없어도 출시됩니다. '함께 호흡' 방은 백엔드가 없으면 정직하게 '조용히' 모드로 동작하고, 방은 **호흡 프리셋**으로 완전히 작동해요. (실시간 커뮤니티를 켜는 법은 맨 아래 참고)

---

## 준비물

| | iOS | Android |
|---|---|---|
| 개발 PC | **macOS + Xcode** (필수) | Windows·mac·Linux + **Android Studio** |
| 계정 | Apple Developer **$99/년** | Google Play Console **$25 1회** |
| 실기기 | 아이폰(권장) | 안드로이드폰(권장) |

> 아이폰 앱은 반드시 맥이 필요해요. 안드로이드는 OS 상관없이 됩니다. 맥이 없다면 **Android 먼저 출시** 후 iOS는 나중에(또는 Codemagic 같은 클라우드 빌드) 해도 됩니다.

---

## 0) 공통 — 웹 자산 빌드 (코드 고칠 때마다)

```bash
git clone <저장소 주소> && cd Amuguna
npm install                # Capacitor 의존성 포함(이미 package.json에 명시)
npm run build:web          # = node tools/build-ios.mjs — 웹 파일을 www/ 로 모음(.git·node_modules·tests 제외)
```

`capacitor.config.json`에 appId `app.oneulshim.care`, appName `오늘의 쉼`, webDir `www`가 이미 들어 있어요.
`www/`·`ios/`·`android/`는 생성물이라 `.gitignore` 처리됨 — 커밋되지 않습니다.

## 1) iOS (맥에서)

```bash
npx cap add ios            # 최초 1회 — ios/ 생성
npm run ios                # 이후 코드 바뀔 때마다: build:web + cap sync ios
npx cap open ios           # Xcode 열기 → Signing(Team) 설정 → 실기기/시뮬레이터 빌드
```
Xcode에서 Team 서명 → Archive → App Store Connect 업로드 → TestFlight → 심사 제출.

## 2) Android

```bash
npx cap add android        # 최초 1회 — android/ 생성
npm run android            # 이후: build:web + cap sync android
npx cap open android       # Android Studio 열기
```
Android Studio에서:
- **키스토어 생성**(최초 1회) → 앱 서명(Build → Generate Signed Bundle/APK → **Android App Bundle(.aab)**).
- `.aab`를 Play Console에 업로드 → 내부 테스트 → 프로덕션 심사 제출.
- 키스토어 파일·비밀번호는 **안전하게 백업**(분실하면 같은 앱으로 업데이트 불가).

## 3) 아이콘 · 스플래시 (양쪽 자동 생성)

웹 아이콘(`icon-512.png` 등)이 이미 있어요. Capacitor 공식 도구로 두 플랫폼 아이콘·스플래시를 한 번에 생성:

```bash
npm i -D @capacitor/assets
npx @capacitor/assets generate --iconBackgroundColor '#f7f1ea' --splashBackgroundColor '#f7f1ea'
```
(1024×1024 원본 아이콘 하나만 `resources/icon.png`에 두면 iOS·Android·adaptive icon·스플래시가 전부 생성됩니다.)

## 4) 네이티브로 더 좋아지는 부분 (선택)

- **예약 알림** — 지금은 웹 `Notification`(앱 열려 있을 때만). 진짜 매일 리마인더는 `@capacitor/local-notifications`:
  ```js
  import { LocalNotifications } from "@capacitor/local-notifications";
  await LocalNotifications.requestPermissions();
  await LocalNotifications.schedule({ notifications: [{
    id: 1, title: "오늘의 쉼 ☕", body: "오늘 마음은 어땠나요?",
    schedule: { on: { hour: 21, minute: 0 }, repeats: true }
  }]});
  ```
  Android는 `smallIcon`용 흰색 실루엣 아이콘(`ic_stat_icon`) 리소스를 `android/app/src/main/res`에 넣어야 상태바 아이콘이 예쁘게 나와요.
- **햅틱** — 지금은 `navigator.vibrate`(Android는 동작, iOS Safari는 무시). 네이티브는 `@capacitor/haptics`의 `Haptics.impact()`로 교체(앱 `Haptic` 객체만 바꾸면 됨).

---

## 출시 전 체크리스트

**이미 코드에 완료된 것**
- [x] 앱 아이콘 PNG 세트(192/512/maskable/apple-touch) + `manifest.json` 완결(id·categories·screenshots·테마색)
- [x] 개인정보 처리방침 `privacy.html` · 이용약관+의료 면책 `terms.html`(설정에 링크) — 스토어 제출 시 배포 URL 사용
- [x] 위기 자원(상담 전화 tel: 링크) 상시 노출 — 정신건강 앱 안전 요건
- [x] 접근성(WCAG AA 대비·포커스·44px 터치·reduced-motion, axe 위반 0) · 오프라인 동작(SW 프리캐시) · zero-scroll 레이아웃
- [x] 데이터 보호 — 내보내기/가져오기 무손실, 자정·멀티탭 경계
- [x] 버전 관리(meta+SW 캐시 동기) · 스토어 스크린샷 초안 `docs/store/`

**네이티브 단계에서 할 것**
- [ ] iOS: Apple Developer 가입 · Xcode 서명 · 6.7"(1290×2796) 스크린샷 재캡처(시뮬레이터)
- [ ] Android: Play Console 가입 · **키스토어 생성·백업** · `.aab` 빌드 · 스토어 등록정보(그래픽·스크린샷)
- [ ] 스플래시 스크린(`@capacitor/assets`로 생성) · 아이콘 생성
- [ ] iOS 예약 알림/햅틱을 네이티브 플러그인으로 교체(선택, 경험 향상)
- [ ] Android 상태바 알림 아이콘(`ic_stat_icon`) 추가
- [ ] 개인정보 처리방침 URL을 두 스토어 등록정보에 기입(정신건강 앱 필수)

---

## '함께 호흡' 실시간 커뮤니티를 켜려면 (선택 · Firebase — 코드 완성됨)

방 기능은 백엔드 없이도 출시돼요(호흡 프리셋 + 초대 코드로 동작). **Firebase 연동 코드는 이미 전부
들어 있어서**, README "클라우드" 절대로 Firebase 프로젝트를 만들고 `config.js`에 설정만 붙여넣으면:

- 함께 탭 **공개 방 목록**(로그인 사용자가 방을 만들면 모두에게 표시 · Firestore)
- 로비·세션 **명단**(같은 방 사람들의 닉네임 · Realtime Database presence, 연결 끊기면 자동 삭제)
- **방장 시작/종료**(방장이 시작하면 모두 동시에 호흡, 마치면 모두 부드럽게 종료 · rooms_live)
- 계정 로그인(이메일/Google) + 기기 간 기록 동기화

가 앱 업데이트 없이 살아납니다. 백엔드가 없으면 조용히 '혼자' 모드 — **가짜 인원을 만들지 않아요.**
Firebase는 iOS·Android·웹 공통이라 Capacitor 앱에서도 같은 코드가 그대로 동작합니다.

---

### 권장 순서
1. **기능 동결 + 안정화**(`npm test` 통과 유지) → 스토어용 스크린샷 재캡처.
2. 맥이 있으면 iOS·Android 동시, 없으면 **Android 먼저**.
3. 내부 테스트(TestFlight / Play 내부 테스트) → 소규모 베타 → 정식 제출.
