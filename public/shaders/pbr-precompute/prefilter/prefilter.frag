#version 300 es
precision mediump float;

in vec3 vertexPosition;
out vec4 out_Color;

uniform float roughness;
uniform samplerCube enviromentMap;

const float PI = 3.14159265359;

//-- BRDF --//
	float D(vec3 n, vec3 h, float a){	
		float alpha2 = pow(a,2.0);
		float NdotH2 = pow(max(dot(n,h),0.0),2.0);
		float den    = PI * pow(NdotH2 * (alpha2 - 1.0) + 1.0,2.0);
		return alpha2 / den;
	}

//-- Low Discrepancy sequence --//
	float RadicalInverse_VdC(uint bits) {
		bits = (bits << 16u) | (bits >> 16u);
		bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
		bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
		bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
		bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
		return float(bits) * 2.3283064365386963e-10;
	}
	vec2 Hammersley(int i, int N){
		return vec2(float(i)/float(N), RadicalInverse_VdC(uint(i)));
	}

//-- Importance Sampling --//
	vec3 ImportanceSampleGGX(vec2 Xi, vec3 N, float roughness){
	    float a = roughness*roughness;
	    
	    float phi = 2.0*PI*Xi.x;
	    float theta = acos(sqrt((1.0 - Xi.y) / (Xi.y * (a*a - 1.0) + 1.0)));
		vec3 H = vec3(cos(phi)*sin(theta),sin(phi)*sin(theta),cos(theta));

	    vec3 up        = vec3(0,1,0);
	    vec3 tangent   = normalize(cross(up, N));
	    vec3 bitangent = normalize(cross(N, tangent));
	    vec3 sampleVec = normalize(tangent * H.x + bitangent * H.y + N * H.z);

	    return sampleVec;
	}

vec3 Li(vec3 w, float mipLevel){
	return textureLod(enviromentMap,w,mipLevel).rgb;
}

void main(void){
	vec3 N = normalize(vertexPosition);
	vec3 V = N;

	int SAMPLE_COUNT = 512;
	vec3 prefiltered = vec3(0.0);
	float weight = 0.0;
	for(int i = 0; i < SAMPLE_COUNT; i++){
		vec3 H = ImportanceSampleGGX(Hammersley(i, SAMPLE_COUNT),N,roughness);
		vec3 L = reflect(-V,H);
		float NdotL = max(dot(N,L),0.0);
		if(NdotL > 0.0){
			float NdotH = max(dot(N,H),0.0);
			float HdotV = max(dot(H,V),0.0);
			float pdf = (D(N,H,roughness) * NdotH / (4.0 * HdotV)) + 0.0001; 
			float res = 1024.0;
			float saTexel  = 4.0 * PI / (6.0 * res * res);
			float saSample = 1.0 / (float(SAMPLE_COUNT) * pdf + 0.0001);
			float mipLevel = roughness == 0.0 ? 0.0 : 0.5 * log2(saSample / saTexel);
			prefiltered += Li(L,mipLevel) * NdotL;
			weight += NdotL;
		}
	}
	prefiltered /= weight;

	out_Color = vec4(prefiltered,1.0);
}