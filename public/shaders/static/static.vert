#version 300 es

in vec3 position;
in vec2 texture;
in vec3 normal;

out vec2 pass_texture;
out vec3 pass_position;
out vec3 surfaceNormal;
out vec3 toCameraVector;
out vec3 toLightVecs[20];

uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 transformationMatrix;
uniform vec3 lightPositions[20];

void main() {
	vec4 worldPosition = transformationMatrix * vec4(position,1.0);
	
	pass_position = worldPosition.xyz;
	pass_texture  = texture;
	surfaceNormal = (transformationMatrix * vec4(normal,0.0)).xyz;
	
	for(int i = 0;i < 20;i++){
		toLightVecs[i] = (lightPositions[i] - worldPosition.xyz);
	}

	toCameraVector = ((inverse(viewMatrix) * vec4(0.0,0.0,0.0,1.0)).xyz - worldPosition.xyz);
	gl_Position = projectionMatrix * viewMatrix * worldPosition;
}