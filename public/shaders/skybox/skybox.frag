#version 300 es
precision mediump float;

in vec3 textureCoords;
out vec4 out_Color;
uniform samplerCube cubeMap;

void main(){
	vec3 color = texture(cubeMap,textureCoords).rgb;
	color = color / (color + 1.0);
	color = pow(color,vec3(1.0/2.2));
	out_Color = vec4(color,1.0);
}