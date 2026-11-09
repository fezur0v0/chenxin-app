// Independently authored radial wave shader. No remote scripts, images or libraries.
const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = position * .5 + .5;
  gl_Position = vec4(position, 0., 1.);
}`;

const fragmentSource = `
precision mediump float;
varying vec2 uv;
uniform float time;
uniform vec2 size;
uniform vec3 color;
uniform sampler2D wallpaper;
uniform vec2 imageSize;
uniform float hasImage;
uniform vec3 touchDrop;

// Finite wave packets: a soft leading crest and fading trailing ripples.
vec2 wave(vec2 point, vec2 origin, float age, float strength) {
  if (age <= 0.) return vec2(0.);
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
  vec2 slope = wave(point, vec2(.36, .59) * aspect, time, .18);
  slope += wave(point, vec2(.70, .36) * aspect, time - .42, .13);
  slope += wave(point, vec2(.57, .80) * aspect, time - .88, .085);
  slope += wave(point, touchDrop.xy * aspect, time - touchDrop.z, .20);
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

export function createWater(host, { wallpaper = '' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' });
  if (!gl) return null;
  let program, buffer, texture, image, frame, observer, stopped = false;
  const shaders = [];
  const destroy = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    host.removeEventListener('pointerdown', touch);
    canvas.removeEventListener('webglcontextlost', lost);
    if (image) { image.onload = null; image.onerror = null; }
    if (texture) gl.deleteTexture(texture);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach(shader => gl.deleteShader(shader));
    canvas.remove();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
  let started = performance.now(), touchDrop = [.5, .5, 10000];
  const touch = event => {
    const rect = canvas.getBoundingClientRect();
    touchDrop = [(event.clientX - rect.left) / rect.width, 1 - (event.clientY - rect.top) / rect.height, (performance.now() - started) / 1000];
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
    const uniforms = Object.fromEntries(['time', 'size', 'color', 'wallpaper', 'imageSize', 'hasImage', 'touchDrop'].map(name => [name, gl.getUniformLocation(program, name)]));
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
          const limit = Math.min(2048, gl.getParameter(gl.MAX_TEXTURE_SIZE));
          const scale = Math.min(1, limit / Math.max(image.naturalWidth, image.naturalHeight));
          const thumbnail = document.createElement('canvas');
          thumbnail.width = Math.max(1, Math.round(image.naturalWidth * scale));
          thumbnail.height = Math.max(1, Math.round(image.naturalHeight * scale));
          thumbnail.getContext('2d').drawImage(image, 0, 0, thumbnail.width, thumbnail.height);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, thumbnail);
          gl.uniform2f(uniforms.imageSize, thumbnail.width, thumbnail.height);
          gl.uniform1f(uniforms.hasImage, 1);
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
      const dpr = Math.min(devicePixelRatio || 1, 1.5, 1600 / Math.max(rect.width, rect.height));
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.size, canvas.width, canvas.height);
    };
    host.append(canvas);
    resize();
    observer = new ResizeObserver(resize);
    observer.observe(host);
    host.addEventListener('pointerdown', touch, { passive: true });
    canvas.addEventListener('webglcontextlost', lost);
    started = performance.now();
    const render = now => {
      if (stopped) return;
      if (!host.isConnected || document.hidden) { destroy(); return; }
      gl.uniform1f(uniforms.time, (now - started) / 1000);
      gl.uniform3fv(uniforms.touchDrop, touchDrop);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return { destroy };
  } catch {
    destroy();
    return null;
  }
}
