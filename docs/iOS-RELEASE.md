# 아이폰(App Store) 출시 가이드

"오늘의 쉼"은 순수 HTML/CSS/JS PWA예요. 두 가지 길이 있습니다.

## A. 지금 바로: PWA (설치형 웹앱)
- 아이폰 Safari에서 열고 **공유 → 홈 화면에 추가** → 앱처럼 전체화면 실행.
- 장점: 빌드/심사 없이 즉시. 단점: App Store에는 안 올라가고, 일부 기능(백그라운드 푸시 등) 제한.

## B. App Store 정식 출시: Capacitor로 네이티브 래핑
웹 코드를 그대로 감싸 네이티브 앱으로 빌드합니다. **macOS + Xcode + Apple Developer 계정($99/년)** 필요.

> 이미 저장소에 `capacitor.config.json`(appId `app.oneulshim.care`, appName `오늘의 쉼`, webDir `.`)이 들어 있어요. 아래는 그 설정을 그대로 사용하는 순서입니다.

```bash
# 1) Capacitor 추가 (프로젝트 루트에서)
npm i @capacitor/core @capacitor/ios
npm i -D @capacitor/cli
# (init 불필요 — capacitor.config.json 이미 존재)

# 2) 네이티브 기능 플러그인 (권장)
npm i @capacitor/local-notifications @capacitor/haptics

# 3) iOS 플랫폼 추가
npx cap add ios

# 4) 웹 자산 동기화 (코드 바뀔 때마다)
npx cap copy ios   # 또는: npx cap sync ios

# 5) Xcode 열기 → 서명(Team) 설정 → 실기기/시뮬레이터 빌드
npx cap open ios
```

### 네이티브 기능 연결 (웹 폴백 → 네이티브로 교체)
앱은 웹 기능으로 동작하되, 네이티브에서 더 좋아지는 두 가지를 플러그인으로 교체하세요.

- **알림(매일 리마인더)** — 현재는 웹 `Notification`(앱이 열려 있을 때만). 진짜 예약 알림은 `@capacitor/local-notifications`로:
  ```js
  import { LocalNotifications } from "@capacitor/local-notifications";
  await LocalNotifications.requestPermissions();
  await LocalNotifications.schedule({ notifications: [{
    id: 1, title: "오늘의 쉼 ☕", body: "오늘 마음은 어땠나요?",
    schedule: { on: { hour: 21, minute: 0 }, repeats: true }
  }]});
  ```
- **햅틱** — 현재 `navigator.vibrate`(iOS Safari 무시). 네이티브는 `@capacitor/haptics`의 `Haptics.impact()`로 교체(앱 `Haptic` 객체만 바꾸면 됨).

### 출시 전 체크리스트 (2026-07-05 갱신 — 코드 측 완료 상태 반영)
- [x] **앱 아이콘 PNG 세트** — `icon-192/512.png`, `icon-maskable-192/512.png`, `apple-touch-icon.png`(180) 저장소에 생성 완료. Xcode `AppIcon`에는 `icon-512.png`(+1024 필요 시 확대 아님 재생성: `tools/icon-export.html`) 사용.
- [x] **개인정보 처리방침** — `privacy.html` (배포 URL: `/privacy.html`). App Store 제출 시 이 URL 사용.
- [x] **이용약관 + 의료 면책** — `terms.html` (의료 서비스 아님 고지, 위기 자원, 유료 기능 도입 시 정책). 설정 화면에 링크됨.
- [x] **스토어 스크린샷 초안** — `docs/store/shot-*.png` (390×844@2x, 데모 데이터). App Store엔 6.7"(1290×2796) 필요 → 시뮬레이터에서 같은 화면 재캡처 권장.
- [x] **manifest 완결** — id·categories·PNG 아이콘(any/maskable)·screenshots·테마색 일치.
- [x] **버전 관리** — `meta[app-version]` + 설정 화면 표기 + SW 캐시 버전 동기, 새 버전 활성화 시 토스트.
- [x] **햅틱** — 웹 `navigator.vibrate` 적용(설정에서 on/off). iOS 네이티브는 `@capacitor/haptics`로 교체 권장.
- [x] `viewport-fit=cover` + safe-area 패딩(상·하단 모두).
- [x] 햅틱/사운드 사용자 설정으로 끄기 제공.
- [x] 위기 자원(상담 전화 tel: 링크) 상시 노출 — 정신건강 앱 심사 안전 요건.
- [x] 접근성 — Esc/포커스/inert, 터치 타깃 44px, WCAG AA 대비, reduced-motion. **axe-core 자동 스캔 위반 0건**(탭 4종 + 여정·명상·리포트 오버레이 + 온보딩·달력·습관·호흡, 라이트/다크/차분 토큰, 2026-07-11).
- [x] 데이터 보호 — 내보내기/가져오기(왕복 무손실), 쿼터 초과 대응, 멀티탭/자정 경계, 동기화 병합(pull→merge→push).
- [x] **오프라인 동작** — SW 프리캐시 후 완전 오프라인 리로드에서 전체 UI 렌더 확인(실브라우저 검증, 2026-07-11).
- [x] **네이티브 대화상자 정리** — 비파괴 알림은 전부 앱 토스트(오버레이 위 z-index 보장). 파괴적 삭제 확인 3곳과 가져오기 실패만 의도적으로 OS confirm/alert 유지.
- [ ] **스플래시 스크린** — Capacitor `@capacitor/splash-screen`으로 설정(네이티브 단계).
- [ ] 오디오: 무음 스위치/배경 재생 정책 확인. 필요 시 `AVAudioSession` 카테고리 조정(네이티브 플러그인).
- [ ] 클라우드 동기화를 켤 경우 로그인/**계정 삭제** 흐름 — Apple 요건(네이티브 제출 전 Supabase 삭제 API 연결).
- [ ] Apple Developer 계정($99/년) + macOS/Xcode(또는 Codemagic CI) — 외부 준비물.
- [ ] 유료(구독) 도입 시 RevenueCat + App Store Connect 상품 등록(ROADMAP 참고).

### 권장
- 첫 출시는 **기능 동결 + 안정화**(이 저장소의 `npm test` 통과 유지).
- TestFlight로 소규모 베타 → 피드백 → 정식 제출.
- 네이티브가 부담되면 **PWA로 먼저 사용자 확보 후** Capacitor로 전환해도 됩니다.
