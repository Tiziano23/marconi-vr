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
                player.position.set(0,0,0);
                camera.orientation.set(0,0,0,1);
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
        Object.defineProperties(this.controllers,{
            left: {
                get() {
                    return this.find(c => {return c.hand == 'left'});
                }
            },
            right: {
                get() {
                    return this.find(c => { return c.hand == 'right' });
                }
            }
        });
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
class Brush {
    constructor(position, color, size, fallof){
        this.mesh = null;
        this.canDraw = false;
        this.size = size || 2.5;
        this.color = color || new color();
        this.position = position || new Vector3f();
        this.lastPosition = position || new Vector3f();
        this.fallof = fallof || ((x) => {
            return 1-x;
        })
    }
    setFallof(f){
        this.fallof = f;
    }
    setPosition(position) {
        this.position = position.copy();
    }
    setLastPosition(position) {
        this.lastPosition = position.copy();
    }
    setMesh(mesh){
        this.mesh = mesh;
    }
}
class DrawingContext {
    constructor(resolution, boundingBox, backgroundColor){
        this.bb = boundingBox;
        this.brushes = [];
        this.resolution = resolution;
        this.outputTexture = new Texture();
        this.backgroundColor = backgroundColor.copy().applyGamma(2.2);
        this.canvas = new Array(this.resolution ** 2 * 4).fill(0);
        for (let i = 0; i < this.canvas.length / 4; i++) {
            this.canvas[i*4] = this.backgroundColor.r * 255;
            this.canvas[i*4+1] = this.backgroundColor.g * 255;
            this.canvas[i*4+2] = this.backgroundColor.b * 255;
            this.canvas[i*4+3] = this.backgroundColor.a * 255;
        }
    }
    addBrush(brush){
        this.brushes.push(brush);
    }
    setOutputTexture(tex){
        this.outputTexture = tex;
    }
    update(){
        for (let b of this.brushes) {
            b.canDraw = this.isTouching(b);
        }
    }
    drawLine(start, end, size){
        let result = [];
        let dx = Math.abs(end.x - start.x);
        let sx = (start.x < end.x ? 1 : -1) * Math.max(Math.round(size / 2), 1);
        let dy = -Math.abs(end.y - start.y);
        let sy = (start.y < end.y ? 1 : -1) * Math.max(Math.round(size / 2), 1);
        if (dx == 0) {
            for (let y = Math.min(start.y, end.y); y <= Math.max(start.y, end.y); y += Math.abs(sy)) {
                result.push(new Vector3f(start.x, y));
            }
            return result;
        } else if (dy == 0) {
            for (let x = Math.min(start.x, end.x); x <= Math.max(start.x, end.x); x += Math.abs(sx)) {
                result.push(new Vector3f(x, start.y));
            }
            return result;
        } else {
            let e_xy = dx + dy;
            let p = new Vector3f(start.x,start.y);
            while (true) {
                if (start.x < end.x && p.x >= end.x) {
                    if (start.y < end.y && p.y >= end.y) {
                        break;
                    } else if (start.y > end.y && p.y <= end.y) {
                        break;
                    }
                } else if (start.x > end.x && p.x <= end.x) {
                    if (start.y < end.y && p.y >= end.y) {
                        break;
                    } else if (start.y > end.y && p.y <= end.y) {
                        break;
                    }
                }
                let e2 = 2 * e_xy;
                if (e2 >= dy) {
                    e_xy += dy;
                    p.x += sx;
                }
                if (e2 <= dx) {
                    e_xy += dx;
                    p.y += sy;
                }
                result.push(p.copy());
            }
        }
        return result;
    }
    draw(brush) {
        if (brush.canDraw) {
            let pixels = [];
            let sizeRatio = (this.bb.maxX - this.bb.minX) / (this.bb.maxY - this.bb.minY);
            let brushSizeX = brush.size;
            let brushSizeY = Math.floor(brush.size * sizeRatio);
            let coords     = this.getTextureCoord(brush.position);
            let lastCoords = this.getTextureCoord(brush.lastPosition);
            let points = this.drawLine(lastCoords, coords, brush.size);
            for (let p of points) {
                for (let y = p.y - brushSizeY; y <= p.y + brushSizeY; y++) {
                    for (let x = p.x - brushSizeX; x <= p.x + brushSizeX; x++){
                        if(x >= 0 && x < this.resolution && y >= 0 && y < this.resolution){
                            if ((Math.pow((x-p.x),2) / Math.pow(brushSizeX,2)) +
                                (Math.pow((y-p.y),2) / Math.pow(brushSizeY,2)) <= 1) {
                                pixels.push({
                                    i: (y * this.resolution) + x,
                                    dist: Math.sqrt(((x - p.x) / brushSizeX)**2 + ((y - p.y) / brushSizeY)**2)
                                });
                            }
                        }
                    }
                }
            }
            let brushColor = brush.color.copy().applyGamma(2.2);
            for (let p of pixels){
                if (brush.fallof(p.dist) == 1) {
                    this.canvas[p.i * 4] = brushColor.r * 255;
                    this.canvas[p.i * 4 + 1] = brushColor.g * 255;
                    this.canvas[p.i * 4 + 2] = brushColor.b * 255;
                    this.canvas[p.i * 4 + 3] = brushColor.a * 255;
                } else {
                    let lastColor = new Color(this.canvas[p.i*4]/255,this.canvas[p.i*4+1]/255,this.canvas[p.i*4+2]/255,this.canvas[p.i*4+3]/255);
                    let c = Color.mix(lastColor, brushColor, brush.fallof(p.dist));
                    this.canvas[p.i*4]   = c.r * 255;
                    this.canvas[p.i*4+1] = c.g * 255;
                    this.canvas[p.i*4+2] = c.b * 255;
                    this.canvas[p.i*4+3] = c.a * 255;
                }
            }
            this.outputTexture.loadImageData(new Uint8Array(this.canvas), { noMips: true });
        }
    }
    getTextureCoord(pos){
        let sizeX = this.bb.maxX - this.bb.minX;
        let sizeY = this.bb.maxY - this.bb.minY;
        return new Vector3f(
            Math.floor((pos.x - this.bb.minX) / sizeX * (this.resolution - 1)),
            Math.floor((this.bb.maxY - pos.y) / sizeY * (this.resolution - 1))
        );
    }
    isTouching(brush){
        return (
            (brush.position.x > this.bb.minX && brush.position.x < this.bb.maxX) &&
            (brush.position.y > this.bb.minY && brush.position.y < this.bb.maxY) &&
            (brush.position.z > this.bb.minZ && brush.position.z < this.bb.maxZ)
        );
    }
}