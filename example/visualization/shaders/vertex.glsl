attribute vec4 aPosition;

uniform mat4 uProjectionMatrix;

uniform mat4 uViewMatrix;

void main() {
  gl_Position = uProjectionMatrix * uViewMatrix * aPosition;
}