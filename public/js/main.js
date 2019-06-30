"use strict";
const canvas = document.querySelector('#display');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
const gl = canvas.getContext("webgl2");
gl.getExtension('EXT_color_buffer_float');
gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.depthFunc(gl.LEQUAL);

const keyboard = {
	keys:{},
	register:{},
	pressed:false,
	getKey:(code) => {
		return keyboard.keys[code] || {pressed:false,touched:false};
	},
	update:() => {
		for(let code in keyboard.register){
			let reg = keyboard.register[code];
			if(!keyboard.keys[code])keyboard.keys[code] = {pressed:false,touched:false};

			if(reg.pressed){
				keyboard.keys[code].touched = !keyboard.keys[code].pressed;
				keyboard.keys[code].pressed = true;
			} else {
				keyboard.keys[code].pressed = false;
				keyboard.keys[code].touched = false;
			}
		}
	}
};
const mouse = {
	dx:0,
	dy:0,
	sensivity:0.5,
	buttons:{}
};
const gamepad = {
	api:null,
	sensivity:15,
	axes:{
		"left-x":0,
		"left-y":0,
		"right-x":0,
		"right-y":0
	},
	buttons:{
		"cross":{pressed:false,touched:false},
		"circle":{pressed:false,touched:false},
		"square":{pressed:false,touched:false},
		"triangle":{pressed:false,touched:false},
		"L1":{pressed:false,touched:false},
		"R1":{pressed:false,touched:false},
		"L2":{pressed:false,touched:false},
		"R2":{pressed:false,touched:false},
		"share":{pressed:false,touched:false},
		"options":{pressed:false,touched:false},
		"L3":{pressed:false,touched:false},
		"R3":{pressed:false,touched:false},
		"d-up":{pressed:false,touched:false},
		"d-down":{pressed:false,touched:false},
		"d-left":{pressed:false,touched:false},
		"d-right":{pressed:false,touched:false},
		"ps":{pressed:false,touched:false},
		"trackpad":{pressed:false,touched:false}
	},
	axesMappings:{
		0:"left-x",
		1:"left-y",
		3:"right-x",
		2:"right-y"
	},
	buttonsMappings:{
		0:"cross",
		1:"circle",
		2:"square",
		3:"triangle",
		4:"L1",
		5:"R1",
		6:"L2",
		7:"R2",
		8:"share",
		9:"options",
		10:"L3",
		11:"R3",
		12:"d-up",
		13:"d-down",
		14:"d-left",
		15:"d-right",
		16:"ps",
		17:"trackpad"
	},
	update:() => {
		if(gamepad.api){
			let oldState = {axes:gamepad.api.axes,buttons:gamepad.api.buttons};
			gamepad.api = navigator.getGamepads()[gamepad.api.index];
			for(let i = 0;i < gamepad.api.buttons.length;i++){
				if(gamepad.api.buttons[i].pressed) {
					gamepad.buttons[gamepad.buttonsMappings[i]].touched = !gamepad.buttons[gamepad.buttonsMappings[i]].pressed;
					gamepad.buttons[gamepad.buttonsMappings[i]].pressed = true;
				} else {
					gamepad.buttons[gamepad.buttonsMappings[i]].pressed = false;
					gamepad.buttons[gamepad.buttonsMappings[i]].touched = false;
				}
			}
			for(let i = 0;i < gamepad.api.axes.length;i++){
				gamepad.axes[gamepad.axesMappings[i]] = Math.abs(gamepad.api.axes[i]) > 0.05 ? gamepad.api.axes[i] : 0;
			}
			if(gamepad.api.axes != oldState.axes || gamepad.api.buttons != oldState.buttons){
				window.dispatchEvent(new Event('gamepadinput'));
			}
		}
	}
};
const vr = {
	display:null,
	displays:[],
	frameData:new VRFrameData(),
	discover:() => {
		navigator.getVRDisplays().then(displays => {
			vr.displays = displays;
		});
	},
	connect:(i) => {
		vr.display = vr.displays[i];
	}
};
const display = {
	id:null,
	deltaTime:0,
	lastFrameTime:0,
	currentFrameTime:0,
	init:() => {
		display.currentFrameTime = performance.now();
		display.lastFrameTime = display.currentFrameTime;
	},
	update:() => {
		display.currentFrameTime = performance.now();
		display.deltaTime = (display.currentFrameTime - display.lastFrameTime) / 1000;
		display.lastFrameTime = display.currentFrameTime;
		document.getElementById('fps-display').innerHTML = display.getFPS();
		vr.discover();
		if(vr.displays.length > 0)vr.connect(0);
	},
	getFPS:() => {return Number(1 / display.deltaTime).toPrecision(4)},
	getFrameTime:() => {return display.deltaTime}
};
const input = {
	sensivity:1,
	viewAxes:{x:0,y:0},
	movementAxes:{x:0,y:0},
	currentDevice:'keyboard',
	update:() => {
		gamepad.update();
		keyboard.update();
		switch(input.currentDevice){
			case 'keyboard':
				if(keyboard.getKey('KeyW').pressed){
					input.movementAxes.y = -1;
				} else if(keyboard.getKey('KeyS').pressed){
					input.movementAxes.y = 1;
				} else {
					input.movementAxes.y = 0;
				}
				if(keyboard.getKey('KeyA').pressed){
					input.movementAxes.x = -1;
				} else if(keyboard.getKey('KeyD').pressed){
					input.movementAxes.x = 1;
				} else {
					input.movementAxes.x = 0;
				}
				input.viewAxes.x = mouse.dy;
				input.viewAxes.y = mouse.dx;
				input.sensivity = mouse.sensivity;
				break;
			case 'gamepad':
				input.movementAxes.x = gamepad.axes['left-x'];
				input.movementAxes.y = gamepad.axes['left-y'];
				input.viewAxes.x =  gamepad.axes['right-x'];
				input.viewAxes.y = gamepad.axes['right-y'];
				input.sensivity = gamepad.sensivity;
				break;
		}
	}
};

