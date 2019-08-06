"use strict";
const canvas = document.querySelector('#display');
const gl = canvas.getContext("webgl2");
if (!gl) throw '[WebGL Error] - Unable to initialize WebGL. Your browser or your PC may not support it.';
gl.getExtension('EXT_color_buffer_float');
gl.depthFunc(gl.LEQUAL);

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;

const socket = io(window.location.href);
const shaders = {};
const loader = new Loader();
const streamer = new Streamer('streamer');
const vrManager = new VRManager();
const gamepadManager = new GamepadManager();
const precomputedIrradianceMap = new IrradianceMap();
const precomputedPrefilteredMap = new PrefilteredMap();
let sceneData;

const keyboard = {
	keys:{},
	register:{},
	pressed:false,
	getKey:(code) => {
		return keyboard.keys[code] || {pressed:false,touched:false,timestamp:0};
	},
	update:() => {
		for(let code in keyboard.register){
			let reg = keyboard.register[code];
			if(!keyboard.keys[code])keyboard.keys[code] = {pressed:false,touched:false,timestamp:0};
			if(reg.pressed){
				keyboard.keys[code].touched = !keyboard.keys[code].pressed;
				keyboard.keys[code].pressed = true;
			} else {
				keyboard.keys[code].pressed = false;
				keyboard.keys[code].touched = false;
			}
			keyboard.keys[code].timestamp = reg.timestamp;
		}
	}
};
const mouse = {
	dx:0,
	dy:0,
	sensivity:0.5,
	buttons:{}
};
const input = {
	sensivity: 1,
	currentDevice: 'keyboard-mouse',
	viewAxis: {
		x: 0,
		y: 0
	},
	movementAxis: {
		x: 0,
		y: 0
	},
	update: () => {
		keyboard.update();
		switch (input.currentDevice) {
			case 'keyboard-mouse':
				if (keyboard.getKey('KeyW').timestamp > keyboard.getKey('KeyS').timestamp && keyboard.getKey('KeyW').pressed) {
					input.movementAxis.y = -1;
				} else if (keyboard.getKey('KeyS').pressed) {
					input.movementAxis.y = 1;
				} else if (keyboard.getKey('KeyW').pressed) {
					input.movementAxis.y = -1;
				} else {
					input.movementAxis.y = 0;
				}
				if (keyboard.getKey('KeyA').timestamp > keyboard.getKey('KeyD').timestamp && keyboard.getKey('KeyA').pressed) {
					input.movementAxis.x = -1;
				} else if (keyboard.getKey('KeyD').pressed) {
					input.movementAxis.x = 1;
				} else if (keyboard.getKey('KeyA').pressed) {
					input.movementAxis.x = -1;
				} else {
					input.movementAxis.x = 0;
				}
				input.viewAxis.x = mouse.dx;
				input.viewAxis.y = mouse.dy;
				input.sensivity = mouse.sensivity;
				break;
			case 'gamepad':
				if(gamepadManager.gamepadReady()){
					switch (gamepadManager.activeGamepad.type) {
						case 'Dualshock4':
							input.movementAxis.x = gamepadManager.activeGamepad.getAxis('left-stick').x;
							input.movementAxis.y = gamepadManager.activeGamepad.getAxis('left-stick').y;
							break;
						case 'Oculus Touch':
							input.movementAxis.x = gamepadManager.activeGamepad.getAxis('thumbstick').x;
							input.movementAxis.y = gamepadManager.activeGamepad.getAxis('thumbstick').y;
							break;
					}
				}
				break;
		}

		if(vrManager.isPresenting){
			camera.setOrientation(vrManager.currentHMD.getOrientation());
		}
	}
};
const display = {
	id:null,
	frameTime: 0,
	lastRenderTime: 0,
	averageFrameTime:0,
	currentRenderTime: 0,
	init:() => {
		display.currentRenderTime = performance.now();
		display.lastRenderTime = display.currentRenderTime;
	},
	update:() => {
		display.currentRenderTime = performance.now()
		display.frameTime = (display.currentRenderTime - display.lastRenderTime) / 1000;
		display.lastRenderTime = display.currentRenderTime;
		display.averageFrameTime = (display.averageFrameTime + display.frameTime) / 2;
		document.getElementById('fps-display').innerHTML = display.getFPS();
	},
	getFPS: () => {
		return Number(1 / display.averageFrameTime).toPrecision(4)
	},
	getFrameTime: () => {
		return display.averageFrameTime;
	}
};

