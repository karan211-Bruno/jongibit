import JSZip from 'jszip';
import type { BookItem, BookPage } from '../types';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function makeTextCover(title: string, badge: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 660;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const grad = ctx.createLinearGradient(0, 0, 480, 660);
  grad.addColorStop(0, '#f5efe2');
  grad.addColorStop(1, '#dfd2bb');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 480, 660);
  ctx.fillStyle = '#3a322a';
  ctx.fillRect(0, 0, 44, 660);
  ctx.fillStyle = '#d96b27';
  ctx.fillRect(350, 0, 68, 120);
  ctx.fillStyle = '#2d2620';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(badge.toUpperCase(), 76, 92);
  ctx.font = 'bold 34px serif';
  const words = title.split(/\s+/);
  let line = '';
  let y = 240;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > 340) {
      ctx.fillText(line, 76, y);
      line = w;
      y += 46;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, 76, y);
  return canvas.toDataURL('image/png');
}

function mimeFromExt(path: string): string {
  const low = path.toLowerCase();
  if (low.endsWith('.png')) return 'image/png';
  if (low.endsWith('.webp')) return 'image/webp';
  if (low.endsWith('.gif')) return 'image/gif';
  if (low.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

function resolveZipPath(baseDir: string, rel: string): string {
  const cleanRel = rel.split('#')[0].split('?')[0];
  const stack = baseDir ? baseDir.split('/').filter(Boolean) : [];
  for (const seg of cleanRel.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') stack.pop();
    else stack.push(seg);
  }
  return stack.join('/');
}

async function parseEpub(file: File, onProgress?: (msg: string) => void): Promise<BookItem> {
  onProgress?.('EPUB 압축 해제 및 목차 분석 중...');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  let opfPath = '';
  if (containerXml) {
    const m = containerXml.match(/full-path=["']([^"']+)["']/);
    if (m) opfPath = m[1];
  }
  if (!opfPath) {
    opfPath = Object.keys(zip.files).find((k) => k.endsWith('.opf')) || '';
  }
  if (!opfPath) throw new Error('유효한 EPUB OPF 파일을 찾지 못했습니다.');

  const opfText = await zip.file(opfPath)?.async('text');
  if (!opfText) throw new Error('EPUB OPF 본문을 읽지 못했습니다.');

  const parser = new DOMParser();
  const opfDoc = parser.parseFromString(opfText, 'application/xml');
  const title =
    opfDoc.querySelector('metadata title, dc\\:title')?.textContent?.trim() ||
    file.name.replace(/\.epub$/i, '');
  const author =
    opfDoc.querySelector('metadata creator, dc\\:creator')?.textContent?.trim() || '저자 미상';

  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';
  const manifest = new Map<string, { href: string; mediaType: string }>();
  opfDoc.querySelectorAll('manifest > item').forEach((el) => {
    const id = el.getAttribute('id') || '';
    const href = decodeURIComponent(el.getAttribute('href') || '');
    const mediaType = el.getAttribute('media-type') || '';
    if (id && href) manifest.set(id, { href, mediaType });
  });

  const spineIds: string[] = [];
  opfDoc.querySelectorAll('spine > itemref').forEach((el) => {
    const idref = el.getAttribute('idref');
    if (idref) spineIds.push(idref);
  });

  // Preload images as data URLs so offline IndexedDB persistence keeps images intact
  const imageCache = new Map<string, string>();
  const zipKeys = Object.keys(zip.files);
  for (const key of zipKeys) {
    if (/\.(png|jpe?g|webp|gif|svg)$/i.test(key) && !zip.files[key].dir) {
      const b64 = await zip.files[key].async('base64');
      imageCache.set(key, `data:${mimeFromExt(key)};base64,${b64}`);
    }
  }

  let coverDataUrl = '';
  for (const [k, v] of imageCache.entries()) {
    if (/cover/i.test(k)) {
      coverDataUrl = v;
      break;
    }
  }

  const pages: BookPage[] = [];
  let idx = 0;
  for (const idref of spineIds) {
    const item = manifest.get(idref);
    if (!item) continue;
    const fullPath = resolveZipPath(opfDir, item.href);
    const entry = zip.file(fullPath);
    if (!entry) continue;
    const rawHtml = await entry.async('text');
    const doc = parser.parseFromString(rawHtml, 'text/html');
    doc.querySelectorAll('script, style, link').forEach((n) => n.remove());
    const chapterDir = fullPath.includes('/') ? fullPath.slice(0, fullPath.lastIndexOf('/')) : '';

    doc.querySelectorAll('img, image').forEach((img) => {
      const attr = img.getAttribute('src') ? 'src' : img.getAttribute('xlink:href') ? 'xlink:href' : 'href';
      const src = img.getAttribute(attr);
      if (!src || src.startsWith('data:')) return;
      const resolved = resolveZipPath(chapterDir, decodeURIComponent(src));
      const dataUrl = imageCache.get(resolved);
      if (dataUrl) {
        if (img.tagName.toLowerCase() === 'image') {
          const replacement = doc.createElement('img');
          replacement.setAttribute('src', dataUrl);
          img.replaceWith(replacement);
        } else {
          img.setAttribute('src', dataUrl);
        }
        if (!coverDataUrl) coverDataUrl = dataUrl;
      }
    });

    const bodyHtml = doc.body?.innerHTML?.trim() || '';
    const textLen = (doc.body?.textContent || '').trim().length;
    if (textLen === 0 && !bodyHtml.includes('<img')) continue;
    const heading = doc.querySelector('h1, h2, h3')?.textContent?.trim();
    pages.push({
      index: idx++,
      title: heading || `챕터 ${idx}`,
      kind: 'html',
      html: bodyHtml,
    });
    onProgress?.(`챕터 ${idx} 변환 완료`);
  }

  if (pages.length === 0) {
    throw new Error('EPUB 본문 페이지를 추출하지 못했습니다.');
  }

  return {
    id: makeId('epub'),
    title,
    author,
    format: 'epub',
    coverDataUrl: coverDataUrl || makeTextCover(title, 'EPUB'),
    pages,
    currentPage: 0,
    bookmarks: [],
    annotations: {},
    updatedAt: Date.now(),
  };
}

async function parsePdf(file: File, onProgress?: (msg: string) => void): Promise<BookItem> {
  onProgress?.('PDF 엔진 초기화 중...');
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: BookPage[] = [];
  const total = doc.numPages;

  for (let i = 1; i <= total; i++) {
    onProgress?.(`PDF 페이지 렌더링 (${i}/${total})`);
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2.2, Math.max(1.1, 1180 / base.width));
    const vp = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, canvas, viewport: vp }).promise;
    pages.push({
      index: i - 1,
      title: `${i}쪽`,
      kind: 'image',
      imageDataUrl: canvas.toDataURL('image/jpeg', 0.88),
    });
  }

  const title = file.name.replace(/\.pdf$/i, '');
  return {
    id: makeId('pdf'),
    title,
    author: 'PDF 문서',
    format: 'pdf',
    coverDataUrl: pages[0]?.imageDataUrl || makeTextCover(title, 'PDF'),
    pages,
    currentPage: 0,
    bookmarks: [],
    annotations: {},
    updatedAt: Date.now(),
  };
}