let shaders = {};
let models = {};
const socket = io(window.location.href);
const loader = new Loader();

function contentLoaded(){
	canvas.classList.remove('loading');
	document.querySelector('#loader').style.opacity = 0;
	document.querySelector('#loader').style.visibility = 'hidden';
	document.querySelector('#loader .background').style.opacity = 1;
	document.querySelector('#loader .background').style.animation = 'fade-out 2.5s both cubic-bezier(0.25,0.75,0.25,1.0)';
}

preload();
async function preload(){
	canvas.classList.add('loading');
	notifier.notify('Loading shaders');
	await fetchShader("shaders/static/static.vert","shaders/static/static.frag").then(data => {
		shaders.staticShader = new StaticShader(data.vertexSource,data.fragmentSource);
	});
	await fetchShader("shaders/skybox/skybox.vert","shaders/skybox/skybox.frag").then(data => {
		shaders.skyboxShader = new SkyboxShader(data.vertexSource,data.fragmentSource);
	});
	await fetchShader("shaders/terrain/terrain.vert","shaders/terrain/terrain.frag").then(data => {
		shaders.terrainShader = new TerrainShader(data.vertexSource,data.fragmentSource);
	});

	notifier.notify('Loading models');
	models.sphere      = await loader.loadObj('sphere','res/models/sphere.obj');
	models.blackboard  = await loader.loadObj('blackboard','res/models/blackboard.obj');
	models.teacherDesk = await loader.loadObj('teacherDesk','res/models/teacherDesk.obj');
	models.floor       = await loader.loadObj('floor','res/models/floor.obj');
	models.desk        = await loader.loadObj('desk','res/models/desk.obj');
	models.chair       = await loader.loadObj('chair','res/models/chair.obj');
	models.sheet       = await loader.loadObj('sheet','res/models/sheet.obj');

	notifier.notify('Loading textures');
	for(let i in models){
		let m = models[i];
		m.textures = {};
		m.textures['normal'] = await loader.loadTexture('res/textures/'+m.id+'/bump.png');
		m.textures['albedo'] = await loader.loadTexture('res/textures/'+m.id+'/albedo.png');
		m.textures['roughness'] = await loader.loadTexture('res/textures/'+m.id+'/roughness.png');
	}
	console.clear();
	
	// models.sheet.textures['albedo'] = await loader.loadTexture('res/textures/notes.png');

	models.floor.textures['normal'] = await loader.loadTexture('res/textures/floor/tiles/bump.png');
	models.floor.textures['albedo'] = await loader.loadTexture('res/textures/floor/tiles/albedo.png');
	models.floor.textures['roughness'] = await loader.loadTexture('res/textures/floor/tiles/roughness.png');
	// models.floor.textures['occlusion'] = await loaderwwwww.loadTexture('res/textures/floor/grass/ao.png');

	notifier.notify('Loading enviroment');
	// window.enviromentMap = loader.createEnviromentMap(4,new Vector3f(0.5,0.6,1.0),new Vector3f(1,1,1));
	window.enviromentMap = await loader.loadEnviromentMapHDR('res/skybox/indoor/2k.hdr');	
	// await window.precomputedIrradianceMap.setEnviromentMap(envMap);
	// await window.precomputedPrefilteredMap.setEnviromentMap(envMap);

	contentLoaded();
	main();
}

