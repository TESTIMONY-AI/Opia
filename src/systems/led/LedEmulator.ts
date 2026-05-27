import * as THREE from 'three';
import { prepareMediaTexture } from '../media/MediaPipeline';
import { ledFragmentShader, ledVertexShader } from '../../core/shaders/ledShader';
import type { LedSettings } from '../../types';
import { MEDIA_UV_FULL, type MediaUvCrop } from './mediaUvCrop';

export function createLedMaterial(
  sourceTexture: THREE.Texture,
  settings: LedSettings,
  crop: MediaUvCrop = MEDIA_UV_FULL,
): THREE.ShaderMaterial {
  prepareMediaTexture(sourceTexture);

  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      sourceTexture: { value: sourceTexture },
      ledResolution: {
        value: new THREE.Vector2(settings.ledCols, settings.ledRows),
      },
      diodeSize: { value: settings.diodeSize },
      brightness: { value: settings.brightness },
      contrast: { value: settings.contrast },
      bloomIntensity: { value: settings.bloomIntensity },
      panelGap: { value: settings.panelGap },
      scanlineAmount: { value: settings.scanlineAmount },
      flipMediaY: { value: settings.flipMediaY },
      mediaUvOffset: { value: crop.offset.clone() },
      mediaUvScale: { value: crop.scale.clone() },
      time: { value: 0 },
    },
    vertexShader: ledVertexShader,
    fragmentShader: ledFragmentShader,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

export function updateLedMaterial(
  material: THREE.ShaderMaterial,
  sourceTexture: THREE.Texture,
  settings: LedSettings,
  time: number,
  crop: MediaUvCrop = MEDIA_UV_FULL,
): void {
  prepareMediaTexture(sourceTexture);
  material.uniforms.sourceTexture.value = sourceTexture;
  material.uniforms.ledResolution.value.set(settings.ledCols, settings.ledRows);
  material.uniforms.diodeSize.value = settings.diodeSize;
  material.uniforms.brightness.value = settings.brightness;
  material.uniforms.contrast.value = settings.contrast;
  material.uniforms.bloomIntensity.value = settings.bloomIntensity;
  material.uniforms.panelGap.value = settings.panelGap;
  material.uniforms.scanlineAmount.value = settings.scanlineAmount;
  material.uniforms.flipMediaY.value = settings.flipMediaY;
  material.uniforms.mediaUvOffset.value.copy(crop.offset);
  material.uniforms.mediaUvScale.value.copy(crop.scale);
  material.uniforms.time.value = time;
}
