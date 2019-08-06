"use strict";
class VRManager {
    constructor(){
        this.currentHMD = null;
        this.availableHMDs = [];
        window.addEventListener('vrdisplayconnect',e => {
            this.availableHMDs.push(new VRHeadset(e.display));
        });
        window.addEventListener('vrdisplaydisconnect', e => {
            if(this.currentHMD){
                if(this.currentHMD.isPresenting){
                    notifier.notify('Terminating VR Display - HDM disconnected');
                    this.terminate();
                }
            }
            this.availableHMDs.splice(this.availableHMDs.findIndex(hmd => {
                return hmd.id == e.display.displayId;
            }),1);
        });
    }
    get isPresenting(){
        if(this.currentHMD) return this.currentHMD.isPresenting;
        else return false;
    }
    getHeadset(id){
        return this.availableHMDs.find(hmd => {return hmd.id == id});
    }
    initialize(){
        if (this.currentHMD) {
            this.currentHMD.display.requestPresent([{
                source: canvas
            }])
            .then(() => {
                window.cancelAnimationFrame(display.id);
                let leftEye = this.currentHMD.display.getEyeParameters('left');
                let rightEye = this.currentHMD.display.getEyeParameters('right');
                canvas.width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
                canvas.height = Math.max(leftEye.renderHeight, rightEye.renderHeight);
                drawVR();
            })
            .catch(err => {
                throw err;
            });
        }
    }
    terminate(){
        if(this.currentHMD){
            this.currentHMD.display.exitPresent().then(() => {
                this.currentHMD.display.cancelAnimationFrame(this.currentHMD.animationFrame);
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                for(let g of this.currentHMD.controllers){
                    gamepadManager.disconnectGamepad(g.id);
                }
                this.currentHMD = null;
                draw();
            });
        }
    }
    discover(){
        return navigator.getVRDisplays().then(displays => {
            this.availableHMDs = [];
            for(let d of displays) this.availableHMDs.push(new VRHeadset(d));
        });
    }
    connect(id){
        this.currentHMD = this.getHeadset(id);
    }
}
class VRHeadset {
    constructor(display){
        this.id = display.displayId;
        this.name = display.displayName;
        this.display = display;
        this.controllers = [];
        this.animationFrame = null;
        this.frameData = new VRFrameData();
        this.display.getFrameData(this.frameData);
    }
    pairController(c) {
        if (c.api.displayId == this.id && this.controllers.length < 2) {
            c.headset = this;
            this.controllers.push(c);
        }
    }
    getOrientation(){
        return new Quaternion(this.frameData.pose.orientation);
    }
    getPosition(){
        let position = new Vector3f(this.frameData.pose.position);
        position.y += this.display.stageParameters.sittingToStandingTransform[13];
        return position;
    }
    updateFrameData(){
        this.display.getFrameData(this.frameData);
    }
    get sittingToStandingTransform(){
        return this.display.stageParameters.sittingToStandingTransform;
    }
    get isConnected(){
        return this.display.isConnected;
    }
    get isPresenting() {
        return this.display.isPresenting;
    }
}

Loader.loadObj('Oculus Touch (Left)', `res/models/oculus_touch_v2_left/model.obj`).then(mesh => {
    mesh.primitives[0].material.setDiffuseMap(new Texture('res/models/oculus_touch_v2_left/diffuse.png'));
    mesh.primitives[0].material.setRoughnessMap(new Texture('res/models/oculus_touch_v2_left/roughness.png'));
    VRManager.prototype.oculusTouchLeftMesh = mesh;
});
Loader.loadObj('Oculus Touch (Right)', `res/models/oculus_touch_v2_right/model.obj`).then(mesh => {
    mesh.primitives[0].material.setDiffuseMap(new Texture('res/models/oculus_touch_v2_right/diffuse.png'));
    mesh.primitives[0].material.setRoughnessMap(new Texture('res/models/oculus_touch_v2_right/roughness.png'));
    VRManager.prototype.oculusTouchRightMesh = mesh;
});