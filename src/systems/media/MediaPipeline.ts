import * as THREE from 'three';

export type MediaKind = 'image' | 'video' | 'placeholder';

function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  return /\.(mp4|mov|webm|m4v|ogg)$/i.test(file.name);
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name);
}

export class MediaPipeline {
  private _texture: THREE.Texture;
  private videoEl: HTMLVideoElement | null = null;
  private objectUrl: string | null = null;
  kind: MediaKind = 'placeholder';
  fileName = '';

  get texture(): THREE.Texture {
    return this._texture;
  }

  get isVideo(): boolean {
    return this.kind === 'video';
  }

  constructor() {
    this._texture = this.createPlaceholderTexture();
  }

  async loadFile(file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    this.disposeCurrent();
    this.objectUrl = url;
    this.fileName = file.name;

    try {
      if (isVideoFile(file)) {
        await this.loadVideo(url);
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
      throw err;
    }
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

  private async loadVideo(url: string): Promise<void> {
    const video = document.createElement('video');
    video.src = url;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    /* Do NOT set crossOrigin on blob URLs — breaks WebGL upload */

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Video failed to load'));
    });

    try {
      await video.play();
    } catch {
      /* Autoplay may need mute; continue if we have dimensions */
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

  private async loadImage(url: string): Promise<void> {
    const img = await loadImage(url);
    const tex = new THREE.Texture(img);
    tex.needsUpdate = true;
    prepareMediaTexture(tex);

    const prev = this._texture;
    this._texture = tex;
    this.kind = 'image';
    prev.dispose();
  }

  private createPlaceholderTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
    grad.addColorStop(0, '#1a3a4a');
    grad.addColorStop(0.5, '#2d1b4e');
    grad.addColorStop(1, '#0d2840');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1920, 1080);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.9)';
    ctx.font = 'bold 96px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Upload media to preview', 960, 520);

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

/** Orientation corrected in LED shader (mediaUv). Keep flipY off to avoid double-flip. */
export function prepareMediaTexture(texture: THREE.Texture): void {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.flipY = false;
  texture.needsUpdate = true;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = url;
  });
}
