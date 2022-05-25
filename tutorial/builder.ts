class TutorialBuilder {
  protected framesCreated : MutableTutorialFrame[] = [];
  protected firstFrame : MutableTutorialFrame = null;
  // Options
  protected isFirst : boolean = false;
  protected isLast : boolean = false;
  protected showBar : boolean = false;
  protected lock:boolean = false;
  protected unlock:boolean = false;
  protected side : OverlayType = OverlayType.Full;
  protected mascotType : MascotType;

  // tutengine specifics
  protected customMsg : string = "";
  protected customGame : string = "";
  // more?

  constructor() {

  }

  finalise() {
    let engine : TutorialEngine = new TutorialEngine(this.framesCreated, this.firstFrame, this.customMsg);
    engine.postTutorialGameCode = this.customGame;
    return engine;
  }

  addMessage(text : string,  followsOn : MutableTutorialFrame = null, options : string = "") : MutableTutorialFrame {
    if (!followsOn) {
      options += "|first";
    }
    let frame : MutableTutorialFrame = this.defaultFrame(text, options);
    frame.removeUponClick = true;
    if (followsOn) {
      followsOn.setFollowUp(frame);
    }
    return frame;
  }

  addButtonConditional(text : string, followsOn : MutableTutorialFrame = null,
          i : number, options : string = "") : MutableTutorialFrame {
    // hmm
    this.parseOptions(options);
    if (!followsOn || this.isFirst) {
      console.warn("Tutwarn: conditional cannot be a first one.");
    }
    let frame : MutableTutorialFrame = this.defaultFrame(text, options);
    frame.removeUponClick = false; 
    followsOn.addConditionalFollowUp(frame, i);
    followsOn.overlaySide = OverlayType.Left;
    return frame;
  }
  addButtonElse(text : string, followsOn : MutableTutorialFrame = null, options : string = "") : MutableTutorialFrame {
    followsOn.removeUponClick = false;
    followsOn.removeUponButton = true;
    followsOn.overlaySide = OverlayType.Left;
    return this.addMessage(text, followsOn, options);;
  }

  addExistingMessage(existingFrame : MutableTutorialFrame, followsOn : MutableTutorialFrame = null, options : string = "") {
    this.parseOptions(options);
    if (!followsOn || this.isFirst) {
      this.setFirst(existingFrame);
    }
    if (this.isLast) {
      console.warn("Wtf? last frame but already created?");
    }
    if (followsOn) {
      followsOn.setFollowUp(existingFrame);
      followsOn.removeUponClick = true;
      followsOn.removeUponButton = false;
    }
    return existingFrame;
  }

  addExistingButtonConditional(existingFrame : MutableTutorialFrame,
          followsOn : MutableTutorialFrame = null, i: number, options : string = "") : MutableTutorialFrame {
    if (!followsOn || this.isFirst) {
      this.setFirst(existingFrame);
    } else {
      followsOn.addConditionalFollowUp(existingFrame, i);
      followsOn.overlaySide = OverlayType.Left;
    }
    if (this.isLast) {
      console.warn("Wtf? last frame but already created?");
    }
    return existingFrame;
  }

  addExistingButtonElse(existingFrame : MutableTutorialFrame,
          followsOn : MutableTutorialFrame = null, options : string = "") : MutableTutorialFrame {
    followsOn.removeUponClick = false;
    followsOn.removeUponButton = true;
    followsOn.overlaySide = OverlayType.Left;
    return this.addExistingMessage(existingFrame, followsOn, options);
  }

  // can't be arsed to make another enum for msgType rn, so TODO :)
  // ANOTHER TODO: escape and unescape the delimiter (":" rn)
  setWinMessage(msgType : string, location : string, message : string) {
    this.customMsg = msgType + ":" + location + ":" + message;
  }

  set postTutGame(code : string) {
    this.customGame = code;
  }

  protected defaultFrame(text: string, options : string) : MutableTutorialFrame {
    this.parseOptions(options);
    let frame : MutableTutorialFrame = new MutableTutorialFrame(this.isFirst, this.isLast);
    if (this.isFirst) {
      this.setFirst(frame);
    }
    frame.showBar = this.showBar;
    frame.text = text;
    frame.overlaySide = this.side;
    frame.mascotType = this.mascotType;
    frame.removeUponClick = true;
    frame.removeUponButton = false;
    frame.lock = this.lock;
    frame.unlock = this.unlock;
    this.framesCreated.push(frame);
    return frame;
  }

  protected setFirst(firstFrame : MutableTutorialFrame) {
    if (this.firstFrame) {
      console.warn("Multiple first frames! Oh no :( ");
    }
    this.firstFrame = firstFrame;
  }


  protected resetParseOptions() {
    this.isFirst = false;
    this.isLast = false;
    this.lock = false;
    this.unlock = false;
    this.showBar = false;
    this.side = OverlayType.Full;
    this.mascotType = MascotType.Regular;
  }

  protected parseOptions(options : string) {
    // reset the options
    this.resetParseOptions();
    let optionArray : string[] = options.split("|");
    for (let i : number = 0; i < optionArray.length; i++) {
      switch (optionArray[i].toLowerCase()) {
        case 'first':
          this.isFirst = true;
          break;
        case 'last':
          this.isLast = true;
          break;
        case 'bar':
          this.showBar = true;
          break;
        case 'left':
          this.side = OverlayType.Left;
          break;
        case 'right':
          this.side = OverlayType.Right;
          if (this.mascotType == MascotType.Regular)
            this.mascotType = MascotType.LookingLeft;
          break;
        case 'sad':
        case 'sadge':
          this.mascotType = MascotType.Sadge;
          break;
        case 'happy':
          this.mascotType = MascotType.Happy;
          break;
        case 'lock':
          this.lock = true;
          break;
        case 'unlock':
          this.unlock = true;
          break;
        case '': break;
        default:
          console.warn("Unknown tutorial option!");
          console.warn("Option: " + optionArray[i].toLowerCase());
          break;
      }
    }
  }
}
