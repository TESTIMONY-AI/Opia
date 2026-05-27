import * as THREE from 'three';

/** Renders a WebGLRenderTarget texture into a display canvas. */
export class MonitorBlitter {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private material = new THREE.MeshBasicMaterial({ toneMapped: false });
  private mesh: THREE.Mesh;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    });
    this.renderer.setPixelRatio(1);
    const geo = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.scene.add(this.mesh);
  }

  draw(texture: THREE.Texture, width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.material.map = texture;
    this.material.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.material.dispose();
    this.mesh.geometry.dispose();
    this.renderer.dispose();
  }
}
