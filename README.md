# 종이빛 (Jongibit) v2.0.0 — 3-in-1 컬러 이북 디스플레이 · 웹툰 · 드로잉 스튜디오

**종이빛(Jongibit) v2.0.0**은 REA(`rea-agents@6.7.0`) 색채 변환 행렬과 3-in-1 디스플레이 워크플로우를 바탕으로 Android · iPadOS · 웹(PWA)에서 **태블릿 / 컬러 전자책 / 메모장(스케치북)** 3가지 사용성을 하나로 통합한 독립 실행형 애플리케이션입니다.

> 본 프로젝트는 공개된 디스플레이 특성 분석 결과를 바탕으로 자체 설계·구현한 독립 소프트웨어이며, 특정 하드웨어 제조사와 무관합니다.

---

## v2.0.0 주요 기능

1. **반투명 블러 3단 X-Paper 모드 선택 모달 (`src/components/XPaperModal.tsx`)**
   - `X-Paper 키` 또는 `Alt+P`로 호출하는 3열 카드 UI
   - **자연 색상 모드** (`"고화질의 밝은 원색"`), **밝은 색상 모드** (`"채도가 낮은 부드러운 색상의 종이 같은 디스플레이 효과"`), **잉크 용지 모드** (`"흑백 잉크의 종이 같은 디스플레이 효과"`) + `● 현재 모드` 표시 및 **`모드 진입`** 버튼
   - **수채화/잉크 번짐 화면 전환**: 모드 진입 시 SVG `feTurbulence` + `feDisplacementMap` 기반 중앙 확산(`780ms`) 웨이브 트랜지션

2. **REA 실측 기반 3x4 색변환 행렬 (`src/lib/xpaper.ts`)**
   - `Light Color` (MAE `0.00377`, RMSE `0.00718`) / `Ink Paper` (MAE `0.00865`, RMSE `0.01245`) SVG `<feColorMatrix>` 필터 + 좌우 분할 실시간 비교 슬라이더

3. **연속 세로 웹툰 스크롤 · EPUB/PDF/CBZ 전자책 리더 (`src/components/ReaderWorkspace.tsx`)**
   - 웹툰/만화 감상용 **세로 연속 스크롤** 모드 전환 + 컬러 한국형 웹툰 샘플 에피소드(`종이빛 일상툰 — 3-in-1 컬러 웹툰 (세로 스크롤)`, `sample-webtoon-teahouse`) 포함 샘플 도서 3종 내장
   - EPUB · PDF · CBZ · TXT 로컬 파일 불러오기 및 IndexedDB 영구 서재 저장

4. **3-in-1 드로잉 · 컬러링 스튜디오 (`src/components/DrawingStudio.tsx`)**
   - **16,384단계 · 3g 초경량 필압 감도**(`Math.pow(p, 0.62)`) 커브 및 실시간 필압(Level / g) HUD
   - **이중 캔버스 컬러링북**: 상단 `mix-blend-mode: multiply` 도안(`일출과 파도 구름`, `숲속 창가 다실`, `스테인드글라스 만다라`, `무지 스케치 용지`) 아래에 브러시 채색, 16색 팔레트, Undo/Redo, X-Paper 보정 PNG 내보내기

5. **Android 전역 화면 오버레이 + 빠른 설정 타일 (`SystemPaperOverlayPlugin`, `PaperTileService`)**
   - `SYSTEM_ALERT_WINDOW` 권한과 Android 12+ 터치 투과 안전 계수 준수
   - 상단 빠른 설정 타일로 다른 앱 위에서도 즉시 밝은 색상 ↔ 잉크 용지 ↔ 자연 색상 전환

---

## REA 분석 근거 (요약)

- 브라우저 시나리오 캡처 Evidence ID: `ev_a41a0a025371645f14e7fb310a895b0cc33d6a3edfa820d05237e8c314ff6c5e`
- JavaScript 분석 Evidence ID: `ev_1f28f443f3c9b0b38b18501d1932b1f9b0223687a8dfd523b4ce1c414468faed`
- 상세 보고서: [`docs/REA_ANALYSIS.md`](docs/REA_ANALYSIS.md)

---

## 설치파일 및 실행 방법

- 자세한 설치 안내는 [`설치-및-사용-안내.md`](설치-및-사용-안내.md)를 참고하세요.
- **GitHub Releases (v2.0.0)**: `jongibit-2.0.0-android.apk`, `jongibit-2.0.0-ios-unsigned.ipa`, `jongibit-2.0.0-source.zip`
- **웹/PWA (GitHub Pages)**: Safari / Chrome에서 열어 `홈 화면에 추가`하면 iPadOS/Android/데스크톱에서 오프라인 앱으로 동작합니다.

## 로컬 빌드

```bash
npm install
npm run build         # dist/ 생성
npm run native:sync   # Android/iOS Capacitor 동기화
```