async function parseCbz(file: File, onProgress?: (msg: string) => void): Promise<BookItem> {
  onProgress?.('만화/화집 압축 해제 중...');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const imageKeys = Object.keys(zip.files)
    .filter((k) => !zip.files[k].dir && !k.startsWith('__MACOSX') && /\.(png|jpe?g|webp|gif)$/i.test(k))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (imageKeys.length === 0) throw new Error('이미지 페이지를 찾지 못했습니다.');

  const pages: BookPage[] = [];
  for (let i = 0; i < imageKeys.length; i++) {
    const k = imageKeys[i];
    onProgress?.(`이미지 불러오는 중 (${i + 1}/${imageKeys.length})`);
    const b64 = await zip.files[k].async('base64');
    pages.push({
      index: i,
      title: `${i + 1}쪽`,
      kind: 'image',
      imageDataUrl: `data:${mimeFromExt(k)};base64,${b64}`,
    });
  }

  const title = file.name.replace(/\.(cbz|zip)$/i, '');
  return {
    id: makeId('cbz'),
    title,
    author: '컬러 만화 · 화집',
    format: 'cbz',
    coverDataUrl: pages[0].imageDataUrl || makeTextCover(title, 'CBZ'),
    pages,
    currentPage: 0,
    bookmarks: [],
    annotations: {},
    updatedAt: Date.now(),
  };
}

