# 종이빛 (Jongibit) — 3-in-1 컬러 이북 디스플레이 & 리더

**종이빛(Jongibit)**은 REA(`rea-agents@6.7.0`) 동적·정적 분석으로 도출한 **3-in-1 X-Paper(원본 컬러 / 컬러 이북 / 흑백 잉크지) 색채 변환 모델**을 Android와 iPadOS/웹(PWA) 환경에서 독립 실행형 프로그램으로 구현한 컬러 이북 리더입니다.

> 본 프로젝트는 공개된 디스플레이 특성 분석 결과를 바탕으로 자체 설계·구현한 독립 소프트웨어이며, 특정 하드웨어 제조사와 무관합니다.

---

## 주요 기능

1. **REA 실측 기반 3-in-1 컬러 이북 엔진 (`src/lib/xpaper.ts`)**
   - `Nature Color` (원본 컬러): 1,670만 원색 항등 행렬 + 선택형 따뜻한 블루라이트 조절
   - `Light Color` (컬러 이북): OLS 3x4 색변환 행렬 (`MAE 0.00377`, `RMSE 0.00718`)을 SVG `<feColorMatrix type="matrix">`에 적용해 눈이 편안한 담채 색종이 톤 재현
   - `Ink Paper` (흑백 잉크지): 묵직한 잉크 대비와 종이 질감을 살린 모노크롬 행렬 (`MAE 0.00865`, `RMSE 0.01245`)
   - **원버튼 순환 키(`종이빛 키`, `Alt+P`)** + 680ms 입체 cubic ease-out 모핑 + **좌우 원본/이북 분할 비교**

2. **EPUB · PDF · CBZ(만화) · TXT 내장 전자책 리더**
   - 샘플 도서 2종 내장(컬러 그림책·전자책 테스트용)
   - 파일 가져오기 → IndexedDB 영구 서재 저장 → 책장·이어읽기 지원

3. **컬러 스튜디오 (사진·문서 변환기)**
   - 어떤 이미지도 컬러 이북 / 흑백 잉크지 톤과 종이 질감으로 즉시 변환해 PNG 저장

4. **Android 전역 화면 오버레이 + 빠른 설정 타일 (`SystemPaperOverlayPlugin`)**
   - `SYSTEM_ALERT_WINDOW` 권한과 Android 12+ 터치 투과 안전 계수(`getMaximumObscuringOpacityForTouch() * 0.85`, 최대 불투명도 `0.48`)를 준수하는 시스템 전역 종이 필터 서비스
   - 상단 빠른 설정 타일(`PaperTileService`)로 다른 이북 앱 위에서도 즉시 전환

---

## REA 분석 근거 (요약)

- 브라우저 시나리오 캡처 Evidence ID: `ev_a41a0a025371645f14e7fb310a895b0cc33d6a3edfa820d05237e8c314ff6c5e`
- JavaScript 분석 Evidence ID: `ev_1f28f443f3c9b0b38b18501d1932b1f9b0223687a8dfd523b4ce1c414468faed`
- 상세 보고서: [`docs/REA_ANALYSIS.md`](docs/REA_ANALYSIS.md)

---

## 설치파일 및 실행 방법

- 자세한 설치 안내는 [`설치-및-사용-안내.md`](설치-및-사용-안내.md)를 참고하세요.
- **GitHub Releases**: `jongibit-1.0.0-android.apk`, `jongibit-1.0.0-ios-unsigned.ipa`, `jongibit-1.0.0-source.zip`
- **웹/PWA (GitHub Pages)**: Safari / Chrome에서 열어 `홈 화면에 추가`하면 iPadOS/Android/데스크톱에서 오프라인 앱으로 동작합니다.

## 로컬 빌드

```bash
npm install
npm run build         # dist/ 생성
npm run native:sync   # Android/iOS Capacitor 동기화
```