function main(){
	if(!gl){alert('Error - Unable to initialize WebGL. Your browser or your PC may not support it.');return};
	display.init();
	window.renderer   = new Renderer(shaders);
	window.vrRenderer = new VRRenderer(shaders);
	
	window.scene  = new Scene();
	window.player = new Player();
	window.camera = new Camera();
	camera.setViewAnchor(player);

	window.precomputedIrradianceMap = new IrradianceMap();
	window.precomputedPrefilteredMap = new PrefilteredMap();

	scene.on('skyboxUpdated',() => {
		window.precomputedIrradianceMap.setEnviromentMap(scene.skybox.enviromentMap);
		window.precomputedPrefilteredMap.setEnviromentMap(scene.skybox.enviromentMap);
	});

	// Entities
		const floor = new Entity(models.floor,new Vector3f(0,0,0),new Vector3f(),1);
		floor.model.material.setNormalMap(models.floor.textures['normal']);
		floor.model.material.setDiffuseMap(models.floor.textures['albedo']);
		floor.model.material.setRoughnessMap(models.floor.textures['roughness']);
		floor.model.material.setIrradianceMap(precomputedIrradianceMap);
		floor.model.material.setPrefilteredMap(precomputedPrefilteredMap);
		scene.addEntity(floor);
	
		const blackboard = new Entity(models.blackboard,new Vector3f(0,6.5,-49.5),new Vector3f(),1);
		blackboard.model.material.setDiffuseMap(models.blackboard.textures['albedo']);
		blackboard.model.material.setRoughnessMap(models.blackboard.textures['roughness']);
		blackboard.model.material.setIrradianceMap(precomputedIrradianceMap);
		blackboard.model.material.setPrefilteredMap(precomputedPrefilteredMap);
		scene.addEntity(blackboard);

		const teacherDesk = new Entity(models.teacherDesk,new Vector3f(0,0,-35),new Vector3f(0,Math.PI,0),1);
		teacherDesk.model.material.setDiffuseMap(models.teacherDesk.textures['albedo']);
		teacherDesk.model.material.setRoughnessMap(models.teacherDesk.textures['roughness']);
		teacherDesk.model.material.setIrradianceMap(precomputedIrradianceMap);
		teacherDesk.model.material.setPrefilteredMap(precomputedPrefilteredMap);
		scene.addEntity(teacherDesk);

		const teacherChair = new Entity(models.chair,new Vector3f(0,0,-37.5),new Vector3f(),1);
		teacherChair.model.material.setDiffuseMap(models.chair.textures['albedo']);
		teacherChair.model.material.setRoughnessMap(models.chair.textures['roughness']);
		teacherChair.model.material.setIrradianceMap(precomputedIrradianceMap);
		teacherChair.model.material.setPrefilteredMap(precomputedPrefilteredMap);
		scene.addEntity(teacherChair);

		// const notes = new Entity(models.sheet,new Vector3f(-4,4,-33.5),new Vector3f(0,Math.PI/8,0),1);
		// notes.model.material.setDiffuseMap(models.sheet.textures['albedo']);
		// notes.model.material.setRoughnessMap(loader.createTextureFromColor(new Vector3f(1.0)));
		// notes.model.material.setIrradianceMap(precomputedIrradianceMap);
		// notes.model.material.setPrefilteredMap(precomputedPrefilteredMap);
		// scene.addEntity(notes);

		const desks = [];
		const origin = new Vector3f(-5,0,10);
		for(let i = -2;i <= 2;i++){
			for(let j = -2;j <= 2;j++){
				let d = new Entity(models.desk,new Vector3f(origin.x+i*10,origin.y,origin.z+j*10),new Vector3f(),1);
				let c = new Entity(models.chair,new Vector3f(origin.x+i*10,origin.y,origin.z+j*10+2),new Vector3f(0,Math.PI,0),1);
				d.model.material.setDiffuseMap(models.desk.textures['albedo']);
				d.model.material.setRoughnessMap(models.desk.textures['roughness']);
				d.model.material.setIrradianceMap(precomputedIrradianceMap);
				d.model.material.setPrefilteredMap(precomputedPrefilteredMap);
				scene.addEntity(d);
				c.model.material.setDiffuseMap(models.chair.textures['albedo']);
				c.model.material.setRoughnessMap(models.chair.textures['roughness']);
				c.model.material.setIrradianceMap(precomputedIrradianceMap);
				c.model.material.setPrefilteredMap(precomputedPrefilteredMap);
				scene.addEntity(c);
			}
		}
	// Lights
		// scene.addLight(new PointLight(new Vector3f(-40,35,-40),new Vector3f(1,0,0),10));
		// scene.addLight(new PointLight(new Vector3f(-40,35, 40),new Vector3f(0,1,0),10));
		// scene.addLight(new PointLight(new Vector3f( 40,35,-40),new Vector3f(0,0,1),10));
		// scene.addLight(new PointLight(new Vector3f( 40,35, 40),new Vector3f(1,1,0),10));
		// scene.addLight(new PointLight(new Vector3f(  0,45,  0),new Vector3f(1,1,1),25));
	// Camera
		scene.setCamera(camera);
	// Enviroment
		const skybox = new Skybox(window.enviromentMap);
		scene.setSkybox(skybox);

	draw();
}

