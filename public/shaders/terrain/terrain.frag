#version 300 es
precision mediump float;

const float PI = 3.14159265359;

struct Light {
	vec3 color;
	float brightness;
};
struct Material {
	vec3 ambient;
	sampler2D diffuseMap;
	sampler2D normalMap;
	sampler2D metalnessMap;
	sampler2D roughnessMap;
	sampler2D occlusionMap;
};
struct PBRData {
	samplerCube enviroment;
	samplerCube irradiance;
	samplerCube prefiltered;
};

in vec2 pass_texture;
in vec3 pass_position;
in vec3 surfaceNormal;
in vec3 toCameraVector;
in vec3 toLightVecs[20];

out vec4 out_Color;

uniform Material material;
uniform Light lights[20];
uniform PBRData pbr;

//-- BRDF --//
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
	float G(vec3 n,vec3 v,vec3 l, float a){
		return G1(n,v,a) * G1(n,l,a);
	}
	vec3 F(vec3 h,vec3 v, vec3 F0){
		return F0 + ((1.0 - F0) * pow(1.0 - max(dot(h,v),0.0),5.0));
	}
	vec3 fresnelRoughness(vec3 h,vec3 v, vec3 F0, float roughness){
		return F0 + ((max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - max(dot(h,v),0.0),5.0));
	}

//-- Functions --//
	vec3 HDRToneMapping(vec3 color){
		vec3 max = max(vec3(0.0),color - 0.004);
		return (max * (6.2 * max + 0.5)) / (max * (6.2 * max + 1.7) + 0.06);
	}
	vec3 gammaCorrection(vec3 color){
		return pow(color,vec3(1.0/2.2));
	}
	vec3 normalFromTexture() {
		vec3 normalMap = texture(material.normalMap,pass_texture).xyz * 2.0 - 1.0;
		vec3 Q1 = dFdx(pass_position);
		vec3 Q2 = dFdy(pass_position);
		vec2 st1 = dFdx(pass_texture);
		vec2 st2 = dFdy(pass_texture);

		vec3 N = normalize(surfaceNormal);
		vec3 T = normalize(Q1 * st2.t - Q2 * st1.t);
		vec3 B = -normalize(cross(N, T));
		mat3 TBN = mat3(T, B, N);

		return normalize(TBN * normalMap);
	}

void main(void) {
	vec3  albedo    = pow(texture(material.diffuseMap,pass_texture).rgb,vec3(2.2));
	float metalness = texture(material.metalnessMap,pass_texture).r;
	float roughness = texture(material.roughnessMap,pass_texture).r;
	float ao        = texture(material.occlusionMap,pass_texture).r;

	vec3 N = normalFromTexture();
	vec3 V = normalize(toCameraVector);
	vec3 R = reflect(-V,N);
	float NdotV = max(dot(N,V),0.0);

	float ior = 1.45;
	vec3 F0 = vec3(pow(abs((1.0 - ior) / (1.0 + ior)),2.0));
	F0 = mix(F0,albedo,metalness);

	//-- Scene Lighting --//
		vec3 L0 = vec3(0.0);
		for(int i = 0;i < 20;i++){
			if(lights[i].brightness > 0.0){
				vec3 L = normalize(toLightVecs[i]);
				vec3 H = normalize(V + L);
				float NdotL = max(dot(N,L),0.0);
				float dist = length(toLightVecs[i]);
				float attenuation = 1.0 / (dist * dist);
				vec3 radiance = lights[i].color * lights[i].brightness * attenuation;
				float D = D(N,H,roughness);
				float G = G(N,V,L,pow(roughness+1.0,2.0)/8.0);
				vec3  F = F(H,V,F0);

				vec3 kS = F;
				vec3 kD = 1.0 - kS;
				kD *= 1.0 - metalness;

				vec3 fr = (kD * albedo / PI) + ((D*G) / (4.0 * NdotV * NdotL + 0.001));
				L0 += fr * radiance * NdotL;
			}
		}

	vec3 kS = fresnelRoughness(N,V,F0,roughness);
	vec3 kD = 1.0 - kS;
	kD *= 1.0 - metalness;

	float mipLevel = (roughness * 4.0);
	vec3 irradiance = texture(pbr.irradiance,surfaceNormal).rgb;
	vec3 prefiltered = textureLod(pbr.prefiltered,R,mipLevel).rgb;

	vec3 diffuse = kD * albedo * irradiance;
	vec3 specular = kS * prefiltered;
	vec3 color = (diffuse + specular) * ao + L0;

	color = HDRToneMapping(color);
	color = gammaCorrection(color);
	out_Color = vec4(color,1.0);
}