const VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_rotate;
  uniform mat4 u_scale;
  uniform mat4 u_moving;
  uniform mat4 u_collision;
  uniform mat4 u_resize;

  void main() {
    gl_Position = u_resize * (u_collision * ( u_moving * (u_scale * (u_rotate * a_Position))));
  }
`;

const FSHADER_SOURCE = `
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`;

function main() {
  const canvas = document.querySelector("#webgl");
  const gl = canvas.getContext("webgl");

  if (!gl) {
    console.log("Failed to get the rendering context for WebGL");
    return;
  }

  if(!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders')
  }

  const n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the positions of the verices');
  }

  const u_rotate = gl.getUniformLocation(gl.program, 'u_rotate');
  const u_scale = gl.getUniformLocation(gl.program, 'u_scale');
  const u_moving = gl.getUniformLocation(gl.program, 'u_moving');
  const u_collision = gl.getUniformLocation(gl.program, 'u_collision');
  const u_resize = gl.getUniformLocation(gl.program, 'u_resize');

  const angle = 3;
  let angleV = 0;

  const speed = 0.01;
  let speedX = 0;
  let speedY = 0;

  const scale = 0.3;
  let scaleV = 1;

  let rotatingInterval;
  let movingInterval;

  document.addEventListener('keydown', (event) => {
    const keyName = event.key;

    if (
      (keyName === '1' || keyName === '2') &&
      !rotatingInterval
    ) {
      rotatingInterval = setInterval(() => {
        if (angleV > 360) angleV = angle;
        else if (angleV < 0) angleV = 360 - angle;

        if (keyName === '1') angleV+=angle;
        else angleV-=angle;
      }, 15);
    } else if (keyName === '=' || keyName === '+') {
      scaleV += scale;
    }  else if (keyName === '-' || keyName === '_') {
      scaleV -= scale;
    } else if (
      (
        keyName === 'ArrowUp' ||
        keyName === 'ArrowDown' ||
        keyName === 'ArrowLeft' ||
        keyName === 'ArrowRight'
      ) &&
      !movingInterval
    ) {
      movingInterval = setInterval(() => {
        if (keyName === 'ArrowUp') {
          speedY += speed;
        } else if (keyName === 'ArrowDown') {
          speedY -= speed;
        } else if (keyName === 'ArrowRight') {
          speedX += speed;
        } else if (keyName === 'ArrowLeft') {
          speedX -= speed;
        }
      }, 15);
    }

  }, false);

  document.addEventListener('keyup', (event) => {
    const keyName = event.key;
    if (keyName === '1' || keyName === '2') {
      clearInterval(rotatingInterval);
      rotatingInterval = false;
    } else if (
      keyName === 'ArrowUp' ||
      keyName === 'ArrowDown' ||
      keyName === 'ArrowLeft' ||
      keyName === 'ArrowRight'
    ) {
      clearInterval(movingInterval);

      movingInterval = false;
    }
  }, false);


  setInterval(() => {
    gl.uniformMatrix4fv(u_rotate, false, getRotationMatrix(angleV));
    gl.uniformMatrix4fv(u_scale, false, getScalingMatrix(scaleV));
    gl.uniformMatrix4fv(u_moving, false, getMovingMatrix(speedX, speedY));
    gl.uniformMatrix4fv(u_collision, false, getWindowScaleMatrix());
    gl.uniformMatrix4fv(u_resize, false, getResizeMatrix());

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
  }, 15);
}

function initVertexBuffers(gl) {
  const vertices = new Float32Array([
    0.0, 0.5, -0.45, -0.25, 0.45, -0.25,
  ]);
  const n = 3;

  const vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object ');
    return -1;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const a_Position = gl.getAttribLocation(gl.program, 'a_Position');

  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  return n;
}

function getRotationMatrix(angle) {
  const radian = Math.PI * angle / 180.0;
  const cosB = Math.cos(radian);
  const sinB = Math.sin(radian);

  return new Float32Array([
    cosB,  sinB, .0,  .0,
    -sinB, cosB, .0,  .0,
    .0,   .0,    1.0, .0,
    0.0,   0.0,    .0,  1.0,
  ]);
}

function getScalingMatrix(scale) {
  return new Float32Array([
    scale,  0.0, .0,  .0,
    0.0, scale, .0,  .0,
    .0,   .0,    1.0, .0,
    0.0,   0.0,    .0,  1.0,
  ]);
}

function getMovingMatrix(x, y) {
  return new Float32Array([
    1.0,  .0, .0,  .0,
    .0,   1.0, .0,  .0,
    .0,   .0,    1.0, .0,
    x,   y,    .0,  1.0,
  ]);
}

function getWindowScaleMatrix() {
  const h = window.innerHeight;
  const w = window.innerWidth;
  let x = 1, y = 1;

  if (h < w) {
    x = h / w;
  } else if (h > w) {
    y = w / h;
  }

  return new Float32Array([
    x,  .0, .0,  .0,
    .0,   y, .0,  .0,
    .0,   .0,    1.0, .0,
    .0,   .0,    .0,  1.0,
  ]);
}

const gWidth = (window.innerWidth < window.innerHeight) ? window.innerWidth : window.innerHeight;

function getResizeMatrix() {
  const h = window.innerHeight;
  const w = window.innerWidth;

  const x = (h < w) ? gWidth / h : gWidth / w;

  return new Float32Array([
    x,  .0, .0,  .0,
    .0,   x, .0,  .0,
    .0,   .0,    1.0, .0,
    .0,   .0,    .0,  1.0,
  ]);
}
