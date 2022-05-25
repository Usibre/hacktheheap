/* In this class we have a number of choices.
** Randomness could be implemented in a number of ways here.
** We randomly search through all blocks until we found an empty block big enough.
** Additionally, we either randomly choose an offset of this empty block where
** the allocation would fit by setting randomiseOffset to true, but this
** generally breaks any space efficiency on the heap.
*/
class RandomFitHeap extends Heap {
  protected randomiseOffset : boolean = false;
  add(newBlock : Block, alignment:number=1) : number {
    let indices : number[] = Array.from(Array(this.CurrentLayout.length).keys());
    let size = newBlock.size;
    let offset :number;
    let index:number;
    while (indices.length > 0) {
      // okay the indices start off as equal to the values, so it may seem
      // redundant to index into indices, but we remove invalid options on a
      // failure, meaning we will have to index or have poor performance.
      let randomIndex : number = Math.floor(Math.random() * indices.length);
      index = indices[randomIndex];
      let currentBlock : Block = this.CurrentLayout[index];
      offset = (alignment-(this._absolute_offset(index,0)%alignment))%alignment;
      if (currentBlock.empty && currentBlock.size >= size+offset) {
        if (this.addAtIndexOffset(index, offset, newBlock)) {
          this._changed_feedback.changed();
          if (offset > 0)
            return this._absolute_offset(index+1, 0);
          return this._absolute_offset(index, 0);
        }
        return -1;
      }
      indices.splice(randomIndex,1);
    }
    if (this.extend()) return this.add(newBlock);
    return -1;
  }
  public malloc(size : number, name:string, itag:string='', bty:string='') : number {
    let b : Block = this.getBlock(size,name, itag, bty);
    return this.add(b);
  }
  public calloc(nmemb : number, size : number, name : string, itag:string, bty:string) : number {
    return this.malloc(nmemb*size, name, itag, bty);
  }
  public memalign(alignment : number, size : number, name : string, itag:string='', bty:string='') : number {
    let b : Block = this.getBlock(size, name, itag, bty);
    return this.add(b, alignment);
  }





} // end class
