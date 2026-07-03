// EditRenderer — WebGL2 pipeline for the EditPage preview canvas.
//
// Why this exists:
// The original 2D-canvas path downscaled to 1280-edge and applied
// exposure → WB → contrast → saturation → LUT in five sequential
// Uint8 passes. Every pass quantized to 0..255, accumulating banding
// in smooth tonal regions, and the resolution cap visibly softened
// fine detail (foliage, hair, sensor noise patterns).
//
// This renderer keeps the source at native resolution (capped only
// at 4096 to stay safe across GPUs), uploads it once, and runs the
// full edit chain in a single fragment-shader pass at highp float
// precision. Only the final write to the default framebuffer is 8-bit
// — which is unavoidable for display anyway. There's no cumulative
// quantization between operations.
//
// The public API is small: construct with a canvas, call setImage()
// when the source loads, setLUT() when the tone curve changes, and
// render() on every slider/curve tick. The class detects WebGL2
// availability at init; if it fails, isSupported() returns false and
// the caller is expected to fall back to its own 2D path.

const VERT_SRC = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  // Map [-1,1] clip space to [0,1] UV, flipping Y so the rendered
  // canvas matches the orientation of the source image.
  v_uv = vec2(a_position.x * 0.5 + 0.5, 1.0 - (a_position.y * 0.5 + 0.5));
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAG_SRC = `#version 300 es
precision highp float;

uniform sampler2D u_image;
uniform sampler2D u_lut;        // 256x1 R8 LUT, indexed by channel value
uniform float u_exposure;       // EV stops
uniform float u_contrast;       // 1.0 == identity
uniform float u_saturation;     // 1.0 == identity
uniform float u_whiteBalance;   // -1..+1, warm positive

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec3 c = texture(u_image, v_uv).rgb;

  // 1. Exposure (2^EV)
  c *= exp2(u_exposure);

  // 2. White balance — symmetric R/B channel scale
  c.r *= 1.0 + u_whiteBalance * 0.4;
  c.b *= 1.0 - u_whiteBalance * 0.4;

  // 3. Contrast around 0.5 midpoint
  c = (c - 0.5) * u_contrast + 0.5;

  // 4. Saturation via Rec.601 luma blend
  float luma = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(luma), c, u_saturation);

  // 5. Clamp before LUT sampling — LUT is defined over [0,1].
  c = clamp(c, 0.0, 1.0);

  // 6. Tone-curve LUT — per-channel lookup
  c.r = texture(u_lut, vec2(c.r, 0.5)).r;
  c.g = texture(u_lut, vec2(c.g, 0.5)).r;
  c.b = texture(u_lut, vec2(c.b, 0.5)).r;

  fragColor = vec4(c, 1.0);
}`;

function compileShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("Shader compile failed: " + log);
  }
  return sh;
}

function linkProgram(gl, vsSrc, fsSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error("Program link failed: " + log);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return prog;
}

