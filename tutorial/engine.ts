class TutorialEngine extends GameController {
  protected readonly frames : TutorialFrame[];
  protected readonly firstFrame : TutorialFrame;
  // index cache
  protected activeIndex : number;
  protected indexDirtyBit : boolean = true;
  protected tutFinished : boolean = false;
  protected customWinMessage : string;
  protected customGameCode : string = "";
  protected showImp : boolean = false;

  constructor(frames : TutorialFrame[], first : TutorialFrame, customMsg : string) {
    super();
    this.frames = frames;
    this.firstFrame = first;
    this.customWinMessage = customMsg;
  }

  prepare() : boolean {
    if (this.prepared) return true;
    this.parse();
    if (!this.puzzle_o) {
      this.puzzle_o = new Puzzle();
    }
    if (!this.createHeap()) return false;
    this.solutionString = "B";
    this.blockTypes = this.puzzle.blocks;
    this.renderEngine = new GameRenderEngine(this.heap, this.showImp);
    this.operationController = new OperationController(this.heap,
              this.puzzle.OpBlueprints, this.renderEngine.buttonRender, this);
    this.renderEngine.writeDetails(this.puzzle_o);
    return true;
  }

  showimpanyway() {
    this.showImp = true;
  }

  set postTutorialGameCode(s : string) {
    this.customGameCode = s;
  }

  start() {
    super.start();
    if (!this.tutFinished) {
      (<HTMLButtonElement>document.getElementById('resetbutton')).disabled=true;
      (<HTMLButtonElement>document.getElementById('nextgamebutton')).style.display="none";
      this.firstFrame.draw(this);
    }
  }

  overlayPress() {
    return this.button(-1);
  }

  button(i: number) {
    super.button(i);
    if (this.tutFinished) return;
    let index : number = this.findActiveIndex();
    let res : boolean;
    if (index >= 0)
      res = this.frames[index].buttonPressCallback(i, this);
    else
      res = false;
    this.indexDirtyBit = res;
  }

  finishTutorial() {
    if (this.tutFinished) return;
    this.tutFinished = true;
    if (this.customGameCode != "") {
      this.puzzleCode = this.customGameCode;
      (<HTMLButtonElement>document.getElementById('resetbutton')).disabled=false;
      this.restart();
    }
  }

  // override
  protected triggerWon() : void {
    if (this.tutFinished)
      this.renderEngine.showWinMessage(this.customWinMessage);

    // show win message is protected to only show the message once.
    // So the fact that super calls the function a second time does not matter.
    // Yet, there's no reason to call the superclass method.
  }
  // override, we don't need to save tutorial (static) puzzle solutions
  protected export() {
    return;
  }
  // override so we don't override the tutorial, even if the impossibru button
  // is shown.
  impossibleMessage() {}


  // this is not necessary if we return the derivative instead
  protected findActiveIndex() : number {
    for (let i : number = 0; i < this.frames.length; i++) {
      if (this.frames[i].active) {
        this.activeIndex = i;
        this.indexDirtyBit = false;
        return i;
      }
    }
    // no active frame and we smh missed that it had finished.
    this.finishTutorial();
    return -1;
  }

}
