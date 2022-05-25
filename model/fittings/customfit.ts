class CustomFit extends Heap {

  constructor(puzzle : Puzzle, contr : GameController) {
    super(puzzle, contr);
    let rpuzzle : ReplayPuzzle = <ReplayPuzzle>puzzle;
    if (rpuzzle.isHuge) {
      this.delay = async function(ms:number) { };
    }
    this.handle(rpuzzle, contr);
  } // end constructor


  async delay(ms: number) {
    await new Promise<void>(resolve => setTimeout(()=>resolve(), ms)).then(()=>{});
  }


  async handle(rpuzzle : ReplayPuzzle, contr : GameController) {
    for (let i = 0; i < rpuzzle.blocks.length; i++) {
      let loc : number = rpuzzle.locations[i];
      let bTy : BlockTy = rpuzzle.blocks[i];
      while (loc+bTy.size > this.Size) {
        // true to overwrite the usual mechanism
        if (!this.extendBy(loc+bTy.size - this.Size, true)) return;
        await this.delay(20);
        contr.changed();
      }
      switch (rpuzzle.types[i]) {
        case 'A': {  // allocate
          let b : Block = new Block(bTy);
          this.addOnLoc(loc, b);
          break;
        }
        case 'F': { // free
          this.removeOnLoc(loc);
          break;
        }
      } // end switch
      await this.delay(300);
      contr.changed();
    } // end for
    contr.changed(true);
    return;
  }

  add(newBlock : Block) : boolean {
    return false;
  }
  addOnLoc(location: number, newBlock : Block) : boolean {
    return this.addAtAbsLocation(location, newBlock);
  }
  removeOnLoc(location: number) : boolean {
    let index, rel_offset : number;
    [index, rel_offset] = this._relative_offset(location);
    if (rel_offset != 0) return false;
    return this._removeByIndex(index);
  }

} // end class
