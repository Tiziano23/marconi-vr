#version 300 es
precision mediump float;

const float PI = 3.14159265359;

struct Light {
	vec3 color;
	vec3 relativePos;
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

in vec3 V;
in mat3 TBN;
in vec2 textureCoords;

out vec4 out_Color;

uniform PBRData pbr;
uniform Light lights[20];
uniform Material material;

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
	float G(vec3 n, vec3 v, vec3 l, float k){
		return G1(n,v,k) * G1(n,l,k);
	}
	vec3 F(vec3 h,vec3 v, vec3 F0){
		return F0 + ((1.0 - F0) * pow(1.0 - max(dot(h,v),0.0),5.0));
	}
	vec3 fresnelRoughness(vec3 h,vec3 v, vec3 F0, float roughness){
		return F0 + ((max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - max(dot(h,v),0.0),5.0));
	}
//----------//

//-- Functions --//
	vec3 HDRToneMapping(vec3 color){
		return color/(color + 1.0);
	}
	vec3 gammaCorrection(vec3 color){
		return pow(color,vec3(1.0/2.2));
	}
//---------------//

//-- Low Discrepancy sequence --//
	float RadicalInverse_VdC(uint bits) {
	    bits = (bits << 16u) | (bits >> 16u);
	    bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
	    bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
	    bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
	    bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
	    return float(bits) * 2.3283064365386963e-10;
	}
	vec2 Hammersley(uint i, uint N){
		return vec2(float(i)/float(N), RadicalInverse_VdC(i));
	}
//------------------------------//

//-- Importance Sampling --//
	vec3 ImportanceSampleGGX(vec2 Xi, vec3 N, float roughness){
	    float a = roughness*roughness;
	    
	    float phi = 2.0*PI*Xi.x;
	    float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a*a - 1.0) * Xi.y));
	    float sinTheta = sqrt(1.0 - cosTheta*cosTheta);
		
		vec3 H = vec3(cos(phi) * sinTheta,sin(phi) * sinTheta,cosTheta);

	    vec3 up        = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
	    vec3 tangent   = normalize(cross(up, N));
	    vec3 bitangent = cross(N, tangent);
	    vec3 sampleVec = tangent * H.x + bitangent * H.y + N * H.z;

	    return normalize(sampleVec);
	}
//-------------------------//

void main(void) {
	vec3  albedo    = pow(texture(material.diffuseMap,textureCoords).rgb,vec3(2.2));
	vec3  normalMap = texture(material.normalMap,textureCoords).rgb * 2.0 - 1.0;
	float metalness = texture(material.metalnessMap,textureCoords).r;
	float roughness = texture(material.roughnessMap,textureCoords).r;
	float ao        = texture(material.occlusionMap,textureCoords).r;
	
	vec3 T = vec3(TBN[0][0],TBN[1][0],TBN[2][0]);
	vec3 N = vec3(TBN[0][2],TBN[1][2],TBN[2][2]);
	if(normalMap.r != 0.0 && normalMap.g != 0.0 && normalMap.b != 1.0) N = inverse(TBN) * normalMap;
	vec3 V = normalize(V);
	vec3 R = reflect(-V,N);

	float ior = 1.45;
	vec3 F0 = vec3(pow(abs((1.0 - ior) / (1.0 + ior)),2.0));
	F0 = mix(F0,albedo,metalness);

	//-- BRDF --//
		// vec2 BRDF = vec2(0,0);
		// const uint SAMPLE_COUNT = 32u;
		// for(uint i = 0u; i < SAMPLE_COUNT; ++i){
		// 	vec3 H = ImportanceSampleGGX(Hammersley(i, SAMPLE_COUNT), N, roughness);
		// 	vec3 L  = reflect(-V,H);
		// 	float NdotL = max(dot(N,L), 0.0);
		// 	float NdotH = max(dot(N,H), 0.0);
		// 	float VdotH = max(dot(V,H), 0.0);
		// 	if(NdotL > 0.0){
		// 		float G = G(N, V, L,(roughness*roughness)/2.0);
		// 		float G_Vis = (G * VdotH) / (NdotH * NdotV);
		// 		float Fc = pow(1.0 - VdotH, 5.0);
		// 		BRDF.x += (1.0 - Fc) * G_Vis;
		// 		BRDF.y += Fc * G_Vis;
		// 	}
		// }
		// BRDF /= float(SAMPLE_COUNT);
	//----------//
	
	//-- Scene Lighting --//
		// vec3 L0 = vec3(0.0);
		// for(int i = 0;i < 20;i++){
		// 	if(lights[i].brightness > 0.0){
		// 		vec3 L = normalize(toLightVecs[i]);
		// 		vec3 H = normalize(V + L);
		// 		float NdotL = max(dot(N,L),0.0);
		// 		if(NdotL > 0.0){
		// 			float dist = length(toLightVecs[i]);
		// 			float attenuation = 1.0 / (0.5 + 0.1*dist*dist);
		// 			vec3 radiance = lights[i].color * lights[i].brightness * attenuation;
		// 			float D = D(N,H,roughness);
		// 			float G = G(N,V,L,roughness);
		// 			vec3  F = F(H,V,F0);
		// 			vec3 kS = F;
		// 			vec3 kD = 1.0 - kS;
		// 			kD *= 1.0 - metalness;
		// 			vec3 fr = (kD * albedo / PI) + ((D*G) / (4.0 * NdotV * NdotL + 0.001));
		// 			L0 += fr * radiance * NdotL;
		// 		}
		// 	}
		// }
	//--------------------//

	vec3 kS = fresnelRoughness(N,V,F0,roughness);
	vec3 kD = 1.0 - kS;
	kD *= 1.0 - metalness;
	
	float mipLevel = roughness * 4.0;
	vec3 irradiance = texture(pbr.irradiance,N).rgb;
	vec3 prefiltered = textureLod(pbr.prefiltered,R,mipLevel).rgb;

	vec3 diffuse = kD * albedo * irradiance;
	vec3 specular = kS * prefiltered;
	vec3 color = (diffuse + specular) * ao;

	out_Color = vec4(color,1.0);

	out_Color = vec4(HDRToneMapping(out_Color.rgb),1.0);
	out_Color = vec4(gammaCorrection(out_Color.rgb),1.0);

	//-- Debug --//
		// out_Color = vec4(gammaCorrection((T + 1.0) * 0.5),1.0);
		// out_Color = vec4(gammaCorrection((N + 1.0) * 0.5),1.0);
		// out_Color = vec4(gammaCorrection((V + 1.0) * 0.5),1.0);
		// out_Color = vec4(vec3(G(N, V, V, (roughness*roughness)/2.0)),1.0);
		// out_Color = vec4(F(N,V,F0),1.0);

		// out_Color = vec4(gammaCorrection(texture(pbr.enviroment,N).rgb),1.0);
		// out_Color = vec4(gammaCorrection(irradiance),1.0);
		// out_Color = vec4(gammaCorrection(prefiltered),1.0);
		// out_Color = vec4(specular,1.0);
		// out_Color = vec4(diffuse,1.0);
		// out_Color = vec4(L0,1.0);

		// out_Color = vec4(normalMap,1.0);
		// out_Color = vec4(gammaCorrection(albedo),1.0);
		// out_Color = vec4(vec3(roughness),1.0);
		// out_Color = vec4(vec3(metalness),1.0);
		// out_Color = vec4(vec3(ao),1.0);
}