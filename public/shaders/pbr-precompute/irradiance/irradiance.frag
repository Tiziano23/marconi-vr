#version 300 es
precision mediump float;

in vec3 vertexPosition;
out vec4 out_Color;
uniform samplerCube enviromentMap;

const float PI = 3.14159265359;
const float HALF_PI = 1.57079632679;
const float TWO_PI = 6.28318530718;

void main(void){
	vec3 normal = normalize(vertexPosition);
	vec3 up = vec3(0.0,1.0,0.0);
	vec3 right = normalize(cross(up,normal));
	up = normalize(cross(normal,right));
	vec3 irradiance = vec3(0.0);
	float SAMPLE_COUNT = 0.0;
	const float STEP_PRECISION = 0.005;
	for(float theta = 0.0; theta < HALF_PI; theta += STEP_PRECISION){
		for(float phi = 0.0; phi < TWO_PI; phi += STEP_PRECISION){
			vec3 vec = vec3(sin(theta)*cos(phi),sin(theta)*sin(phi),cos(theta));
			vec3 wi = vec.x*right + vec.y*up + vec.z*normal;
			irradiance += texture(enviromentMap,wi).rgb * cos(theta) * sin(theta);
			SAMPLE_COUNT++;
		}
	}
	irradiance *= PI / SAMPLE_COUNT;
	out_Color = vec4(irradiance,1.0);
}