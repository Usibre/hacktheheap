class Operation{}
class Operationv2 {
  public blueprint : OperationBlueprint;
  protected unmapped : string[];
  protected indicesToMap : number[];
  protected tagmap : Map<string,[string,number]>;
  protected controller : OperationController;
  id : number;
  constructor(opbp : OperationBlueprint, controller : OperationController) {
    this.blueprint = opbp;
    [this.unmapped, this.indicesToMap] = opbp.getReqs;
    // map from tag to [index, value]
    this.tagmap = new Map();
    this.controller = controller;
    this.id = Math.floor(Math.random() * 4096);
  }
  async delay(ms: number) {
    await new Promise<void>(resolve => setTimeout(()=>resolve(), ms)).then(()=>{});
  }
  get complete() : boolean {
    return this.unmapped.length < 1;
  }
  equals(other:Operationv2) : boolean {
    if (!this.blueprint.equals(other.blueprint))
      return false;
    if (this.id != other.id)
      return false;
    return true;
  }
  requires(itag : string) : boolean {
    let baretag:string = this.controller.baretag(itag);
    if (itag.charAt(0)=='-') {itag = itag.substr(1);}
    if (this.tagmap.has(baretag) &&
      this.tagmap.get(baretag)[0]==itag)
      return true;
    return (this.unmapped.indexOf(baretag)>=0);
  }
  get creates() : string[] {
    return [...this.blueprint.createdTags];
  }
  get removes() : string[] {
    return [...this.blueprint.removedTags];
  }
  get text() : string {
    return this.blueprint.name;
  }
  get description() : string {
    let arr : string[] = [];
    for (let i = 0; i < this.blueprint.length; i++) {
      arr.push(this.getDescriptionFromIndex(i));
    }
    return arr.join("; ");
  }
  getDescriptionFromIndex(index:number) : string {
    if (RenderConfig.Names == "simplified") {
      return this._getSimplifiedDescription(index);
    }
    return this._getDescriptionFromIndex(index);
  }
  _getSimplifiedDescription(index:number) : string {
    let opstep = this.blueprint.step(index);
    let itag : string;
    let previndex : number;
    let bugged:boolean = opstep.bty=="B";
    let target:boolean = opstep.bty=="T";
    let btText : string = bugged ? ","+RenderConfig.buggedName : "";
    btText = target ? ","+RenderConfig.targetName : btText;
    switch(opstep.type) {
      case OpStepTy.Malloc:
        let mall = opstep as MallocBlueprint;
        return mall.name+"=newblock("+mall.size+btText+")";
      case OpStepTy.Calloc:
        let call = opstep as CallocBlueprint;
        return call.name+"=newblock("+call.nmemb+"*"+call.size+btText+")";
      case OpStepTy.Memalign:
        let mema = opstep as MemalignBlueprint;
        return mema.name+"=alignedblock("+mema.size+" on "+mema.alignment+btText+")";
      case OpStepTy.Realloc:
        let reall = opstep as ReallocBlueprint;
        previndex = this.createdByMyself(reall.Tag, index);
        if (previndex < 0)
          itag = this.controller.getItag(reall.Tag, this);
        else
          itag = this.blueprint.step(previndex).name;
        let name:string;
        if (reall.name.length>0)
          name = reall.name
        else
          name = itag
        return name+"=resize("+itag+" to "+reall.size+btText+")";
      case OpStepTy.Free:
        let free = opstep as FreeBlueprint;
        previndex = this.createdByMyself(free.Tag, index);
        if (previndex < 0)
          itag = this.controller.getItag(free.Tag, this);
        else
          itag = this.blueprint.step(previndex).name;
        return "remove("+itag+btText+")";
      case OpStepTy.Mallopt:
        let mallopt = opstep as MalloptBlueprint;
        return "changemode("+mallopt.param+","+mallopt.value+")";
    }
    return "UNKNOWN OP";
  }
  _getDescriptionFromIndex(index:number) : string {
    let opstep = this.blueprint.step(index);
    let itag : string;
    let previndex : number;
    let bugged:boolean = opstep.bty=="B";
    let target:boolean = opstep.bty=="T";
    let btText : string = bugged ? "->"+RenderConfig.buggedName : "";
    btText = target ? "->"+RenderConfig.targetName : btText;
    switch(opstep.type) {
      case OpStepTy.Malloc:
        let mall = opstep as MallocBlueprint;
        return mall.name+"=malloc("+mall.size+")"+btText;
      case OpStepTy.Calloc:
        let call = opstep as CallocBlueprint;
        return call.name+"=calloc("+call.nmemb+","+call.size+")"+btText;
      case OpStepTy.Memalign:
        let mema = opstep as MemalignBlueprint;
        return mema.name+"=memalign("+mema.alignment+","+mema.size+")"+btText;
      case OpStepTy.Realloc:
        let reall = opstep as ReallocBlueprint;
        previndex = this.createdByMyself(reall.Tag, index);
        if (previndex < 0)
          itag = this.controller.getItag(reall.Tag, this);
        else
          itag = this.blueprint.step(previndex).name;
        let name:string;
        if (reall.name.length>0)
          name = reall.name
        else
          name = itag
        return name+"=realloc("+itag+","+reall.size+")"+btText;
      case OpStepTy.Free:
        let free = opstep as FreeBlueprint;
        previndex = this.createdByMyself(free.Tag, index);
        if (previndex < 0)
          itag = this.controller.getItag(free.Tag, this);
        else
          itag = this.blueprint.step(previndex).name;
        return "free("+itag+")"+btText;
      case OpStepTy.Mallopt:
        let mallopt = opstep as MalloptBlueprint;
        return "mallopt("+mallopt.param+","+mallopt.value+")";
    }
    return "UNKNOWN OP";
  }
  getTag(index : number) : string {
    return this.blueprint.step(index).Tag;
  }
  createdByMyself(tag:string, maxindex:number=-1) : number {
    if (maxindex<0)maxindex=this.blueprint.length;
    let ty:OpStepTy;
    for (let i = 0; i < maxindex; i++) {
      ty=this.blueprint.step(i).type;
      switch (ty) {
        case OpStepTy.Malloc:
        case OpStepTy.Calloc:
        case OpStepTy.Memalign:
          if (this.blueprint.step(i).Tag==tag) return i;
        default:
          continue;
      }
    }
    return -1;
  }

