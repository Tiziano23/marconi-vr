#version 300 es

in vec3 position;
out vec3 vertexPosition;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;

void main(){
	vertexPosition = position;
	gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}