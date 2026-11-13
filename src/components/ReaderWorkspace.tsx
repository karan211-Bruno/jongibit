import React, { useEffect, useRef, useState } from 'react';
import type { AnnotationStroke, BookItem, DisplayTuning } from '../types';
import { applyPaperMatrixToCanvas } from '../lib/xpaper';
import { saveAndShareFile } from '../lib/native';

interface ReaderWorkspaceProps {
  book: BookItem;
  tuning: DisplayTuning;
  onUpdateBook: (book: BookItem) => void;
  onChangeTuning: (patch: Partial<DisplayTuning>) => void;
  onBackToLibrary: () => void;
}

type ToolMode = 'read' | 'pen' | 'highlighter' | 'eraser';

const PEN_COLORS = ['#1d1c1a', '#c9382b', '#2063b8', '#2a7a4f', '#d97b18'];

export const ReaderWorkspace: React.FC<ReaderWorkspaceProps> = ({
  book,
  tuning,
  onUpdateBook,
  onChangeTuning,
  onBackToLibrary,
}) => {
  const [tool, setTool] = useState<ToolMode>('read');
  const [penColor, setPenColor] = useState('#c9382b');
  const [showToc, setShowToc] = useState(false);
  const [showTypography, setShowTypography] = useState(false);
  const [verticalWebtoon, setVerticalWebtoon] = useState<boolean>(
    () => book.id === 'sample-webtoon-teahouse' || book.format === 'cbz'
  );
  const [statusMsg, setStatusMsg] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeStrokeRef = useRef<AnnotationStroke | null>(null);

  useEffect(() => {
    setVerticalWebtoon(book.id === 'sample-webtoon-teahouse' || book.format === 'cbz');
  }, [book.id, book.format]);

  const pageIdx = Math.max(0, Math.min(book.pages.length - 1, book.currentPage));
  const currentPage = book.pages[pageIdx];
  const isBookmarked = book.bookmarks.includes(pageIdx);
  const pageAnnotations = book.annotations[pageIdx] || [];

  const goToPage = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(book.pages.length - 1, nextIdx));
    if (clamped !== pageIdx) {
      onUpdateBook({ ...book, currentPage: clamped, updatedAt: Date.now() });
    }
  };

  const toggleBookmark = () => {
    const exists = book.bookmarks.includes(pageIdx);
    const bookmarks = exists
      ? book.bookmarks.filter((p) => p !== pageIdx)
      : [...book.bookmarks, pageIdx].sort((a, b) => a - b);
    onUpdateBook({ ...book, bookmarks, updatedAt: Date.now() });
  };

  // Redraw page vector annotations onto normalized 1000x1400 overlay canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawStroke = (s: AnnotationStroke) => {
      if (s.points.length === 0) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = s.isHighlighter ? 0.34 : 0.94;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(s.points[0].x * canvas.width, s.points[0].y * canvas.height);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x * canvas.width, s.points[i].y * canvas.height);
      }
      if (s.points.length === 1) {
        ctx.lineTo(s.points[0].x * canvas.width + 0.1, s.points[0].y * canvas.height + 0.1);
      }
      ctx.stroke();
      ctx.restore();
    };

    for (const s of pageAnnotations) drawStroke(s);
  }, [pageAnnotations, pageIdx]);

  const toNormPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'read') return;
    if (e.pointerType === 'touch' && tool !== 'eraser') {
      // Allow pen/mouse drawing cleanly; touch also works when user selects pen/highlighter
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = toNormPoint(e);

    if (tool === 'eraser' || e.buttons === 32) {
      const kept = pageAnnotations.filter(
        (s) => !s.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 0.03),
      );
      if (kept.length !== pageAnnotations.length) {
        onUpdateBook({
          ...book,
          annotations: { ...book.annotations, [pageIdx]: kept },
          updatedAt: Date.now(),
        });
      }
      return;
    }

    activeStrokeRef.current = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      color: penColor,
      width: tool === 'highlighter' ? 22 : 4,
      isHighlighter: tool === 'highlighter',
      points: [pt],
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'read') return;
    const pt = toNormPoint(e);
    if (tool === 'eraser' && e.buttons > 0) {
      const kept = pageAnnotations.filter(
        (s) => !s.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 0.03),
      );
      if (kept.length !== pageAnnotations.length) {
        onUpdateBook({
          ...book,
          annotations: { ...book.annotations, [pageIdx]: kept },
        });
      }
      return;
    }

    const st = activeStrokeRef.current;
    if (!st) return;
    st.points.push(pt);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && st.points.length >= 2) {
      const a = st.points[st.points.length - 2];
      const b = st.points[st.points.length - 1];
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = st.color;
      ctx.globalAlpha = st.isHighlighter ? 0.34 : 0.94;
      ctx.lineWidth = st.width;
      ctx.beginPath();
      ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
      ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
      ctx.stroke();
      ctx.restore();
    }
  };

  const handlePointerUp = () => {
    const st = activeStrokeRef.current;
    if (!st) return;
    activeStrokeRef.current = null;
    onUpdateBook({
      ...book,
      annotations: {
        ...book.annotations,
        [pageIdx]: [...pageAnnotations, st],
      },
      updatedAt: Date.now(),
    });
  };

  const handleExportCurrentImage = async () => {
    if (!currentPage?.imageDataUrl) {
      setStatusMsg('이미지·PDF 페이지에서 현재 종이빛 색감 PNG 저장이 가능합니다.');
      setTimeout(() => setStatusMsg(''), 2500);
      return;
    }
    const img = new Image();
    img.src = currentPage.imageDataUrl;
    await new Promise((res) => {
      img.onload = res;
    });
    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = img.naturalWidth;
    rawCanvas.height = img.naturalHeight;
    const rctx = rawCanvas.getContext('2d');
    if (!rctx) return;
    rctx.drawImage(img, 0, 0);
    const converted = applyPaperMatrixToCanvas(
      rawCanvas,
      tuning.mode,
      tuning.strength,
      tuning.warmth,
    );
    const filename = `${book.title}-${pageIdx + 1}-${tuning.mode}.png`;
    await saveAndShareFile(filename, converted.toDataURL('image/png'), 'image/png');
    setStatusMsg(`${filename} 내보내기 완료`);
    setTimeout(() => setStatusMsg(''), 2500);
  };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowRight' || ev.key === 'PageDown') goToPage(pageIdx + 1);
      if (ev.key === 'ArrowLeft' || ev.key === 'PageUp') goToPage(pageIdx - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="reader-root">
      <div className="reader-toolbar">
        <div className="reader-toolbar-group">
          <button type="button" className="ghost-btn" onClick={onBackToLibrary}>
            ← 서재
          </button>
          <button type="button" className="ghost-btn" onClick={() => setShowToc((v) => !v)}>
            목차 ({book.pages.length})
          </button>
          <button
            type="button"
            className={`ghost-btn ${isBookmarked ? 'is-accent' : ''}`}
            onClick={toggleBookmark}
          >
            {isBookmarked ? '★ 책갈피됨' : '☆ 책갈피'}
          </button>
        </div>

        <div className="reader-title" title={book.title}>
          <strong>{book.title}</strong>
          <span>
            {pageIdx + 1} / {book.pages.length}
          </span>
        </div>

        <div className="reader-toolbar-group">
          <button
            type="button"
            className={`tool-chip ${tool === 'read' ? 'active' : ''}`}
            onClick={() => setTool('read')}
          >
            읽기
          </button>
          <button
            type="button"
            className={`tool-chip ${tool === 'pen' ? 'active' : ''}`}
            onClick={() => setTool('pen')}
          >
            펜
          </button>
          <button
            type="button"
            className={`tool-chip ${tool === 'highlighter' ? 'active' : ''}`}
            onClick={() => setTool('highlighter')}
          >
            형광펜
          </button>
          <button
            type="button"
            className={`tool-chip ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => setTool('eraser')}
          >
            지우개
          </button>
          {tool !== 'read' && (
            <div className="color-dots">
              {PEN_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`펜 색상 ${c}`}
                  className={`color-dot ${penColor === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setPenColor(c)}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            className={`tool-chip ${verticalWebtoon ? 'active' : ''}`}
            data-testid="toggle-scroll-mode"
            onClick={() => setVerticalWebtoon((v) => !v)}
          >
            {verticalWebtoon ? '세로 웹툰 스크롤' : '페이지 넘김'}
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => setShowTypography((v) => !v)}
          >
            글자·보기
          </button>
          {currentPage?.kind === 'image' && (
            <button type="button" className="ghost-btn" onClick={handleExportCurrentImage}>
              PNG 저장
            </button>
          )}
        </div>
      </div>

      {statusMsg && <div className="reader-toast">{statusMsg}</div>}

      {showTypography && (
        <div className="typography-bar">
          <label>
            글꼴 {tuning.fontSize}px
            <input
              type="range"
              min={14}
              max={28}
              value={tuning.fontSize}
              onChange={(e) => onChangeTuning({ fontSize: Number(e.target.value) })}
            />
          </label>
          <label>
            줄간격 {tuning.lineHeight.toFixed(2)}
            <input
              type="range"
              min={1.35}
              max={2.2}
              step={0.05}
              value={tuning.lineHeight}
              onChange={(e) => onChangeTuning({ lineHeight: Number(e.target.value) })}
            />
          </label>
          <label>
            여백 {tuning.pageMargin}px
            <input
              type="range"
              min={16}
              max={72}
              value={tuning.pageMargin}
              onChange={(e) => onChangeTuning({ pageMargin: Number(e.target.value) })}
            />
          </label>
        </div>
      )}

      <div className="reader-body">
        {showToc && (
          <aside className="toc-drawer">
            <div className="toc-head">
              <strong>목차 & 책갈피</strong>
              <button type="button" onClick={() => setShowToc(false)}>
                ✕
              </button>
            </div>
            <div className="toc-list">
              {book.pages.map((p) => (
                <button
                  key={p.index}
                  type="button"
                  className={`toc-item ${p.index === pageIdx ? 'active' : ''}`}
                  onClick={() => {
                    goToPage(p.index);
                    setShowToc(false);
                  }}
                >
                  <span>
                    {p.index + 1}. {p.title || `${p.index + 1}쪽`}
                  </span>
                  {book.bookmarks.includes(p.index) && <em>★</em>}
                </button>
              ))}
            </div>
          </aside>
        )}

        <main className="reader-viewport">
          {verticalWebtoon ? (
            <div className="webtoon-scroll-container" data-testid="webtoon-scroll-feed">
              {book.pages.map((pg) => (
                <div
                  key={pg.index}
                  className="webtoon-panel-card"
                  style={{ padding: `${Math.min(18, tuning.pageMargin)}px` }}
                >
                  {pg.kind === 'html' ? (
                    <article
                      className="ebook-prose"
                      style={{
                        fontSize: `${tuning.fontSize}px`,
                        lineHeight: tuning.lineHeight,
                      }}
                      dangerouslySetInnerHTML={{ __html: pg.html || '' }}
                    />
                  ) : (
                    <div className="ebook-image-page">
                      <img src={pg.imageDataUrl} alt={pg.title || `웹툰 ${pg.index + 1}컷`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              <button
                type="button"
                className="page-nav-edge prev"
                disabled={pageIdx === 0}
                onClick={() => goToPage(pageIdx - 1)}
                aria-label="이전 페이지"
              >
                ‹
              </button>

              <div
                className="reader-paper-sheet"
                style={{
                  padding: `${tuning.pageMargin}px`,
                }}
              >
                {currentPage?.kind === 'html' ? (
                  <article
                    className="ebook-prose"
                    style={{
                      fontSize: `${tuning.fontSize}px`,
                      lineHeight: tuning.lineHeight,
                    }}
                    dangerouslySetInnerHTML={{ __html: currentPage.html || '' }}
                  />
                ) : (
                  <div className="ebook-image-page">
                    <img src={currentPage?.imageDataUrl} alt={currentPage?.title || '페이지'} />
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  width={1000}
                  height={1400}
                  className={`reader-annotation-canvas ${tool !== 'read' ? 'is-drawing' : ''}`}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                />
              </div>

              <button
                type="button"
                className="page-nav-edge next"
                disabled={pageIdx >= book.pages.length - 1}
                onClick={() => goToPage(pageIdx + 1)}
                aria-label="다음 페이지"
              >
                ›
              </button>
            </>
          )}
        </main>
      </div>

      <footer className="reader-footer">
        <button
          type="button"
          disabled={pageIdx === 0}
          onClick={() => goToPage(pageIdx - 1)}
        >
          이전 쪽
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(0, book.pages.length - 1)}
          value={pageIdx}
          onChange={(e) => goToPage(Number(e.target.value))}
          className="page-scrubber"
        />
        <button
          type="button"
          disabled={pageIdx >= book.pages.length - 1}
          onClick={() => goToPage(pageIdx + 1)}
        >
          다음 쪽
        </button>
      </footer>
    </div>
  );
};
