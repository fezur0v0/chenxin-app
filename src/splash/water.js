import { createSurface } from './surface.js';
import { createGesture } from './gesture.js';

const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = position * .5 + .5;
  gl_Position = vec4(position, 0., 1.);
}`;

const fragmentSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 uv;
uniform vec2 size;
uniform vec3 color;
uniform sampler2D wallpaper;
uniform vec2 imageSize;
uniform float hasImage;
uniform sampler2D surface;
uniform vec2 surfaceStep;
uniform float time;

float heightAt(vec2 p) {
  return texture2D(surface, p).r - 128. / 255.;
}

void main() {
  vec2 p = vec2(uv.x, 1. - uv.y);
  vec2 gradient = vec2(
    heightAt(p + vec2(surfaceStep.x, 0.)) - heightAt(p - vec2(surfaceStep.x, 0.)),
    heightAt(p + vec2(0., surfaceStep.y)) - heightAt(p - vec2(0., surfaceStep.y)));
  float cover = max(size.x / imageSize.x, size.y / imageSize.y);
  vec2 crop = size / (imageSize * cover);
  vec2 samplePoint = clamp((uv - .5) * crop + .5 + vec2(gradient.x, -gradient.y) * .42, .002, .998);
  vec4 photo = texture2D(wallpaper, samplePoint);
  vec3 water = mix(color, photo.rgb, hasImage * photo.a);
  float illumination = (gradient.x + gradient.y) * 2.4;
  water += illumination * vec3(1., .98, .92);
  water += max(0., illumination - .045) * 5.5 * vec3(1., 1., .96);
  float band = sin(dot(p, vec2(1.3, 1.)) * 2.6 - time * .2);
  water += vec3(smoothstep(.78, 1., band) * .065);
  vec2 sun = vec2(.5 + .22 * cos(time * .07), .36 + .18 * sin(time * .09));
  float distanceToSun = length((p - sun) * vec2(1., 1.35));
  water += vec3((1. - smoothstep(0., .55, distanceToSun)) * .055);
  gl_FragColor = vec4(water, 1.);
}`;

