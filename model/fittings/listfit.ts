class SegregatedFreeListHeap extends Heap {
  protected FreeLists : Map<number,number[]>;
  protected unsorted : number;
  constructor(puzzle : Puzzle, contr : GameController) {
    super(puzzle, contr);
    this.FreeLists = new Map();
    this.unsorted = 0;
  }


  add(newBlock : Block, alignment : number = 1) : number {
    let size = newBlock.size;
    if (this.FreeLists.has(size) && this.FreeLists.get(size).length > 0) {
      let last_index : number = this.FreeLists.get(size).length-1;
      let abs_index : number = this.FreeLists.get(size)[last_index];
      this.FreeLists.get(size).splice(last_index, 1);
      let res = this._relative_offset(abs_index);
      let alignment_addition : number = (alignment-(abs_index%alignment))%alignment;
      let index = res[0];
      let offset = res[1]+alignment_addition;
      // add here
      if (this.addAtIndexOffset(index, offset, newBlock)) {
        this._changed_feedback.changed();
        if (offset > 0)
          return this._absolute_offset(index+1, 0);
        return this._absolute_offset(index, 0);
      }
    }
    let res = this._relative_offset(this.unsorted);
    let alignment_addition : number = (alignment-(this.unsorted%alignment))%alignment;
    let index = res[0];
    let offset = res[1]+alignment_addition;
    this.unsorted += size+alignment_addition;
    if (this.addAtIndexOffset(index, offset, newBlock)) {
      this._changed_feedback.changed();
      if (offset > 0)
        return this._absolute_offset(index+1, 0);
      return this._absolute_offset(index, 0);
    }
    if (this.extend()) return this.add(newBlock, alignment);
    return -1;
  }

  protected extend() : boolean {
    return super.extend();
  }

  public malloc(size : number, name:string, itag:string='', bty:string='') : number {
    let b : Block = this.getBlock(size,name,itag,bty);
    return this.add(b);
  }
  public calloc(nmemb : number, size : number, name : string, itag:string='', bty:string='') : number {
    return this.malloc(nmemb*size, name, itag, bty);
  }
  public memalign(alignment : number, size : number, name : string, itag:string='', bty:string='') : number {
    let b : Block = this.getBlock(size, name, itag, bty);
    return this.add(b, alignment);
  }
  public free(ptr:number, is_index:boolean = false, itag:string='') : boolean {
    let [index, offset] = this._relative_offset(ptr);
    if (offset > 0 || index < 0 || index >= this.blocks) return false;
    let b:Block = this.block(index);
    if (b.empty) return false;
    let size:number = b.size;
    if (this._removeByIndex(index)) {
      if (!this.FreeLists.get(size))
        this.FreeLists.set(size, []);
      this.FreeLists.get(size).push(ptr);
      return true;
    }
    return false;
  }
} // end class
