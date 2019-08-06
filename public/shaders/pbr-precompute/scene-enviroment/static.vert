#version 300 es

in vec3 position;
in vec2 texture;
in vec3 normal;

out vec3 V;
out vec3 N;
out vec3 worldPos;
out vec2 textureCoords;

uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 transformationMatrix;

void main() {
	vec4 worldPosition = transformationMatrix * vec4(position, 1.0);
	V = normalize((inverse(viewMatrix)[3].xyz - worldPosition.xyz));
	N = normalize((transformationMatrix * vec4(normal,0.0)).xyz);
	worldPos = worldPosition.xyz;
	textureCoords = texture;
	gl_Position = projectionMatrix * viewMatrix * worldPosition;
}