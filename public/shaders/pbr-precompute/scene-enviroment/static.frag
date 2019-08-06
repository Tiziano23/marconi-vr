#version 300 es
precision mediump float;
const float PI = 3.14159265359;
struct Light {
	vec3 color;
	vec3 position;
	float brightness;
};
struct Material {
	vec3 ambient;
	sampler2D diffuseMap;
	sampler2D metalnessMap;
	sampler2D roughnessMap;
	sampler2D occlusionMap;
};
in vec3 V;
in vec3 N;
in vec3 worldPos;
in vec2 textureCoords;
out vec4 out_Color;
uniform Light lights[20];
uniform Material material;
float D(vec3 n, vec3 h, float a){
	float alpha2 = pow(a,2.0);
	float NdotH2 = pow(max(dot(n,h),0.0),2.0);
	float den    = PI * pow(NdotH2 * (alpha2 - 1.0) + 1.0,2.0);
	return alpha2 / den;
}
float G1(vec3 n, vec3 v, float k){
	float NdotV = max(dot(n,v),0.0);
	return NdotV / (NdotV * (1.0 - k) + k);
}
float G(vec3 n, vec3 v, vec3 l, float k){
	return G1(n,v,k) * G1(n,l,k);
}
vec3 F(vec3 n,vec3 v, vec3 F0){
	return F0 + ((1.0 - F0) * pow(1.0 - max(dot(n,v),0.0),5.0));
}
vec3 fresnelRoughness(vec3 h,vec3 v, vec3 F0, float roughness){
	return F0 + ((max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - max(dot(h,v),0.0),5.0));
}
void main(void) {
	vec3  albedo    = pow(texture(material.diffuseMap,textureCoords).rgb, vec3(2.2));
	float metalness = texture(material.metalnessMap,textureCoords).r;
	float roughness = texture(material.roughnessMap,textureCoords).r;
	float ao        = texture(material.occlusionMap,textureCoords).r;
	vec3 V = normalize(V);
	vec3 R = reflect(-V,N);
	float NdotV = max(dot(N,V),0.0);
	float ior = 1.45;
	vec3 F0 = vec3(pow(abs((1.0 - ior) / (1.0 + ior)),2.0));
	F0 = mix(F0,albedo,metalness);
	vec3 L0 = vec3(0);
	for(int i = 0;i < 20;i++){
		if(lights[i].brightness > 0.0){
			vec3 L = normalize(lights[i].position - worldPos);
			vec3 H = normalize(V + L);
			float NdotL = max(dot(N,L),0.0);
			if(NdotL > 0.0){
				float dist = length(lights[i].position - worldPos);
				float attenuation = 1.0 / (dist * dist);
				vec3 radiance = lights[i].color * lights[i].brightness * attenuation;
				float D = D(N,H,pow(roughness,2.0));
				float G = G(N,V,L,pow(roughness+1.0,2.0)/8.0);
				vec3  F = F(N,V,F0);
				vec3 kS = F;
				vec3 kD = vec3(1.0) - kS;
				kD *= 1.0 - metalness;
				vec3 fr = (kD * albedo / PI) + ((D*G*F) / (4.0 * NdotV * NdotL));
				L0 += fr * radiance * NdotL;
			}
		}
	}
	vec3 color = L0;
	out_Color = vec4(color,1.0);
}