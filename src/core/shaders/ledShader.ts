/** GLSL3 — LED wall: quantized cells, readable video, diode grid, soft bloom */
export const ledVertexShader = /* glsl */ `
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const ledFragmentShader = /* glsl */ `
precision highp float;

uniform sampler2D sourceTexture;
uniform vec2 ledResolution;
uniform float diodeSize;
uniform float brightness;
uniform float contrast;
uniform float bloomIntensity;
uniform float panelGap;
uniform float scanlineAmount;
uniform float flipMediaY;
uniform vec2 mediaUvOffset;
uniform vec2 mediaUvScale;
uniform float time;

in vec2 vUv;
out vec4 fragColor;

float diodeMask(vec2 local, float size) {
  float r = size * 0.48;
  float d = length(local);
  return 1.0 - smoothstep(r - 0.03, r + 0.03, d);
}

void main() {
  vec2 mediaUv = vec2(vUv.x, mix(vUv.y, 1.0 - vUv.y, flipMediaY));
  mediaUv = mediaUvOffset + mediaUv * mediaUvScale;

  vec2 cell = floor(mediaUv * ledResolution);
  vec2 quantUv = (cell + 0.5) / ledResolution;

  vec3 source = texture(sourceTexture, quantUv).rgb;
  source = (source - 0.5) * contrast + 0.5;
  source *= brightness;

  vec2 local = fract(mediaUv * ledResolution) - 0.5;
  float gap = panelGap * 0.45;
  if (abs(local.x) > 0.5 - gap || abs(local.y) > 0.5 - gap) {
    fragColor = vec4(0.015, 0.015, 0.02, 1.0);
    return;
  }

  float mask = diodeMask(local, diodeSize);
  mask = max(mask, 0.42);

  vec3 color = source * mask;

  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  color += source * bloomIntensity * smoothstep(0.55, 1.0, luma) * 0.55;

  float clip = max(max(color.r, color.g), color.b);
  color = mix(color, color / (clip + 0.2), smoothstep(0.85, 1.35, clip) * 0.35);

  if (scanlineAmount > 0.001) {
    float scan = 1.0 - scanlineAmount * 0.12 * (1.0 - cos(mediaUv.y * 320.0 + time * 3.0));
    color *= scan;
  }

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
