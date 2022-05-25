class TutorialFrame {
  protected mType : MascotType;
  protected message : string;
  protected clickRemove : boolean;
  protected buttonRemove : boolean;
  // overlay stuff
  protected isFirst : boolean;
  protected isLast : boolean;
  protected bar : boolean = false;
  protected overlayName : string;
  protected overlayArea : HTMLDivElement;
  protected mascotImage : HTMLImageElement;
  protected textboxImage : HTMLImageElement;
  protected textArea : HTMLDivElement;
  protected overlayType : OverlayType;
  protected locking : number = 0; // 0 is default, 1 is lock, 2 is unlock
  // activity
  protected Active : boolean = false;
  // linked list system
  protected nextFrame : TutorialFrame;
  protected conditionalFrameMap : Map<number, TutorialFrame>;

  protected in_engine : boolean;

  constructor(isFirst : boolean = false, isLast : boolean = false,
        mType : MascotType = MascotType.Regular, in_engine : boolean = true) {
    this.mType = mType;
    this.isFirst = isFirst;
    this.isLast = isLast;
    this.in_engine = in_engine;
    this.overlayName = TutorialConfig.OverlayID;
    this.buttonRemove = false;
    this.clickRemove = true;
    this.conditionalFrameMap = new Map<number, TutorialFrame>();
  }

  protected createOverlay() {
    this.overlayArea = document.createElement("div");
    this.overlayArea.id = this.overlayName;
    this.overlayArea.classList.add("tutorial-overlay"); // todo: use enum
    this.overlayArea.style.position = "fixed";
    this.overlayArea.style.display = "block";
    if (this.in_engine)
      this.overlayArea.setAttribute('onclick', 'game.button(-1,-1);');
    else
      this.overlayArea.setAttribute('onclick', 'document.getElementById("' + this.overlayName + '").remove()');
    this.overlayArea.style.background = TutorialConfig.OverlayColourFallback;
    this.overlayArea.style.background = TutorialConfig.OverlayColour;
    document.body.appendChild(this.overlayArea);
    this.mascotImage = document.createElement("img");
    this.mascotImage.src = this.mascotResource;
    this.mascotImage.id = TutorialConfig.MascotID;
    this.mascotImage.classList.add("tutorial-mascot");
    this.mascotImage.classList.add("noselect");
    this.overlayArea.appendChild(this.mascotImage);
    let textContainer : HTMLDivElement = document.createElement("div");
    textContainer.style.position = "relative";
    textContainer.style.textAlign = "center";
    this.overlayArea.appendChild(textContainer);
    this.textboxImage = document.createElement("img");
    this.textboxImage.src = TutorialConfig.TextboxSource;
    this.textboxImage.id = TutorialConfig.TextBoxImageID;
    this.textboxImage.classList.add("tutorial-textimage");
    this.textboxImage.classList.add("noselect");
    textContainer.appendChild(this.textboxImage);
    this.textArea = document.createElement("div");
    this.textArea.classList.add("centered-text");
    this.textArea.classList.add("noselect");
    this.textArea.id = TutorialConfig.TextAreaID;
    textContainer.appendChild(this.textArea);
  }

  protected get mascotResource() {
    return TutorialConfig.mascotmap[this.mType];
  }


  get active() : boolean {
    return this.Active;
  }

  get text() : string {
    return this.message;
  }

  get lock() : boolean { return this.locking==1;}
  get unlock() : boolean { return this.locking==2;}
  set lock(b:boolean) { }
  set unlock(b:boolean) { }

  // dummy nops because of weird behaviour of TS with getters and setters
  // see https://stackoverflow.com/questions/38717725/why-cant-get-superclasss-property-by-getter-typescript
  set text(s:string){}
  get overlaySide() : OverlayType { return this.overlayType;}
  set overlaySide(side : OverlayType) {}
  get removeUponClick() : boolean {return this.buttonRemove;}
  set removeUponClick(click : boolean) {}
  get mascotType() : MascotType {return this.mType;}
  set mascotType(mType : MascotType) {}


  get sideKeyword() : string {
    switch (this.overlayType) {

      case OverlayType.Left: return "left";
      case OverlayType.Right: return "right";
      case OverlayType.Full:
      default: return "full";
    }
  }

  buttonPressCallback(i: number, engine : TutorialEngine = null) : boolean {
    for (let key of this.conditionalFrameMap.keys()) {
      if (key==i) {
        let overrideFrame : TutorialFrame = this.conditionalFrameMap.get(key);
        this.removeMyself();
        overrideFrame.draw(engine);
        return true;
      } else {
        ////console.log("No conditional override: " + coord.toString());
      }
    } // no conditional success
    if ((i<0 && this.clickRemove) ||
        (i>=0 && this.buttonRemove)) {
      this.removeMyself();
      if (!this.isLast && this.nextFrame)
        this.nextFrame.draw(engine);
      else if (engine)
        engine.finishTutorial();
      return true;
    }
    return false;
  } // end fn

  clickCallBack(engine : TutorialEngine = null) {
    this.buttonPressCallback(-1, engine);
  }

  draw(engine : TutorialEngine = null) {
    this.drawMyself();
    if (engine) {
      if (this.lock) engine.lock();
      else if (this.unlock) engine.unlock();
    }
  }

  protected initMyself() {
    if (this.isFirst) {
      this.createOverlay();
    } else {
      this.overlayArea = <HTMLDivElement>document.getElementById(TutorialConfig.OverlayID);
      this.mascotImage = <HTMLImageElement>document.getElementById(TutorialConfig.MascotID);
      this.textboxImage = <HTMLImageElement>document.getElementById(TutorialConfig.TextBoxImageID);
      this.textArea = <HTMLDivElement>document.getElementById(TutorialConfig.TextAreaID);
      if (!this.overlayArea) {
        console.warn("Could not find overlay elt!");
      }
      if (!this.mascotImage) {
        console.warn("Could not find the mascot elt!");
      }
    }
    if (!this.nextFrame && this.conditionalFrameMap.size <= 0)
      this.isLast = true;
  }

  protected drawMyself() {
    this.initMyself();
    if (this.clickRemove)
      this.overlayArea.style.cursor = "pointer";
    else
      this.overlayArea.style.cursor = "auto";
    this.mascotImage.src = this.mascotResource;
    this.overlayArea.classList.add("tutorial-overlay-" + this.sideKeyword);
    this.mascotImage.classList.add("tutorial-mascot-" + this.sideKeyword);
    this.textboxImage.classList.add("tutorial-textimage-" + this.sideKeyword);
    this.textArea.classList.add("centered-text-"+this.sideKeyword);
    this.textArea.innerHTML = this.text;
    switch (this.overlayType) {
      case OverlayType.Full: this.drawFull(); break;
      case OverlayType.Left: this.drawLeft(); break;
      case OverlayType.Right: this.drawRight(); break;
      default: this.drawFull(); break;
    }
    if (this.bar) {
      let mbardiv : HTMLDivElement = <HTMLDivElement>document.getElementById('stickydiv');
      mbardiv.classList.add('stickyoverlay');
    }
    this.Active = true;
  }

  protected drawFull() {
  }
  protected drawLeft() {

  }
  protected drawRight() {

  }

  public removeMyself() {
    this.Active = false;
    this.overlayArea.classList.remove("tutorial-overlay-"+this.sideKeyword);
    this.mascotImage.classList.remove("tutorial-mascot-"+this.sideKeyword);
    this.textboxImage.classList.remove("tutorial-textimage-"+this.sideKeyword);
    this.textArea.classList.remove("centered-text-"+this.sideKeyword);
    this.textArea.innerHTML = "";
    if (this.bar) {
      let mbardiv : HTMLDivElement = <HTMLDivElement>document.getElementById('stickydiv');
      mbardiv.classList.remove('stickyoverlay');
    }
    if (this.isLast) {
      this.mascotImage.style.display = "none";
      this.overlayArea.style.display = "none";
    }
  }

}



