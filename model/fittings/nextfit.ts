class NextFitHeap extends Heap {
  protected pointer : number = 0;
  protected offset : number = 0;

  add(newBlock : Block, alignment:number=1) : number {

    let size : number = newBlock.size;
    let heaplength : number = this.CurrentLayout.length;
    // if we do not add the heapsize, a pointer on 0 will become -1
    // even after modulus.
    let lastpointer : number = (this.pointer-1 + heaplength)%heaplength;
    let ended : boolean = false;
    while(!ended) {
      ended = (this.pointer == lastpointer); // turns into a do while sort of
      let currentBlock : Block = this.CurrentLayout[this.pointer];
      let additional = (alignment-(this._absolute_offset(this.pointer,this.offset)%alignment))%alignment;
      if (currentBlock.empty && currentBlock.size >= size + this.offset+additional) {
        // found, add here
        this.offset  += additional;
        if (this.offset > 0) {
          // split the empty blocks into two
          // and let the pointer point towards the second one (increment)
          // Then our function will follow naturally
          let remainingSize : number = this.CurrentLayout[this.pointer].size - this.offset;
          this.CurrentLayout[this.pointer].size = this.offset;
          this.pointer++;
          this.CurrentLayout.splice(this.pointer,0,new EmptyBlock(remainingSize));
        }
        let res : boolean = this.addAtIndex(this.pointer, newBlock);
        let ptr : number = this.pointer;
        this.pointer++;
        // don't use the precomputed length because it can update in various ways
        this.pointer = this.pointer%(this.CurrentLayout.length);
        this.offset = 0;
        if (res) {
          this._changed_feedback.changed();
          return this._absolute_offset(ptr,0);
        }
        return -1;
      }
      this.pointer++;
      if (this.offset > 0) {
        // reset last pointer so we take the same block into account with
        // offset 0 instead of the given offset.
        lastpointer = (this.pointer-1 + heaplength)%heaplength;
        this.offset = 0;
      }
      this.pointer = this.pointer%heaplength;
    } // end for
    // add at the end instead
    if (this.extend()) return this.add(newBlock, alignment);
    return -1;
  }

  protected mergeEmpty(lowerId : number) : boolean {
    let lowersize : number = this.CurrentLayout[lowerId].size;
    let result : boolean = super.mergeEmpty(lowerId);
    // if merge failed or the lowest id is beyond our pointer,
    // it doesn't affect the pointer position.
    if (!result || lowerId >= this.pointer) return result;
    // If we reach this point in the code, we merged two blocks on the left
    // so our pointer moves one to the left with the merge.
    this.pointer--;
    // if we're in the middle of the merge, point towards the beginning and
    // add the size of the lower as offset.
    // note that we already decremented the pointer by one, so this
    // checks if the original pointer was in the middle.
    if (lowerId == this.pointer) {
      this.offset += lowersize;
    }
    return result;
  }
  public malloc(size : number, name:string, itag:string='', bty:string='') : number {
    let b : Block = this.getBlock(size,name,itag,bty);
    return this.add(b);
  }
  public calloc(nmemb : number, size : number, name : string, itag:string='', bty:string='') : number {
    return this.malloc(nmemb*size, name, itag,bty);
  }
  public memalign(alignment : number, size : number, name : string, itag:string='', bty:string='') : number {
    let b : Block = this.getBlock(size, name, itag, bty);
    return this.add(b, alignment);
  }

} // end class
