/*
 * Integración "isla" del componente MetallicButton de 21st.dev en los
 * .hero-cta del hero. Puerto a JS plano (sin TypeScript/JSX/Tailwind/
 * shadcn/lucide-react) para poder correr sin build step, usando React +
 * ReactDOM cargados por CDN (ver index.html).
 *
 * Progressive enhancement real: si WebGL2 no está soportado, o React/
 * ReactDOM no llegaron a cargar (CDN bloqueado, sin red, etc.), esta
 * mejora se salta por completo y el sitio queda exactamente como estaba
 * antes de esta integración (degradé CSS + sheen animado + ripple, todo
 * definido en css/styles.css y js/app.js). Nada de lo que ya funcionaba
 * depende de este archivo.
 *
 * El original sin modificar vive en 21st-components/buttons/metallic-button/
 * (carpeta hermana del proyecto) — este archivo es la adaptación para
 * poder mostrarlo en el sitio real.
 */
(function () {
  'use strict';

  // ---- Shaders: copiados tal cual del componente original ----

  var VERTEX_SHADER = [
    '#version 300 es',
    'precision mediump float;',
    '',
    'layout(location = 0) in vec4 a_position;',
    '',
    'uniform vec2 u_resolution;',
    'uniform float u_pixelRatio;',
    'uniform float u_originX;',
    'uniform float u_originY;',
    'uniform float u_worldWidth;',
    'uniform float u_worldHeight;',
    'uniform float u_fit;',
    'uniform float u_scale;',
    'uniform float u_rotation;',
    'uniform float u_offsetX;',
    'uniform float u_offsetY;',
    '',
    'out vec2 v_objectUV;',
    'out vec2 v_responsiveUV;',
    'out vec2 v_responsiveBoxGivenSize;',
    '',
    'vec3 getBoxSize(float boxRatio, vec2 givenBoxSize) {',
    '  vec2 box = vec2(0.);',
    '  box.x = boxRatio * min(givenBoxSize.x / boxRatio, givenBoxSize.y);',
    '  float noFitBoxWidth = box.x;',
    '  if (u_fit == 1.) {',
    '    box.x = boxRatio * min(u_resolution.x / boxRatio, u_resolution.y);',
    '  } else if (u_fit == 2.) {',
    '    box.x = boxRatio * max(u_resolution.x / boxRatio, u_resolution.y);',
    '  }',
    '  box.y = box.x / boxRatio;',
    '  return vec3(box, noFitBoxWidth);',
    '}',
    '',
    'void main() {',
    '  gl_Position = a_position;',
    '',
    '  vec2 uv = gl_Position.xy * .5;',
    '  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);',
    '  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);',
    '  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;',
    '  float r = u_rotation * 3.14159265358979323846 / 180.;',
    '  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));',
    '  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);',
    '',
    '  float fixedRatio = 1.;',
    '  vec2 fixedRatioBoxGivenSize = vec2(',
    '  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,',
    '  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y',
    '  );',
    '',
    '  vec2 objectBoxSize = getBoxSize(fixedRatio, fixedRatioBoxGivenSize).xy;',
    '  vec2 objectWorldScale = u_resolution.xy / objectBoxSize;',
    '',
    '  v_objectUV = uv;',
    '  v_objectUV *= objectWorldScale;',
    '  v_objectUV += boxOrigin * (objectWorldScale - 1.);',
    '  v_objectUV += graphicOffset;',
    '  v_objectUV /= u_scale;',
    '  v_objectUV = graphicRotation * v_objectUV;',
    '',
    '  v_responsiveBoxGivenSize = vec2(',
    '  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,',
    '  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y',
    '  );',
    '  float responsiveRatio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;',
    '  vec2 responsiveBoxSize = getBoxSize(responsiveRatio, v_responsiveBoxGivenSize).xy;',
    '  vec2 responsiveBoxScale = u_resolution.xy / responsiveBoxSize;',
    '',
    '  v_responsiveUV = uv;',
    '  v_responsiveUV *= responsiveBoxScale;',
    '  v_responsiveUV += boxOrigin * (responsiveBoxScale - 1.);',
    '  v_responsiveUV += graphicOffset;',
    '  v_responsiveUV /= u_scale;',
    '  v_responsiveUV.x *= responsiveRatio;',
    '  v_responsiveUV = graphicRotation * v_responsiveUV;',
    '  v_responsiveUV.x /= responsiveRatio;',
    '}'
  ].join('\n');

  var FRAGMENT_SHADER = [
    '#version 300 es',
    'precision mediump float;',
    '',
    'uniform vec2 u_resolution;',
    'uniform float u_time;',
    '',
    'uniform vec4 u_colorBack;',
    'uniform vec4 u_colorTint;',
    '',
    'uniform float u_softness;',
    'uniform float u_repetition;',
    'uniform float u_shiftRed;',
    'uniform float u_shiftBlue;',
    'uniform float u_distortion;',
    'uniform float u_contour;',
    'uniform float u_angle;',
    '',
    'in vec2 v_objectUV;',
    'in vec2 v_responsiveUV;',
    'in vec2 v_responsiveBoxGivenSize;',
    '',
    'out vec4 fragColor;',
    '',
    '#define TWO_PI 6.28318530718',
    '#define PI 3.14159265358979323846',
    '',
    'vec2 rotate(vec2 uv, float th) {',
    '  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;',
    '}',
    '',
    'vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }',
    'float snoise(vec2 v) {',
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439,',
    '    -0.577350269189626, 0.024390243902439);',
    '  vec2 i = floor(v + dot(v, C.yy));',
    '  vec2 x0 = v - i + dot(i, C.xx);',
    '  vec2 i1;',
    '  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
    '  vec4 x12 = x0.xyxy + C.xxzz;',
    '  x12.xy -= i1;',
    '  i = mod(i, 289.0);',
    '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))',
    '    + i.x + vec3(0.0, i1.x, 1.0));',
    '  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),',
    '      dot(x12.zw, x12.zw)), 0.0);',
    '  m = m * m;',
    '  m = m * m;',
    '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
    '  vec3 h = abs(x) - 0.5;',
    '  vec3 ox = floor(x + 0.5);',
    '  vec3 a0 = x - ox;',
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);',
    '  vec3 g;',
    '  g.x = a0.x * x0.x + h.x * x0.y;',
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
    '  return 130.0 * dot(m, g);',
    '}',
    '',
    'float getColorChanges(float c1, float c2, float stripe_p, vec3 w, float blur, float bump, float tint) {',
    '  float ch = mix(c2, c1, smoothstep(.0, 2. * blur, stripe_p));',
    '',
    '  float border = w[0];',
    '  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));',
    '',
    '  border = w[0] + .4 * (1. - bump) * w[1];',
    '  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));',
    '',
    '  border = w[0] + .5 * (1. - bump) * w[1];',
    '  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));',
    '',
    '  border = w[0] + w[1];',
    '  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));',
    '',
    '  float gradient_t = (stripe_p - w[0] - w[1]) / w[2];',
    '  float gradient = mix(c1, c2, smoothstep(0., 1., gradient_t));',
    '  ch = mix(ch, gradient, smoothstep(border, border + .5 * blur, stripe_p));',
    '',
    '  ch = mix(ch, 1. - min(1., (1. - ch) / max(tint, 0.0001)), u_colorTint.a);',
    '  return ch;',
    '}',
    '',
    'void main() {',
    '  const float firstFrameOffset = 2.8;',
    '  float t = .3 * (u_time + firstFrameOffset);',
    '',
    '  vec2 uv = v_objectUV + .5;',
    '  uv.y = 1. - uv.y;',
    '',
    '  float cycleWidth = u_repetition;',
    '  float edge = 0.;',
    '',
    '  vec2 rotatedUV = uv - vec2(.5);',
    '  float angle = (-u_angle + 70.) * PI / 180.;',
    '  float cosA = cos(angle);',
    '  float sinA = sin(angle);',
    '  rotatedUV = vec2(',
    '  rotatedUV.x * cosA - rotatedUV.y * sinA,',
    '  rotatedUV.x * sinA + rotatedUV.y * cosA',
    '  ) + vec2(.5);',
    '',
    '  vec2 shapeUV = uv - .5;',
    '  shapeUV *= .67;',
    '  edge = pow(clamp(3. * length(shapeUV), 0., 1.), 18.);',
    '',
    '  edge = mix(smoothstep(.9 - 2. * fwidth(edge), .9, edge), edge, smoothstep(0.0, 0.4, u_contour));',
    '',
    '  float opacity = 1. - smoothstep(.9 - 2. * fwidth(edge), .9, edge);',
    '  edge = 1.2 * edge;',
    '',
    '  float diagBLtoTR = rotatedUV.x - rotatedUV.y;',
    '  float diagTLtoBR = rotatedUV.x + rotatedUV.y;',
    '',
    '  vec3 color = vec3(0.);',
    '  vec3 color1 = vec3(.98, 0.98, 1.);',
    '  vec3 color2 = vec3(.1, .1, .1 + .1 * smoothstep(.7, 1.3, diagTLtoBR));',
    '',
    '  vec2 grad_uv = uv - .5;',
    '',
    '  float dist = length(grad_uv + vec2(0., .2 * diagBLtoTR));',
    '  grad_uv = rotate(grad_uv, (.25 - .2 * diagBLtoTR) * PI);',
    '  float direction = grad_uv.x;',
    '',
    '  float bump = pow(1.8 * dist, 1.2);',
    '  bump = 1. - bump;',
    '  bump *= pow(uv.y, .3);',
    '',
    '  float thin_strip_1_ratio = .12 / cycleWidth * (1. - .4 * bump);',
    '  float thin_strip_2_ratio = .07 / cycleWidth * (1. + .4 * bump);',
    '  float wide_strip_ratio = (1. - thin_strip_1_ratio - thin_strip_2_ratio);',
    '',
    '  float thin_strip_1_width = cycleWidth * thin_strip_1_ratio;',
    '  float thin_strip_2_width = cycleWidth * thin_strip_2_ratio;',
    '',
    '  float noise = snoise(uv - t);',
    '',
    '  edge += (1. - edge) * u_distortion * noise;',
    '',
    '  direction += diagBLtoTR;',
    '  float contour = 0.;',
    '  direction -= 2. * noise * diagBLtoTR * (smoothstep(0., 1., edge) * (1.0 - smoothstep(0., 1., edge)));',
    '  direction *= mix(1., 1. - edge, smoothstep(.5, 1., u_contour));',
    '  direction -= 1.7 * edge * smoothstep(.5, 1., u_contour);',
    '  direction += .2 * pow(u_contour, 4.) * (1.0 - smoothstep(0., 1., edge));',
    '',
    '  bump *= clamp(pow(uv.y, .1), .3, 1.);',
    '  direction *= (.1 + (1.1 - edge) * bump);',
    '',
    '  direction *= (.4 + .6 * (1.0 - smoothstep(.5, 1., edge)));',
    '  direction += .18 * (smoothstep(.1, .2, uv.y) * (1.0 - smoothstep(.2, .4, uv.y)));',
    '  direction += .03 * (smoothstep(.1, .2, 1. - uv.y) * (1.0 - smoothstep(.2, .4, 1. - uv.y)));',
    '',
    '  direction *= (.5 + .5 * pow(uv.y, 2.));',
    '  direction *= cycleWidth;',
    '  direction -= t;',
    '',
    '  float colorDispersion = (1. - bump);',
    '  colorDispersion = clamp(colorDispersion, 0., 1.);',
    '  float dispersionRed = colorDispersion;',
    '  dispersionRed += .03 * bump * noise;',
    '  dispersionRed += 5. * (smoothstep(-.1, .2, uv.y) * (1.0 - smoothstep(.1, .5, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, 1., bump)));',
    '  dispersionRed -= diagBLtoTR;',
    '',
    '  float dispersionBlue = colorDispersion;',
    '  dispersionBlue *= 1.3;',
    '  dispersionBlue += (smoothstep(0., .4, uv.y) * (1.0 - smoothstep(.1, .8, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, .8, bump)));',
    '  dispersionBlue -= .2 * edge;',
    '',
    '  dispersionRed *= (u_shiftRed / 20.);',
    '  dispersionBlue *= (u_shiftBlue / 20.);',
    '',
    '  float blur = u_softness / 15. + .3 * contour;',
    '',
    '  vec3 w = vec3(thin_strip_1_width, thin_strip_2_width, wide_strip_ratio);',
    '  w[1] -= .02 * smoothstep(.0, 1., edge + bump);',
    '  float stripe_r = fract(direction + dispersionRed);',
    '  float r = getColorChanges(color1.r, color2.r, stripe_r, w, blur + fwidth(stripe_r), bump, u_colorTint.r);',
    '  float stripe_g = fract(direction);',
    '  float g = getColorChanges(color1.g, color2.g, stripe_g, w, blur + fwidth(stripe_g), bump, u_colorTint.g);',
    '  float stripe_b = fract(direction - dispersionBlue);',
    '  float b = getColorChanges(color1.b, color2.b, stripe_b, w, blur + fwidth(stripe_b), bump, u_colorTint.b);',
    '',
    '  color = vec3(r, g, b);',
    '  color *= opacity;',
    '',
    '  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;',
    '  color = color + bgColor * (1. - opacity);',
    '  opacity = opacity + u_colorBack.a * (1. - opacity);',
    '',
    '  color += 1. / 256. * (fract(sin(dot(.014 * gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453123) - .5);',
    '',
    '  fragColor = vec4(color, opacity);',
    '}'
  ].join('\n');

  var DEFAULT_MIN_PIXEL_RATIO = 2;
  var DEFAULT_MAX_PIXEL_COUNT = 1920 * 1080 * 4;

  function parseColor(value) {
    var fallback = [1, 1, 1, 1];
    if (typeof value !== 'string') return fallback;
    var hex = value.trim().replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(function (c) { return c + c; }).join('');
    }
    if (hex.length === 6) hex += 'ff';
    if (hex.length !== 8) return fallback;
    var int = parseInt(hex, 16);
    if (isNaN(int)) return fallback;
    return [
      ((int >> 24) & 255) / 255,
      ((int >> 16) & 255) / 255,
      ((int >> 8) & 255) / 255,
      (int & 255) / 255
    ];
  }

  function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  // ---- Puerto de MetallicShaderMount (idéntico en comportamiento al
  // original, sin tipos de TypeScript) ----
  function MetallicShaderMount(parent, uniforms, speed) {
    this.gl = null;
    this.program = null;
    this.parent = parent;
    this.uniforms = uniforms;
    this.speed = speed;
    this.locations = {};
    this.rafId = null;
    this.lastRenderTime = 0;
    this.currentFrame = 0;
    this.renderScale = 1;
    this.resolutionChanged = true;
    this.resizeObserver = null;
    this.intersectionObserver = null;
    this.isInViewport = true;
    this.disposed = false;

    var self = this;
    this.canvas = document.createElement('canvas');
    parent.appendChild(this.canvas);

    var gl = this.canvas.getContext('webgl2', {
      antialias: true,
      premultipliedAlpha: true,
      alpha: true
    });
    if (!gl) return;

    var vertex = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    var fragment = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertex || !fragment) return;

    var program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }

    this.gl = gl;
    this.program = program;

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    var position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    this.cacheLocations();
    this.setupObservers();
    this.renderFrame = this.renderFrame.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.requestRender = this.requestRender.bind(this);
    this.handleResize();
    this.renderFrame(performance.now());
    if (speed !== 0) this.requestRender();
  }

  MetallicShaderMount.prototype.cacheLocations = function () {
    var gl = this.gl, program = this.program;
    if (!gl || !program) return;
    var names = [
      'u_time', 'u_resolution', 'u_pixelRatio', 'u_colorBack', 'u_colorTint',
      'u_softness', 'u_repetition', 'u_shiftRed', 'u_shiftBlue', 'u_distortion',
      'u_contour', 'u_angle', 'u_originX', 'u_originY', 'u_worldWidth',
      'u_worldHeight', 'u_fit', 'u_scale', 'u_rotation', 'u_offsetX', 'u_offsetY'
    ];
    for (var i = 0; i < names.length; i++) {
      this.locations[names[i]] = gl.getUniformLocation(program, names[i]);
    }
  };

  MetallicShaderMount.prototype.setupObservers = function () {
    var self = this;
    this.resizeObserver = new ResizeObserver(function () { self.handleResize(); });
    this.resizeObserver.observe(this.parent);

    if (typeof IntersectionObserver !== 'undefined') {
      this.intersectionObserver = new IntersectionObserver(function (entries) {
        var entry = entries[0];
        self.isInViewport = entry ? entry.isIntersecting : true;
        if (self.isInViewport && self.speed !== 0) self.requestRender();
      });
      this.intersectionObserver.observe(this.parent);
    }
  };

  MetallicShaderMount.prototype.handleResize = function () {
    var gl = this.gl;
    if (!gl || this.disposed) return;

    var width = this.parent.clientWidth;
    var height = this.parent.clientHeight;
    if (width === 0 || height === 0) return;

    var dpr = Math.max(1, window.devicePixelRatio || 1);
    var targetRenderScale = Math.max(dpr, DEFAULT_MIN_PIXEL_RATIO);
    var targetPixelWidth = Math.round(width) * targetRenderScale;
    var targetPixelHeight = Math.round(height) * targetRenderScale;

    var headroom = Math.sqrt(DEFAULT_MAX_PIXEL_COUNT) / Math.sqrt(targetPixelWidth * targetPixelHeight);
    var clamp = Math.min(1, headroom);
    var newWidth = Math.round(targetPixelWidth * clamp);
    var newHeight = Math.round(targetPixelHeight * clamp);

    if (this.canvas.width === newWidth && this.canvas.height === newHeight) return;

    this.canvas.width = newWidth;
    this.canvas.height = newHeight;
    this.renderScale = newWidth / Math.round(width);
    this.resolutionChanged = true;
    gl.viewport(0, 0, newWidth, newHeight);
    this.renderFrame(performance.now());
  };

  MetallicShaderMount.prototype.pushUniforms = function () {
    var gl = this.gl;
    if (!gl) return;
    var u = this.uniforms;
    gl.uniform4fv(this.locations.u_colorBack || null, parseColor(u.colorBack));
    gl.uniform4fv(this.locations.u_colorTint || null, parseColor(u.colorTint));
    gl.uniform1f(this.locations.u_repetition || null, u.repetition);
    gl.uniform1f(this.locations.u_softness || null, u.softness);
    gl.uniform1f(this.locations.u_angle || null, u.angle);
    gl.uniform1f(this.locations.u_distortion || null, u.distortion);
    gl.uniform1f(this.locations.u_shiftRed || null, u.shiftRed);
    gl.uniform1f(this.locations.u_shiftBlue || null, u.shiftBlue);
    gl.uniform1f(this.locations.u_contour || null, 0);
    gl.uniform1f(this.locations.u_scale || null, u.scale);
    gl.uniform1f(this.locations.u_fit || null, 1);
    gl.uniform1f(this.locations.u_rotation || null, 0);
    gl.uniform1f(this.locations.u_offsetX || null, 0.1);
    gl.uniform1f(this.locations.u_offsetY || null, -0.1);
    gl.uniform1f(this.locations.u_originX || null, 0.5);
    gl.uniform1f(this.locations.u_originY || null, 0.5);
    gl.uniform1f(this.locations.u_worldWidth || null, 0);
    gl.uniform1f(this.locations.u_worldHeight || null, 0);
  };

  MetallicShaderMount.prototype.renderFrame = function (currentTime) {
    var gl = this.gl;
    if (!gl || !this.program || this.disposed) return;

    var dt = currentTime - this.lastRenderTime;
    this.lastRenderTime = currentTime;
    if (this.speed !== 0 && this.isInViewport) {
      this.currentFrame += dt * this.speed;
    }

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);

    gl.uniform1f(this.locations.u_time || null, this.currentFrame * 1e-3);
    if (this.resolutionChanged) {
      gl.uniform2f(this.locations.u_resolution || null, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.locations.u_pixelRatio || null, this.renderScale);
      this.resolutionChanged = false;
    }
    this.pushUniforms();

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (this.speed !== 0 && this.isInViewport) {
      this.requestRender();
    } else {
      this.rafId = null;
    }
  };

  MetallicShaderMount.prototype.requestRender = function () {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(this.renderFrame);
  };

  MetallicShaderMount.prototype.setSpeed = function (speed) {
    this.speed = speed;
    if (speed === 0) {
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.renderFrame(performance.now());
      return;
    }
    if (this.rafId === null) {
      this.lastRenderTime = performance.now();
      this.requestRender();
    }
  };

  MetallicShaderMount.prototype.dispose = function () {
    this.disposed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this.resizeObserver = null;
    if (this.intersectionObserver) this.intersectionObserver.disconnect();
    this.intersectionObserver = null;
    if (this.gl && this.program) this.gl.deleteProgram(this.program);
    this.gl = null;
    this.program = null;
    this.canvas.remove();
  };

  // ---- Uniforms por defecto (mismos valores que el demo original) ----
  var DEFAULT_UNIFORMS = {
    colorBack: '#000000',
    colorTint: '#ffffff',
    repetition: 4,
    softness: 0.5,
    angle: 45,
    scale: 8,
    distortion: 0,
    shiftRed: 0.3,
    shiftBlue: 0.3
  };
  var IDLE_SPEED = 0.6;
  var HOVER_SPEED = 1;
  var CLICK_SPEED = 2.4;

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // ---- Componente React (React.createElement, sin JSX: no hay build
  // step en este proyecto para transformarlo) ----
  var h = window.React ? window.React.createElement : null;

  function MetallicHeroButton(props) {
    var React = window.React;
    var useRef = React.useRef, useEffect = React.useEffect, useState = React.useState;

    var surfaceRef = useRef(null);
    var mountRef = useRef(null);
    var rippleId = useRef(0);
    var reducedMotion = prefersReducedMotion();
    var isHoveredRef = useRef(false);
    var pointerSpeedTimeout = useRef(null);
    var ripplesState = useState([]);
    var ripples = ripplesState[0], setRipples = ripplesState[1];

    useEffect(function () {
      if (!surfaceRef.current) return;
      var initialSpeed = reducedMotion ? 0 : (props.initiallyActive ? IDLE_SPEED : 0);
      var mount = new MetallicShaderMount(surfaceRef.current, DEFAULT_UNIFORMS, initialSpeed);
      mountRef.current = mount;
      if (props.onMount) props.onMount(mount);
      return function () {
        mount.dispose();
        if (props.onUnmount) props.onUnmount(mount);
      };
      // eslint-disable-next-line
    }, []);

    function handleMouseEnter() {
      isHoveredRef.current = true;
      if (!reducedMotion && mountRef.current) mountRef.current.setSpeed(HOVER_SPEED);
    }
    function handleMouseLeave() {
      isHoveredRef.current = false;
      if (!reducedMotion && mountRef.current) mountRef.current.setSpeed(IDLE_SPEED);
    }
    function handlePointerDown(e) {
      if (reducedMotion) return;
      if (mountRef.current) {
        mountRef.current.setSpeed(CLICK_SPEED);
        if (pointerSpeedTimeout.current) clearTimeout(pointerSpeedTimeout.current);
        pointerSpeedTimeout.current = setTimeout(function () {
          if (mountRef.current) mountRef.current.setSpeed(isHoveredRef.current ? HOVER_SPEED : IDLE_SPEED);
        }, 300);
      }
      var rect = e.currentTarget.getBoundingClientRect();
      var ripple = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: rippleId.current++ };
      setRipples(function (prev) { return prev.concat([ripple]); });
      setTimeout(function () {
        setRipples(function (prev) { return prev.filter(function (r) { return r.id !== ripple.id; }); });
      }, 600);
    }

    var rippleNodes = ripples.map(function (r) {
      return h('span', {
        key: r.id,
        className: 'mb-ripple',
        style: { left: r.x + 'px', top: r.y + 'px' }
      });
    });

    return h(
      'span',
      {
        className: 'mb-shell',
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onPointerDown: handlePointerDown
      },
      h('span', { className: 'mb-surface', ref: surfaceRef }),
      h('span', { className: 'mb-face' }),
      h('span', { className: 'mb-label' }, props.label, ' ', h('span', { 'aria-hidden': 'true' }, '→')),
      rippleNodes
    );
  }

  // ---- Bootstrap: sólo se activa si el navegador soporta WebGL2 y
  // React/ReactDOM cargaron. Si algo falta, no se toca nada del sitio. ----
  function supportsWebGL2() {
    try {
      var c = document.createElement('canvas');
      return !!c.getContext('webgl2');
    } catch (e) {
      return false;
    }
  }

  function init() {
    if (!window.React || !window.ReactDOM || !supportsWebGL2()) return;

    var ctas = Array.prototype.slice.call(document.querySelectorAll('.hero-cta'));
    var slides = Array.prototype.slice.call(document.querySelectorAll('.hero-slide'));
    if (ctas.length === 0) return;

    var mounts = []; // { slideIndex, shaderMount }

    ctas.forEach(function (anchor) {
      var slide = anchor.closest('.hero-slide');
      var slideIndex = slide ? slides.indexOf(slide) : -1;
      var isInitiallyActive = slide ? slide.classList.contains('active') : false;

      var label = (anchor.textContent || '').replace('→', '').trim();

      // Limpia el contenido original (texto + <span>→</span>) para que
      // React tome el control de este anchor puntual. El <a> en sí no se
      // toca: sigue siendo el mismo elemento con su href intacto.
      anchor.textContent = '';
      anchor.classList.add('is-metallic-ready');

      var root = ReactDOM.createRoot(anchor);
      root.render(
        h(MetallicHeroButton, {
          label: label,
          initiallyActive: isInitiallyActive,
          onMount: function (shaderMount) {
            mounts.push({ slideIndex: slideIndex, shaderMount: shaderMount });
          }
        })
      );
    });

    // Registro global: app.js llama acá cuando cambia el slide activo del
    // hero, para pausar el shader de los botones que no se ven (ahorra
    // GPU: sólo el botón del slide visible anima).
    window.NuvoraMetallicButtons = {
      setActiveSlide: function (activeIndex) {
        mounts.forEach(function (m) {
          m.shaderMount.setSpeed(m.slideIndex === activeIndex ? IDLE_SPEED : 0);
        });
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
