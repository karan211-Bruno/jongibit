# REA 역분석 보고서 — 3-in-1 컬러 이북 전환 메커니즘

## 1. 분석 대상 및 REA 증거(Evidence) 식별자
- **대상 URL**: `https://www.xp-pen.jp/product/magic-note-pad.html`
- **사용 도구**: `rea@6.7.0` (`/Users/newborn/.npm-global/bin/rea`)
- **브라우저 시나리오 Evidence ID**:
  `ev_a41a0a025371645f14e7fb310a895b0cc33d6a3edfa820d05237e8c314ff6c5e`
  (`rea capture-browser-scenario` — 헤드리스 Chrome `1440×900`, `wait_swiper2` → `click_light_color` → `click_ink_paper` → `click_nature_color`)
- **JavaScript 정적 그래프 Evidence ID**:
  `ev_1f28f443f3c9b0b38b18501d1932b1f9b0223687a8dfd523b4ce1c414468faed`
  (`rea analyze-javascript-application` — 대상 스냅샷 SHA-256: `c9a2fedc0dd0b7a97d8c749ad5d05f4c260579e26f937923f4139f105c1c2365`)

> 본 보고서는 공식 제품 소개 페이지의 공개 웹 동작을 REA로 관찰·계측한 기술 분석 기록입니다. `종이빛(Jongibit)`은 타사의 코드·이미지·상표 자산을 전혀 포함하지 않고, 산출된 sRGB 색변환 수식과 독자적인 SVG/Canvas/Android 오버레이 아키텍처로 새로 작성된 독립 애플리케이션입니다.

---

## 2. REA 런타임 관찰 결과 (DOM & UI 상태 전환)
`capture-browser-scenario` 실행 시 `.pagination_bullet_1/2/3` 클릭에 따라 다음과 같은 DOM 상태 및 인디케이터 이동이 관측되었다:

| 단계 (`step_id`) | 활성 모드 | 활성 클래스 | 인디케이터 위치 (`.line_box_active`) |
| --- | --- | --- | --- |
| `settle_nature_color` | 원본 컬러 (Nature Color) | `.pagination_bullet_1.active` | `left: 79px` (`transition: left 0.3s ease-in-out`) |
| `settle_light_color` | 컬러 이북 (Light Color) | `.pagination_bullet_2.active` | `left: 309.156px` (`transition: left 0.3s ease-in-out`) |
| `settle_ink_paper` | 흑백 잉크지 (Ink Paper) | `.pagination_bullet_3.active` | `left: 529.625px` (`transition: left 0.3s ease-in-out`) |

- 전환 인터랙션은 `#swiper2` 페이드 효과(`effect: 'fade'`, 클릭 시 `slideTo(..., 1000, false)`)와 `updateSliderPosition()`의 300ms 수평 슬라이더 애니메이션으로 구성됨을 확인하였다.

---

## 3. 3모드 공식 렌더 이미지 정량 색변환 보정 (sRGB Affine Color Matrix)
3가지 모드 샘플 이미지(해상도 `802×1226`, 불투명 유효 픽셀 `558,379`개)의 SHA-256 및 RGB 통계:

| 모드 | 참조 에셋 SHA-256 | 크기 | 평균 RGBA |
| --- | --- | --- | --- |
| Nature Color (원본 컬러) | `fa3837741488ffc33807c95b39084a9ac4469495e7ab9e4db31c758b87816360` | 198,200 B | `[135.91, 127.51, 126.34, 145.32]` |
| Light Color (컬러 이북) | `a1cbc7d1d9911f1a659905f43b8ed0dab7b36a817855721380d2fdaa48c18a65` | 182,146 B | `[133.29, 129.04, 128.53, 145.32]` |
| Ink Paper (흑백 잉크지) | `83e780125017b01e3836079caad47855beabf2a00442dbbae458199ec59f0288` | 165,110 B | `[128.84, 128.75, 128.84, 145.32]` |

최소자승법(OLS)으로 도출한 정규화 sRGB `[0, 1]` 공간 $3\times 4$ 색변환 행렬:

### A. 컬러 이북 (Light Color / 담채 종이빛)
- **오차**: `MAE = 0.00377`, `RMSE = 0.00718` (255 스케일 기준 평균 오차 1 미만)
$$
\begin{bmatrix} R' \\ G' \\ B' \end{bmatrix}
=
\begin{bmatrix}
0.7191 & 0.1025 & 0.1767 \\
0.2234 & 0.5735 & 0.2007 \\
0.2229 & 0.0849 & 0.6893
\end{bmatrix}
\begin{bmatrix} R \\ G \\ B \end{bmatrix}
+
\begin{bmatrix} 0.0010 \\ 0.0016 \\ 0.0022 \end{bmatrix}
$$
- **특성**: 원색의 극단적 채도를 약 35~42% 완화하여 반사형 컬러 E-Ink(Kaleido/담채 종이)처럼 눈부심을 줄이면서도 색상 구분과 따뜻한 종이 톤을 유지한다.

### B. 흑백 잉크지 (Ink Paper / 전자잉크 흑백)
- **오차**: `MAE = 0.00865`, `RMSE = 0.01245`
$$
Y' = 0.4382 R + 0.1955 G + 0.4142 B - 0.0527, \quad (R'=G'=B'=Y')
$$
- **특성**: 단순 휘도 평균(`0.2126R + 0.7152G + 0.0722B`)이 아니라 적색·청색 계수의 가중치를 높이고 `-0.0527` 오프셋을 적용해, 인쇄된 종이 위 흑백 텍스트의 먹색 대비를 뚜렷하게 유지한다.

---

## 4. Android & iPadOS 구현 아키텍처
1. **실시간 GPU 가속 SVG 필터 (`<feColorMatrix color-interpolation-filters="sRGB">`)**:
   - iPadOS Safari/WKWebView 및 Android Chromium WebView 모두에서 동작하도록 `width: 0; height: 0` 고정 SVG(절대 `display: none` 미사용)에 `<feColorMatrix>`를 바인딩하고, `requestAnimationFrame`으로 900ms 색공간 모핑 보간을 수행한다.
2. **AG 나노에칭 종이 입자 & 저블루라이트**:
   - 미세 SVG 노이즈 텍스처 + 따뜻한 색온도(Warmth) 행렬 합성을 더해 실제 무광 종이질감 화면을 재현한다.
3. **Android 시스템 전역 오버레이 (`SystemPaperOverlayPlugin`)**:
   - 앱 바깥(타사 전자책 앱 등)에서도 종이빛 톤을 유지할 수 있도록 `TYPE_APPLICATION_OVERLAY` + `FLAG_NOT_TOUCHABLE | FLAG_NOT_FOCUSABLE` + Android 12+ 터치 통과 투명도 안전 상한(`InputManager.getMaximumObscuringOpacityForTouch() * 0.85f`)을 구현하고, 상단 빠른 설정 타일(`TileService`)을 제공한다.