  has(tag : string, val : number) : boolean {
    if (!this.tagmap.has(tag)) return false;
    return this.tagmap.get(tag)[1]==val;
  }
  map(itag : string, val : number) : boolean {
    let tag:string = this.controller.baretag(itag);
    if (this.tagmap.has(tag) && this.tagmap.get(tag)[0]==itag) {
      this.tagmap.set(tag, [this.tagmap.get(tag)[0], val]);
      return true;
    }
    let index : number = this.unmapped.indexOf(tag);
    if (index < 0) return false;
    this.tagmap.set(tag, [itag, val]);
    this.unmapped.splice(index,1);
    return true;
  }
  unmap(tag : string, val : number) : boolean {
    tag = this.controller.baretag(tag);
    if (!this.tagmap.has(tag)) return false;
    if (this.blueprint.getReqs[0].indexOf(tag)<0) return false;
    this.unmapped.push(tag);
    this.tagmap.delete(tag);
  }
  get_value(tag : string, execmap : Map<string,number>) : [number,boolean] {
    let tagindex,tagval : number;
    let from_this_op : boolean = false;
    if (execmap.has(tag)) {
      from_this_op = true;
      tagval = execmap.get(tag);
    } else
    if (this.tagmap.has(tag)) {
      tagval = this.tagmap.get(tag)[1];
    } else {
      console.warn("Value not found in execmap or tagmap.");
      return [-1,false];
    }
    return [tagval, from_this_op];
  }
  get_itag(tag:string) : string {
    if (this.tagmap.has(tag)) {
      return this.tagmap.get(tag)[0];
    }
    return this.controller.getItag(tag, this);
  }