export class EditRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.supported = false;
    this.imgWidth = 0;
    this.imgHeight = 0;
    this.maxEdge = 4096; // Cap source dimensions so VRAM stays sane.

    try {
      const gl = canvas.getContext("webgl2", {
        // preserveDrawingBuffer enables drawImage(canvas, ...) on a 2D
        // canvas later — the histogram + region-stat readback path
        // relies on this.
        preserveDrawingBuffer: true,
        premultipliedAlpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        alpha: false,
      });
      if (!gl) throw new Error("WebGL2 unavailable");
      this.gl = gl;

      this.program = linkProgram(gl, VERT_SRC, FRAG_SRC);

      // Fullscreen quad
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          -1, -1, 1, -1, -1, 1,
          -1,  1, 1, -1, 1,  1,
        ]),
        gl.STATIC_DRAW
      );
      const aPos = gl.getAttribLocation(this.program, "a_position");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);

      this.locs = {
        image: gl.getUniformLocation(this.program, "u_image"),
        lut: gl.getUniformLocation(this.program, "u_lut"),
        exposure: gl.getUniformLocation(this.program, "u_exposure"),
        contrast: gl.getUniformLocation(this.program, "u_contrast"),
        saturation: gl.getUniformLocation(this.program, "u_saturation"),
        whiteBalance: gl.getUniformLocation(this.program, "u_whiteBalance"),
      };

      // Image texture — filled lazily by setImage()
      this.imgTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.imgTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // LUT texture — 256x1 single-channel, seeded with identity
      this.lutTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const identity = new Uint8Array(256);
      for (let i = 0; i < 256; i++) identity[i] = i;
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.R8, 256, 1, 0, gl.RED, gl.UNSIGNED_BYTE, identity
      );

      this.supported = true;
    } catch (e) {
      // The caller is responsible for falling back to a 2D pipeline.
      // eslint-disable-next-line no-console
      console.warn("EditRenderer: WebGL2 init failed, falling back:", e);
      this.supported = false;
    }
  }

  isSupported() {
    return this.supported;
  }

  /** Upload the source image to the GPU and size the canvas to match. */
  setImage(img) {
    if (!this.supported || !img) return;
    const gl = this.gl;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return;

    // Cap to maxEdge to stay safe on lower-end GPUs. Downscale via a
    // 2D canvas first when needed — texImage2D with HTMLImageElement
    // doesn't accept a target size, only the source.
    const scale = Math.min(1, this.maxEdge / w, this.maxEdge / h);
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.bindTexture(gl.TEXTURE_2D, this.imgTex);
    if (scale < 1) {
      const tmp = document.createElement("canvas");
      tmp.width = tw;
      tmp.height = th;
      tmp.getContext("2d").drawImage(img, 0, 0, tw, th);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tmp);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    }

    this.imgWidth = tw;
    this.imgHeight = th;
    if (this.canvas.width !== tw) this.canvas.width = tw;
    if (this.canvas.height !== th) this.canvas.height = th;
    gl.viewport(0, 0, tw, th);
  }

  /** Upload a 256-entry Uint8 LUT (R = remapped intensity). */
  setLUT(lutUint8) {
    if (!this.supported) return;
    const gl = this.gl;
    let data = lutUint8;
    if (!(data instanceof Uint8Array) || data.length !== 256) {
      // Defensive normalization — if the caller hands us something
      // unexpected, fall back to identity.
      data = new Uint8Array(256);
      for (let i = 0; i < 256; i++) data[i] = i;
      if (lutUint8 && typeof lutUint8.length === "number") {
        const n = Math.min(256, lutUint8.length);
        for (let i = 0; i < n; i++) {
          const v = Number(lutUint8[i]);
          if (Number.isFinite(v)) data[i] = Math.max(0, Math.min(255, v | 0));
        }
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.R8, 256, 1, 0, gl.RED, gl.UNSIGNED_BYTE, data
    );
  }

  /** Render one frame with the supplied UI-space slider values. */
  render({
    exposure = 0,
    contrast = 100,
    saturation = 100,
    whiteBalance = 0,
  } = {}) {
    if (!this.supported || !this.imgWidth) return false;
    const gl = this.gl;
    gl.viewport(0, 0, this.imgWidth, this.imgHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imgTex);
    gl.uniform1i(this.locs.image, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.lutTex);
    gl.uniform1i(this.locs.lut, 1);

    gl.uniform1f(this.locs.exposure, Number(exposure) || 0);
    gl.uniform1f(this.locs.contrast, (Number(contrast) || 100) / 100);
    gl.uniform1f(this.locs.saturation, (Number(saturation) || 100) / 100);
    gl.uniform1f(this.locs.whiteBalance, (Number(whiteBalance) || 0) / 100);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
    return true;
  }

  destroy() {
    if (!this.gl) return;
    const gl = this.gl;
    if (this.imgTex) gl.deleteTexture(this.imgTex);
    if (this.lutTex) gl.deleteTexture(this.lutTex);
    if (this.program) gl.deleteProgram(this.program);
    this.gl = null;
    this.supported = false;
  }
}
