import type { PaperMode } from '../types';

/** 4x5 SVG feColorMatrix values (20 numbers, row-major) in sRGB space. */
export type ColorMatrix20 = number[];

export const NATURE_MATRIX: ColorMatrix20 = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
];

/**
 * Derived via REA + OLS regression against official Light Color mode reference
 * (MAE = 0.00377, RMSE = 0.00718 over 558,379 opaque pixels).
 */
export const LIGHT_COLOR_MATRIX: ColorMatrix20 = [
  0.7191, 0.1025, 0.1767, 0, 0.0010,
  0.2234, 0.5735, 0.2007, 0, 0.0016,
  0.2229, 0.0849, 0.6893, 0, 0.0022,
  0, 0, 0, 1, 0,
];

/**
 * Derived via REA + OLS regression against official Ink Paper mode reference
 * (MAE = 0.00865, RMSE = 0.01245; preserves crisp ink text contrast).
 */
export const INK_PAPER_MATRIX: ColorMatrix20 = [
  0.4382, 0.1955, 0.4142, 0, -0.0527,
  0.4381, 0.1956, 0.4138, 0, -0.0527,
  0.4382, 0.1955, 0.4142, 0, -0.0527,
  0, 0, 0, 1, 0,
];

export const MODE_INFO: Record<
  PaperMode,
  { label: string; shortLabel: string; sub: string; badge: string; indicatorLeftPercent: number }
> = {
  nature: {
    label: '자연 색상 모드',
    shortLabel: '자연 색상',
    sub: '고화질의 밝은 원색',
    badge: 'Nature Color',
    indicatorLeftPercent: 0,
  },
  'light-color': {
    label: '밝은 색상 모드',
    shortLabel: '밝은 색상',
    sub: '채도가 낮은 부드러운 색상의 종이 같은 디스플레이 효과',
    badge: 'Light Color',
    indicatorLeftPercent: 33.333,
  },
  'ink-paper': {
    label: '잉크 용지 모드',
    shortLabel: '잉크 용지',
    sub: '흑백 잉크의 종이 같은 디스플레이 효과',
    badge: 'Ink Paper',
    indicatorLeftPercent: 66.666,
  },
};

export function lerpMatrix(a: ColorMatrix20, b: ColorMatrix20, t: number): ColorMatrix20 {
  const k = Math.max(0, Math.min(1, t));
  return a.map((v, i) => v + (b[i] - v) * k);
}

/**
 * Computes the effective 20-element sRGB feColorMatrix combining the chosen
 * mode, strength (0..100), and warmth/low-blue-light filter (0..100).
 */
export function computePaperMatrix(
  mode: PaperMode,
  strength: number,
  warmth: number,
): ColorMatrix20 {
  const s = Math.max(0, Math.min(100, strength)) / 100;
  const w = Math.max(0, Math.min(100, warmth)) / 100;

  let base: ColorMatrix20;
  if (mode === 'nature') {
    base = [...NATURE_MATRIX];
  } else if (mode === 'light-color') {
    // Allow subtle overdrive from 80%..100% strength while scaling from Nature at 0%
    base = lerpMatrix(NATURE_MATRIX, LIGHT_COLOR_MATRIX, s * 1.05);
  } else {
    base = lerpMatrix(NATURE_MATRIX, INK_PAPER_MATRIX, s);
  }

  // Apply warm low-blue-light tint softly across white highlights & midtones
  if (w > 0.001) {
    const rGain = 1 + 0.03 * w;
    const gGain = 1 - 0.025 * w;
    const bGain = 1 - 0.14 * w;
    const gains = [rGain, gGain, bGain, 1];
    const out = [...base];
    for (let row = 0; row < 3; row++) {
      const g = gains[row];
      for (let col = 0; col < 5; col++) {
        out[row * 5 + col] = out[row * 5 + col] * g;
      }
      if (row === 0) out[row * 5 + 4] += 0.012 * w;
      if (row === 1) out[row * 5 + 4] += 0.004 * w;
      if (row === 2) out[row * 5 + 4] -= 0.012 * w;
    }
    return out;
  }

  return base;
}

export function formatMatrixAttribute(m: ColorMatrix20): string {
  return m.map((v) => v.toFixed(5)).join(' ');
}

export function nextPaperMode(current: PaperMode): PaperMode {
  if (current === 'nature') return 'light-color';
  if (current === 'light-color') return 'ink-paper';
  return 'nature';
}

/**
 * Applies the exact sRGB matrix directly to a 2D canvas ImageData buffer
 * for high-fidelity offline PNG/PDF export.
 */
export function applyPaperMatrixToCanvas(
  source: HTMLCanvasElement,
  mode: PaperMode,
  strength: number,
  warmth: number,
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const sctx = source.getContext('2d');
  const octx = out.getContext('2d');
  if (!sctx || !octx) return source;
  const img = sctx.getImageData(0, 0, source.width, source.height);
  const d = img.data;
  const m = computePaperMatrix(mode, strength, warmth);
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255;
    const g = d[i + 1] / 255;
    const b = d[i + 2] / 255;
    const nr = m[0] * r + m[1] * g + m[2] * b + m[4];
    const ng = m[5] * r + m[6] * g + m[7] * b + m[9];
    const nb = m[10] * r + m[11] * g + m[12] * b + m[14];
    d[i] = Math.max(0, Math.min(255, Math.round(nr * 255)));
    d[i + 1] = Math.max(0, Math.min(255, Math.round(ng * 255)));
    d[i + 2] = Math.max(0, Math.min(255, Math.round(nb * 255)));
  }
  octx.putImageData(img, 0, 0);
  return out;
}
