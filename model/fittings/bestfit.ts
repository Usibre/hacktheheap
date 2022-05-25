class BestFitHeap extends Heap {

  add(newBlock : Block, alignment:number = 1) : number {
    let size = newBlock.size;
    let smallestFittingEmpty : Block = null;
    let index : number;
    let offset : number;
    let off:number;
    // find the smallest fitting empty block
    for (let i = 0; i < this.CurrentLayout.length; i++) {
      let currentBlock : Block = this.CurrentLayout[i];
      off = (alignment-(this._absolute_offset(i,0)%alignment))%alignment;
      if (currentBlock.empty && currentBlock.size >= size+off) {
        if (smallestFittingEmpty === null ||
            smallestFittingEmpty.size > currentBlock.size) {
          smallestFittingEmpty = currentBlock;
          index = i;
          offset = off;
        }
      }
    } // end for
    if (smallestFittingEmpty === null) {
      // We did not find any space. Either extend the heapsize or return failure
      if (this.extend()) return this.add(newBlock);
      return -1;
    }
    // found, add here
    if (this.addAtIndexOffset(index, offset, newBlock)) {
      this._changed_feedback.changed();
      if (offset > 0)
        return this._absolute_offset(index+1, 0);
      return this._absolute_offset(index, 0);
    }
    return -1;
  }

  public malloc(size : number, name:string, itag:string='', bty:string='') : number {
    let b : Block = this.getBlock(size,name,itag, bty);
    return this.add(b);
  }
  public calloc(nmemb : number, size : number, name : string, itag:string='', bty:string='') : number {
    return this.malloc(nmemb*size, name, itag, bty);
  }
  public memalign(alignment : number, size : number, name : string, itag:string='', bty:string='') : number {
    let b : Block = this.getBlock(size, name, itag, bty);
    return this.add(b, alignment);
  }
} // end class
