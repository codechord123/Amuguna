# 아이폰(App Store) 출시 가이드

"오늘의 쉼"은 순수 HTML/CSS/JS PWA예요. 두 가지 길이 있습니다.

## A. 지금 바로: PWA (설치형 웹앱)
- 아이폰 Safari에서 열고 **공유 → 홈 화면에 추가** → 앱처럼 전체화면 실행.
- 장점: 빌드/심사 없이 즉시. 단점: App Store에는 안 올라가고, 일부 기능(백그라운드 푸시 등) 제한.

## B. App Store 정식 출시: Capacitor로 네이티브 래핑
웹 코드를 그대로 감싸 네이티브 앱으로 빌드합니다. **macOS + Xcode + Apple Developer 계정($99/년)** 필요.

```bash
# 1) Capacitor 추가 (프로젝트 루트에서)
npm init -y
npm i @capacitor/core @capacitor/ios
npm i -D @capacitor/cli
npx cap init "오늘의 쉼" com.yourname.oneulshim --web-dir=.

# 2) iOS 플랫폼 추가
npx cap add ios

# 3) 웹 자산 동기화 (코드 바뀔 때마다)
npx cap copy ios

# 4) Xcode 열기 → 서명(Team) 설정 → 실기기/시뮬레이터 빌드
npx cap open ios
```

### 출시 전 체크리스트
- [ ] **앱 아이콘 PNG 세트** (1024×1024 등) — 현재 `icon.svg`를 PNG로 변환해 `AppIcon`에 추가.
- [ ] **스플래시 스크린** 설정.
- [ ] `viewport-fit=cover` + safe-area 패딩 — 이미 적용됨(노치 대응).
- [ ] **개인정보 처리방침 URL** — 데이터는 기기 저장(+선택적 Supabase). App Store 필수.
- [ ] 오디오: 무음 스위치/배경 재생 정책 확인. 필요 시 `AVAudioSession` 카테고리 조정(네이티브 플러그인).
- [ ] 외부 앰비언트 오디오를 쓴다면 **라이선스(CC0 등)** 확인하고 앱에 포함.
- [ ] 클라우드 동기화를 켤 경우 로그인/계정 삭제 흐름 — Apple의 "계정 삭제 제공" 요건 충족.
- [ ] 햅틱/사운드는 사용자 설정으로 끌 수 있어야 함(이미 제공).
- [ ] 위기 자원(상담 전화) 노출 — 정신건강 앱 심사 시 가점/안전 요건.

### 권장
- 첫 출시는 **기능 동결 + 안정화**(이 저장소의 `npm test` 통과 유지).
- TestFlight로 소규모 베타 → 피드백 → 정식 제출.
- 네이티브가 부담되면 **PWA로 먼저 사용자 확보 후** Capacitor로 전환해도 됩니다.
