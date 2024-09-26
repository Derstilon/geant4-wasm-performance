attribute vec4 a_Position;

uniform mat4 u_ProjectionMatrix;

uniform mat4 u_ViewMatrix;

void main() {
  gl_Position = u_ProjectionMatrix * u_ViewMatrix * a_Position;
}