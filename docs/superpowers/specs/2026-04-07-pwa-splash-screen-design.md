# PWA 스플래시 스크린 설계

## 개요
앱 설치 후 홈 화면에서 실행할 때 보이는 스플래시 스크린 구현. 배경색 + 웨스트짐 로고(아이콘) 중앙 배치.

## 타겟 플랫폼
- Android + iOS 모두

## 디자인
- 배경색: `#ffffff` (라이트) / `#0a0a0a` (다크)
- 중앙: 기존 512x512 앱 아이콘
- 텍스트 없음

---

## Android

manifest.json의 `name`, `icons`, `background_color` 조합으로 OS가 자동 생성. **현재 설정으로 이미 동작함. 변경 불필요.**

## iOS

Safari는 manifest 스플래시를 지원하지 않음. `apple-touch-startup-image` 메타태그로 디바이스별 이미지를 직접 제공해야 함.

### 필요한 스플래시 이미지 사이즈

| 디바이스 | 가로 | 세로 | 비율 |
|---------|------|------|------|
| iPhone SE | 640 | 1136 | 2x |
| iPhone 8 | 750 | 1334 | 2x |
| iPhone 8 Plus | 1242 | 2208 | 3x |
| iPhone X/XS/11 Pro | 1125 | 2436 | 3x |
| iPhone XR/11 | 828 | 1792 | 2x |
| iPhone XS Max/11 Pro Max | 1242 | 2688 | 3x |
| iPhone 12 mini/13 mini | 1080 | 2340 | 3x |
| iPhone 12/13/14 | 1170 | 2532 | 3x |
| iPhone 12/13/14 Pro Max | 1284 | 2778 | 3x |
| iPhone 14 Pro | 1179 | 2556 | 3x |
| iPhone 14 Pro Max | 1290 | 2796 | 3x |
| iPhone 15/16 Pro | 1206 | 2622 | 3x |
| iPhone 15/16 Pro Max | 1320 | 2868 | 3x |

### 구현 방법

1. **스플래시 이미지 생성 스크립트** (`scripts/generate-splash.mjs`)
   - `sharp` 라이브러리로 기존 512x512 아이콘을 활용
   - 각 사이즈별로 흰색 배경 + 중앙 로고 PNG 생성
   - 출력: `public/splash/` 디렉토리

2. **메타태그 추가** (`src/app/layout.tsx`)
   - `apple-touch-startup-image` 링크를 media query와 함께 추가
   - 각 디바이스 해상도에 맞는 이미지 매칭

3. **이미지 저장**
   - 경로: `public/splash/apple-splash-{width}x{height}.png`
   - `.gitignore`에 추가하지 않음 (빌드 결과물이 아닌 정적 에셋)

### 메타태그 예시

```html
<link
  rel="apple-touch-startup-image"
  href="/splash/apple-splash-1170x2532.png"
  media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
/>
```

---

## 작업 범위

1. `sharp` devDependency 추가
2. `scripts/generate-splash.mjs` 생성 및 실행
3. `src/app/layout.tsx`에 iOS 스플래시 메타태그 추가
4. 생성된 스플래시 이미지를 `public/splash/`에 커밋

## 범위 밖
- 앱 내부 커스텀 로딩 애니메이션
- 다크모드 스플래시 (iOS는 media query로 분기 가능하나, 이미지 수 2배로 증가 — 추후 필요시 추가)
