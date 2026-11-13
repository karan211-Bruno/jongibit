import React, { useState } from 'react';
import type { PaperMode } from '../types';
import { MODE_INFO } from '../lib/xpaper';

interface XPaperModalProps {
  open: boolean;
  currentMode: PaperMode;
  onSelectMode: (mode: PaperMode) => void;
  onClose: () => void;
}

const ORDERED_MODES: PaperMode[] = ['nature', 'light-color', 'ink-paper'];

export const XPaperModal: React.FC<XPaperModalProps> = ({
  open,
  currentMode,
  onSelectMode,
  onClose,
}) => {
  const [selected, setSelected] = useState<PaperMode>(currentMode);

  if (!open) return null;

  return (
    <div
      className="xpaper-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="X-Paper 화면 모드 전환"
      data-testid="xpaper-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="xpaper-modal-shell">
        <div className="xpaper-modal-header">
          <div aria-hidden="true" style={{ width: 32 }} />
          <h2>X-Paper</h2>
          <button
            type="button"
            className="xpaper-modal-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="xpaper-cards-stack">
          {ORDERED_MODES.map((m) => {
            const info = MODE_INFO[m];
            const isSelected = selected === m;
            const isCurrent = currentMode === m;
            return (
              <button
                key={m}
                type="button"
                data-testid={`xpaper-card-${m}`}
                className={`xpaper-mode-card ${isSelected ? 'is-selected' : ''}`}
                onClick={() => setSelected(m)}
              >
                <div className={`xpaper-mini-preview preview-${m}`} aria-hidden="true">
                  <div className="mini-wallpaper">
                    <div className="mini-clock">
                      <strong>12</strong>
                      <span>36</span>
                    </div>
                    <div className="mini-icons-grid">
                      <i style={{ background: '#4b8bf5' }} />
                      <i style={{ background: '#f5b041' }} />
                      <i style={{ background: '#58d68d' }} />
                      <i style={{ background: '#ec7063' }} />
                    </div>
                    <div className="mini-card-strip" />
                  </div>
                </div>

                <div className="xpaper-mode-copy">
                  <strong>{info.label}</strong>
                  <p>{info.sub}</p>
                  {isCurrent && (
                    <span className="xpaper-current-pill">
                      <em />
                      현재 모드
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="xpaper-modal-footer">
          <button
            type="button"
            className="xpaper-enter-btn"
            data-testid="xpaper-enter-mode"
            onClick={() => {
              onSelectMode(selected);
              onClose();
            }}
          >
            모드 진입
          </button>
        </div>
      </div>
    </div>
  );
};
