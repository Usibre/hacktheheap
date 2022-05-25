abstract class Heap {
  protected Size : number;
  protected CurrentLayout : Block[];
  protected bugTy : AttackType;
  //protected metaType : AllocateMetadata;
  protected extendIfFullBy : number;
  protected maxExtends : number;
  protected wincondition : Wincondition;
  protected won : boolean;
  protected _changed_feedback : GameController;
  protected blocktys : BlockTy[] = [];
  public lastOp : Operationv2;
  // to be filled in by the fitting strategy, e.g. firstfit, nextfit, etc.


  constructor(puzzle : Puzzle, contr : GameController) {
    this._changed_feedback = contr;
    this.Size = puzzle.heapsize;
    this.CurrentLayout = puzzle.initHeapSetup;
    if (puzzle.initHeapSetup.length==0)
      this.CurrentLayout.push(new EmptyBlock(puzzle.heapsize));
    this.bugTy = puzzle.attackType;
    //this.metaType = metaType;
    this.maxExtends = puzzle.growtimes;
    this.extendIfFullBy = puzzle.growsize;
    this.wincondition = Wincondition.getWinCondition(this.bugTy);
    this.won = false;
    this.clean();
  }
  destruct() {}

  get smallestSize() : number {
    let smallest : number = -1;
    for (let i = 0; i < this.CurrentLayout.length; i++) {
      if (this.CurrentLayout[i].empty) continue;
      if (smallest < 0 || smallest > this.CurrentLayout[i].size)
        smallest = this.CurrentLayout[i].size;
    }
    return smallest;
  }

  forceRender(force:boolean=true) : void {
    this._changed_feedback.changed(force);
  }

  protected extend() : boolean {
    if (this.maxExtends <= 0) return false;
    if (this.extendIfFullBy <= 0) return false;
    //console.log("Extending heap by " + this.extendIfFullBy);
    this.Size += this.extendIfFullBy;
    this.CurrentLayout.push(new EmptyBlock(this.extendIfFullBy));
    this.clean();
    this.maxExtends -= 1;
    return true;
  }

  // overwrite only to be used by replay mode
  protected extendBy(amount : number, overwrite : boolean = false) : boolean {
    if (overwrite) {
      this.Size += amount;
      this.CurrentLayout.push(new EmptyBlock(amount));
      if (this.CurrentLayout[this.CurrentLayout.length-2].empty)
        this.mergeEmpty(this.CurrentLayout.length-2);
      return true;
    }
    let times : number = amount / this.extendIfFullBy;
    let res : boolean = true;
    for (let i : number = 0; i < times; i++)
      res = res && this.extend();
    return res;
  }

  protected addAtIndex(i : number, newBlock : Block) : boolean {
    let size = newBlock.size;
    if (!this.CurrentLayout[i].empty) {
      console.warn("Trying to add a block in a non-empty space (index " + i + "). ");
      console.warn(this.CurrentLayout[i]);
      return false;
    }
    if (this.CurrentLayout[i].size == size ) {
      // replace if size is equal
      this.CurrentLayout.splice(i,1,newBlock);
    } else if (this.CurrentLayout[i].size > size) {
      // make the empty block smaller if not
      this.CurrentLayout.splice(i,0,newBlock);
      this.CurrentLayout[i+1].size -= size;
    } else {
      console.warn("Trying to add a block in a space too small (index " + i + "). ");
      console.warn(this.CurrentLayout[i]);
      return false;
    }
    return true;
  }

  protected addAtIndexOffset(i: number, offset : number, newBlock : Block) : boolean {
    if (offset == 0) return this.addAtIndex(i, newBlock);
    if (!this.CurrentLayout[i].empty || this.CurrentLayout[i].size < offset + newBlock.size) {
      console.warn("Incorrect index/offset given to add at index+offset!");
      console.warn("index: " + i.toString(10) + ", offset: " + offset.toString(10));
      return false;
    }
    this.CurrentLayout[i].size -= offset;
    let firstEmpty : EmptyBlock = new EmptyBlock(offset);
    this.CurrentLayout.splice(i,0,firstEmpty);
    return this.addAtIndex(i+1, newBlock);
  }

  addAtAbsLocation(offset: number, newBlock: Block) : boolean {
    let index, rel_offset : number;
    [index, rel_offset] = this._relative_offset(offset);
    return this.addAtIndexOffset(index, rel_offset, newBlock);
  }

  getBlockById(blockId : number) : Block {
    let index = this.getIndexFromId(blockId);
    if (index < 0) return null;
    if (index >= this.CurrentLayout.length) return null;
    return this.CurrentLayout[index];
  }

  getIndexFromId(blockId : number) : number {
    for (let i = 0; i < this.CurrentLayout.length; i++) {
      let currentBlock = this.CurrentLayout[i];
      if (currentBlock.id == blockId) {
        return i;
      }
    }
      // failed to find
      return -1;
  }

  getIndexFromItag(itag:string) : number {
    for (let i = 0; i < this.CurrentLayout.length; i++) {
      if (this.CurrentLayout[i].itag == itag) return i;
    }
    return -1;
  }

  getPrevFromId(blockId : number) : Block {
    let index : number = this.getIndexFromId(blockId)-1;
    if (!this.validIndex(index))
      return null;
    return this.block(index);
  }

  getNextFromId(blockId : number) : Block {
    let index : number = this.getIndexFromId(blockId)+1;
    if (!this.validIndex(index))
      return null;
    return this.block(index);
  }

  protected validIndex(index : number) {
    return (index >= 0 && index < this.blocks);
  }

  block(index : number) : Block {
    if (index < 0 || index >= this.blocks) return null;
    return this.CurrentLayout[index];
  }

  get blocks() : number {
    return this.CurrentLayout.length;
  }

  get wc() : Wincondition { return this.wincondition;}

  get size() : number { return this.Size; }
  get growtimes() : number { return this.maxExtends;}

  removeById(blockId : number, prevop_id : number = -1) : boolean {
    let index : number = this.getIndexFromId(blockId);
    if (index == -1) {
      // failed to find
      console.warn("Could not find the index from id " + blockId);
      return false;
    }
    if (this._removeByIndex(index)) {
      this._changed_feedback.changed();
      return true;
    }
    return false;
  }

  triggerBug(abs_offset : number, opTy : string) : boolean {
    let [index, off] = this._relative_offset(abs_offset);
    if (this.wincondition.win(this, index, opTy)) {
      this.won = true;
      return true;
    }
    return false;
  }

  get hasWon() : boolean { return this.won; }

  protected clean() : boolean {
    let total : number = this.CurrentLayout[0].size;
    for (let i = 1; i < this.CurrentLayout.length; i++) {
      total += this.CurrentLayout[i].size;
      if (this.CurrentLayout[i-1].empty && this.CurrentLayout[i].empty) {
        let b1 : boolean = this.mergeEmpty(i-1);
        i--;
      }
    }
    if (total == this.Size)
      return false;
    if (total < this.Size) {
      this.CurrentLayout.push(new EmptyBlock(this.Size - total));
      // we potentially add a new empty next to an empty.
      // we could check for this for efficiency but maybe later.
      return this.clean();
    } else if (total > this.Size) {
      console.warn("CRITICAL! Current layout is " + String(total-this.Size) + " bigger than the max!!!");
    }
  }

  protected mergeEmpty(lowerId : number) : boolean {
    if( !(lowerId >= 0 && lowerId+1 < this.CurrentLayout.length)) {
      console.warn("Out of Range Error!");
      return false;
    }
    if (!this.CurrentLayout[lowerId].empty ||
        !this.CurrentLayout[lowerId+1].empty) {
      console.warn("Invalid empty Error!");
      return false;
    }
    let additionalSize = this.CurrentLayout[lowerId+1].size;
    this.CurrentLayout.splice(lowerId+1, 1);
    this.CurrentLayout[lowerId].size += additionalSize;
    return true;
  }

  // merge remove by index, merging adjacent empty blocks
  // We could replace this with a single splice with a call to clean()
  // but this implementation should be solid and more efficient anyway
  protected _removeByIndex(index : number) : boolean {
    if( !(index >= 0 && index < this.CurrentLayout.length)) {
      console.warn("Out of Range Error!");
      return false;
    }
    let size = this.CurrentLayout[index].size;
    this.CurrentLayout.splice(index,1,new EmptyBlock(size));
    if (index > 0 && this.CurrentLayout[index-1].empty) {
      // left-side merge
      this.mergeEmpty(index-1);
      index--;
    }
    if (index+1 < this.CurrentLayout.length && this.CurrentLayout[index+1].empty) {
      // right-side merge
      this.mergeEmpty(index);
    }
    return true;
  } // end remove by index

  protected _relative_offset(abs_offset : number) : number[] {
    let i : number = 0;
    while (abs_offset >= this.CurrentLayout[i].size) {
      abs_offset -= this.CurrentLayout[i].size;
      i+=1;
      if (i >= this.CurrentLayout.length) return [-1,-1];
    }
    return [i, abs_offset];
  }

  protected _absolute_offset(index : number, offset : number) : number {
    let i : number = 0;
    let abs_offset = 0;
    while (i < index) {
      abs_offset += this.CurrentLayout[i].size;
      i += 1;
    }
    return abs_offset + offset;
  }

  protected getBlock(size:number, name:string, itag:string='', ty:string = 'R') : Block {
    if ("E"==ty) return new EmptyBlock(size);
    let bty : BlockTy = this.getBlockTy(size, name,ty);
    let b : Block = new Block(bty);
    b.itag=itag;
    return b;
  }

  protected getBlockTy(size:number, name:string, ty:string='R') : BlockTy {
    let bty : BlockTy;
    for (bty of this.blocktys) {
      if (bty.name==name&&bty.size==size&&bty.tyChar==ty)
        return bty;
    }
    bty = new BlockTy(size, name);
    if ('b'==ty.toLowerCase()) bty.bugged = true;
    if ('t'==ty.toLowerCase()) bty.target = true;
    this.blocktys.push(bty);
    return bty;
  }

  public malloc(size:number, name:string, itag:string='', bty:string='') : number {
    console.log("todo.");
    return 0;
  }
  public calloc(nmemb:number, size:number,name:string, itag:string='', bty:string='') : number {
    console.log("todo.");
    return 0;
  }
  public memalign(alignment:number, size:number, name:string, itag:string='', bty:string='') : number {
    console.log("todo.");
    return 0;
  }
  public realloc(ptr:number, size:number, is_index:boolean = false, itag:string='', bty:string='') : number {
    let [index, offset] = this._relative_offset(ptr);
    if (offset > 0) return -1;
    if (index >= this.CurrentLayout.length) return -1;
    let b : Block = this.CurrentLayout[index];
    if (itag!='' && b.itag!=itag) console.warn("Warning! "+itag+"!="+b.itag);
    if (bty==''||bty.toUpperCase()=='R') bty = b.tyChar;
    if (b.size == size) return ptr;
    if (b.size > size) {
      let leftover : number = b.size - size;
      let empty : EmptyBlock = new EmptyBlock(leftover);
      this.CurrentLayout.splice(index+1, 0, empty);
      this.CurrentLayout[index].size = size;
      return ptr;
    }
    // the alloc needs to grow
    let extra : number = size - b.size;
    if (this.CurrentLayout.length > index+1 &&
          this.CurrentLayout[index+1].empty &&
          this.CurrentLayout[index+1].size >= extra) {
      this.CurrentLayout[index].size = size;
      this.CurrentLayout[index+1].size -= extra;
      if (this.CurrentLayout[index+1].size == 0)
        this.CurrentLayout.splice(index+1,1);
    } else {
      // just free and realloc then
      if (this._removeByIndex(index))
        return this.malloc(size, b.name, itag, bty);
    }
    return -1;
  }
  public free(ptr : number, is_index : boolean = false, itag:string='') : boolean {
    let [index, offset] = this._relative_offset(ptr);
    if (offset > 0) return false;
    return this._removeByIndex(index);
  }
  public mallopt(param : number, value : number, itag:string='') {
    return;
  }
  public commit() {
    this._changed_feedback.changed();
    return;
  }
}

class DummyHeap extends Heap {
  constructor(contr : GameController, p : Puzzle) {

    super(p,contr);
  }

}
