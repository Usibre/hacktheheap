class Puzzle {
  heapsize : number = 1;
  growsize : number = 0;
  growtimes : number = 0;
  allocatorType : AllocateType = AllocateType.FirstFit;
  attackType : AttackType = AttackType.INV;
  blocks : Array<BlockTy> = [];
  initHeapSetup : Array<Block> = [] ;
  operations : Array<Operation> = [];
  initOps : Array<Operation> = [] ;
  // metavar that overrides the dynamic updating of the screen after every
  // single op
  isHuge : boolean = false;
  // For v2 solutions (opblueprints)
  OpBlueprints : OperationBlueprint[] = [];
  get buggedTags() : string[] {
    let bugged:string[] = [];
    for (let opbp of this.OpBlueprints) {
      for (let step of opbp.steps) {
        if (step.bty=="B") bugged.push(step.Tag);
      }
    }
    return bugged;
  }
  get targetTags() : string[] {
    let target:string[] = [];
    for (let opbp of this.OpBlueprints) {
      for (let step of opbp.steps) {
        if (step.bty=="T") target.push(step.Tag);
      }
    }
    return target;
  }
}

class ReplayPuzzle extends Puzzle {
  locations : Array<number> = [] ;
  types : Array<string> = []; // A / F / ...
}


enum AllocateType {
  FirstFit = 0,
  NextFit = 1,
  BestFit = 2 ,
  RandomFit = 3,
  ListFit = 4, // Segregated free lists
  CustomFit = 5, // for replay
  PTMalloc = 6,
  DLMalloc = 7,
  TCMalloc = 8,
  JEMalloc = 9,
}



// Every FA and FD can be translated into an FO by carefully placing the
// exploit operation at the right place - something that will be done automatically
// in V1 (this is V1 btw despite the directory).
enum AttackType {
  OFA = 0, // OverFlow at Allocation
  OFO = 1, // OverFlow at Operation
  OFD = 2, // Overflow at Deallocation
  OVF = 3, // Overflow at any time, for puzzle reasons
  UFA = 4, // UnderFlow at Allocation
  UFO = 5, // UnderFlow at Operation
  UFD = 6, // UnderFlow at Deallocation
  UNF = 7, // Underflow at any time
  UAF = 8, // Use-after-free
  INV = 9, // invalid
  // More?
}


enum OpStepTy {
  // New
  Malloc = 0,
  Calloc = 1,
  Memalign = 2,
  // Alter
  Realloc = 3,
  // Rm
  Free = 4,
  // Misc
  Mallopt = 5,
  ERROR = 6,
}

class OpStepBlueprint {
  protected tag : string;
  protected ty : OpStepTy;
  protected Name : string;
  protected bTy : string = "";
  public args : number[] = [];
  constructor(tag: string, ty: OpStepTy, name : string) {
    this.tag = tag;
    this.ty = ty;
    this.Name = name;
  }
  public get Tag() { return this.tag; }
  public get type() { return this.ty; }
  public get name() { return this.Name; }
  public get bty() : string { return this.bTy; }
  public set bty(s:string) {this.bTy=s;}
  public equals(other:OpStepBlueprint) {
    if (this.Tag!=other.Tag || this.type!=other.type || this.name!=other.name)
      return false;
    if (this.bty!=other.bty)
      return false;
    return true;
  }
}

class OperationBlueprint {
  isInit : boolean = false;
  steps : OpStepBlueprint[] = [];
  reqTags : string[] = [];
  reqIndices : number[] = [];
  createdTags : string[] = [];
  removedTags : string[] = [];
  public name : string;

  get init() : boolean {
    return this.isInit;
  }
  get isbaseop() : boolean {
    return this.reqTags.length < 1;
  }
  get getReqs() : [string[],number[]] {
    return [[...this.reqTags], [...this.reqIndices]]
  }
  get length() : number {
    return this.steps.length;
  }
  step(index : number) : OpStepBlueprint {
    return this.steps[index];
  }
  get laststep() : OpStepBlueprint {
    return this.step(this.length-1);
  }
  equals(opbp:OperationBlueprint) : boolean {
    if (!(this.isInit==opbp.isInit && this.name==opbp.name &&
        this.steps.length == opbp.steps.length))
      return false;
    for (let i:number=0; i < this.steps.length; i++) {
      if (!this.steps[i].equals(opbp.steps[i])) return false;
    }
    return true;
  }

  public addStep(tag : string, ty : OpStepTy, name : string) {
    switch (ty) {
      case OpStepTy.Malloc:
        this.steps.push(new MallocBlueprint(tag,ty,name));
        this.add_create();
        break;
      case OpStepTy.Calloc:
        this.steps.push(new CallocBlueprint(tag,ty,name));
        this.add_create();
        break;
      case OpStepTy.Memalign:
        this.steps.push(new MemalignBlueprint(tag,ty,name));
        this.add_create();
        break;
      case OpStepTy.Realloc:
        this.steps.push(new ReallocBlueprint(tag,ty,name));
        this.add_req();
        break;
      case OpStepTy.Free:
        this.steps.push(new FreeBlueprint(tag,ty,name));
        this.add_req();
        this.add_rm();
        break;
      case OpStepTy.Mallopt:
        this.steps.push(new MalloptBlueprint(tag,ty,name));
        break;
      default:
        console.warn("Unknown stepty? " + ty.toString());
    }
    return;
  }

  public addArg(val : number) {
    let index : number = this.steps.length-1;
    if (index < this.steps.length && index >=0)
      this.steps[index].args.push(val);
  }
  protected add_req() {
    let tag : string = this.steps[this.steps.length-1].Tag;
    if (this.createdTags.indexOf(tag)>=0) return;
    this.reqIndices.push(this.steps.length-1);
    if (this.reqTags.indexOf(tag)>=0) return;
    this.reqTags.push(tag);
  }
  protected add_create() {
    let tag : string = this.steps[this.steps.length-1].Tag;
    this.createdTags.push(tag);
  }
  protected add_rm() {
    let tag : string = this.steps[this.steps.length-1].Tag;
    if (this.createdTags.indexOf(tag)>=0) {
      this.createdTags.splice(this.createdTags.indexOf(tag,0),1);
    } else {
      this.removedTags.push(tag);
    }
  }
}

class MallocBlueprint extends OpStepBlueprint {
  get size() : number {
    if (this.args.length<1) return 0;
    return this.args[0];
  }
}
class CallocBlueprint extends OpStepBlueprint {
  get size() : number {
    if (this.args.length<2) return 0;
    return this.args[1];
  }
  get nmemb() : number {
    if (this.args.length<1) return 0;
    return this.args[0];
  }
}
class MemalignBlueprint extends OpStepBlueprint {
  get size() : number {
    if (this.args.length<2) return 0;
    return this.args[1];
  }
  get alignment() : number {
    if (this.args.length<1) return 0;
    return this.args[0];
  }
}
class ReallocBlueprint extends OpStepBlueprint {
  get size() : number {
    if (this.args.length<1) return 0;
    return this.args[0];
  }
}
class FreeBlueprint extends OpStepBlueprint {}
class MalloptBlueprint extends OpStepBlueprint {
  get param() : number {
    if (this.args.length<1) return 0;
    return this.args[0];
  }
  get value() : number {
    if (this.args.length<2) return 0;
    return this.args[1];
  }
}
