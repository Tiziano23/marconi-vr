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
in vec3 worldPos;
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
		return alpha2 / max(den, 0.001);
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
//----------//

//-- Functions --//
	vec3 HDRToneMapping(in vec3 color) {
		return color/(1.0 + color);
	}
	vec3 BurgessToneMapping(in vec3 color) {
		vec3 x = max(vec3(0.0), color-0.004);
		return (x * (6.2 * x + 0.5)) / (x * (6.2 * x + 1.7) + 0.06);
	}
	vec3 toGammaSpace(in vec3 color) {
		return pow(color,vec3(1.0/2.2));
	}
//---------------//

void main(void) {
	vec3  albedo    = pow(texture(material.diffuseMap,textureCoords).rgb, vec3(2.2));
	vec3  normalMap = texture(material.normalMap,textureCoords).rgb * 2.0 - 1.0;
	float metalness = texture(material.metalnessMap,textureCoords).r;
	float roughness = texture(material.roughnessMap,textureCoords).r;
	float ao        = texture(material.occlusionMap,textureCoords).r;
	
	vec3 T = vec3(TBN[0][0],TBN[1][0],TBN[2][0]);
	vec3 N = vec3(0,0,0);
	if(abs(normalMap.x) < 0.004 && abs(normalMap.y) < 0.004 && normalMap.z == 1.0){
		N = vec3(TBN[0][2],TBN[1][2],TBN[2][2]);
	} else {
		N = inverse(TBN) * normalMap;
	}

	vec3 V = normalize(V);
	vec3 R = reflect(-V,N);
	float NdotV = max(dot(N,V),0.0);

	float ior = 1.45;
	vec3 F0 = vec3(pow(abs((1.0 - ior) / (1.0 + ior)),2.0));
	F0 = mix(F0,albedo,metalness);
	
	//-- Scene Lighting --//
		vec3 L0 = vec3(0);
		for(int i = 0;i < 20;i++){
			if (lights[i].brightness > 0.0) {
				vec3 L = normalize(lights[i].position - worldPos);
				vec3 H = normalize(V + L);
				float NdotL = max(dot(N,L),0.0);
				if (NdotL > 0.0) {
					float dist = length(lights[i].position - worldPos);
					float attenuation = 1.0 / (dist * dist);
					vec3 radiance = lights[i].color * lights[i].brightness * attenuation;

					float D = D(N,H,pow(roughness, 2.0));
					float G = G(N,V,L,pow(roughness + 1.0, 2.0)/8.0);
					vec3  F = F(N,V,F0);
					vec3 kS = F;
					vec3 kD = vec3(1.0) - kS;
					kD *= 1.0 - metalness;

					vec3 fr = (kD * albedo / PI) + ((D*F*G) / max(4.0 * NdotV * NdotL,0.001));
					L0 += fr * radiance * NdotL;
				}
			}
		}
	//--------------------//

	vec3 kS = fresnelRoughness(N,V,F0,roughness);
	vec3 kD = 1.0 - kS;
	kD *= 1.0 - metalness;

	float mipLevel = roughness * 4.0;
	vec3 irradiance = texture(pbr.irradiance,N).rgb;
	vec3 prefiltered = textureLod(pbr.prefiltered,R,mipLevel).rgb;
	
	vec3 diffuse = kD * albedo * irradiance;
	vec3 specular = kS * prefiltered;

	vec3 color = (diffuse + specular + L0) * ao;
	
	color = HDRToneMapping(color);
	color = toGammaSpace(color);
	out_Color = vec4(color,1.0);

	//-- Debug --//
		// out_Color = vec4(toGammaSpace((T + 1.0) * 0.5),1.0);
		// out_Color = vec4(toGammaSpace((N + 1.0) * 0.5),1.0);
		// out_Color = vec4(toGammaSpace((V + 1.0) * 0.5),1.0);
		// out_Color = vec4(toGammaSpace((R + 1.0) * 0.5),1.0);

		// out_Color = vec4(vec3(D(N, V, pow(roughness, 2.0))),1.0);
		// out_Color = vec4(vec3(G(N, V, V, pow(roughness + 1.0, 2.0)/8.0)),1.0);
		// out_Color = vec4(F(N,V,F0),1.0);

		// out_Color = vec4(toGammaSpace(texture(pbr.enviroment,N).rgb),1.0);
		// out_Color = vec4(toGammaSpace(irradiance),1.0);
		// out_Color = vec4(toGammaSpace(prefiltered),1.0);
		// out_Color = vec4(toGammaSpace(specular),1.0);
		// out_Color = vec4(toGammaSpace(diffuse),1.0);
		// out_Color = vec4(toGammaSpace(L0),1.0);

		// out_Color = vec4(toGammaSpace(albedo),1.0);
		// out_Color = vec4(normalMap,1.0);
		// out_Color = vec4(roughness,0,0,1.0);
		// out_Color = vec4(metalness,0,0,1.0);
		// out_Color = vec4(ao,0,0,1.0);
}