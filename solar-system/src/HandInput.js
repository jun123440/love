const base = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/';
let engine;
function loadEngine() {
  if (window.Hands) return Promise.resolve();
  return engine ||= new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.src = base + 'hands.js';
    script.crossOrigin = 'anonymous';
    script.onload = () => window.Hands ? resolve() : reject(new Error('Hands export missing'));
    script.onerror = () => reject(new Error('Hands download failed'));
    document.head.append(script);
  }).catch(error => { engine = null; throw error; });
}

export class HandInput {
  constructor(videoElement, canvasElement) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.canvasCtx = canvasElement.getContext('2d');
    this.handsData = { left: null, right: null };
    this.smoothedRight = null;
    this.smoothedLeft = null;
    this.smoothingFactor = 0.15;
    this.stopped = false;
    this.frame = 0;
    this.lastVideo = -1;
    this.isReady = false;
    this.status = "Initializing Hand Tracking...";
  }

  async init() {
    await loadEngine();
    if (this.stopped) return;
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:320},height:{ideal:240}},audio:false});
    if (this.stopped) { stream.getTracks().forEach(t => t.stop()); return; }
    this.videoElement.srcObject = stream;
    await this.videoElement.play();
    if (this.stopped) return;
    this.hands = new window.Hands({locateFile: f => base + f});
    this.hands.setOptions({maxNumHands:1,modelComplexity:0,minDetectionConfidence:.5,minTrackingConfidence:.5});
    this.hands.onResults(results => { if (!this.stopped) this.onResults(results); });
    const tick = async () => {
      if (this.stopped) return;
      const video = this.videoElement;
      if (video.readyState >= 2 && video.currentTime !== this.lastVideo) {
        this.lastVideo = video.currentTime;
        try {
          this.pending = this.hands.send({image:video});
          await this.pending;
        }
        catch { this.handsData = {left:null,right:null}; }
        finally { this.pending = null; }
      }
      if (!this.stopped) this.frame = setTimeout(tick,50);
    };
    this.frame = setTimeout(tick,0);
    this.isReady = true;
    this.status = 'Hand Tracking Active';
  }

  stop() {
    this.stopped = true;
    this.isReady = false;
    clearTimeout(this.frame);
    const stream = this.videoElement.srcObject;
    stream?.getTracks().forEach(t => t.stop());
    this.videoElement.srcObject = null;
    this.handsData = {left:null,right:null};
    const hands = this.hands;
    this.hands = null;
    if (hands) Promise.resolve(this.pending).catch(() => {}).then(() => hands.close()).catch(() => {});
  }

  onResults(results) {
    this.handsData.left = null;
    this.handsData.right = null;
    if (results.multiHandLandmarks) {
      for (const [index, landmarks] of results.multiHandLandmarks.entries()) {
        const label = results.multiHandedness[index].label;
        const gesture = this.detectGesture(landmarks);
        const x = (landmarks[0].x + landmarks[9].x) / 2;
        const y = (landmarks[0].y + landmarks[9].y) / 2;
        const pinchDist = Math.hypot(landmarks[4].x - landmarks[8].x, landmarks[4].y - landmarks[8].y);
        const handInfo = { x, y, landmarks, gesture, pinchDistance: pinchDist };
        if (label === 'Left') {
            if (!this.smoothedLeft) this.smoothedLeft = handInfo;
            else {
                this.smoothedLeft.x = this.lerp(this.smoothedLeft.x, handInfo.x, this.smoothingFactor);
                this.smoothedLeft.y = this.lerp(this.smoothedLeft.y, handInfo.y, this.smoothingFactor);
                this.smoothedLeft.gesture = handInfo.gesture;
            }
            this.handsData.left = this.smoothedLeft;
        } else {
            if (!this.smoothedRight) this.smoothedRight = handInfo;
            else {
                this.smoothedRight.x = this.lerp(this.smoothedRight.x, handInfo.x, this.smoothingFactor);
                this.smoothedRight.y = this.lerp(this.smoothedRight.y, handInfo.y, this.smoothingFactor);
                this.smoothedRight.gesture = handInfo.gesture;
            }
            this.handsData.right = this.smoothedRight;
        }
      }
    }
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        this.smoothedLeft = null;
        this.smoothedRight = null;
    }
  }

  lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
  }

  detectGesture(landmarks) {
    const fingers = [8, 12, 16, 20];
    const knuckles = [6, 10, 14, 18];
    let openCount = 0;
    for (let i = 0; i < 4; i++) {
        if (landmarks[fingers[i]].y < landmarks[knuckles[i]].y) openCount++;
    }
    if (openCount === 0) return 'fist';
    return 'neutral';
  }

  getRightHand() { return this.handsData.right; }
  getLeftHand() { return this.handsData.left; }
  getStatus() { return this.status; }
}
