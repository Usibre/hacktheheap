class PuzzleParser {
  protected parsePtr : number;
  protected rawData : string;
  static MAGIC : string = "HPM/";
  static REPLAYMAGICv1 : string = "HPR/";
  protected puzzle : Puzzle;
  protected puzzlepieceCtr : number = 0;
  protected pieces : number;
  protected version : number = 0;
  protected replay : boolean = false;

  constructor(pieces : number) {
    this.pieces = pieces;
  }

  loadData(data : string) : void { this.rawData = data; }

  parseData(data: string) : Puzzle {
    let oldData : string = this.rawData;
    this.loadData(data);
    let p : Puzzle = this.parse();
    this.loadData(oldData);
    return p;
  }
  parse() : Puzzle {
    this.parsePtr = 0;
    this.puzzlepieceCtr = 0;
    this.puzzle = new Puzzle();
    this.prepare();
    // for heapsize, alloctype and attacktype
    if (!this.readHeader()) {
      console.warn("Failed to parse header.");
      return null;
    }
    if (this.replay) return this.puzzle;
    if (this.version == 1 ) {
      if (!this.readBlockTypes()) return null;
      console.error("V1 puzzles not supported anymore :/");
    } else if (this.version == 2) {
      console.log("Parsing v2 ops.");
      this.parseV2Ops();
    }
    return this.puzzle;
  }

  protected parseV2Ops() : boolean {
    while (this.parsePtr < this.rawData.length) {
      let opbp : OperationBlueprint = new OperationBlueprint();
      let nextChar : string = this.rawData.charAt(this.parsePtr);
      if (nextChar==".") {opbp.isInit = true; this.parsePtr++;}
      let name : string = this.parseAlphaNum();
      opbp.name = name;
      if(!(this.rawData.charAt(this.parsePtr)==":")) {
        console.warn("Weird parse problems.");
        console.warn("Expected : (after name of op '"+name+"')");
        console.warn("Instead, I got this: '" + this.rawData.substring(this.parsePtr, this.parsePtr+10) + "'");
      }
      this.parsePtr++;
      this.parseV2Opsteps(opbp);
      this.puzzle.OpBlueprints.push(opbp);
    }
    return true;
  }
  protected parseV2Opsteps(opbp : OperationBlueprint) : boolean {
    while (this.parsePtr < this.rawData.length && this.rawData.charAt(this.parsePtr)!=".") {
      this.parseV2Opstep(opbp);
    }
    while (this.parsePtr<this.rawData.length &&
        "\r\n ".indexOf(this.rawData.charAt(this.parsePtr))>=0) {
      this.parsePtr++; // remove potential whitespace
    }
      this.parsePtr++; // remove the delimiting . and potential whitespace
    while (this.parsePtr<this.rawData.length &&
        "\r\n ".indexOf(this.rawData.charAt(this.parsePtr))>=0) {
      this.parsePtr++; // remove potential whitespace
    }
    return true;
  }
  protected parseV2Opstep(opbp : OperationBlueprint) : boolean {
    let ty : OpStepTy = <OpStepTy>this.parseNr(); // 0 == Alloc for example
    let tag = this.parseStr(); // e.g. stream A
    let bty : string = 'R';
    if (this.rawData.charAt(this.parsePtr)=='&') {
      this.parsePtr++;
      bty = this.rawData.charAt(this.parsePtr++);
    }
    this.parsePtr++; // (
    let name = this.parseAlphaNum(); // name of individual item
    opbp.addStep(tag, ty, name);
    opbp.laststep.bty = bty;
    if (this.rawData.charAt(this.parsePtr)==":") {
      let val : number;
      do {
        this.parsePtr++;
        val = this.parseNr();
        opbp.addArg(val);
      } while (this.rawData.charAt(this.parsePtr)==",");
      if (!(this.rawData.charAt(this.parsePtr)==")")) {
        console.warn("Weird parse (problems).");
      }
    }
    this.parsePtr++;
    return;
  }

  protected prepare() : void {
    this.rawData = this.rawData.replace(/\s/g,'').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    BlockIdCtr.reset();
    EmptyBlockIdCtr.reset();
  }

  protected readHeader() : boolean {
    // 4B[Magic] 1B[AllocateType] 3B[AttackType]
    // <number>T [heapsize]
    // E.g. HPM/ F OFA 1024T
    // Version 2 starts with HPM2/ instead
    if (!this.checkMagic()) {
      console.warn("Parsing magic failed.");
      return false;
    }
    console.log("Parsing magic success.");
    let nextChar : string = this.rawData.charAt(this.parsePtr);
    if (nextChar == "H") {
      this.parsePtr += 1;
      this.puzzle.isHuge = true;
    }
    if (this.replay) {
      let puzzle : ReplayPuzzle = new ReplayPuzzle();
      puzzle.isHuge = this.puzzle.isHuge;
      this.puzzle = puzzle;
      if (!this.readReplay()) {
        console.warn("Reading replay steps failed!");
        return false;
      }
      return true;
    }
    if (!this.readAllocateType()) return false;
    console.log("Parsing allocty success.");
    if (!this.readAttackType()) return false;
    console.log("Parsing attty success.");
    if (!this.readHeapSize()) return false;
    console.log("Parsing heapsize success.");
    return true;
  }

  protected readReplay() : boolean {
    let nextChar : string = this.rawData.charAt(this.parsePtr);
    while (nextChar.match(/^[AF]$/)) {
      if (!this.readReplayStep()) return false;
      nextChar = this.rawData.charAt(this.parsePtr);
    }
    this.puzzle.heapsize = 64;
    this.puzzle.growsize = 32;
    this.puzzle.growtimes = 1024*1024;
    this.puzzle.allocatorType = AllocateType.CustomFit;
    return true;
  }

  protected readReplayStep() : boolean {
    let puzzle : ReplayPuzzle = <ReplayPuzzle>this.puzzle;
    let nextChar : string = this.rawData.charAt(this.parsePtr++);
    puzzle.types.push(nextChar);
    let loc = this.parseNr();
    if (loc < 0) return false;
    puzzle.locations.push(loc);
    let name : string = this.parseStr();
    if (name.length < 1) return false;
    let size : number = this.parseNr();
    if (size < 1) return false;
    let bTy : BlockTy = new BlockTy(size, name);
    if (this.pieces > 0) {
      bTy.pieceType = this.puzzlepieceCtr++%this.pieces;
    }
    puzzle.blocks.push(bTy);
    return true;
  }

  protected readBlockTypes() : boolean {
    // [name in alpha] [size in bytes] [RTB] (#[6 digits])?
    // rtb == regular, target, bugged
    // colour code is optional
    // follows on directly to the next one
    // finally, one character that's not in [a-zA-Z]
    let nextChar : string = this.rawData.charAt(this.parsePtr);
    while (nextChar.match(/^[a-zA-Z]$/)) {
      if (!this.readBlock()) return false;
      nextChar = this.rawData.charAt(this.parsePtr);
    }
    this.parsePtr++; // any random char to denote the end of this part
    return true;
  }

  protected readBlock() : boolean {
    let base : number = 10;
    let name : string = this.parseStr();
    if (name.length < 1) return false;
    let size = this.parseNr();
    if (size < 1) return false;
    let bTy : BlockTy = new BlockTy(size, name);
    let specialTy : string = this.rawData.substring(this.parsePtr, this.parsePtr+1);
    switch (specialTy) {
      case 'T':
        bTy.target = true;
        break;
      case 'B':
        bTy.bugged = true;
        break;
    }
    this.parsePtr++;
    if (this.rawData.substring(this.parsePtr, this.parsePtr+1) == "#") {
      // we only support colours of the format #[0-9a-f]{6}
      // and for now we assume this too bc I'm lazy
      bTy.colour = this.rawData.substring(this.parsePtr, this.parsePtr+7);
      this.parsePtr += 7;
    }
    if (this.pieces > 0) {
      bTy.pieceType = this.puzzlepieceCtr++%this.pieces;
    }
    this.puzzle.blocks.push(bTy);
    return true;
  }

  private checkMagic() : boolean {
    let magicLength : number = PuzzleParser.MAGIC.length;
    let magic : string = this.rawData.substring(this.parsePtr,this.parsePtr+magicLength);
    if (magic == PuzzleParser.MAGIC) {
      this.parsePtr += magicLength;
      this.version = 2;
      return true;
    }
    if (magic == PuzzleParser.REPLAYMAGICv1) {
      this.parsePtr += magicLength;
      this.version = 1;
      this.replay = true;
      return true;
    }
    if (this.rawData.substring(0, 3) == "HPM" && this.rawData.substring(4,5) == '/') {
      this.version = parseInt(this.rawData.substring(3,4), 10);
      if (this.version > 0 && this.version < 3) {
        this.parsePtr += 5;
        return true;
      }
    }
    return false;
  }

  // static single character
  protected readAllocateType() : boolean {
    let allocateChar : string = this.rawData.substring(this.parsePtr, this.parsePtr+1);
    this.parsePtr++;
    switch (allocateChar) {
      case 'F':
        this.puzzle.allocatorType = AllocateType.FirstFit;
        return true;
      case 'N':
        this.puzzle.allocatorType = AllocateType.NextFit;
        return true;
      case 'B':
        this.puzzle.allocatorType = AllocateType.BestFit;
        return true;
      case 'R':
        this.puzzle.allocatorType = AllocateType.RandomFit;
        return true;
      case 'L':
        this.puzzle.allocatorType = AllocateType.ListFit;
        return true;
      case 'P':
        this.puzzle.allocatorType = AllocateType.PTMalloc;
        return true;
      case 'D':
        this.puzzle.allocatorType = AllocateType.DLMalloc;
        return true;
      case 'T':
        this.puzzle.allocatorType = AllocateType.TCMalloc;
        return true;
      case 'J':
        this.puzzle.allocatorType = AllocateType.JEMalloc;
        return true;
      default:
        console.warn("Unknown allocate type: " + allocateChar);
        return false;
    }
    console.warn("Reaching the end of readAllocateType in the parser should be impossible. ");
  }

  // static 3 characters
  protected readAttackType() : boolean {
    let attackStr : string = this.rawData.substring(this.parsePtr, this.parsePtr+3);
    this.parsePtr+=3;
    switch (attackStr) {
      case 'OFA':
        this.puzzle.attackType = AttackType.OFA;
        return true;
      case 'OFO':
        this.puzzle.attackType = AttackType.OFO;
        return true;
      case 'OFD':
        this.puzzle.attackType = AttackType.OFD;
        return true;
      case 'OVF':
        this.puzzle.attackType = AttackType.OVF;
        return true;
      case 'UFA':
        this.puzzle.attackType = AttackType.UFA;
        return true;
      case 'UFO':
        this.puzzle.attackType = AttackType.UFO;
        return true;
      case 'UFD':
        this.puzzle.attackType = AttackType.UFD;
        return true;
      case 'UNF':
        this.puzzle.attackType = AttackType.UNF;
        return true;
      case 'UAF':
        this.puzzle.attackType = AttackType.UAF;
        return true;
      default:
        console.warn("Unknown attack type: " + attackStr);
        return false;
    }
    console.warn("Reaching the end of readAttackType in the parser should be impossible. ");
  }

  protected readHeapSize() : boolean {
    let heapsize : number = this.parseNr();
    this.parsePtr++; // the T
    this.puzzle.heapsize = heapsize;
    let nextC : string = this.rawData.charAt(this.parsePtr);
    if (nextC != "+")
      return heapsize>0;
    this.parsePtr++;
    this.puzzle.growsize = this.parseNr();
    this.puzzle.growtimes = 1;
    nextC = this.rawData.charAt(this.parsePtr);
    if (nextC == "x") {this.parsePtr++; this.puzzle.growtimes = this.parseNr();}
    return heapsize>0 && this.puzzle.growsize>0 && this.puzzle.growtimes >=0;
  }

  private parseAlphaNum() : string {
    let lookahead : number = this.parsePtr;
    while (this.rawData.charAt(lookahead).match(/^[a-zA-Z0-9]$/)) lookahead++;
    let str : string = this.rawData.substring(this.parsePtr, lookahead);
    this.parsePtr = lookahead;
    return str;
  }

  private parseStr() : string {
    let lookahead : number = this.parsePtr;
    while (this.rawData.charAt(lookahead).match(/^[a-zA-Z]$/)) lookahead++;
    let str : string = this.rawData.substring(this.parsePtr, lookahead);
    this.parsePtr = lookahead;
    return str;
  }

  private parseNr(base : number = 10) : number {
    if(!(base == 10 || base == 16)) throw new Error('Invalid base for number parsing.');
    let lookahead : number = this.parsePtr+1;
    if (base == 10)
      while (this.rawData.charAt(lookahead).match(/^[0-9]$/)) lookahead++;
    else if (base == 16) {
      if (this.rawData.charAt(lookahead)=='0' &&
          this.rawData.charAt(lookahead+1) == 'x') lookahead+=2;
      while (this.rawData.charAt(lookahead).match(/^[0-9a-fA-F]$/)) lookahead++;
    } else {
      console.warn('Invalid number parsing base.');
      throw new Error('Invalid base for number parsing.');
      return -1;
    }
    let str : string = this.rawData.substring(this.parsePtr, lookahead);
    this.parsePtr = lookahead;
    return parseInt(str, base);
  }


}
