import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { PaperMode, SystemOverlayState } from '../types';

interface SystemPaperOverlayNative {
  getState(): Promise<SystemOverlayState>;
  requestPermission(): Promise<{ granted: boolean }>;
  applyFilter(options: {
    enabled: boolean;
    mode: PaperMode;
    strength: number;
    warmth: number;
  }): Promise<SystemOverlayState>;
  openColorCorrectionSettings(): Promise<void>;
}

const SystemPaperOverlay = registerPlugin<SystemPaperOverlayNative>('SystemPaperOverlay');

export function isAndroidNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function isIosNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

export async function getSystemOverlayState(): Promise<SystemOverlayState> {
  if (!isAndroidNative()) {
    return {
      supported: false,
      hasPermission: false,
      enabled: false,
      mode: 'light-color',
      strength: 92,
      warmth: 24,
    };
  }
  try {
    return await SystemPaperOverlay.getState();
  } catch {
    return {
      supported: false,
      hasPermission: false,
      enabled: false,
      mode: 'light-color',
      strength: 92,
      warmth: 24,
    };
  }
}

export async function requestOverlayPermission(): Promise<boolean> {
  if (!isAndroidNative()) return false;
  const res = await SystemPaperOverlay.requestPermission();
  return Boolean(res.granted);
}

export async function applySystemOverlayFilter(opts: {
  enabled: boolean;
  mode: PaperMode;
  strength: number;
  warmth: number;
}): Promise<SystemOverlayState> {
  return SystemPaperOverlay.applyFilter(opts);
}

export async function openAndroidColorCorrectionSettings(): Promise<void> {
  if (!isAndroidNative()) return;
  await SystemPaperOverlay.openColorCorrectionSettings();
}

export async function saveAndShareFile(
  filename: string,
  base64Data: string,
  mimeType: string,
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const saved = await Filesystem.writeFile({
      path: filename,
      data: cleanBase64,
      directory: Directory.Cache,
    });
    await Share.share({
      title: filename,
      url: saved.uri,
      dialogTitle: `${filename} 내보내기`,
    });
    return;
  }

  const bin = atob(base64Data.includes(',') ? base64Data.split(',')[1] : base64Data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
