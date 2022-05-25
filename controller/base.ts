class GameController {
  protected puzzle_o : Puzzle;
  protected puzzle_code : string;
  protected puzzle_birtybit : boolean = false;
  protected prepared : boolean;
  // game vars
  protected heap : Heap;
  protected blockTypes : BlockTy[];

  protected renderEngine : GameRenderEngine;
  protected operationController : OperationController;
  protected solutionString : string;
  protected custom : boolean = false; // whether we should show the custom puzzle button
  public saved : boolean = false;
  public pid:number=-1;
  public player:string='';

  constructor() {
    this.puzzle_o = null;
  }

  set puzzle(puzzle : Puzzle) {
    this.puzzle_o = puzzle;
    this.prepared = false;
    this.puzzle_birtybit = true;
  }

  set puzzleCode(code : string) {
    this.prepared = false;
    this.puzzle_code = code;
    this.puzzle_birtybit = true;
    document.getElementById('puzzlecode').innerHTML = this.puzzle_code;
    return;
  }
  get OpController() : OperationController {
    return this.operationController;
  }

  get puzzle() : Puzzle { return this.puzzle_o; }

  // callback to rerender
  changed(force : boolean = false, render_all:boolean = false) : void  {
    if (this.puzzle.isHuge) {
      if (!force) return;
    }
    this.renderEngine.render(render_all);
    if (this.heap.size != this.puzzle_o.heapsize || render_all) {
      this.puzzle_o.heapsize = this.heap.size;
      this.puzzle_o.growtimes = this.heap.growtimes;
      this.renderEngine.writeDetails(this.puzzle_o);
    }
    if (this.heap.hasWon) {
      this.triggerWon();
    }
  }

  protected triggerWon() : void {
    this.solutionString += "S";
    this.export();
    this.renderEngine.showWinMessage();
  }

  restart() : void {
    this.pid = -1;
    this.renderEngine.destruct();
    this.heap.destruct();
    this.start();
  }

  parse() : boolean {
    if (!this.puzzle_birtybit) return true;
    let parser : PuzzleParser = new PuzzleParser(RenderConfig.AmountOfPieces);
    let puzzle : Puzzle = parser.parseData(this.puzzle_code);
    if (!puzzle) {
      console.warn("Parsing failed!");
      return false;
    } else {
      this.puzzle = puzzle;
      this.prepared = false;
      console.log("Parsing success.");
      return true;
    }
  }

  start() : void {
    if (this.parse()) {
      if (!this.prepared) this.prepare();
      document.getElementById('puzzlecode').innerHTML = this.puzzle_code;
      if (this.custom) {
        this.renderEngine.showCustom();
      }
    }
    this.changed(true);
  }

  // argument for subclass usage
  prepare(renderEngine : GameRenderEngine = null) : boolean {
    if (this.prepared) return true;
    if (!this.puzzle_o) {
      this.puzzle_o = new Puzzle();
    }
    if (!this.createHeap()) return false;
    this.solutionString = "B";
    this.blockTypes = this.puzzle.blocks;
    this.renderEngine = new GameRenderEngine(this.heap, true);
    this.operationController = new OperationController(this.heap,
              this.puzzle.OpBlueprints, this.renderEngine.buttonRender, this);
    this.renderEngine.writeDetails(this.puzzle_o);
    this.prepared = true;
    return true;
  }

  createHeap() : boolean {
    switch (this.puzzle.allocatorType) {
      case AllocateType.FirstFit:
        this.heap = new FirstFitHeap(this.puzzle, this);
        break;
      case AllocateType.NextFit:
        this.heap = new NextFitHeap(this.puzzle, this);
        break;
      case AllocateType.BestFit:
        this.heap = new BestFitHeap(this.puzzle, this);
        break;
      case AllocateType.RandomFit:
        this.heap = new RandomFitHeap(this.puzzle, this);
        break;
      case AllocateType.ListFit:
        this.heap = new SegregatedFreeListHeap(this.puzzle, this);
        break;
      case AllocateType.CustomFit:
        this.heap = new CustomFit(this.puzzle, this);
        break;
      case AllocateType.PTMalloc:
      case AllocateType.DLMalloc:
      case AllocateType.TCMalloc:
      case AllocateType.JEMalloc:
        this.heap = new MallocSVC(this.puzzle, this);
        break;
      default:
        return false;
    }
    return (!(!(this.heap)));
  }

  button(i: number) {
    this.save(i);
    this.operationController.execute(i);
  }

  save(x: number) {
    if (x < 0 ) return;
    this.solutionString += "." + x.toString();
  }

  impossibleMessage() {
    this.renderEngine.showImpossibleMessage();
  }

  showCustom() {
    this.custom = true;
  }
  lock() {
    this.renderEngine.lock();
  }
  unlock() {
    this.renderEngine.unlock();
  }

  impossible() {
    if (this.saved) return;
    let exportstring : string = "";
    exportstring += '"action":"impossible"';
    exportstring += ',"puzzlecode":"' + (this.puzzle_code)+'"';
    exportstring += ',"player":"'+this.player+'"';
    exportstring += ',"pid":"'+this.pid+'"';
    exportstring = '{'+exportstring+'}'
    fetch(`puzzles/`, {
      method: 'POST',
      headers: {'Content-Type':'application/json; charset=UTF-8'},
      body: exportstring
    })
    .then(resp => window.location.reload());
  }

  protected export() {
    if (this.saved) return;
    // encodeURIComponent
    let exportstring : string = "";
    exportstring += '"action":"export"';
    exportstring += ',"puzzlecode":"' + (this.puzzle_code)+'"';
    exportstring += ',"solution":"' + (this.solutionString)+'"';
    exportstring += ',"player":"'+this.player+'"';
    exportstring += ',"pid":"'+this.pid+'"';
    exportstring = '{'+exportstring+'}'
    this.saved=true;
    fetch(`puzzles/`, {
      method: 'POST',
      headers: {'Content-Type':'application/json; charset=UTF-8'},
      body: exportstring
    })
    .then(function(response) {
      if (response.status != 200) {
        console.warn("Saving failed!");
        console.warn(response);
      }
    });
  }


}
