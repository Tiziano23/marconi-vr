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

        setInterval(() => {
            for(let g of this.gamepads){
                g.update();
            }
        },0);
    }
    gamepadReady(){
        return this.activeGamepad ? true : false;
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
    constructor(id,sensivity,deadzone){
        this.xVal = 0;
        this.yVal = 0;
        this.id = id;
        this.deadzone = deadzone || [0.05,0.05];
        this.sensivity = sensivity || 15;
    }
    setDeadzone(deadzone){
        this.deadzone = deadzone.length == 2 ? deadzone : this.deadzone;
        return this;
    }
    setSensivity(sens){
        this.sensivity = sens >= 1 ? sens : this.sensivity;
        return this;
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
        this.pressed = false;
        this.touched = false;
    }
}
class Gamepad {
    constructor(api){
        if(!api) throw new TypeError("Failed to construct 'Gamepad': 1 argument required, but only 0 present.");
        this.api = api || null;
        this.id = api.id;
        this.type = 'Generic';
        this.axes = [];
        this.buttons = [];
    }
    update(){
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
            new GamepadAxis('left-stick'),
            new GamepadAxis('right-stick')
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
        this.poseMatrix = mat4.create();
        
        this.headset.pairController(this);
        if (this.hand == 'left') this.entity = new Entity(VRManager.prototype.oculusTouchLeftMesh);
        if (this.hand == 'right') this.entity = new Entity(VRManager.prototype.oculusTouchRightMesh);
    }
    update(){
        super.update();
        let position = this.api.pose.position;
        let orientation = this.api.pose.orientation;
        mat4.fromRotationTranslation(this.poseMatrix, orientation, position);
        mat4.multiply(this.poseMatrix, this.headset.sittingToStandingTransform, this.poseMatrix);
    }
}