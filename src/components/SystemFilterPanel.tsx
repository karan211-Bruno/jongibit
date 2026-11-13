import React, { useEffect, useState } from 'react';
import type { DisplayTuning, PaperMode, SystemOverlayState } from '../types';
import {
  applySystemOverlayFilter,
  getSystemOverlayState,
  isAndroidNative,
  openAndroidColorCorrectionSettings,
  requestOverlayPermission,
} from '../lib/native';
import { exportAllDataJson, importAllDataJson } from '../lib/db';
import { MODE_INFO } from '../lib/xpaper';

interface SystemFilterPanelProps {
  tuning: DisplayTuning;
  onRefreshLibrary: () => void;
  onBack: () => void;
}

export const SystemFilterPanel: React.FC<SystemFilterPanelProps> = ({
  tuning,
  onRefreshLibrary,
  onBack,
}) => {
  const [overlay, setOverlay] = useState<SystemOverlayState>({
    supported: false,
    hasPermission: false,
    enabled: false,
    mode: tuning.mode,
    strength: tuning.strength,
    warmth: tuning.warmth,
  });
  const [msg, setMsg] = useState('');
  const androidNative = isAndroidNative();

  const refreshOverlay = async () => {
    const s = await getSystemOverlayState();
    setOverlay(s);
  };

  useEffect(() => {
    refreshOverlay();
  }, []);

  const handlePermission = async () => {
    const granted = await requestOverlayPermission();
    await refreshOverlay();
    setMsg(granted ? '다른 앱 위에 표시 권한이 허용되었습니다.' : '설정에서 권한을 켠 뒤 다시 돌아와 주세요.');
  };

  const handleApplyOverlay = async (enabled: boolean, mode: PaperMode = tuning.mode) => {
    const next = await applySystemOverlayFilter({
      enabled,
      mode,
      strength: tuning.strength,
      warmth: tuning.warmth,
    });
    setOverlay(next);
    setMsg(
      enabled
        ? `기기 전체 화면에 ${MODE_INFO[mode].label} 종이 필터를 적용했습니다.`
        : '기기 전체 화면 필터를 껐습니다.',
    );
  };

  const handleBackup = async () => {
    const json = await exportAllDataJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jongibit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg('서재 전체 JSON 백업을 내려받았습니다.');
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const raw = await file.text();
    const res = await importAllDataJson(raw);
    onRefreshLibrary();
    setMsg(`${res.count}권의 도서를 복원했습니다.`);
  };

  return (
    <div className="system-panel">
      <div className="system-head">
        <div>
          <h2>기기 전체 화면 적용 & 백업 설정</h2>
          <p>종이빛 앱 내부뿐 아니라 안드로이드/아이패드 기기 전체 화면을 컬러 이북 느낌으로 쓰는 방법을 안내합니다.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={onBack}>
          ← 서재로
        </button>
      </div>

      {msg && <div className="system-banner">{msg}</div>}

      <div className="system-grid">
        <section className="system-card">
          <h3>Android · 다른 앱 위 종이빛 필터 (오버레이 & 빠른 설정 타일)</h3>
          <p>
            Android 앱에서는 밀리의 서재·리디북스·브라우저 등 <strong>타사 앱 위에도</strong> 따뜻한 컬러 이북 종이 톤을 씌우고, 상단 빠른 설정 타일(<strong>종이빛 필터</strong>)로 원탭 전환할 수 있습니다.
          </p>
          {androidNative ? (
            <div className="android-controls">
              <div className="status-row">
                <span>권한 상태: {overlay.hasPermission ? '허용됨' : '권한 필요'}</span>
                <span>오버레이: {overlay.enabled ? `켜짐 (${MODE_INFO[overlay.mode].label})` : '꺼짐'}</span>
              </div>
              <div className="btn-row">
                {!overlay.hasPermission && (
                  <button type="button" className="primary-btn" onClick={handlePermission}>
                    다른 앱 위에 표시 권한 허용
                  </button>
                )}
                <button
                  type="button"
                  className="primary-btn"
                  disabled={!overlay.hasPermission}
                  onClick={() => handleApplyOverlay(true, 'light-color')}
                >
                  컬러 이북 오버레이 켜기
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={!overlay.hasPermission}
                  onClick={() => handleApplyOverlay(true, 'ink-paper')}
                >
                  흑백 잉크지 오버레이
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => handleApplyOverlay(false)}
                >
                  오버레이 끄기
                </button>
              </div>
              <div className="btn-row" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => openAndroidColorCorrectionSettings()}
                >
                  기기 흑백(색상 보정) 설정 열기
                </button>
              </div>
            </div>
          ) : (
            <div className="info-box">
              현재 웹/iOS 환경에서 실행 중입니다. Android APK(<code>jongibit-1.0.0-android.apk</code>)를 설치하면 시스템 오버레이와 빠른 설정 타일이 활성화됩니다.
            </div>
          )}
        </section>

        <section className="system-card">
          <h3>iPad · 시스템 전체 컬러 이북 / 흑백 프리셋 가이드</h3>
          <p>
            iPadOS는 앱이 다른 앱 화면 위에 오버레이를 덮는 것을 허용하지 않지만, 기본 탑재된 <strong>손쉬운 사용 색상 필터</strong>를 단축어로 연결하면 아이패드 전체를 X-Paper처럼 전환할 수 있습니다.
          </p>
          <ol className="guide-steps">
            <li>
              <strong>컬러 이북(담채 톤) 설정</strong>: <code>설정 → 손쉬운 사용 → 디스플레이 및 텍스트 크기 → 색상 필터 → 색조</code> 선택 후 <strong>강도 35% · 색조 따뜻한 미색</strong> + <strong>화이트 포인트 줄이기 40%</strong>
            </li>
            <li>
              <strong>흑백 잉크지 설정</strong>: <code>색상 필터 → 흑백(그레이스케일)</code> 선택 + <strong>화이트 포인트 줄이기 35%</strong>
            </li>
            <li>
              <strong>단축어 원버튼 전환</strong>: Apple <code>단축어</code> 앱에서 <code>색상 필터 설정(전환)</code> 동작을 홈 화면이나 제어 센터에 두면 X-Paper Key처럼 동작합니다.
            </li>
          </ol>
        </section>

        <section className="system-card">
          <h3>REA 분석 기반 sRGB 행렬 정보</h3>
          <p>
            <code>rea-agents@6.7.0</code>으로 측정한 공식 3모드 색변환 수식이 실시간 GPU <code>&lt;feColorMatrix&gt;</code>에 적용됩니다.
          </p>
          <ul className="metric-list">
            <li><strong>원본 컬러</strong>: sRGB 항등 행렬 (100% 원색)</li>
            <li><strong>컬러 이북</strong>: 3×4 담채 sRGB 행렬 (공식 레퍼런스 대비 MAE 0.0038)</li>
            <li><strong>흑백 잉크지</strong>: 먹색 대비 강화 모노크롬 행렬 (MAE 0.0087)</li>
          </ul>
        </section>

        <section className="system-card">
          <h3>서재 데이터 백업 및 복원</h3>
          <p>가져온 EPUB, PDF, 만화, 책갈피, 필기 주석을 JSON 파일로 백업하거나 복원합니다.</p>
          <div className="btn-row">
            <button type="button" className="primary-btn" onClick={handleBackup}>
              전체 백업 내려받기 (.json)
            </button>
            <label className="ghost-btn" style={{ cursor: 'pointer' }}>
              백업 파일 불러오기
              <input type="file" accept=".json,application/json" onChange={handleRestore} hidden />
            </label>
          </div>
        </section>
      </div>

      <footer className="legal-note">
        종이빛(Jongibit)은 독자적으로 구현된 독립 애플리케이션이며, XPPen 또는 특정 제조사와 제휴·후원·보증 관계가 없습니다.
      </footer>
    </div>
  );
};
