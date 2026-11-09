// Independently authored radial wave shader. No remote scripts, images or libraries.
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
uniform float time;
uniform vec2 size;
uniform vec3 color;
uniform sampler2D wallpaper;
uniform vec2 imageSize;
uniform float hasImage;
uniform vec4 drops[16];

// Finite wave packets: a soft leading crest and fading trailing ripples.
vec2 wave(vec2 point, vec2 origin, float age, float strength) {
  if (age <= 0. || age > 4. || strength == 0.) return vec2(0.);
  vec2 delta = point - origin;
  float distance = length(delta);
  float front = distance - age * .29;
  float width = .045 + age * .014;
  float envelope = exp(-pow(front / width, 2.)) * exp(-age * .65);
  float phase = front * 170.;
  float slope = (cos(phase) - sin(phase) * front / (width * width * 85.));
  return delta / max(distance, .001) * slope * envelope * strength
    * smoothstep(0., .12, age) * smoothstep(0., .025, distance);
}
void main() {
  vec2 aspect = size / min(size.x, size.y);
  vec2 point = uv * aspect;
  vec2 slope = vec2(0.);
  for (int i = 0; i < 16; i++) {
    slope += wave(point, drops[i].xy * aspect, time - drops[i].z, drops[i].w);
  }
  vec3 normal = normalize(vec3(-slope, 1.));
  // Cover crop matches the CSS fallback, including portrait/landscape wallpapers.
  float cover = max(size.x / imageSize.x, size.y / imageSize.y);
  vec2 crop = size / (imageSize * cover);
  vec2 refracted = clamp((uv - .5 + slope * .024 / aspect) * crop + .5, .001, .999);
  vec4 photo = texture2D(wallpaper, refracted);
  vec3 base = mix(color, photo.rgb, hasImage * photo.a);
  vec3 light = normalize(vec3(-.45, .65, 1.));
  float diffuse = dot(normal, light) - light.z;
  float glint = pow(max(dot(normal, normalize(light + vec3(0., 0., 1.))), 0.), 42.);
  float flatGlint = pow(normalize(light + vec3(0., 0., 1.)).z, 42.);
  vec3 water = base + vec3(diffuse * .24) + vec3(glint - flatGlint) * .12;
  gl_FragColor = vec4(clamp(water, 0., 1.), 1.);
}`;

export function createWater(host, { wallpaper = '', entry } = {}) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return null;
  let program, buffer, texture, image, frame, render, observer, stopped = false;
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
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
    canvas.remove();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
  let started = performance.now(), cursor = 3, uniforms, loadedImage;
  const drops = new Float32Array(16 * 4);
  drops.set([.36, .59, 0, .18, .70, .36, .42, .13, .57, .80, .88, .085]);
  const pointers = new Map();
  const addDrop = (event, strength) => {
    const rect = canvas.getBoundingClientRect();
    drops.set([Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height)), (performance.now() - started) / 1000, strength], cursor * 4);
    cursor = (cursor + 1) % 16;
    if (!frame && render && !stopped) frame = requestAnimationFrame(render);
  };
  const down = event => {
    if (event.target.closest('button, a') || (event.pointerType === 'mouse' && event.button !== 0) || host.classList.contains('is-leaving')) return;
    host.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, time: performance.now() });
    addDrop(event, .20);
  };
  const move = event => {
    const last = pointers.get(event.pointerId), now = performance.now();
    if (!last || now - last.time < 60 || Math.hypot(event.clientX - last.x, event.clientY - last.y) < 8) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, time: now });
    addDrop(event, .10);
  };
  const up = event => {
    pointers.delete(event.pointerId);
    if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
  };
  const pointerEvents = [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', up], ['lostpointercapture', up]];
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
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, backdrop);
    gl.uniform2f(uniforms.imageSize, backdrop.width, backdrop.height);
    gl.uniform1f(uniforms.hasImage, 1);
    if (!frame && render) frame = requestAnimationFrame(render);
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
    uniforms = Object.fromEntries(['time', 'size', 'color', 'wallpaper', 'imageSize', 'hasImage', 'drops[0]'].map(name => [name, gl.getUniformLocation(program, name)]));
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
      const dpr = Math.min(devicePixelRatio || 1, 1.5, Math.min(1600, gl.getParameter(gl.MAX_TEXTURE_SIZE)) / Math.max(rect.width, rect.height));
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.size, canvas.width, canvas.height);
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
    started = performance.now();
    render = now => {
      frame = 0;
      if (stopped) return;
      if (!host.isConnected || document.hidden) { destroy(); return; }
      // Keep shader time small even during long play sessions on mediump GPUs.
      if (now - started > 30000) {
        started += 30000;
        for (let i = 0; i < 16; i++) { drops[i * 4 + 2] -= 30; if (drops[i * 4 + 2] < -4) drops[i * 4 + 3] = 0; }
      }
      gl.uniform1f(uniforms.time, (now - started) / 1000);
      gl.uniform4fv(uniforms['drops[0]'], drops);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      // Once the water settles, render nothing until input/resize/focus wakes it.
      const age = (now - started) / 1000;
      if (Array.from({ length: 16 }, (_, i) => i).some(i => drops[i * 4 + 3] > 0 && age - drops[i * 4 + 2] < 4)) frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return { destroy };
  } catch {
    destroy();
    return null;
  }
}
