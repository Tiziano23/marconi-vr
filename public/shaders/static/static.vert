#version 300 es

in vec3 position;
in vec2 texture;
in vec3 normal;
in vec3 tangent;

out vec3 V;
out vec3 T;
out mat3 TBN;
out vec2 textureCoords;

uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 transformationMatrix;

void main() {
	vec4 worldPosition = transformationMatrix * vec4(position,1.0);
	
	textureCoords = texture;

	vec3 N = normalize((transformationMatrix * vec4(normal,  0.0)).xyz);
	vec3 T = normalize((transformationMatrix * vec4(tangent, 0.0)).xyz);
	vec3 B = normalize(cross(N,T));

	TBN = mat3(
		T.x,B.x,N.x,
		T.y,B.y,N.y,
		T.z,B.z,N.z
	);

	V = (inverse(viewMatrix) * worldPosition).xyz;

	gl_Position = projectionMatrix * viewMatrix * worldPosition;
}