preload();
function contentLoaded(){
	canvas.classList.remove('loading');
	document.querySelector('#loading-screen').classList.add('hidden');
}
async function preload(){
	canvas.classList.add('loading');

	notifier.notify('Loading shaders');
	await Loader.loadShader("shaders/static/static.vert","shaders/static/static.frag").then(data => {
		shaders.staticShader = new StaticShader(data.vertexSource,data.fragmentSource);
	});
	await Loader.loadShader("shaders/skybox/skybox.vert", "shaders/skybox/skybox.frag").then(data => {
		shaders.skyboxShader = new SkyboxShader(data.vertexSource,data.fragmentSource);
	});
	await Loader.loadShader("shaders/pbr-precompute/scene-enviroment/static.vert", "shaders/pbr-precompute/scene-enviroment/static.frag").then(data => {
		shaders.sceneEnviromentShader = new SceneEnviromentShader(data.vertexSource, data.fragmentSource);
	});

	notifier.notify('Loading scene');
	sceneData = await new GLTFLoader().load("res/scenes/default/scene.gltf");

	notifier.notify('Loading enviroment');
	let scene = new Scene();
	scene.addEntity(sceneData.nodes[0]);
	scene.addLights(sceneData.lights);
	await precomputedIrradianceMap.prepare();
	await precomputedPrefilteredMap.prepare();
	let precomputedEnviromentMap = Loader.createEnviromentMapFromScene(512, scene, new Vector3f(0, 1.6, 0), shaders.sceneEnviromentShader);
	precomputedIrradianceMap.setEnviromentMap(precomputedEnviromentMap, true);
	precomputedPrefilteredMap.setEnviromentMap(precomputedEnviromentMap, true);

	setTimeout(contentLoaded, 1250);
	main();
}
function main(){
	display.init();
	window.renderer   = new Renderer(shaders);
	window.vrRenderer = new VRRenderer(shaders);
	window.scene  = new Scene();
	window.player = new Player();
	window.camera = new Camera();
	camera.setViewAnchor(player);
	// Entities
		scene.addEntities(sceneData.nodes)
	// Lights
		scene.addLights(sceneData.lights)
	// Camera
		scene.setCamera(camera);
	// Enviroment
		scene.setIrradianceMap(precomputedIrradianceMap);
		scene.setPrefilteredMap(precomputedPrefilteredMap);
	//-----------//
	draw();
}

function draw(options = {}){
	display.update();
	input.update();
	socketUpdate();

	if (!options.once) display.id = window.requestAnimationFrame(draw);

	//-- Game Logic --//
	camera.update();
	player.update();

	//-- Rendering --//
	renderer.prepare();
	renderer.renderScene(scene);

	mouse.dx = 0;
	mouse.dy = 0;
}

//-- WebVR --//	
	function drawVR(options = {}) {
		let HMD = vrManager.currentHMD;
		display.update();
		input.update();
		socketUpdate();
		
		if (!options.once) HMD.animationFrame = HMD.display.requestAnimationFrame(drawVR);
		HMD.updateFrameData();
		
		//-- Game Logic --//
		camera.update();
		player.update();
		
		//-- Rendering --//
		vrRenderer.prepare();
		vrRenderer.renderScene(scene, HMD);
		
		HMD.display.submitFrame();
	}

