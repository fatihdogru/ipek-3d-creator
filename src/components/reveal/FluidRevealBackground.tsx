import { useEffect, useRef, useState } from 'react';

/*
  A Navier-Stokes fluid simulation, rendered in WebGL2.

  The pointer injects velocity and dye into the field; the solver advects it,
  removes divergence with a Jacobi pressure solve, and adds vorticity so the
  trail curls instead of smearing. The dye field is then thresholded and used to
  choose between the two images, which is what gives the reveal its hard,
  organic, living edge — the same construction landonorris.com uses.

  One instance per page. Each fills its own container and idles while it is
  scrolled out of view, so three of them can coexist without competing.
*/

// Simulation grids. Velocity stays coarse (it is smooth anyway); the dye needs
// resolution because its threshold becomes a visible edge.
const SIM_RES = 128;
const DYE_RES = 512;

const PRESSURE_ITERATIONS = 14;
const PRESSURE_DISSIPATION = 0.8;
const VELOCITY_DISSIPATION = 0.25;
const DYE_DISSIPATION = 0.9;
const CURL = 26;

const SPLAT_RADIUS = 0.3;
const SPLAT_FORCE = 5500;

// Where the dye field is cut into "revealed" and "not revealed", and how many
// dye units that cut is feathered over (just enough to kill the stair-stepping).
const THRESHOLD = 0.16;
const THRESHOLD_FEATHER = 0.035;

const GRID_EASE = 0.06;
const PARALLAX = 16;

const BASE_VERTEX = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 texelSize;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const SPLAT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTarget;
uniform float uAspect;
uniform vec3 uColor;
uniform vec2 uPoint;
uniform float uRadius;
void main () {
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
  vec3 base = texture(uTarget, vUv).xyz;
  fragColor = vec4(base + splat, 1.0);
}`;

const ADVECTION_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uDissipation;
void main () {
  vec2 coord = vUv - uDt * texture(uVelocity, vUv).xy * uTexelSize;
  vec4 result = texture(uSource, coord);
  float decay = 1.0 + uDissipation * uDt;
  fragColor = result / decay;
}`;

const DIVERGENCE_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
void main () {
  float L = texture(uVelocity, vL).x;
  float R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y;
  float B = texture(uVelocity, vB).y;
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }
  fragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

const CURL_SHADER = `#version 300 es
precision highp float;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
void main () {
  float L = texture(uVelocity, vL).y;
  float R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x;
  float B = texture(uVelocity, vB).x;
  fragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

const VORTICITY_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uCurlStrength;
uniform float uDt;
void main () {
  float L = texture(uCurl, vL).x;
  float R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x;
  float B = texture(uCurl, vB).x;
  float C = texture(uCurl, vUv).x;

  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= uCurlStrength * C;
  force.y *= -1.0;

  vec2 velocity = texture(uVelocity, vUv).xy + force * uDt;
  velocity = clamp(velocity, -1000.0, 1000.0);
  fragColor = vec4(velocity, 0.0, 1.0);
}`;

