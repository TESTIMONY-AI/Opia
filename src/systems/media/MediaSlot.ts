import * as THREE from 'three';
import { prepareMediaTexture } from './MediaPipeline';

export type MediaKind = 'image' | 'video' | 'placeholder';

function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  return /\.(mp4|mov|webm|m4v|ogg)$/i.test(file.name);
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
}

function guessTypeFromName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (/\.(mp4|mov|webm|m4v|ogg)$/.test(lower)) return 'video/mp4';
  if (/\.png$/.test(lower)) return 'image/png';
  if (/\.jpe?g$/.test(lower)) return 'image/jpeg';
  if (/\.webp$/.test(lower)) return 'image/webp';
  return '';
}

function loadImage(url: string, remote = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (remote) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = url;
  });
}

export interface MediaSlotOptions {
  /** Draw center split line on placeholder (side LED pair). */
  splitPreview?: boolean;
}

export class MediaSlot {
  private _texture: THREE.Texture;
  private videoEl: HTMLVideoElement | null = null;
  private objectUrl: string | null = null;
  private lastFile: File | null = null;
  kind: MediaKind = 'placeholder';
  fileName = '';
  private readonly placeholderLabel: string;
  private readonly splitPreview: boolean;

  constructor(placeholderLabel: string, options: MediaSlotOptions = {}) {
    this.placeholderLabel = placeholderLabel;
    this.splitPreview = options.splitPreview ?? false;
    this._texture = this.createPlaceholderTexture(placeholderLabel);
  }

  get texture(): THREE.Texture {
    return this._texture;
  }

  get isVideo(): boolean {
    return this.kind === 'video';
  }

  async loadFile(file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    this.disposeCurrent();
    this.objectUrl = url;
    this.fileName = file.name;
    this.lastFile = file;

    try {
      if (isVideoFile(file)) {
        await this.loadVideo(url, false);
        return;
      }
      if (isImageFile(file)) {
        await this.loadImage(url);
        return;
      }
      throw new Error(`Unsupported file type: ${file.name}`);
    } catch (err) {
      URL.revokeObjectURL(url);
      this.objectUrl = null;
      this.lastFile = null;
      throw err;
    }
  }

  async loadFromAsset(asset: {
    fileName: string;
    blob?: Blob;
    sourceUrl?: string;
  }): Promise<void> {
    this.disposeCurrent();
    this.fileName = asset.fileName;

    if (asset.blob) {
      const file = new File([asset.blob], asset.fileName, {
        type: asset.blob.type || 'application/octet-stream',
      });
      await this.loadFile(file);
      return;
    }

    if (!asset.sourceUrl) {
      throw new Error(`No media data for ${asset.fileName}`);
    }

    this.lastFile = null;
    const url = asset.sourceUrl;
    const video = isVideoFile(
      new File([], asset.fileName, {
        type: guessTypeFromName(asset.fileName),
      }),
    );
    const image = isImageFile(
      new File([], asset.fileName, {
        type: guessTypeFromName(asset.fileName),
      }),
    );

    try {
      if (video) {
        await this.loadVideo(url, true);
        return;
      }
      if (image) {
        await this.loadImage(url, true);
        return;
      }
      throw new Error(`Unsupported file type: ${asset.fileName}`);
    } catch (err) {
      this.fileName = '';
      throw err;
    }
  }

  getAsset(): { fileName: string; blob: Blob } | null {
    if (!this.lastFile) return null;
    return { fileName: this.fileName, blob: this.lastFile };
  }

  resetToPlaceholder(): void {
    this.disposeCurrent();
    this.lastFile = null;
    this.fileName = '';
    this.kind = 'placeholder';
    const prev = this._texture;
    this._texture = this.createPlaceholderTexture(this.placeholderLabel);
    prev.dispose();
  }

  update(): void {
    if (this._texture instanceof THREE.VideoTexture) {
      this._texture.needsUpdate = true;
    }
  }

  dispose(): void {
    this.disposeCurrent();
    this._texture.dispose();
  }

  private async loadVideo(url: string, remote: boolean): Promise<void> {
    const video = document.createElement('video');
    if (remote) {
      video.crossOrigin = 'anonymous';
    }
    video.src = url;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error('Video failed to load'));
    });

    try {
      await video.play();
    } catch {
      if (video.videoWidth < 1) {
        throw new Error('Video could not play — try another file or browser');
      }
    }

    const vt = new THREE.VideoTexture(video);
    prepareMediaTexture(vt);

    const prev = this._texture;
    this._texture = vt;
    this.videoEl = video;
    this.kind = 'video';
    prev.dispose();
  }

  private async loadImage(url: string, remote = false): Promise<void> {
    const img = await loadImage(url, remote);
    const tex = new THREE.Texture(img);
    tex.needsUpdate = true;
    prepareMediaTexture(tex);

    const prev = this._texture;
    this._texture = tex;
    this.kind = 'image';
    prev.dispose();
  }

  private createPlaceholderTexture(label: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
    grad.addColorStop(0, '#1a2838');
    grad.addColorStop(1, '#121820');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1920, 1080);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.85)';
    ctx.font = 'bold 72px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 960, 500);
    ctx.font = '36px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Upload image or video', 960, 580);

    if (this.splitPreview) {
      const inner = 1.76;
      const total = 1 + inner + inner + 1;
      const cuts = [
        0,
        1920 * (1 / total),
        1920 * ((1 + inner) / total),
        1920 * ((1 + inner + inner) / total),
        1920,
      ];
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 10]);
      for (let i = 1; i < cuts.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(cuts[i], 100);
        ctx.lineTo(cuts[i], 980);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.font = '22px system-ui';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      const labels = ['1×5 L', '2×5 L', '2×5 R', '1×5 R'];
      for (let i = 0; i < labels.length; i++) {
        const cx = (cuts[i] + cuts[i + 1]) * 0.5;
        ctx.fillText(labels[i], cx, 660);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    prepareMediaTexture(tex);
    return tex;
  }

  private disposeCurrent(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.removeAttribute('src');
      this.videoEl.load();
      this.videoEl = null;
    }
  }
}
