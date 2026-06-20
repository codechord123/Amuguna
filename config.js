// config.js — 클라우드 동기화 설정
// 1) https://supabase.com 에서 무료 프로젝트 생성
// 2) Project Settings → API 에서 "Project URL" 과 "anon public" 키를 복사해 아래에 붙여넣기
// 3) README의 SQL을 SQL Editor에 한 번 실행 (테이블 + 보안정책)
// 키를 비워두면 앱은 기존처럼 '이 기기에만 저장(오프라인)'으로 동작합니다.
// (anon 키는 공개되어도 안전한 '공개 키'입니다. Row Level Security로 본인 데이터만 접근돼요.)
window.ONEUL_CONFIG = {
  SUPABASE_URL: "",       // 예: "https://abcdxyz.supabase.co"
  SUPABASE_ANON_KEY: "",  // 예: "eyJhbGciOi..."
};