const PRESSURE_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
void main () {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  float divergence = texture(uDivergence, vUv).x;
  fragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRADIENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
in vec2 vL;
in vec2 vR;
in vec2 vT;
in vec2 vB;
out vec4 fragColor;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main () {
  float L = texture(uPressure, vL).x;
  float R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x;
  float B = texture(uPressure, vB).x;
  vec2 velocity = texture(uVelocity, vUv).xy - vec2(R - L, T - B);
  fragColor = vec4(velocity, 0.0, 1.0);
}`;

const CLEAR_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTexture;
uniform float uValue;
void main () {
  fragColor = uValue * texture(uTexture, vUv);
}`;

const DISPLAY_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uDye;
uniform sampler2D uImageBase;
uniform sampler2D uImageReveal;
uniform vec2 uCoverBase;
uniform vec2 uCoverReveal;
uniform float uThreshold;
uniform float uFeather;
void main () {
  float dye = texture(uDye, vUv).r;
  float mask = smoothstep(uThreshold - uFeather, uThreshold + uFeather, dye);

  vec2 uvBase = (vUv - 0.5) * uCoverBase + 0.5;
  vec2 uvReveal = (vUv - 0.5) * uCoverReveal + 0.5;

  vec3 base = texture(uImageBase, uvBase).rgb;
  vec3 reveal = texture(uImageReveal, uvReveal).rgb;

  fragColor = vec4(mix(base, reveal, mask), 1.0);
}`;

type FBO = {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach: (id: number) => number;
};

type DoubleFBO = {
  read: FBO;
  write: FBO;
  swap: () => void;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
};

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'shader compile failed');
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, fragment: string) {
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, BASE_VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? 'program link failed');
  }

  const uniforms: Record<string, WebGLUniformLocation | null> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const name = gl.getActiveUniform(program, i)!.name;
    uniforms[name] = gl.getUniformLocation(program, name);
  }

  return { program, uniforms };
}

export default function FluidRevealBackground({
  base,
  reveal,
  onFail,
}: {
  base: string;
  reveal: string;
  onFail: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const patternRef = useRef<SVGPatternElement | null>(null);

  const pointerRef = useRef({
    x: 0.5,
    y: 0.5,
    dx: 0,
    dy: 0,
    moved: false,
    localX: 0,
    localY: 0,
  });
  const offsetRef = useRef({ x: 0, y: 0 });
  const visibleRef = useRef(true);

  const [cell, setCell] = useState(() =>
    typeof window === 'undefined'
      ? 48
      : Math.round(Math.min(64, Math.max(36, window.innerWidth * 0.028))),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });

    if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
      onFail();
      return;
    }

    let disposed = false;
    let frame = 0;

    try {
      gl.disable(gl.BLEND);

      // Fullscreen quad, shared by every pass.
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      );
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      const programs = {
        splat: createProgram(gl, SPLAT_SHADER),
        advection: createProgram(gl, ADVECTION_SHADER),
        divergence: createProgram(gl, DIVERGENCE_SHADER),
        curl: createProgram(gl, CURL_SHADER),
        vorticity: createProgram(gl, VORTICITY_SHADER),
        pressure: createProgram(gl, PRESSURE_SHADER),
        gradient: createProgram(gl, GRADIENT_SHADER),
        clear: createProgram(gl, CLEAR_SHADER),
        display: createProgram(gl, DISPLAY_SHADER),
      };

      const blit = (target: FBO | null) => {
        if (target) {
          gl.viewport(0, 0, target.width, target.height);
          gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        } else {
          gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };

      const createFBO = (w: number, h: number): FBO => {
        gl.activeTexture(gl.TEXTURE0);
        const texture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA16F,
          w,
          h,
          0,
          gl.RGBA,
          gl.HALF_FLOAT,
          null,
        );

        const fbo = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          texture,
          0,
        );
        gl.viewport(0, 0, w, h);
        gl.clear(gl.COLOR_BUFFER_BIT);

        return {
          texture,
          fbo,
          width: w,
          height: h,
          texelSizeX: 1 / w,
          texelSizeY: 1 / h,
          attach(id: number) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
          },
        };
      };

      const createDoubleFBO = (w: number, h: number): DoubleFBO => {
        const fbo1 = createFBO(w, h);
        const fbo2 = createFBO(w, h);
        return {
          read: fbo1,
          write: fbo2,
          width: w,
          height: h,
          texelSizeX: fbo1.texelSizeX,
          texelSizeY: fbo1.texelSizeY,
          swap() {
            const temp = this.read;
            this.read = this.write;
            this.write = temp;
          },
        };
      };

      const getResolution = (resolution: number) => {
        let aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
        if (aspect < 1) aspect = 1 / aspect;
        const min = Math.round(resolution);
        const max = Math.round(resolution * aspect);
        return gl.drawingBufferWidth > gl.drawingBufferHeight
          ? { width: max, height: min }
          : { width: min, height: max };
      };

      let velocity: DoubleFBO;
      let dye: DoubleFBO;
      let divergence: FBO;
      let curl: FBO;
      let pressure: DoubleFBO;

      const initFramebuffers = () => {
        const sim = getResolution(SIM_RES);
        const dyeRes = getResolution(DYE_RES);
        velocity = createDoubleFBO(sim.width, sim.height);
        dye = createDoubleFBO(dyeRes.width, dyeRes.height);
        divergence = createFBO(sim.width, sim.height);
        curl = createFBO(sim.width, sim.height);
        pressure = createDoubleFBO(sim.width, sim.height);
      };

      // Images, uploaded once and sampled by the display pass.
      const loadTexture = (src: string) => {
        const texture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          1,
          1,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          new Uint8Array([0, 0, 0, 255]),
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const holder = { texture, aspect: 1 };
        const image = new Image();
        image.onload = () => {
          if (disposed) return;
          holder.aspect = image.width / image.height;
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image,
          );
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        };
        image.src = src;
        return holder;
      };

      const imageBase = loadTexture(base);
      const imageReveal = loadTexture(reveal);

      const resize = () => {
        const rect = container.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = Math.max(1, Math.round(rect.width * dpr));
        const h = Math.max(1, Math.round(rect.height * dpr));
        if (canvas.width === w && canvas.height === h) return false;
        canvas.width = w;
        canvas.height = h;
        return true;
      };

      resize();
      initFramebuffers();

      const onMouseMove = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;
        // Ignore pointers over other pages, or the trail leaks in from nowhere.
        if (
          localX < 0 ||
          localX > rect.width ||
          localY < 0 ||
          localY > rect.height
        ) {
          return;
        }

        const p = pointerRef.current;
        const x = localX / rect.width;
        const y = 1 - localY / rect.height;
        // Deltas are in normalised space, so the wider axis has to be corrected
        // or horizontal strokes push harder than vertical ones.
        const aspect = rect.width / rect.height;
        p.dx = (x - p.x) * SPLAT_FORCE * (aspect > 1 ? aspect : 1);
        p.dy = (y - p.y) * SPLAT_FORCE * (aspect < 1 ? 1 / aspect : 1);
        p.x = x;
        p.y = y;
        p.localX = localX;
        p.localY = localY;
        p.moved = true;
      };

      const onResize = () => {
        if (resize()) initFramebuffers();
        setCell(
          Math.round(Math.min(64, Math.max(36, window.innerWidth * 0.028))),
        );
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('resize', onResize);

      // Idle while the page is scrolled away: three simulations at once is a
      // lot of GPU for something nobody is looking at.
      const observer = new IntersectionObserver(
        ([entry]) => {
          visibleRef.current = entry.isIntersecting;
        },
        { rootMargin: '10% 0px' },
      );
      observer.observe(container);

      const splat = (x: number, y: number, dx: number, dy: number) => {
        const aspect = canvas.width / canvas.height;
        // The shader divides dot(p, p) by this, so it is a squared radius already.
        const radius =
          aspect > 1 ? (SPLAT_RADIUS / 100) * aspect : SPLAT_RADIUS / 100;

        gl.useProgram(programs.splat.program);
        gl.uniform1i(programs.splat.uniforms.uTarget!, velocity.read.attach(0));
        gl.uniform1f(programs.splat.uniforms.uAspect!, aspect);
        gl.uniform2f(programs.splat.uniforms.uPoint!, x, y);
        gl.uniform3f(programs.splat.uniforms.uColor!, dx, dy, 0);
        gl.uniform1f(programs.splat.uniforms.uRadius!, radius);
        blit(velocity.write);
        velocity.swap();

        gl.uniform1i(programs.splat.uniforms.uTarget!, dye.read.attach(0));
        gl.uniform3f(programs.splat.uniforms.uColor!, 1, 1, 1);
        blit(dye.write);
        dye.swap();
      };

      const coverScale = (aspect: number) => {
        const canvasAspect = canvas.width / canvas.height;
        return canvasAspect > aspect
          ? [1, aspect / canvasAspect]
          : [canvasAspect / aspect, 1];
      };

      let last = performance.now();

      const step = (dt: number) => {
        // Curl, then vorticity confinement: keeps the trail swirling.
        gl.useProgram(programs.curl.program);
        gl.uniform2f(
          programs.curl.uniforms.texelSize!,
          velocity.texelSizeX,
          velocity.texelSizeY,
        );
        gl.uniform1i(
          programs.curl.uniforms.uVelocity!,
          velocity.read.attach(0),
        );
        blit(curl);

        gl.useProgram(programs.vorticity.program);
        gl.uniform2f(
          programs.vorticity.uniforms.texelSize!,
          velocity.texelSizeX,
          velocity.texelSizeY,
        );
        gl.uniform1i(
          programs.vorticity.uniforms.uVelocity!,
          velocity.read.attach(0),
        );
        gl.uniform1i(programs.vorticity.uniforms.uCurl!, curl.attach(1));
        gl.uniform1f(programs.vorticity.uniforms.uCurlStrength!, CURL);
        gl.uniform1f(programs.vorticity.uniforms.uDt!, dt);
        blit(velocity.write);
        velocity.swap();

        // Project the velocity field back to divergence-free.
        gl.useProgram(programs.divergence.program);
        gl.uniform2f(
          programs.divergence.uniforms.texelSize!,
          velocity.texelSizeX,
          velocity.texelSizeY,
        );
        gl.uniform1i(
          programs.divergence.uniforms.uVelocity!,
          velocity.read.attach(0),
        );
        blit(divergence);

        gl.useProgram(programs.clear.program);
        gl.uniform1i(
          programs.clear.uniforms.uTexture!,
          pressure.read.attach(0),
        );
        gl.uniform1f(programs.clear.uniforms.uValue!, PRESSURE_DISSIPATION);
        blit(pressure.write);
        pressure.swap();

        gl.useProgram(programs.pressure.program);
        gl.uniform2f(
          programs.pressure.uniforms.texelSize!,
          velocity.texelSizeX,
          velocity.texelSizeY,
        );
        gl.uniform1i(
          programs.pressure.uniforms.uDivergence!,
          divergence.attach(0),
        );
        for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
          gl.uniform1i(
            programs.pressure.uniforms.uPressure!,
            pressure.read.attach(1),
          );
          blit(pressure.write);
          pressure.swap();
        }

        gl.useProgram(programs.gradient.program);
        gl.uniform2f(
          programs.gradient.uniforms.texelSize!,
          velocity.texelSizeX,
          velocity.texelSizeY,
        );
        gl.uniform1i(
          programs.gradient.uniforms.uPressure!,
          pressure.read.attach(0),
        );
        gl.uniform1i(
          programs.gradient.uniforms.uVelocity!,
          velocity.read.attach(1),
        );
        blit(velocity.write);
        velocity.swap();

        // Move velocity and dye along the flow.
        gl.useProgram(programs.advection.program);
        gl.uniform2f(
          programs.advection.uniforms.texelSize!,
          velocity.texelSizeX,
          velocity.texelSizeY,
        );
        gl.uniform2f(
          programs.advection.uniforms.uTexelSize!,
          velocity.texelSizeX,
          velocity.texelSizeY,
        );
        gl.uniform1i(
          programs.advection.uniforms.uVelocity!,
          velocity.read.attach(0),
        );
        gl.uniform1i(
          programs.advection.uniforms.uSource!,
          velocity.read.attach(0),
        );
        gl.uniform1f(programs.advection.uniforms.uDt!, dt);
        gl.uniform1f(
          programs.advection.uniforms.uDissipation!,
          VELOCITY_DISSIPATION,
        );
        blit(velocity.write);
        velocity.swap();

        gl.uniform1i(
          programs.advection.uniforms.uVelocity!,
          velocity.read.attach(0),
        );
        gl.uniform1i(programs.advection.uniforms.uSource!, dye.read.attach(1));
        gl.uniform1f(
          programs.advection.uniforms.uDissipation!,
          DYE_DISSIPATION,
        );
        blit(dye.write);
        dye.swap();
      };

      const render = () => {
        const [baseX, baseY] = coverScale(imageBase.aspect);
        const [revealX, revealY] = coverScale(imageReveal.aspect);

        gl.useProgram(programs.display.program);
        gl.uniform1i(programs.display.uniforms.uDye!, dye.read.attach(0));

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, imageBase.texture);
        gl.uniform1i(programs.display.uniforms.uImageBase!, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, imageReveal.texture);
        gl.uniform1i(programs.display.uniforms.uImageReveal!, 2);

        gl.uniform2f(programs.display.uniforms.uCoverBase!, baseX, baseY);
        gl.uniform2f(programs.display.uniforms.uCoverReveal!, revealX, revealY);
        gl.uniform1f(programs.display.uniforms.uThreshold!, THRESHOLD);
        gl.uniform1f(programs.display.uniforms.uFeather!, THRESHOLD_FEATHER);
        blit(null);
      };

      const tick = () => {
        frame = requestAnimationFrame(tick);

        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 1 / 60);
        last = now;

        if (!visibleRef.current) return;

        if (resize()) initFramebuffers();

        const pointer = pointerRef.current;
        if (pointer.moved) {
          pointer.moved = false;
          splat(pointer.x, pointer.y, pointer.dx, pointer.dy);
          pointer.dx = 0;
          pointer.dy = 0;
        }

        step(dt);
        render();

        const pattern = patternRef.current;
        if (pattern) {
          const rect = container.getBoundingClientRect();
          const nx = rect.width ? pointer.localX / rect.width - 0.5 : 0;
          const ny = rect.height ? pointer.localY / rect.height - 0.5 : 0;
          const offset = offsetRef.current;
          offset.x += (nx * PARALLAX - offset.x) * GRID_EASE;
          offset.y += (ny * PARALLAX - offset.y) * GRID_EASE;
          pattern.setAttribute('x', String(offset.x));
          pattern.setAttribute('y', String(offset.y));
        }
      };

      frame = requestAnimationFrame(tick);

      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        observer.disconnect();
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('resize', onResize);
      };
    } catch (error) {
      console.warn('[reveal] fluid simulation unavailable:', error);
      cancelAnimationFrame(frame);
      onFail();
      return;
    }
  }, [base, reveal, onFail]);

  const gridId = `reveal-grid-${base.replace(/\W/g, '').slice(-12)}`;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="hidden lg:block absolute inset-0 pointer-events-none overflow-hidden"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <svg className="absolute inset-0 h-full w-full" style={{ opacity: 0.1 }}>
        <defs>
          <pattern
            ref={patternRef}
            id={gridId}
            width={cell}
            height={cell}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${cell} 0 L 0 0 0 ${cell}`}
              fill="none"
              stroke="#64748b"
              strokeWidth={0.6}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${gridId})`} />
      </svg>
    </div>
  );
}
