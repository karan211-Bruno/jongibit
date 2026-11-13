import React, { useState } from 'react';
import type { DisplayTuning, PaperMode } from '../types';
import { applyPaperMatrixToCanvas, MODE_INFO } from '../lib/xpaper';
import { saveAndShareFile } from '../lib/native';

interface ColorStudioModalProps {
  tuning: DisplayTuning;
  onClose: () => void;
}

export const ColorStudioModal: React.FC<ColorStudioModalProps> = ({ tuning, onClose }) => {
  const [srcUrl, setSrcUrl] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<PaperMode>(tuning.mode);
  const [convertedUrl, setConvertedUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('paper-image');

  const renderPreview = (imgUrl: string, mode: PaperMode) => {
    const img = new Image();
    img.src = imgUrl;
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const out = applyPaperMatrixToCanvas(c, mode, tuning.strength, tuning.warmth);
      setConvertedUrl(out.toDataURL('image/png'));
    };
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name.replace(/\.[^.]+$/, ''));
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setSrcUrl(url);
      renderPreview(url, previewMode);
    };
    reader.readAsDataURL(file);
  };

  const switchMode = (m: PaperMode) => {
    setPreviewMode(m);
    if (srcUrl) renderPreview(srcUrl, m);
  };

  const handleDownload = async () => {
    if (!convertedUrl) return;
    await saveAndShareFile(`${fileName}-${previewMode}.png`, convertedUrl, 'image/png');
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-label="컬러 이북 이미지 변환 스튜디오">
      <div className="modal-card wide">
        <div className="modal-head">
          <div>
            <h2>컬러 이북 색감 변환 스튜디오</h2>
            <p>만화·일러스트·자료 사진을 불러와 X-Paper 3모드 색감으로 즉시 변환하고 PNG로 저장합니다.</p>
          </div>
          <button type="button" className="close-x" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="studio-controls">
          <label className="upload-btn">
            이미지 파일 열기 (PNG · JPG · WEBP)
            <input type="file" accept="image/*" onChange={handleFile} hidden />
          </label>
          <div className="studio-mode-pills">
            {(['nature', 'light-color', 'ink-paper'] as PaperMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={previewMode === m ? 'active' : ''}
                onClick={() => switchMode(m)}
              >
                {MODE_INFO[m].label}
              </button>
            ))}
          </div>
          {convertedUrl && (
            <button type="button" className="primary-btn" onClick={handleDownload}>
              변환된 PNG 저장
            </button>
          )}
        </div>

        {srcUrl ? (
          <div className="studio-compare-grid">
            <div className="studio-pane">
              <span>원본 이미지</span>
              <img src={srcUrl} alt="원본" />
            </div>
            <div className="studio-pane">
              <span>{MODE_INFO[previewMode].label} 변환 결과</span>
              <img src={convertedUrl || srcUrl} alt="변환 결과" />
            </div>
          </div>
        ) : (
          <div className="studio-empty">
            이미지를 선택하면 원본과 <strong>컬러 이북 / 흑백 잉크지</strong> 변환 결과를 나란히 비교할 수 있습니다.
          </div>
        )}
      </div>
    </div>
  );
};
