class OperationController {
  protected heap : Heap;
  protected controller : GameController;
  protected buttonBar : ButtonBarRender;
  protected operationBlueprints : OperationBlueprint[];
  protected currentOperations : Operationv2[] = [];
  protected conditionalBlueprints : OperationBlueprint[] = [];
  protected tagMap : [string,Operationv2][] = [];
  protected conditionalOperations : Operationv2[] = [];
  // counter per tag to keep track what the next free itag is
  protected tagids : Map<string,number>;
  protected isHuge : boolean = false;

  protected async_lock : boolean = false;

  constructor(heap: Heap, operationlist : OperationBlueprint[],
          buttonbar : ButtonBarRender,
          basecontroller : GameController) {
    this.heap = heap;
    this.isHuge = basecontroller.puzzle.isHuge;
    this.controller = basecontroller;
    this.buttonBar = buttonbar;
    this.operationBlueprints = operationlist;
    this.tagids = new Map();
    this.populate();
  }
  async delay(ms: number) {
    await new Promise<void>(resolve => setTimeout(()=>resolve(), ms)).then(()=>{});
  }

  protected populate() {
    this.buttonBar.reset();
    let inits : Operationv2[] = [];
    for (let opbp of this.operationBlueprints) {
      if (opbp.init) inits.push(new Operationv2(opbp, this));
      else if (opbp.isbaseop) {
        this.addOp(new Operationv2(opbp, this));
      } else {
        this.conditionalBlueprints.push(opbp);
      }
    }
    for (let op of inits) {
      this.executeOp(op);
    }
  }
  async execute(opindex : number) {
    if (opindex < 0 || opindex >= this.currentOperations.length) return;
    let op : Operationv2 = this.currentOperations[opindex];
    this.executeOp(op);
  }

  protected async executeOp(op : Operationv2) {
    if (!op.complete) {
      console.warn("Illegal operation!");
      return;
    }
    this.controller.lock();
    await op.execute(this.heap, this.isHuge).then(
      (response) => {
        this.process_map(response, op);
        this.controller.unlock();
        this.controller.changed(true);
      }
    );
  }

  process_map(result_map : Map<string,number>, op : Operationv2) {
    let creates = op.creates;
    let itag : string;
    let saved_tag : string;
    for (let [tag,value] of result_map) {
      itag = this.getItag(tag, op);
      this.process_tag(itag,value);
    }
  }

  protected process_tag(itag : string, val : number) {
    let tag : string = this.baretag(itag);
    if (tag.charAt(0)=='-') tag = tag.substr(1);
    for (let bp of this.conditionalBlueprints) {
      if (bp.reqTags.indexOf(tag)<0) continue;
      this.process_tag_bp(itag, val, bp);
    }
  }

  protected process_tag_bp(itag:string, val:number, bp:OperationBlueprint) {
    let unmap : boolean = false;
    if (itag.charAt(0)=='-') {
      unmap = true;
      itag = itag.substr(1);
    }
    let op : Operationv2 = this.get_op(itag, bp);
    let in_use : boolean = this.currentOperations.indexOf(op)>=0;
    let bare : string = this.baretag(itag);
    if (unmap) {
     op.unmap(itag,val);
     let incomplete:boolean = !op.complete;
     if (in_use && incomplete) {
       this.removeOp(op);
     }
     this.tagmap_delete(itag, op);
    } else {
      op.map(itag, val);
      if (this.tagMap.indexOf([itag,op])<0) {
        this.tagMap.push([itag,op]);
      }
      if (!in_use && op.complete) {
        this.addOp(op);
      }
    }
  }
  protected addOp(operation : Operationv2) {
    this.currentOperations.push(operation);
    this.buttonBar.addButton(operation.text, operation.description);
  }
  protected removeOp(operation : Operationv2) {
    let index : number = this.currentOperations.indexOf(operation);
    if (index<0) return;
    this.buttonBar.removeButton(index);
    this.currentOperations.splice(index, 1);
  }

  baretag(itag:string) {
    let splitindex : number = itag.indexOf(".");
    if (splitindex < 0) return itag;
    return itag.substr(0,splitindex);
  }
  newItag(tag : string, op:Operationv2 = null) {
    if (tag.indexOf('.')!=-1) return tag;
    let rm : boolean = false;
    if (tag.charAt(0)=='-') { rm=true;tag = tag.substr(1);}
    if (!this.tagids.has(tag)) this.tagids.set(tag, 0);
    let id : number = this.tagids.get(tag);
    this.tagids.set(tag, id+1);
    tag = this.tagToItag(tag, id);
    if (op !== null && this.tagMap.indexOf([tag,op])<0&&!rm)
      this.tagMap.push([tag,op]);
    if (rm) return '-'+tag;
    return tag;

  }
  getItag(tag:string, op:Operationv2) {
    let rm : boolean = false;
    if (tag.indexOf('.')!=-1) return tag;
    if (tag.charAt(0)=='-') { rm=true;tag = tag.substr(1);}
    for (let [itag, listop] of this.tagMap) {
      if (!listop.equals(op)) continue;
      if (this.baretag(itag)!=tag) continue;
      if (rm) return '-'+itag;
      return itag;
    }
    return this.newItag(tag);
  }
  protected tagToItag(tag : string, index : number) {
    return tag + '.' + index.toString();
  }

  protected get_op(itag:string, bp:OperationBlueprint) : Operationv2 {
    for (let [list_itag, op] of this.tagMap) {
      if (bp.equals(op.blueprint)) {
        if (list_itag==itag) {
          return op;
        }
      }
    }
    // now check unfilled ops
    for (let op of this.conditionalOperations) {
      if (!op.blueprint.equals(bp)) continue;
      if (!op.requires(itag)) continue;
      if (this.tagMap.indexOf([itag,op])<0)
        this.tagMap.push([itag,op]);
      return op;
    }
    // still nothing, means new op
    let op : Operationv2 = new Operationv2(bp, this);
    this.tagMap.push([itag,op]);
    this.conditionalOperations.push(op);
    return op;
  }

  protected tagmap_delete(itag:string, op:Operationv2) {
    let index:number = this.tagMap.indexOf([itag,op]);
    while (index >= 0) {
      this.tagMap.splice(index,1);
      index = this.tagMap.indexOf([itag,op]);
    }
    return;
  }
}
