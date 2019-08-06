"use strict";
class GamepadManager {
    constructor(){
        this.gamepads = new Array();
        this.activeGamepad = null;
        window.addEventListener("gamepadinput",e => {
            this.activeGamepad = e.detail.gamepad;
        });
        window.addEventListener("gamepadconnected", e => {
            if (e.gamepad.id.includes('Wireless Controller'))
                gamepadManager.connectGamepad(new Dualshock4(e.gamepad));
            else if (e.gamepad.id.includes('Oculus Touch'))
                gamepadManager.connectGamepad(new OculusTouch(e.gamepad));
            else if (!e.gamepad.id.includes('Unknown Gamepad'))
                gamepadManager.connectGamepad(new Gamepad(e.gamepad));
        });
        window.addEventListener("gamepaddisconnected", e => {
            gamepadManager.disconnectGamepad(e.gamepad.id);
        });
    }
    update() {
        for (let g of this.gamepads) {
            g.update();
        }
    }
    getGamepad(id) {
        return this.gamepads.find(g => {
            return g.id == id;
        });
    }
    connectGamepad(g){
        if(g) this.gamepads.push(g);
    }
    disconnectGamepad(id){
        this.gamepads.splice(this.gamepads.findIndex(g => {
            return g.id == id;
        }),1);
    }
}
class GamepadAxis {
    constructor(id, scale = 1, sensivity = 1, deadzone = [0.05, 0.05]){
        this.xVal = 0;
        this.yVal = 0;
        this.id = id;
        this.scale = scale;
        this.deadzone = deadzone;
        this.sensivity = sensivity;
    }
    setDeadzone(deadzone){
        this.deadzone = deadzone.length == 2 ? deadzone : this.deadzone;
        return this;
    }
    setSensivity(sens){
        this.sensivity = sens > 0 && sens <= 1 ? sens : this.sensivity;
        return this;
    }
    getSensivity(){
        return this.scale * this.sensivity;
    }
    set x(x){
        this.xVal = Math.abs(x) > this.deadzone[0] ? x : 0;
    }
    get x(){
        return this.xVal;
    }
    set y(y){
        this.yVal = Math.abs(y) > this.deadzone[1] ? y : 0;
    }
    get y(){
        return this.yVal;
    }
}
class GamepadButton {
    constructor(id){
        this.id = id;
        this.once = false;
        this.pressed = false;
        this.touched = false;
    }
}
class Gamepad {
    constructor(api = Gamepad){
        if(!api) throw new TypeError("Failed to construct 'Gamepad': 1 argument required, but only 0 present.");
        this.api = api;
        this.id = api.id;
        this.type = 'Generic';
        this.axes = [];
        this.buttons = [];
    }
    update(){
        if (this.api) {
            this.api = navigator.getGamepads()[this.api.index];
            let ls = {axes:[],buttons:[]};
            for(let a of this.axes){
                ls.axes.push({x:a.x,y:a.y})
            }
            for(let b of this.buttons){
                ls.buttons.push({pressed:b.pressed,touched:b.touched})
            }
    
            for (let i in this.api.buttons) {
                if (this.api.buttons[i].touched) {
                    this.buttons[i].touched = true;
                } else {
                    this.buttons[i].touched = false;
                }
                if (this.api.buttons[i].pressed) {
                    this.buttons[i].once = !this.buttons[i].pressed;
                    this.buttons[i].pressed = true;
                } else {
                    this.buttons[i].pressed = false;
                    this.buttons[i].once = false;
                }
            }
            for (let i = 0; i < this.api.axes.length/2; i++) {
                this.axes[i].x = this.api.axes[i*2];
                this.axes[i].y = this.api.axes[i*2+1];
            }
    
            let isInput = false;
            for(let i in this.axes){
                if (ls.axes[i].x != this.axes[i].x || ls.axes[i].y != this.axes[i].y)isInput = true;
            }
            for (let i in this.buttons) {
                if (ls.buttons[i].pressed != this.buttons[i].pressed
                || ls.buttons[i].touched != this.buttons[i].touched)isInput = true;
            }
            if(isInput) {
                window.dispatchEvent(new CustomEvent('gamepadinput',{detail:{gamepad:this}}));
            }
        }
    }
    getAxis(id) {
        return this.axes.find(a => {
            return a.id == id
        })
    }
    getButton(id) {
        return this.buttons.find(b => {
            return b.id == id
        })
    }
}
class Dualshock4 extends Gamepad {
    constructor(api){
        super(api);
        this.type = 'Dualshock4';
        this.axes = [
            new GamepadAxis('left-stick', 1, 1, [0.1,0.1]),
            new GamepadAxis('right-stick', 180, 0.45)
        ]
        this.buttons = [
            new GamepadButton('cross'),
            new GamepadButton('circle'),
            new GamepadButton('square'),
            new GamepadButton('triangle'),
            new GamepadButton('L1'),
            new GamepadButton('R1'),
            new GamepadButton('L2'),
            new GamepadButton('R2'),
            new GamepadButton('share'),
            new GamepadButton('options'),
            new GamepadButton('L3'),
            new GamepadButton('R3'),
            new GamepadButton('d-up'),
            new GamepadButton('d-down'),
            new GamepadButton('d-left'),
            new GamepadButton('d-right'),
            new GamepadButton('ps'),
            new GamepadButton('trackpad')
        ]
    }
}
class OculusTouch extends Gamepad {
    constructor(api){
        super(api);
        this.headset = vrManager.getHeadset(this.api.displayId);
        if(!this.headset) throw new Error('Invalid gamepad api - no VRHeadsed found with id: '+this.api.displayId+'.');
        this.type = 'Oculus Touch';
        this.hand = this.api.hand;
        this.axes = [
            new GamepadAxis('thumbstick')
        ]
        this.buttons = [
            new GamepadButton('thumbstick'),
            new GamepadButton('trigger'),
            new GamepadButton('grip'),
            new GamepadButton('a'),
            new GamepadButton('b'),
            new GamepadButton('options')
        ];
        this.position = new Vector3f();
        this.orientation = new Quaternion();
        this.poseMatrix = mat4.create();
        this.headset.pairController(this);
        if (this.hand == 'left') {
            this.defaultMesh = VRManager.prototype.oculusTouchLeftMesh;
            this.entity = new Entity(this.id,VRManager.prototype.oculusTouchLeftMesh);
        }
        if (this.hand == 'right') {
            this.defaultMesh = VRManager.prototype.oculusTouchRightMesh;
            this.entity = new Entity(this.id,VRManager.prototype.oculusTouchRightMesh);
        }
        this.entity.mesh.setIrradianceMap(scene.irradianceMap);
		this.entity.mesh.setPrefilteredMap(scene.prefilteredMap);
    }
    update(){
        super.update();
        if (!this.headset)gamepadManager.disconnectGamepad(this.id);
        else if (this.api) {
            let localPos = this.api.pose.position;
            vec3.transformMat4(localPos, localPos, this.headset.sittingToStandingTransform);
            localPos = new Vector3f(localPos);
            if (localPos.x + localPos.y + localPos.z != 0) {
                this.position = player.position.copy().add(localPos);
            }
            this.orientation = new Quaternion(this.api.pose.orientation);
            mat4.fromRotationTranslation(this.poseMatrix, this.orientation.arr(), this.position.arr());
        }
    }
    changeMesh(mesh){
        if (this.entity.mesh != mesh) {
            mesh.setIrradianceMap(scene.irradianceMap);
            mesh.setPrefilteredMap(scene.prefilteredMap);
            this.entity.mesh = mesh;
        }
    }
    resetDefaultMesh(){
        if (this.entity.mesh != this.defaultMesh) this.entity.mesh = this.defaultMesh;
    }
    getPenTipPosition(){
        return this.position.add(new Vector3f(0, 0, -0.042).applyQuaternion(this.orientation));
    }
}