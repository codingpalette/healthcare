# PWA (Progressive Web App) 설계

## 개요
웨스트짐 플랫폼에 PWA 기능을 추가하여 앱 설치, 오프라인 지원, 스플래시 스크린을 제공한다.

## 기술 선택
- **@serwist/next**: Next.js용 PWA 라이브러리 (next-pwa 후속)
- 기존 `notification-sw.js` 푸시 로직을 Serwist 서비스워커에 통합

## 구현 항목

### 1. manifest.json
- 앱 이름, 아이콘(192x192, 512x512), display: standalone
- 테마/배경색 설정

### 2. 서비스워커
- Serwist 기반 서비스워커 (`src/app/sw.ts`)
- 앱 셸 프리캐싱 + 기존 푸시 알림 로직 통합
- 캐싱 전략: 이미지 Cache First, API Network First

### 3. 오프라인 페이지
- `src/app/offline/page.tsx` - 연결 안내 + 재시도 버튼

### 4. 메타 태그
- layout.tsx에 manifest, apple-touch-icon, apple-mobile-web-app-capable 등 추가

### 5. 설치 유도 배너
- `beforeinstallprompt` 감지, 하단 토스트 배너
- 닫으면 7일간 미표시 (localStorage)
- iOS Safari 별도 안내

### 6. 스플래시 스크린
- iOS: apple-touch-startup-image 메타 태그
- Android: manifest 아이콘/색상으로 자동 생성