export function createWater(host, { wallpaper = '', entry } = {}) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return null;
  let program, buffer, texture, surfaceTexture, field, image, frame, render, observer;
  let stopped = false, lastFrame = 0, nextBreath = 0;
  const startedAt = performance.now();
  const shaders = [];
  const destroy = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    for (const [event, handler] of pointerEvents) host.removeEventListener(event, handler);
    for (const id of pointers.keys()) { if (host.hasPointerCapture(id)) host.releasePointerCapture(id); }
    pointers.clear();
    entry?.removeEventListener('focus', paintBackdrop);
    entry?.removeEventListener('blur', paintBackdrop);
    canvas.removeEventListener('webglcontextlost', lost);
    if (image) { image.onload = null; image.onerror = null; }
    if (texture) gl.deleteTexture(texture);
    if (surfaceTexture) gl.deleteTexture(surfaceTexture);
    field = null;
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
    canvas.remove();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
  let uniforms, loadedImage;
  const pointers = new Map();
  const wake = () => {
    if (!frame && render && !stopped) {
      lastFrame = performance.now();
      frame = requestAnimationFrame(render);
    }
  };
  const point = event => {
    const rect = host.getBoundingClientRect();
    const clamp = value => Math.max(0, Math.min(1, value));
    return {
      x: clamp((event.clientX - rect.left) / Math.max(1, rect.width)),
      y: clamp((event.clientY - rect.top) / Math.max(1, rect.height)),
    };
  };
  const down = event => {
    if (!field || event.target.closest('button, a') ||
        (event.pointerType === 'mouse' && event.button !== 0) || host.classList.contains('is-leaving')) return;
    host.setPointerCapture(event.pointerId);
    const position = point(event);
    const rect = host.getBoundingClientRect();
    pointers.set(event.pointerId, createGesture(field, position, rect.width, rect.height));
    wake();
  };
  const move = event => {
    if (!field || host.classList.contains('is-leaving')) return;
    let gesture = pointers.get(event.pointerId);
    if (!gesture && event.pointerType === 'mouse' && event.buttons === 0) {
      const rect = host.getBoundingClientRect();
      gesture = createGesture(field, point(event), rect.width, rect.height, false);
      pointers.set(event.pointerId, gesture);
    }
    gesture?.move(point(event));
    wake();
  };
  const up = event => {
    if (event.type === 'pointerup') move(event);
    pointers.delete(event.pointerId);
    if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
  };
  const pointerEvents = [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', up], ['lostpointercapture', up], ['pointerleave', event => { if (!host.hasPointerCapture(event.pointerId)) pointers.delete(event.pointerId); }]];
  // Render the backdrop + native entrance into one texture beneath the water.
  // The DOM button remains the real hit target and accessibility surface.
  const paintBackdrop = () => {
    if (stopped || !uniforms || !texture) return;
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const backdrop = document.createElement('canvas');
    backdrop.width = canvas.width; backdrop.height = canvas.height;
    const ctx = backdrop.getContext('2d');
    ctx.scale(canvas.width / rect.width, canvas.height / rect.height);
    ctx.fillStyle = getComputedStyle(host).getPropertyValue('--splash-color').trim();
    ctx.fillRect(0, 0, rect.width, rect.height);
    if (loadedImage) {
      const scale = Math.max(rect.width / loadedImage.naturalWidth, rect.height / loadedImage.naturalHeight);
      const width = loadedImage.naturalWidth * scale, height = loadedImage.naturalHeight * scale;
      ctx.drawImage(loadedImage, (rect.width - width) / 2, (rect.height - height) / 2, width, height);
    }
    if (entry) {
      const box = entry.getBoundingClientRect(), style = getComputedStyle(entry);
      const x = box.left - rect.left, y = box.top - rect.top;
      ctx.beginPath(); ctx.roundRect(x + .5, y + .5, box.width - 1, box.height - 1, 24);
      ctx.fillStyle = style.backgroundColor; ctx.fill();
      ctx.strokeStyle = style.borderTopColor; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = style.color; ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(entry.textContent, x + box.width / 2, y + box.height / 2);
      if (entry.matches(':focus-visible')) {
        ctx.beginPath(); ctx.roundRect(x - 5, y - 5, box.width + 10, box.height + 10, 29);
        ctx.strokeStyle = style.outlineColor; ctx.lineWidth = 2; ctx.stroke();
      }
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, backdrop);
    gl.uniform2f(uniforms.imageSize, backdrop.width, backdrop.height);
    gl.uniform1f(uniforms.hasImage, 1);
    wake();
  };
  const lost = event => { event.preventDefault(); destroy(); };
  try {
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Water shader unavailable');
      return shader;
    };
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Water renderer unavailable');
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    uniforms = Object.fromEntries(['size', 'color', 'wallpaper', 'imageSize', 'hasImage', 'surface', 'surfaceStep', 'time'].map(name => [name, gl.getUniformLocation(program, name)]));
    const hex = getComputedStyle(host).getPropertyValue('--splash-color').trim();
    const color = /^#[a-f\d]{6}$/i.test(hex) ? hex.slice(1).match(/../g).map(part => parseInt(part, 16) / 255) : [.91, .93, .94];
    gl.uniform3fv(uniforms.color, color);
    texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.uniform1i(uniforms.wallpaper, 0);
    gl.uniform2f(uniforms.imageSize, 1, 1);
    surfaceTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, surfaceTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(uniforms.surface, 1);
    // Match the app's local image policy; don't introduce external image requests.
    if (/^data:image\/(?:jpeg|png|webp);base64,[a-z\d+/=]+$/i.test(wallpaper)) {
      image = new Image();
      image.onload = () => {
        if (stopped || !host.isConnected) return;
        try {
          loadedImage = image;
          paintBackdrop();
          canvas.style.visibility = '';
        } catch { destroy(); }
      };
      // While decoding, the CSS wallpaper is already visible underneath.
      canvas.style.visibility = 'hidden';
      image.onerror = () => { if (!stopped) canvas.style.visibility = ''; };
      image.src = wallpaper;
    }
    const resize = () => {
      const rect = host.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(devicePixelRatio || 1, 1.5, Math.min(1600, gl.getParameter(gl.MAX_TEXTURE_SIZE)) / Math.max(rect.width, rect.height));
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.size, canvas.width, canvas.height);
      const resized = createSurface(rect.width, rect.height);
      if (!field || field.columns !== resized.columns || field.rows !== resized.rows) {
        field = resized;
        pointers.clear();
        gl.uniform2f(uniforms.surfaceStep, 1 / field.columns, 1 / field.rows);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, surfaceTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, field.columns, field.rows, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, field.heights());
      }
      paintBackdrop();
    };
    host.append(canvas);
    resize();
    observer = new ResizeObserver(resize);
    observer.observe(host);
    for (const [event, handler] of pointerEvents) host.addEventListener(event, handler, { passive: true });
    entry?.addEventListener('focus', paintBackdrop);
    entry?.addEventListener('blur', paintBackdrop);
    canvas.addEventListener('webglcontextlost', lost);
    render = now => {
      frame = 0;
      if (stopped) return;
      if (!host.isConnected || document.hidden) { destroy(); return; }
      if (!field) return;
      const elapsed = (now - lastFrame) / 1000;
      nextBreath -= elapsed;
      if (nextBreath <= 0) {
        field.breathe((2 + Math.random() * (field.columns - 4)) / field.columns,
          (2 + Math.random() * (field.rows - 4)) / field.rows);
        nextBreath = .4 + Math.random() * 1.3;
      }
      field.advance(elapsed);
      lastFrame = now;
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, surfaceTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, field.columns, field.rows, gl.LUMINANCE, gl.UNSIGNED_BYTE, field.heights());
      gl.uniform1f(uniforms.time, (now - startedAt) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      frame = requestAnimationFrame(render);
    };
    wake();
    return { destroy };
  } catch {
    destroy();
    return null;
  }
}
