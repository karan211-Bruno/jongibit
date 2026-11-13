import React, { useEffect, useState } from 'react';
import type { BookItem, DisplayTuning } from './types';
import {
  DEFAULT_TUNING,
  deleteBook,
  listBooks,
  loadDisplayTuning,
  saveBook,
  saveDisplayTuning,
} from './lib/db';
import { buildSampleBooks } from './lib/sampleBooks';
import { importFilesToBook } from './lib/ebook';
import { MODE_INFO, nextPaperMode } from './lib/xpaper';
import { PaperDisplayStage } from './components/PaperDisplayStage';
import { PaperKeyBar } from './components/PaperKeyBar';
import { ReaderWorkspace } from './components/ReaderWorkspace';
import { ColorStudioModal } from './components/ColorStudioModal';
import { SystemFilterPanel } from './components/SystemFilterPanel';

export const App: React.FC = () => {
  const [tuning, setTuning] = useState<DisplayTuning>(DEFAULT_TUNING);
  const [books, setBooks] = useState<BookItem[]>([]);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [view, setView] = useState<'library' | 'reader' | 'system'>('library');
  const [showStudio, setShowStudio] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const refreshBooks = async () => {
    let items = await listBooks();
    if (items.length === 0) {
      const samples = buildSampleBooks();
      for (const s of samples) await saveBook(s);
      items = await listBooks();
    }
    setBooks(items);
  };

  useEffect(() => {
    loadDisplayTuning().then(setTuning);
    refreshBooks();
  }, []);

  const updateTuning = (patch: Partial<DisplayTuning>) => {
    setTuning((prev) => {
      const next = { ...prev, ...patch };
      saveDisplayTuning(next).catch(() => undefined);
      return next;
    });
  };

  // Global shortcut Alt+P to mimic hardware X-Paper Key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setTuning((prev) => {
          const next = { ...prev, mode: nextPaperMode(prev.mode) };
          saveDisplayTuning(next).catch(() => undefined);
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const activeBook = books.find((b) => b.id === activeBookId) || null;

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErrorMsg('');
    setLoadingMsg('도서를 불러오는 중...');
    try {
      const book = await importFilesToBook(files, setLoadingMsg);
      await saveBook(book);
      await refreshBooks();
      setActiveBookId(book.id);
      setView('reader');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '파일을 불러오지 못했습니다.');
    } finally {
      setLoadingMsg('');
      e.target.value = '';
    }
  };

  const handleUpdateBook = async (updated: BookItem) => {
    setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    await saveBook(updated);
  };

  const handleDeleteBook = async (id: string) => {
    await deleteBook(id);
    if (activeBookId === id) {
      setActiveBookId(null);
      setView('library');
    }
    await refreshBooks();
  };

  return (
    <div className="app-shell">
      <PaperKeyBar
        tuning={tuning}
        onChange={updateTuning}
        onOpenLibrary={() => setView('library')}
        onOpenStudio={() => setShowStudio(true)}
        onOpenSystem={() => setView('system')}
        hasActiveBook={Boolean(activeBook)}
        onBackToReader={() => setView('reader')}
        activeView={view}
      />

      <div className="stage-wrap">
        <PaperDisplayStage
          tuning={tuning}
          onChangeCompareRatio={(compareRatio) => updateTuning({ compareRatio })}
        >
          {view === 'reader' && activeBook ? (
            <ReaderWorkspace
              book={activeBook}
              tuning={tuning}
              onUpdateBook={handleUpdateBook}
              onChangeTuning={updateTuning}
              onBackToLibrary={() => setView('library')}
            />
          ) : view === 'system' ? (
            <SystemFilterPanel
              tuning={tuning}
              onRefreshLibrary={refreshBooks}
              onBack={() => setView('library')}
            />
          ) : (
            <div className="library-view">
              <section className="hero-card">
                <div className="hero-copy">
                  <span className="hero-badge">
                    현재 표시: {MODE_INFO[tuning.mode].label} ({MODE_INFO[tuning.mode].badge})
                  </span>
                  <h1>눈부심 없이 읽는 3-in-1 컬러 이북 디스플레이</h1>
                  <p>
                    상단의 <strong>종이빛 키</strong>를 눌러 <strong>원본 컬러 → 컬러 이북(담채) → 흑백 잉크지</strong>를 즉시 전환해 보세요. EPUB, PDF, 만화(CBZ), 이미지를 불러와 실제 컬러 전자책처럼 읽고 주석을 남길 수 있습니다.
                  </p>
                  <div className="hero-actions">
                    <label className="primary-btn" style={{ cursor: 'pointer' }}>
                      + 책·만화·PDF 가져오기
                      <input
                        type="file"
                        multiple
                        accept=".epub,.pdf,.cbz,.zip,.txt,.md,image/*"
                        onChange={handleImport}
                        hidden
                      />
                    </label>
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => updateTuning({ compareSplit: !tuning.compareSplit })}
                    >
                      {tuning.compareSplit ? '비교 커튼 닫기' : '원본 vs 컬러 이북 실시간 비교'}
                    </button>
                  </div>
                </div>
                <div className="hero-palette-preview" aria-hidden="true">
                  <div className="swatch-row">
                    <span style={{ background: '#e62e45' }} />
                    <span style={{ background: '#ff8c1a' }} />
                    <span style={{ background: '#ffd12e' }} />
                    <span style={{ background: '#1e7a4c' }} />
                    <span style={{ background: '#4158f5' }} />
                  </div>
                  <p>컬러 스펙트럼 테스트 카드 · 상단 모드 탭 전환 시 실시간으로 채도·온도가 바뀝니다</p>
                </div>
              </section>

              {loadingMsg && <div className="status-banner">{loadingMsg}</div>}
              {errorMsg && <div className="error-banner">{errorMsg}</div>}

              <section className="books-section">
                <div className="section-head">
                  <h2>내 서재 ({books.length})</h2>
                  <span className="section-hint">샘플 컬러 도감 또는 가져온 전자책을 눌러 바로 읽어 보세요</span>
                </div>

                <div className="books-grid">
                  {books.map((b) => (
                    <article key={b.id} className="book-card">
                      <button
                        type="button"
                        className="book-cover-btn"
                        onClick={() => {
                          setActiveBookId(b.id);
                          setView('reader');
                        }}
                      >
                        <img src={b.coverDataUrl} alt={b.title} />
                        <span className="format-chip">{b.format.toUpperCase()}</span>
                      </button>
                      <div className="book-meta">
                        <h3 title={b.title}>{b.title}</h3>
                        <p>{b.author}</p>
                        <div className="book-foot">
                          <span>
                            {b.currentPage + 1}/{b.pages.length}쪽
                          </span>
                          <div className="book-btns">
                            <button
                              type="button"
                              className="mini-open"
                              onClick={() => {
                                setActiveBookId(b.id);
                                setView('reader');
                              }}
                            >
                              읽기
                            </button>
                            {!b.isSample && (
                              <button
                                type="button"
                                className="mini-del"
                                onClick={() => handleDeleteBook(b.id)}
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </PaperDisplayStage>
      </div>

      {showStudio && (
        <ColorStudioModal tuning={tuning} onClose={() => setShowStudio(false)} />
      )}
    </div>
  );
};
