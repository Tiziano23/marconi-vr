#version 300 es
precision mediump float;

in vec3 vertexPosition;
out vec4 out_Color;
uniform sampler2D equirectangularMap;
const vec2 invAtan = vec2(0.1591, 0.3183);

vec2 SampleSphericalMap(vec3 v){
	vec2 uv = vec2(-atan(v.z, v.x), -asin(v.y));
	uv *= invAtan;
	uv += 0.5;
	return uv;
}

void main(){
	vec2 uv = SampleSphericalMap(normalize(vertexPosition));
	vec4 rgbe = texture(equirectangularMap,uv);
	float scale = pow(2.0, (rgbe.a * 255.0) - 128.0);
	vec3 color = vec3(
		rgbe.r * scale,
		rgbe.g * scale,
		rgbe.b * scale
	);
	out_Color = vec4(color,1);
}