async function parseImages(files: File[]): Promise<BookItem> {
  const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const pages: BookPage[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const f = sorted[i];
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(f);
    });
    pages.push({
      index: i,
      title: f.name,
      kind: 'image',
      imageDataUrl: dataUrl,
    });
  }
  const title = sorted.length === 1 ? sorted[0].name.replace(/\.[^.]+$/, '') : `${sorted[0].name} 외 ${sorted.length - 1}장`;
  return {
    id: makeId('img'),
    title,
    author: '이미지 북',
    format: 'cbz',
    coverDataUrl: pages[0]?.imageDataUrl || makeTextCover(title, 'IMG'),
    pages,
    currentPage: 0,
    bookmarks: [],
    annotations: {},
    updatedAt: Date.now(),
  };
}

async function parseTextOrMarkdown(file: File): Promise<BookItem> {
  const raw = await file.text();
  const paragraphs = raw.split(/\r?\n\r?\n/).filter((p) => p.trim().length > 0);
  const pages: BookPage[] = [];
  const perPage = 8;
  for (let i = 0; i < paragraphs.length; i += perPage) {
    const chunk = paragraphs.slice(i, i + perPage);
    const html = chunk
      .map((p) => {
        const trimmed = p.trim();
        if (trimmed.startsWith('# ')) return `<h1>${escapeHtml(trimmed.slice(2))}</h1>`;
        if (trimmed.startsWith('## ')) return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
        return `<p>${escapeHtml(trimmed).replace(/\r?\n/g, '<br/>')}</p>`;
      })
      .join('');
    pages.push({
      index: pages.length,
      title: `${pages.length + 1}쪽`,
      kind: 'html',
      html,
    });
  }
  if (pages.length === 0) {
    pages.push({ index: 0, title: '1쪽', kind: 'html', html: `<p>${escapeHtml(raw)}</p>` });
  }
  const title = file.name.replace(/\.(txt|md|markdown)$/i, '');
  return {
    id: makeId('txt'),
    title,
    author: '텍스트 문서',
    format: 'txt',
    coverDataUrl: makeTextCover(title, 'TEXT'),
    pages,
    currentPage: 0,
    bookmarks: [],
    annotations: {},
    updatedAt: Date.now(),
  };
}

export async function importFilesToBook(
  files: FileList | File[],
  onProgress?: (msg: string) => void,
): Promise<BookItem> {
  const arr = Array.from(files);
  if (arr.length === 0) throw new Error('선택된 파일이 없습니다.');
  if (arr.length > 1 && arr.every((f) => /\.(png|jpe?g|webp|gif)$/i.test(f.name))) {
    return parseImages(arr);
  }
  const f = arr[0];
  const low = f.name.toLowerCase();
  if (low.endsWith('.epub')) return parseEpub(f, onProgress);
  if (low.endsWith('.pdf')) return parsePdf(f, onProgress);
  if (low.endsWith('.cbz') || low.endsWith('.zip')) return parseCbz(f, onProgress);
  if (/\.(png|jpe?g|webp|gif)$/i.test(low)) return parseImages([f]);
  return parseTextOrMarkdown(f);
}
