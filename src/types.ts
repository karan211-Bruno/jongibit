export type PaperMode = 'nature' | 'light-color' | 'ink-paper';

export interface DisplayTuning {
  mode: PaperMode;
  strength: number; // 0..100
  warmth: number; // 0..100 (low blue light / warm paper)
  grain: number; // 0..100 (AG nano-etching paper grain)
  fontSize: number; // px
  lineHeight: number;
  pageMargin: number; // px
  twoPageSpread: boolean;
  compareSplit: boolean;
  compareRatio: number; // 0..100
}

export interface BookPage {
  index: number;
  title?: string;
  kind: 'html' | 'image';
  html?: string;
  imageDataUrl?: string;
}

export interface AnnotationStroke {
  id: string;
  color: string;
  width: number;
  isHighlighter: boolean;
  points: Array<{ x: number; y: number }>;
}

export interface BookItem {
  id: string;
  title: string;
  author: string;
  format: 'sample' | 'epub' | 'pdf' | 'cbz' | 'txt';
  coverDataUrl: string;
  pages: BookPage[];
  currentPage: number;
  bookmarks: number[];
  annotations: Record<number, AnnotationStroke[]>;
  updatedAt: number;
  isSample?: boolean;
}

export interface SystemOverlayState {
  supported: boolean;
  hasPermission: boolean;
  enabled: boolean;
  mode: PaperMode;
  strength: number;
  warmth: number;
  accessibilityColorCorrectionAvailable?: boolean;
}
