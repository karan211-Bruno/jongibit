import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { DisplayTuning } from '../types';
import { applyPaperMatrixToCanvas } from '../lib/xpaper';
import { saveAndShareFile } from '../lib/native';

interface DrawingStudioProps {
  tuning: DisplayTuning;
  onBack: () => void;
}

type ColoringTemplateId = 'sunrise-waves' | 'botanical-tea' | 'mandala' | 'blank';
type BrushTool = 'fineliner' | 'marker' | 'pencil' | 'eraser';

interface DrawPoint {
  x: number;
  y: number;
  p: number; // calibrated 3g low-activation pressure 0..1
}

interface DrawStroke {
  tool: BrushTool;
  color: string;
  size: number;
  points: DrawPoint[];
}

const STUDIO_W = 1000;
const STUDIO_H = 1280;

const PALETTE_COLORS = [
  '#161616',
  '#e53935',
  '#fb8c00',
  '#fdd835',
  '#43a047',
  '#00897b',
  '#1e88e5',
  '#3949ab',
  '#8e24aa',
  '#d81b60',
  '#6d4c41',
  '#78909c',
  '#ff8a65',
  '#4dd0e1',
  '#aed581',
  '#fff59d',
];

function calibrateEmrPressure(raw: number, pointerType: string): number {
  const base = pointerType === 'pen' ? (raw > 0 ? raw : 0.35) : 0.45;
  // 3g low-activation sensitivity curve: light initial force still registers cleanly
  return Math.max(0.04, Math.min(1, Math.pow(base, 0.62)));
}

