import React, { useState } from 'react';
import type { DisplayTuning, PaperMode } from '../types';
import { MODE_INFO } from '../lib/xpaper';

interface PaperKeyBarProps {
  tuning: DisplayTuning;
  onChange: (patch: Partial<DisplayTuning>) => void;
  onOpenLibrary: () => void;
  onOpenDrawing: () => void;
  onOpenStudio: () => void;
  onOpenSystem: () => void;
  onOpenXPaperModal: () => void;
  hasActiveBook: boolean;
  onBackToReader?: () => void;
  activeView: 'library' | 'reader' | 'drawing' | 'system';
}

const MODES: PaperMode[] = ['nature', 'light-color', 'ink-paper'];

export const PaperKeyBar: React.FC<PaperKeyBarProps> = ({
  tuning,
  onChange,
  onOpenLibrary,
  onOpenDrawing,
  onOpenStudio,
  onOpenSystem,
  onOpenXPaperModal,
  hasActiveBook,
  onBackToReader,
  activeView,
}) => {
  const [showTuning, setShowTuning] = useState(false);

  const activeIdx = MODES.indexOf(tuning.mode);
  const indicatorLeft = `${activeIdx * 33.3333}%`;

  return (
    <header className="paper-topbar" data-testid="paper-topbar">
      <div className="topbar-left">
        <button
          type="button"
          className={`brand-btn ${activeView === 'library' ? 'is-active' : ''}`}
          onClick={onOpenLibrary}
        >
          <span className="brand-dot" />
          <span>종이빛 서재</span>
        </button>
        {hasActiveBook && activeView !== 'reader' && onBackToReader && (
          <button type="button" className="ghost-pill" onClick={onBackToReader}>
            읽던 책
          </button>
        )}
      </div>

      {/* 3-in-1 X-Paper Mode Switcher with REA-style 300ms sliding bar */}
      <div className="xpaper-switcher" role="tablist" aria-label="컬러 이북 3모드 전환">
        <div className="xpaper-tabs">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={tuning.mode === m}
              data-testid={`mode-${m}`}
              className={`xpaper-tab ${tuning.mode === m ? 'active' : ''}`}
              onClick={() => onChange({ mode: m })}
            >
              {MODE_INFO[m].shortLabel}
            </button>
          ))}
        </div>
        <div className="xpaper-line-box">
          <div className="xpaper-line-active" style={{ left: indicatorLeft }} />
        </div>
      </div>

      <div className="topbar-right">
        <button
          type="button"
          className="paper-key-btn"
          data-testid="paper-key-cycle"
          title="X-Paper 3모드 선택 패널 (Alt+P)"
          onClick={onOpenXPaperModal}
        >
          <span className="paper-key-led" data-mode={tuning.mode} />
          <span>X-Paper 키</span>
        </button>

        <button
          type="button"
          className={`icon-pill ${activeView === 'drawing' ? 'is-active' : ''}`}
          data-testid="open-drawing-studio"
          onClick={onOpenDrawing}
        >
          드로잉·컬러링
        </button>

        <button
          type="button"
          className={`icon-pill ${tuning.compareSplit ? 'is-active' : ''}`}
          data-testid="toggle-compare"
          onClick={() => onChange({ compareSplit: !tuning.compareSplit })}
          title="원본과 컬러 이북 좌우 비교"
        >
          비교
        </button>

        <button
          type="button"
          className={`icon-pill ${showTuning ? 'is-active' : ''}`}
          data-testid="toggle-tuning"
          onClick={() => setShowTuning((v) => !v)}
        >
          색감
        </button>

        <button type="button" className="icon-pill" onClick={onOpenStudio}>
          변환
        </button>

        <button
          type="button"
          className={`icon-pill ${activeView === 'system' ? 'is-active' : ''}`}
          onClick={onOpenSystem}
        >
          기기설정
        </button>
      </div>

      {showTuning && (
        <div className="tuning-popover" role="dialog" aria-label="종이 색감 미세 조절">
          <div className="tuning-head">
            <div>
              <strong>{MODE_INFO[tuning.mode].label}</strong>
              <p>{MODE_INFO[tuning.mode].sub}</p>
            </div>
            <button type="button" className="close-x" onClick={() => setShowTuning(false)}>
              ✕
            </button>
          </div>

          <label className="slider-row">
            <span>모드 강도</span>
            <input
              type="range"
              min={0}
              max={100}
              value={tuning.strength}
              onChange={(e) => onChange({ strength: Number(e.target.value) })}
            />
            <em>{tuning.strength}%</em>
          </label>

          <label className="slider-row">
            <span>저블루라이트 온도</span>
            <input
              type="range"
              min={0}
              max={100}
              value={tuning.warmth}
              onChange={(e) => onChange({ warmth: Number(e.target.value) })}
            />
            <em>{tuning.warmth}%</em>
          </label>

          <label className="slider-row">
            <span>AG 종이 입자 질감</span>
            <input
              type="range"
              min={0}
              max={100}
              value={tuning.grain}
              onChange={(e) => onChange({ grain: Number(e.target.value) })}
            />
            <em>{tuning.grain}%</em>
          </label>

          <div className="tuning-presets">
            <button
              type="button"
              onClick={() => onChange({ mode: 'light-color', strength: 92, warmth: 24, grain: 18 })}
            >
              낮 컬러 이북 추천
            </button>
            <button
              type="button"
              onClick={() => onChange({ mode: 'light-color', strength: 100, warmth: 62, grain: 26 })}
            >
              밤 따뜻한 종이
            </button>
            <button
              type="button"
              onClick={() => onChange({ mode: 'ink-paper', strength: 100, warmth: 15, grain: 30 })}
            >
              흑백 전자잉크
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
