// config.js — 클라우드(Firebase) 설정
// 1) https://console.firebase.google.com 에서 무료 프로젝트 생성
// 2) 프로젝트 설정 → 일반 → "웹 앱 추가" → 아래 firebaseConfig 값을 그대로 붙여넣기
// 3) Authentication → 로그인 방법에서 '이메일/비밀번호'(+원하면 Google) 활성화
// 4) Firestore·Realtime Database 생성 + README의 보안 규칙 붙여넣기
// 값을 비워두면 앱은 기존처럼 '이 기기에만 저장(오프라인)'으로 동작합니다.
// (apiKey는 공개되어도 안전한 식별자예요. 접근 제어는 보안 규칙이 담당합니다.)
window.ONEUL_CONFIG = {
  FIREBASE: {
    apiKey: "",            // 예: "AIzaSy..."
    authDomain: "",        // 예: "oneul-shim.firebaseapp.com"
    projectId: "",         // 예: "oneul-shim"
    databaseURL: "",       // 예: "https://oneul-shim-default-rtdb.asia-southeast1.firebasedatabase.app" (Realtime Database 주소 — 명단·실시간 인원용)
    appId: "",             // 예: "1:1234567890:web:abcdef"
  },

  // (선택) 외부 앰비언트 오디오 파일. 지정하면 합성음 대신 실제 녹음을 재생해요.
  // 무료(CC0) 소스: Pixabay(pixabay.com/sound-effects), Freesound(CC0 필터), mixkit 등.
  // 받은 파일을 ./sounds/ 에 넣고 아래 경로를 채우세요. 비워두면 내장 합성음을 사용합니다.
  // 로컬 파일을 쓰면 서비스워커가 오프라인 캐시도 해줘요(런타임 캐시).
  AMBIENT_URLS: {
    // rain: "./sounds/rain.mp3",
    // wave: "./sounds/wave.mp3",
    // forest: "./sounds/forest.mp3",
    // fire: "./sounds/fire.mp3",
  },

  // (선택) Sentry 오류 모니터링. sentry.io에서 무료 프로젝트 생성 후 'DSN'을 붙여넣으면
  // 런타임 오류가 자동으로 대시보드에 보고돼요(사용자가 신고하기 전에 버그 파악).
  // 비워두면 완전히 비활성 — 외부로 아무것도 전송하지 않아요.
  // ⚠️ 개인정보 보호: 일기·기록·로컬 데이터는 절대 전송하지 않고, 오류 메시지/스택만 보냅니다.
  SENTRY_DSN: "",  // 예: "https://abc123@o456.ingest.sentry.io/789"

  // (선택) Lottie 벡터 애니메이션. lottiefiles.com 등에서 받은 .json을 ./vendor/anim/ 에 넣고
  // 아래에 경로를 적으면, 해당 연출이 합성 반짝임 대신 그 애니메이션으로 재생돼요.
  // 비워두면 가벼운 내장 '반짝임'이 쓰입니다. 플레이어는 필요할 때만 자동 로드돼요.
  LOTTIE: {
    // celebrate: "./vendor/anim/celebrate.json",  // 기록 완료 축하
    // breathe:   "./vendor/anim/breathe.json",    // 호흡 가이드
  },
};