  async execute(heap : Heap, skipDelay:boolean=false) : Promise<Map<string,number>> {
    let opstep : OpStepBlueprint;
    let res : number;
    let execmap = new Map<string,number>();
    let indexmap = new Map<string,number>();
    let tagval : number;
    let from_this_op : boolean;
    heap.lastOp = this;
    for (let i = 0; i < this.blueprint.length; i++) {
      opstep = this.blueprint.step(i);
      let itag : string;
      let bty : string = opstep.bty;
      switch(opstep.type) {
        case OpStepTy.Malloc:
          let mallocstep = opstep as MallocBlueprint;
          itag = this.controller.newItag(mallocstep.Tag, this);
          res = heap.malloc(mallocstep.size, mallocstep.name, itag, bty);
          if (res>=0) {
            execmap.set(itag, res);
            heap.triggerBug(res, 'A');
          }
          this.tagmap.set(mallocstep.Tag, [itag,res]);
          indexmap.set(mallocstep.Tag, i);
          break;
        case OpStepTy.Calloc:
          let callocstep = opstep as CallocBlueprint;
          itag = this.controller.newItag(callocstep.Tag, this);
          res = heap.calloc(callocstep.nmemb, callocstep.size, callocstep.name, itag, bty);
          if (res>=0) {
            execmap.set(callocstep.Tag, res);
            heap.triggerBug(res, 'A');
          }
          this.tagmap.set(callocstep.Tag, [itag,res]);
          indexmap.set(callocstep.Tag, i);
          break;
        case OpStepTy.Memalign:
          let mstep = opstep as MemalignBlueprint;
          itag = this.controller.newItag(mstep.Tag, this);
          res = heap.memalign(mstep.alignment, mstep.size, mstep.name, itag,bty);
          if (res>=0) {
            execmap.set(mstep.Tag, res);
            heap.triggerBug(res, 'A');
          }
          this.map(mstep.Tag, res);
          indexmap.set(mstep.Tag, i);
          break;
        case OpStepTy.Realloc:
          let reallocstep = opstep as ReallocBlueprint;
          tagval = this.get_value(reallocstep.Tag, execmap)[0];
          from_this_op = (this.createdByMyself(reallocstep.Tag, i)>=0);
          itag = this.get_itag(reallocstep.Tag);
          if (from_this_op && tagval<0) {
            res = heap.realloc(indexmap.get(reallocstep.Tag), reallocstep.size, true, itag,bty);
          } else {
            res = heap.realloc(tagval, reallocstep.size, false, itag,bty);
          }
          if (res>=0) {
            execmap.set(reallocstep.Tag, res);
            heap.triggerBug(res, 'A');
          }
          indexmap.set(reallocstep.Tag, i);
          this.tagmap.set(reallocstep.Tag, [itag, res]);
          break;
        case OpStepTy.Free:
          from_this_op = (this.createdByMyself(opstep.Tag, i)>=0);
          tagval = this.get_value(opstep.Tag, execmap)[0];
          itag = this.get_itag(opstep.Tag);
          let bres:boolean;
          if (from_this_op && tagval<0)
            bres = heap.free(indexmap.get(opstep.Tag), true, itag);
          else
            bres = heap.free(tagval, false, itag);
          if (bres) {
            execmap.set('-' + opstep.Tag, tagval); // deleted
            this.unmap(opstep.Tag, tagval);
            heap.triggerBug(res, 'F');
          } else {
          }
          indexmap.delete(opstep.Tag);
          break;
        case OpStepTy.Mallopt:
          let malloptstep = opstep as MalloptBlueprint;
          heap.mallopt(malloptstep.param, malloptstep.value);
          break;
        default:
          console.warn("Unknown operation :(");
      }
      if (!skipDelay) {
        heap.forceRender(false);
        await this.delay(200);
      }
    } // end for loop
    heap.commit();
    return execmap;
  }

}