function drawTemplateLineArt(ctx: CanvasRenderingContext2D, template: ColoringTemplateId) {
  ctx.clearRect(0, 0, STUDIO_W, STUDIO_H);
  if (template === 'blank') return;

  ctx.save();
  ctx.strokeStyle = '#141414';
  ctx.fillStyle = '#141414';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (template === 'sunrise-waves') {
    // Original line-art inspired by crisp sun over ocean waves & clouds
    ctx.lineWidth = 6;
    ctx.strokeRect(36, 36, STUDIO_W - 72, STUDIO_H - 72);

    // Big rising sun dome
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(460, 490, 260, Math.PI, 0, false);
    ctx.stroke();

    // Inner crescent highlight arc
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(460, 490, 210, Math.PI * 1.12, Math.PI * 1.55, false);
    ctx.stroke();

    // Horizon divider lines
    ctx.lineWidth = 6;
    for (const hy of [520, 560, 610]) {
      ctx.beginPath();
      ctx.moveTo(36, hy);
      ctx.lineTo(STUDIO_W - 36, hy);
      ctx.stroke();
    }

    // Layered sinusoidal ocean waves
    ctx.lineWidth = 4.5;
    for (let row = 0; row < 12; row++) {
      const baseY = 665 + row * 48;
      const freq = 0.018 + (row % 3) * 0.004;
      const amp = 16 + (row % 2) * 8;
      ctx.beginPath();
      for (let x = 36; x <= STUDIO_W - 36; x += 12) {
        const y = baseY + Math.sin(x * freq + row * 1.15) * amp;
        if (x === 36) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Sky cloud ribbons
    const clouds = [
      [180, 180, 220],
      [710, 150, 210],
      [760, 320, 190],
    ];
    ctx.lineWidth = 4.5;
    for (const [cx, cy, cw] of clouds) {
      ctx.beginPath();
      ctx.moveTo(cx - cw * 0.45, cy);
      ctx.bezierCurveTo(cx - cw * 0.3, cy - 55, cx + cw * 0.1, cy - 60, cx + cw * 0.35, cy);
      ctx.bezierCurveTo(cx + cw * 0.6, cy + 25, cx - cw * 0.5, cy + 32, cx - cw * 0.45, cy);
      ctx.stroke();
    }

    // Soaring seagull silhouette
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(640, 260);
    ctx.quadraticCurveTo(680, 232, 712, 262);
    ctx.quadraticCurveTo(748, 228, 788, 255);
    ctx.stroke();
  } else if (template === 'botanical-tea') {
    ctx.lineWidth = 5.5;
    ctx.strokeRect(48, 48, STUDIO_W - 96, STUDIO_H - 96);
    // Arch window frame
    ctx.beginPath();
    ctx.moveTo(180, 740);
    ctx.lineTo(180, 380);
    ctx.arc(500, 380, 320, Math.PI, 0, false);
    ctx.lineTo(820, 740);
    ctx.closePath();
    ctx.stroke();
    // Window crossbars
    ctx.beginPath();
    ctx.moveTo(500, 60);
    ctx.lineTo(500, 740);
    ctx.moveTo(180, 460);
    ctx.lineTo(820, 460);
    ctx.stroke();
    // Table & teacup
    ctx.beginPath();
    ctx.moveTo(80, 950);
    ctx.lineTo(920, 950);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(500, 880, 130, 38, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(500, 815, 88, 0, Math.PI, false);
    ctx.closePath();
    ctx.stroke();
    // Botanical leaves
    for (let i = 0; i < 6; i++) {
      const lx = 260 + i * 95;
      const ly = 1040 + (i % 2) * 35;
      ctx.beginPath();
      ctx.ellipse(lx, ly, 42, 72, (i - 2.5) * 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (template === 'mandala') {
    const cx = STUDIO_W / 2;
    const cy = STUDIO_H / 2;
    ctx.lineWidth = 4;
    for (const r of [90, 180, 280, 380, 460]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let ring = 0; ring < 3; ring++) {
      const count = 8 * (ring + 1);
      const innerR = 90 + ring * 95;
      const outerR = innerR + 95;
      for (let i = 0; i < count; i++) {
        const a1 = (i / count) * Math.PI * 2;
        const a2 = ((i + 0.5) / count) * Math.PI * 2;
        const a3 = ((i + 1) / count) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a1) * innerR, cy + Math.sin(a1) * innerR);
        ctx.quadraticCurveTo(
          cx + Math.cos(a2) * (outerR + 30),
          cy + Math.sin(a2) * (outerR + 30),
          cx + Math.cos(a3) * innerR,
          cy + Math.sin(a3) * innerR
        );
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

function paintStudioStroke(ctx: CanvasRenderingContext2D, stroke: DrawStroke) {
  const pts = stroke.points;
  if (pts.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.tool === 'eraser') {
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 1;
  } else {
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = stroke.tool === 'marker' ? 0.65 : stroke.tool === 'pencil' ? 0.8 : 0.98;
  }

  const mult =
    stroke.tool === 'marker' ? 2.4 : stroke.tool === 'eraser' ? 3.2 : stroke.tool === 'pencil' ? 0.9 : 1;

  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, Math.max(1, stroke.size * mult * (0.4 + pts[0].p * 0.9)), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const width = Math.max(1, stroke.size * mult * (0.35 + b.p * 1.15));
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  ctx.restore();
}

export const DrawingStudio: React.FC<DrawingStudioProps> = ({ tuning, onBack }) => {
  const [template, setTemplate] = useState<ColoringTemplateId>('sunrise-waves');
  const [tool, setTool] = useState<BrushTool>('marker');
  const [color, setColor] = useState('#1e88e5');
  const [size, setSize] = useState(14);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [redoStack, setRedoStack] = useState<DrawStroke[]>([]);
  const [pressureLevel, setPressureLevel] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState('');

  const paintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeStrokeRef = useRef<DrawStroke | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const redrawPaint = useCallback(
    (extra?: DrawStroke | null) => {
      const canvas = paintCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#fcfaf4';
      ctx.fillRect(0, 0, STUDIO_W, STUDIO_H);
      for (const st of strokes) paintStudioStroke(ctx, st);
      if (extra) paintStudioStroke(ctx, extra);
    },
    [strokes]
  );

  useEffect(() => {
    redrawPaint();
  }, [redrawPaint]);

  useEffect(() => {
    const canvas = lineCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) drawTemplateLineArt(ctx, template);
  }, [template]);

  const toStudioPoint = (clientX: number, clientY: number, rect: DOMRect, p: number): DrawPoint => ({
    x: Math.max(0, Math.min(STUDIO_W, ((clientX - rect.left) / rect.width) * STUDIO_W)),
    y: Math.max(0, Math.min(STUDIO_H, ((clientY - rect.top) / rect.height) * STUDIO_H)),
    p,
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch' && e.width > 38) return;
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    activePointerIdRef.current = e.pointerId;

    const effTool: BrushTool = e.pointerType === 'pen' && e.buttons === 32 ? 'eraser' : tool;
    const calP = calibrateEmrPressure(e.pressure, e.pointerType);
    setPressureLevel(Math.round(calP * 16384));

    const rect = canvas.getBoundingClientRect();
    activeStrokeRef.current = {
      tool: effTool,
      color,
      size,
      points: [toStudioPoint(e.clientX, e.clientY, rect, calP)],
    };
    redrawPaint(activeStrokeRef.current);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId || !activeStrokeRef.current) return;
    const canvas = paintCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const nativeEv = e.nativeEvent as PointerEvent;
    const events =
      typeof nativeEv.getCoalescedEvents === 'function' ? nativeEv.getCoalescedEvents() : [nativeEv];
    const list = events.length > 0 ? events : [nativeEv];

    let lastP = 0.5;
    for (const ev of list) {
      lastP = calibrateEmrPressure(ev.pressure, ev.pointerType);
      activeStrokeRef.current.points.push(toStudioPoint(ev.clientX, ev.clientY, rect, lastP));
    }
    setPressureLevel(Math.round(lastP * 16384));
    redrawPaint(activeStrokeRef.current);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = null;
    if (activeStrokeRef.current) {
      const done = activeStrokeRef.current;
      activeStrokeRef.current = null;
      setStrokes((prev) => [...prev.slice(-39), done]);
      setRedoStack([]);
    }
    setPressureLevel(0);
  };

  const handleExportPng = async () => {
    const paint = paintCanvasRef.current;
    const line = lineCanvasRef.current;
    if (!paint || !line) return;
    const out = document.createElement('canvas');
    out.width = STUDIO_W;
    out.height = STUDIO_H;
    const octx = out.getContext('2d');
    if (!octx) return;
    octx.drawImage(paint, 0, 0);
    octx.globalCompositeOperation = 'multiply';
    octx.drawImage(line, 0, 0);
    octx.globalCompositeOperation = 'source-over';
    applyPaperMatrixToCanvas(out, tuning.mode, tuning.strength, tuning.warmth);
    const dataUrl = out.toDataURL('image/png');
    await saveAndShareFile(`jongibit-artwork-${Date.now()}.png`, dataUrl, 'image/png');
    setStatusMsg('종이빛 컬러/잉크 보정 PNG로 저장했습니다.');
    window.setTimeout(() => setStatusMsg(''), 2800);
  };

  const pressureGrams = pressureLevel > 0 ? Math.max(3, Math.round((pressureLevel / 16384) * 350)) : 0;

  return (
    <div className="drawing-studio-shell" data-testid="drawing-studio">
      <div className="drawing-studio-bar">
        <div className="studio-left-controls">
          <button type="button" className="ghost-btn" onClick={onBack}>
            ← 서재로
          </button>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as ColoringTemplateId)}
            aria-label="컬러링북 도안 선택"
          >
            <option value="sunrise-waves">도안 1 · 일출과 파도 구름 (컬러링)</option>
            <option value="botanical-tea">도안 2 · 숲속 창가 다실 (컬러링)</option>
            <option value="mandala">도안 3 · 스테인드글라스 만다라</option>
            <option value="blank">무지 자유 스케치 용지</option>
          </select>
        </div>

        <div className="studio-tool-chips">
          {(
            [
              ['marker', '수채 컬러링'],
              ['fineliner', '세밀 펜'],
              ['pencil', '연필'],
              ['eraser', '지우개'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`tool-chip ${tool === id ? 'active' : ''}`}
              onClick={() => setTool(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="studio-right-controls">
          <span className="emr-hud-badge" data-testid="emr-pressure-hud">
            16,384단계 · {pressureLevel > 0 ? `${pressureLevel} (${pressureGrams}g)` : '3g 초경량 대기'}
          </span>
          <button
            type="button"
            className="ghost-btn"
            disabled={strokes.length === 0}
            onClick={() => {
              const last = strokes[strokes.length - 1];
              if (!last) return;
              setStrokes((s) => s.slice(0, -1));
              setRedoStack((r) => [...r, last]);
            }}
          >
            실행 취소
          </button>
          <button
            type="button"
            className="ghost-btn"
            disabled={redoStack.length === 0}
            onClick={() => {
              const next = redoStack[redoStack.length - 1];
              if (!next) return;
              setRedoStack((r) => r.slice(0, -1));
              setStrokes((s) => [...s, next]);
            }}
          >
            다시 실행
          </button>
          <button type="button" className="ghost-btn" onClick={() => setStrokes([])}>
            전체 지우기
          </button>
          <button type="button" className="primary-btn" onClick={handleExportPng}>
            PNG 저장
          </button>
        </div>
      </div>

      {statusMsg && <div className="reader-toast">{statusMsg}</div>}

      <div className="drawing-workspace-grid">
        <aside className="drawing-palette-rail" aria-label="색상 및 굵기 팔레트">
          <div className="palette-swatches">
            {PALETTE_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                className={`palette-swatch ${color === hex ? 'active' : ''}`}
                style={{ background: hex }}
                aria-label={`색상 ${hex}`}
                onClick={() => {
                  setColor(hex);
                  if (tool === 'eraser') setTool('marker');
                }}
              />
            ))}
          </div>
          <label className="custom-color-label">
            직접 선택
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
          <label className="brush-size-label">
            펜 굵기 {size}px
            <input
              type="range"
              min={2}
              max={36}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
          </label>
        </aside>

        <div className="drawing-canvas-stage">
          <div className="drawing-paper-board">
            <canvas
              ref={paintCanvasRef}
              width={STUDIO_W}
              height={STUDIO_H}
              className="studio-paint-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            <canvas
              ref={lineCanvasRef}
              width={STUDIO_W}
              height={STUDIO_H}
              className="studio-lineart-canvas"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
