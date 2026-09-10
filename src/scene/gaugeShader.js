import * as THREE from 'three'

// An instrument face drawn entirely in the fragment shader: two concentric
// arcs, an engraved graduation scale, a redline segment past 90%, and an index
// mark at the current reading. Polar maths means it stays razor sharp at any
// size, and it is one draw call.
//
// Everything is emissive and blended additively — the face is lit, not painted.

export const vert = /* glsl */ `
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`

export const frag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying float vDepth;

  uniform float uV5;       // 5-hour reading, 0..1
  uniform float uVW;       // weekly reading, 0..1 (negative hides the inner arc)
  uniform float uOpacity;
  uniform float uTime;
  uniform float uJitter;   // wobble on the reading, for a dial that is unsettled
  uniform float uTicks;
  uniform float uGlow;
  uniform vec3  uOk;
  uniform vec3  uCaution;
  uniform vec3  uRed;
  uniform vec3  uSteel;
  uniform vec2  uFog;    // near, far — the scene fog, applied by hand

  const float SWEEP = 270.0;
  const float START = 225.0;

  vec3 valColor(float v) {
    vec3 c = uOk;
    c = mix(c, uCaution, step(0.75, v));
    c = mix(c, uRed, step(0.90, v));
    return c;
  }

  float ring(float r, float a, float b, float aa) {
    return smoothstep(a - aa, a + aa, r) - smoothstep(b - aa, b + aa, r);
  }

  float ticks(float t, float sp, float w, float aa) {
    float d = abs(fract(t / sp + 0.5) - 0.5) * sp;
    return 1.0 - smoothstep(w, w + aa, d);
  }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);

    float ang = mod(degrees(atan(p.y, p.x)), 360.0);
    float t = mod(START - ang, 360.0) / SWEEP;

    float ar = max(fwidth(r) * 1.1, 0.0008);
    float at = fwidth(t) * 1.1;
    if (at > 0.15 || at <= 0.0) at = 0.0025;   // guard the seam in the gap

    float on = step(t, 1.0);
    vec3 col = vec3(0.0);

    // ---- graduation scale ----
    float scaleBand = ring(r, 0.876, 0.956, ar);
    float minorBand = ring(r, 0.918, 0.956, ar);
    float major = ticks(t, 0.1,  0.0032, at) * scaleBand;
    float minor = ticks(t, 0.025, 0.0014, at) * minorBand;
    col += uSteel * (major * 0.85 + minor * 0.42) * on * uTicks;

    // ---- 5-hour arc ----
    float v5 = clamp(uV5 + uJitter * (sin(uTime * 3.1) * 0.55 + sin(uTime * 7.9) * 0.32), 0.0, 1.0);
    vec3 c5 = valColor(v5);
    float band5 = ring(r, 0.722, 0.846, ar) * on;

    // unlit track, with the redline segment tinted even when empty
    float redZone = step(0.90, t);
    col += mix(uSteel * 0.20, uRed * 0.24, redZone) * band5;

    float fill5 = band5 * (1.0 - smoothstep(v5 - at, v5 + at, t));
    col += c5 * fill5 * 1.10;

    // index mark, standing slightly proud of the band
    float idx5 = (1.0 - smoothstep(0.0, at * 2.0, abs(t - v5)))
               * ring(r, 0.694, 0.876, ar) * on;
    col += c5 * idx5 * 1.5;

    float glow5 = exp(-pow((r - 0.784) / 0.115, 2.0))
                * (1.0 - smoothstep(v5 - at, v5 + at, t)) * on;
    col += c5 * glow5 * 0.30 * uGlow;

    // ---- weekly arc ----
    if (uVW >= 0.0) {
      float vw = clamp(uVW, 0.0, 1.0);
      vec3 cw = valColor(vw);
      float bandW = ring(r, 0.520, 0.612, ar) * on;
      col += mix(uSteel * 0.18, uRed * 0.20, step(0.90, t)) * bandW;

      float fillW = bandW * (1.0 - smoothstep(vw - at, vw + at, t));
      col += cw * fillW * 0.95;

      float idxW = (1.0 - smoothstep(0.0, at * 2.0, abs(t - vw)))
                 * ring(r, 0.496, 0.638, ar) * on;
      col += cw * idxW * 1.2;

      float glowW = exp(-pow((r - 0.566) / 0.085, 2.0))
                  * (1.0 - smoothstep(vw - at, vw + at, t)) * on;
      col += cw * glowW * 0.22 * uGlow;
    }

    // ---- hub hairline ----
    col += uSteel * ring(r, 0.404, 0.412, ar) * 0.55;

    // Emissive material, so distance has to be faded in explicitly.
    float fog = 1.0 - smoothstep(uFog.x, uFog.y, vDepth);
    gl_FragColor = vec4(col * uOpacity * fog, 1.0);
    #include <colorspace_fragment>
  }
`

export function gaugeUniforms(overrides = {}) {
  return {
    uV5: { value: 0.62 },
    uVW: { value: 0.34 },
    uOpacity: { value: 1 },
    uTime: { value: 0 },
    uJitter: { value: 0 },
    uTicks: { value: 1 },
    uGlow: { value: 1 },
    uOk: { value: new THREE.Color('#3fd08a') },
    uCaution: { value: new THREE.Color('#f0b429') },
    uRed: { value: new THREE.Color('#f0533f') },
    uSteel: { value: new THREE.Color('#6d8a99') },
    uFog: { value: new THREE.Vector2(24, 60) },
    ...overrides,
  }
}
