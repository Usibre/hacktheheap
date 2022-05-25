class FirstFitHeap extends Heap {

  add(newBlock : Block) : boolean {
    let size = newBlock.size;
    for (let i = 0; i < this.CurrentLayout.length; i++) {
      let currentBlock : Block = this.CurrentLayout[i];
      if (currentBlock.empty && currentBlock.size >= size) {
        // found, add here
        if (this.addAtIndex(i, newBlock)) {
          this._changed_feedback.changed();
          return true;
        }
        return false;
      }
    } // end for
    // add at the end instead
    if (this.extend()) return this.add(newBlock);
    return false;
  }
  _add(newBlock : Block) : number {
    let size = newBlock.size;
    for (let i = 0; i < this.CurrentLayout.length; i++) {
      let currentBlock : Block = this.CurrentLayout[i];
      if (currentBlock.empty && currentBlock.size >= size) {
        // found, add here
        if (this.addAtIndex(i, newBlock)) {
          this._changed_feedback.changed();
          return this._absolute_offset(i,0);
        }
        return -1;
      }
    } // end for
    // add at the end instead
    if (this.extend()) return this._add(newBlock);
    return -1;
  }

  public malloc(size : number, name:string, itag : string = '', bty:string='') : number {
    let b : Block = this.getBlock(size,name, itag, bty);
    return this._add(b);
  }
  public calloc(nmemb : number, size : number, name : string, itag:string='', bty:string='') : number {
    return this.malloc(nmemb*size, name, itag, bty);
  }
  public memalign(alignment : number, size : number, name : string, itag:string='', bty:string='') : number {
    let b : Block = this.getBlock(size,name, itag, bty);
    for (let i = 0; i < this.CurrentLayout.length; i++) {
      let currentBlock : Block = this.CurrentLayout[i];
      if (currentBlock.empty && currentBlock.size >= size) {
        let offset : number = (alignment-(this._absolute_offset(i,0)%alignment))%alignment;
        // found, add here
        if (currentBlock.size >= size+offset) {
          if (this.addAtIndexOffset(i, offset, b)) {
            this._changed_feedback.changed();
            return this._absolute_offset(i,offset);
          }
        }
        return -1;
      }
    } // end for
    // add at the end instead
    if (this.extend()) return this.memalign(alignment, size, name);
    return -1;
  }


} // end class