function draw(){
	display.update();
	input.update();
	socketUpdate();

	display.id = window.requestAnimationFrame(draw);

	//-- Game Logic --//
	camera.update();

	//-- Rendering --//
	renderer.prepare();
	renderer.renderScene(scene);

	mouse.dx = 0;
	mouse.dy = 0;
}

//-- WebVR --//
	function drawVR(){
		keyboard.update()
		input.update();
		socketUpdate();

		vr.display.id = vr.display.requestAnimationFrame(drawVR);
		vr.display.getFrameData(vr.frameData);

		//-- Game Logic --//
		camera.update();

		//-- Rendering --//
		vrRenderer.prepare();  
		vrRenderer.renderScene(scene,vr.frameData);

		vr.display.submitFrame();
	}
	function WebVRToggle(){
		if(vr.display){
			if(vr.display.isPresenting){
				notifier.notify('Terminating VR Display');
				vr.display.cancelAnimationFrame(vr.display.id);
				canvas.width = window.innerWidth;
				canvas.height = window.innerHeight;
				draw();
			} else {
				notifier.notify('Initializing VR Display');
				vr.display.requestPresent([{source:canvas}])
				.then(() => {
					window.cancelAnimationFrame(display.id);
					let leftEye = vr.display.getEyeParameters('left');
					let rightEye = vr.display.getEyeParameters('right');
					canvas.width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
					canvas.height = Math.max(leftEye.renderHeight, rightEye.renderHeight);
					drawVR();
				})
				.catch(err => {
					throw err;
				});
			}
		} else {
			notifier.notify('No VR Dispays deteced');
		}
	}

//-- Remote Controller --//
	const streamer = new Streamer('streamer');
	function socketUpdate() {
		socket.emit('update', { pos: player.getPosition(), rot: camera.getRotation(), input: { view: input.viewAxes, mov: input.movementAxes } }, (res) => {
			// player.setPosition(res.pos);
			// player.setRotation(res.rot);
			// input.viewAxex = res.input.view;
			// input.movementAxes = res.input.mov;
			player.update();
		});
	}

//-- Event Listeners --//
	// WebVR
		window.addEventListener('vrdisplaydisconnect',e => {
			notifier.notify('Terminating VR Display');
			vr.display.cancelAnimationFrame(vr.display.id);
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			draw();
		});
	// Resize
		window.addEventListener('resize',e => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		});
	// Mouse
		canvas.addEventListener('click',e => {
			canvas.requestPointerLock();
		});
		window.addEventListener('mousemove',e => {
			if(document.pointerLockElement === canvas || document.mozPointerLockElement === canvas){
				mouse.dx = (mouse.dx + e.movementX) / 2;
				mouse.dy = (mouse.dy + e.movementY) / 2;
				input.currentDevice = 'keyboard';
			}
		});
	// Touch
		window.addEventListener('touchend',e => {
			document.documentElement.requestFullscreen({navigationUI:"hide"});
		});
	// Keyboard
		window.addEventListener('keydown',e => {
			if(e.altKey)e.preventDefault();
			input.currentDevice = 'keyboard';

			if(!keyboard.register[e.code])keyboard.register[e.code] = {};
			keyboard.register[e.code].pressed = true;
		});
		window.addEventListener('keyup',e => {
			if(keyboard.register[e.code]){
				keyboard.register[e.code].pressed = false;
				keyboard.register[e.code].touched = false;
			}
		});
	// Gamepad
		window.addEventListener("gamepadinput",e => {
			input.currentDevice = 'gamepad';
		});
		window.addEventListener("gamepadconnected",e => {
			if(!/Unknown Gamepad/gi.test(e.gamepad.id)){
				gamepad.api = e.gamepad;
			}
		});
		window.addEventListener("gamepaddisconnected",e => {
			gamepad.api = null;
		});