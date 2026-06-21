// config.js — 클라우드 동기화 설정
// 1) https://supabase.com 에서 무료 프로젝트 생성
// 2) Project Settings → API 에서 "Project URL" 과 "anon public" 키를 복사해 아래에 붙여넣기
// 3) README의 SQL을 SQL Editor에 한 번 실행 (테이블 + 보안정책)
// 키를 비워두면 앱은 기존처럼 '이 기기에만 저장(오프라인)'으로 동작합니다.
// (anon 키는 공개되어도 안전한 '공개 키'입니다. Row Level Security로 본인 데이터만 접근돼요.)
window.ONEUL_CONFIG = {
  SUPABASE_URL: "",       // 예: "https://abcdxyz.supabase.co"
  SUPABASE_ANON_KEY: "",  // 예: "eyJhbGciOi..."

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
};