//-- Remote Controller --//
	function socketUpdate() {
		socket.emit('update', { pos: player.getPosition(), rot: camera.getRotation(), input: { view: input.viewAxis, mov: input.movementAxis } }, (res) => {
			// player.setPosition(res.pos);
			// player.setRotation(res.rot);
			// input.viewAxex = res.input.view;
			// input.movementAxis = res.input.mov;
		});
	}

//-- Event Listeners --//
	// Resize
		window.addEventListener('resize', () => {
			if(!vrManager.isPresenting){
				canvas.width = window.innerWidth;
				canvas.height = window.innerHeight;
			}
		});
	// Mouse
		canvas.addEventListener('click', () => {
			canvas.requestPointerLock();
		});
		window.addEventListener('mousemove', e => {
			if(document.pointerLockElement === canvas || document.mozPointerLockElement === canvas){
				mouse.dx = e.movementX; // (mouse.dx + e.movementX) / 2;
				mouse.dy = e.movementY; // (mouse.dy + e.movementY) / 2;
				input.currentDevice = 'keyboard-mouse';
			}
		});
	// Touch
		window.addEventListener('touchend', () => {
			document.documentElement.requestFullscreen({navigationUI:"hide"});
		});
	// Keyboard
		window.addEventListener('keydown', e => {
			if(e.altKey)e.preventDefault();
			input.currentDevice = 'keyboard-mouse';
			if(!keyboard.register[e.code])keyboard.register[e.code] = {};
			keyboard.register[e.code].pressed = true;
			keyboard.register[e.code].timestamp = Date.now();
		});
		window.addEventListener('keyup', e => {
			if(keyboard.register[e.code]){
				keyboard.register[e.code].pressed = false;
				keyboard.register[e.code].touched = false;
			}
		});
	// Input
		window.addEventListener("gamepadinput", () => {
			input.currentDevice = 'gamepad';
		});
		
//-- Interface --//
const sidebar = document.querySelector('#sidebar');
const tabs = document.querySelectorAll('#sidebar .tabs>.tab');
const menuItems = document.querySelectorAll('#sidebar .menu>.item');
document.querySelector('#toggle-sidebar').addEventListener('click', () => {
	if (sidebar.attributes['tab'].value != 'menu') sidebar.setAttribute('tab', 'menu');
	else sidebar.classList.toggle('visible');
});
menuItems[0].addEventListener('click',() => {
	if (!streamer.isFrameVisible()) {
		sidebar.classList.remove('visible');
		streamer.openFrame();
	}
});
menuItems[1].addEventListener('click', () => {
	if (vrManager.isPresenting) {
		notifier.notify('Terminating VR presentation, please remove your headset');
		vrManager.terminate();
		menuItems[1].querySelector('i').classList.replace('fa-times', 'fa-vr-cardboard');
		menuItems[1].querySelector('.text').innerHTML = 'Enter VR';
		sidebar.classList.remove('visible');
	} else {
		sidebar.setAttribute('tab','vr-devices');
		tabs[1].querySelector('.available-hmds').innerHTML = '';
		vrManager.discover().then(() => {
			for (let hmd of vrManager.availableHMDs) {
				let el = document.createElement('div');
				el.id = hmd.id;
				el.className = 'item';
				el.innerHTML = `
					<p>
						<i class="fas fa-vr-cardboard"></i><span class="name">${hmd.name}</span>
					</p>
				`;
				tabs[1].querySelector('.available-hmds').appendChild(el);
				el.addEventListener('click',e => {
					sidebar.classList.remove('visible');
					sidebar.setAttribute('tab','menu');
					vrManager.connect(el.id);
					if (!vrManager.isPresenting) {
						notifier.notify('Initializing VR presentation, please put on your headser');
						vrManager.initialize();
						menuItems[1].querySelector('i').classList.replace('fa-vr-cardboard','fa-times');
						menuItems[1].querySelector('.text').innerHTML = 'Exit VR';
					}
				});
			}
		});
	}
});