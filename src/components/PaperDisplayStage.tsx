import React, { useEffect, useRef } from 'react';
import type { DisplayTuning } from '../types';
import { computePaperMatrix, formatMatrixAttribute, lerpMatrix, type ColorMatrix20 } from '../lib/xpaper';

interface PaperDisplayStageProps {
  tuning: DisplayTuning;
  onChangeCompareRatio?: (ratio: number) => void;
  children: React.ReactNode;
}

export const PaperDisplayStage: React.FC<PaperDisplayStageProps> = ({
  tuning,
  onChangeCompareRatio,
  children,
}) => {
  const matrixRef = useRef<SVGFEColorMatrixElement | null>(null);
  const currentMatrixRef = useRef<ColorMatrix20>(
    computePaperMatrix(tuning.mode, tuning.strength, tuning.warmth),
  );
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const target = computePaperMatrix(tuning.mode, tuning.strength, tuning.warmth);
    const start = [...currentMatrixRef.current];
    const startTime = performance.now();
    const duration = 680; // Smooth paper-ink morph transition

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const rawT = Math.min(1, elapsed / duration);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - rawT, 3);
      const next = lerpMatrix(start, target, eased);
      currentMatrixRef.current = next;
      if (matrixRef.current) {
        matrixRef.current.setAttribute('values', formatMatrixAttribute(next));
      }
      if (rawT < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tuning.mode, tuning.strength, tuning.warmth]);

  const filterCss =
    tuning.mode === 'nature' && tuning.warmth === 0 ? 'none' : 'url(#jongibit-xpaper)';

  const grainOpacity = tuning.mode === 'nature' ? tuning.grain * 0.0012 : tuning.grain * 0.0032;

  return (
    <div className="paper-stage-shell">
      {/* Safari/iPadOS requires width/height 0 with fixed positioning instead of display:none */}
      <svg
        aria-hidden="true"
        width="0"
        height="0"
        style={{
          position: 'fixed',
          width: 0,
          height: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        <defs>
          <filter
            id="jongibit-xpaper"
            colorInterpolationFilters="sRGB"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
          >
            <feColorMatrix
              ref={matrixRef}
              type="matrix"
              values={formatMatrixAttribute(currentMatrixRef.current)}
            />
          </filter>
          <filter id="jongibit-paper-grain">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.82"
              numOctaves={3}
              seed={7}
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>

      {tuning.compareSplit ? (
        <div className="compare-container">
          {/* Left side: Original Nature Color */}
          <div
            className="compare-layer compare-original"
            style={{ clipPath: `inset(0 ${100 - tuning.compareRatio}% 0 0)` }}
          >
            <div className="paper-filtered-content" style={{ filter: 'none' }}>
              {children}
            </div>
            <span className="compare-tag left">원본 컬러 (Nature)</span>
          </div>

          {/* Right side: Filtered E-Book Color */}
          <div
            className="compare-layer compare-filtered"
            style={{ clipPath: `inset(0 0 0 ${tuning.compareRatio}%)` }}
          >
            <div className="paper-filtered-content" style={{ filter: filterCss }}>
              {children}
            </div>
            {grainOpacity > 0.002 && (
              <div
                className="paper-grain-overlay"
                style={{
                  opacity: grainOpacity,
                  filter: 'url(#jongibit-paper-grain)',
                }}
              />
            )}
            <span className="compare-tag right">
              {tuning.mode === 'ink-paper' ? '흑백 잉크지' : '컬러 이북'}
            </span>
          </div>

          {/* Draggable divider */}
          <div
            className="compare-divider"
            style={{ left: `${tuning.compareRatio}%` }}
          >
            <input
              type="range"
              min={5}
              max={95}
              value={tuning.compareRatio}
              aria-label="원본과 종이빛 색감 비교 위치"
              onChange={(e) => onChangeCompareRatio?.(Number(e.target.value))}
              className="compare-range-input"
            />
            <div className="compare-handle" aria-hidden="true">
              ↔
            </div>
          </div>
        </div>
      ) : (
        <div className="paper-single-layer">
          <div className="paper-filtered-content" style={{ filter: filterCss }}>
            {children}
          </div>
          {grainOpacity > 0.002 && (
            <div
              className="paper-grain-overlay"
              style={{
                opacity: grainOpacity,
                filter: 'url(#jongibit-paper-grain)',
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};