// This is a subclass to construct the tutorial, not to be used once the
// tutorial is running.
class MutableTutorialFrame extends TutorialFrame {

  constructor(isFirst : boolean = false, isLast : boolean = false,
      mType : MascotType = MascotType.Regular, in_engine : boolean = true) {
    super(isFirst, isLast, mType, in_engine);
  }

  setFollowUp(frame : MutableTutorialFrame) {
    this.nextFrame = frame;
  }
  addConditionalFollowUp(frame : MutableTutorialFrame, i: number) {
    this.conditionalFrameMap.set(i, frame);
    if (i>=0) {
      this.overlaySide = OverlayType.Left;
      this.removeUponClick = false;
    }
  }

  // dummy nops because of weird behaviour of TS with getters and setters
  // see https://stackoverflow.com/questions/38717725/why-cant-get-superclasss-property-by-getter-typescript
  get text() : string {return this.message;}
  set text(text : string) {
    this.message = text;
  }

  get overlaySide() : OverlayType {return this.overlayType;}
  set overlaySide(side : OverlayType) {
    this.overlayType = side;
  }

  get removeUponClick() : boolean {return this.clickRemove;}
  set removeUponClick(click : boolean) {
    this.clickRemove = click;
    if (this.active) {
      if (this.clickRemove)
        this.overlayArea.style.cursor = "pointer";
      else
        super.overlayArea.style.cursor = "auto";
    }
  }

  get removeUponButton() : boolean { return this.buttonRemove; }
  set removeUponButton(b : boolean) { this.buttonRemove = b; }

  get mascotType() : MascotType {return this.mType;}
  set mascotType(mType : MascotType) {
    this.mType = mType;
  }
  get showBar() : boolean { return this.bar;}
  set showBar(b : boolean) {this.bar = b; }

  get lock() : boolean { return this.locking==1;}
  get unlock() : boolean { return this.locking==2;}
  set lock(b:boolean) { if (b) this.locking=1; else if (this.locking==1)this.locking=0;}
  set unlock(b:boolean) { if (b) this.locking=2;else if (this.locking==2)this.locking=0;}

} // end class


enum OverlayType {
  Full,
  Left,
  Right
}
