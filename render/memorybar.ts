class MemoryBarRender {
  protected barcount : number = 0;
  protected bars : CanvasRenderingContext2D[] = [];
  protected readonly DivArea : HTMLDivElement;
  protected static madeSticky : boolean = false;
  protected imageArray : CanvasImageSource[] = [];
  protected HtmlArea : HTMLCanvasElement;
  protected heap : Heap;
  protected pointer : number;
  protected context : CanvasRenderingContext2D;
  protected lastRenderBlockids : number[] = [];
  protected _lock : boolean;




  constructor(heap : Heap) {
    this.DivArea = <HTMLDivElement>document.getElementById("stickydiv");
    document.getElementById('stickydiv').style.overflow = "scroll";
    document.getElementById('stickydiv').style.resize = "vertical";
    this.HtmlArea = this.addBar();
    this.heap = heap;
    this.loadImages();
    this.makeSticky();
  }
  destruct() : void {
    while (this.barcount > 0) this.removeBar();
  }
  // NOTE: Lock/unlock here does *NOT* mean that the memorybar cannot be changed
  // or so, but this is a follow from the game locking upon performing an action.
  // instead, locking means that every change belongs to the same operation.
  lock() : boolean {
    this._lock = true; return true;
  }
  unlock() : void {
    this._lock = false;
  }
  // Getters and helpers and such
  get puzzlePieceOverflow() : number {
    return RenderConfig.puzzlepieceOverflow;
  }
  get stepsize() : number {
    return this.puzzlePieceOverflow;
  }
  get piecesPerBar() : number {
    return Math.floor(this.width / this.stepsize);
  }
  get height() : number {
    return RenderConfig.barHeight;
  }
  get width() : number {
    return this.HtmlArea.width;
  }
  getBasePieceNr(index:number) {
    let baseindex:number = index % (this.imageArray.length/RenderConfig.imagesPerPuzzlePiece);
    let basenr : number = baseindex * RenderConfig.imagesPerPuzzlePiece;
    return basenr;
  }
  get ptrLocation() : number {
    return this.pointer * this.stepsize;
  }
  get images() : CanvasImageSource[] {
    return this.imageArray;
  }
  getXCenter(credit:number) {
    let realSize : number = this.sizeCountToActualSize(credit);
    if (this.pointer ==0) return this.ptrLocation+(realSize/4);
    return this.ptrLocation+(realSize/4) + this.puzzlePieceOverflow/2;
  }
  costs(b : Block) : number {
    let size : number = b.size;
    // lets scale logarithmic
    let cost : number = 0;
    while (size > 0) {
      cost +=1;
      size = Math.floor(size/RenderConfig.logarithmicScaleconst);
    }
    return cost;
  }
  sizeCountToActualSize(count : number) : number {
    return count*this.stepsize;
  }

  // Init functions
  protected loadImages() : void {
    let image : CanvasImageSource;
    for (let i : number = 0; i < RenderConfig.puzzlePieceImageSources.length; i++) {
      image = new Image();
      image.src = RenderConfig.puzzlePieceImageSources[i];
      this.imageArray.push(image);
    }
  }

  protected makeSticky() : void {
    if (MemoryBarRender.madeSticky) return;
    // make the memory bar sticky:
    // When the user scrolls the page, execute myFunction
    window.onscroll = function() {stickybar()};
    // Get the navbar
    var memorybar = document.getElementById("stickydiv");
    // Get the offset position
    //var sticky = memorybar.offsetTop;
    var sticky = memorybar.offsetTop + 150;
    // Add the sticky class to the navbar when you reach its scroll position. Remove "sticky" when you leave the scroll position
    function stickybar() {
      if (window.pageYOffset >= sticky) {
        memorybar.classList.add("sticky")
      } else {
        memorybar.classList.remove("sticky");
      }
    }
    MemoryBarRender.madeSticky = true;
  }

  resizeCanvasToDisplaySize(canvas : HTMLCanvasElement) {
     // look up the size the canvas is being displayed
     const width = canvas.clientWidth;
     const height = canvas.clientHeight;
     // If it's resolution does not match change it
     if (canvas.width !== width || canvas.height !== height) {
       canvas.width = width;
       canvas.height = height;
       return true;
     }
     return false;
  }

  // bar manipulation
  addBar() {
    let newBar : HTMLCanvasElement = <HTMLCanvasElement>document.createElement("canvas");
    newBar.id = "memoryBar" + this.barcount.toString();
    newBar.height = this.height;
    newBar.classList.add("memorybar");
    newBar.innerHTML="Your browser does not support the HTML canvas tag.";
    let ctx = newBar.getContext("2d");
    this.bars.push(newBar.getContext("2d"));
    this.DivArea.appendChild(newBar);
    this.resizeCanvasToDisplaySize(newBar);
    ctx.fillStyle = RenderConfig.mbarBackground;
    ctx.fillRect(0,0, newBar.width, newBar.height);
    this.barcount += 1;
    return newBar;
  }
  removeBar() {
    this.barcount-=1;
    let oldBar : HTMLCanvasElement = <HTMLCanvasElement>
      document.getElementById("memoryBar"+this.barcount.toString());
    this.DivArea.removeChild(oldBar);
    this.bars.pop();
  }
  resize() {
    let bar : HTMLCanvasElement;
    for (let i = 0; i < this.barcount; i++){
      bar = <HTMLCanvasElement>
          document.getElementById("memoryBar"+i.toString());
      this.resizeCanvasToDisplaySize(bar);
    }
  }


  // Drawing :D
  render() : void {
    let barIndex : number = 0;
    let credits : number = this.piecesPerBar;
    let bIndex : number = 0;
    let blocks : Block[] = [];
    let b : Block;
    let cBlockids : number[] = [];
    let bars : Block[][] = [];
    while (bIndex < this.heap.blocks) {
      while (bIndex < this.heap.blocks && credits > 0) {
        b = this.heap.block(bIndex);
        if (this.costs(b)>credits) break;
        if (!b.empty)
          cBlockids.push(b.id);
        blocks.push(b);
        credits -=this.costs(b);
        bIndex++;
      }
      bars.push(blocks);
      barIndex++;
      blocks = [];
      credits = this.piecesPerBar;
    } // end outer while (all blocks drawn)
    // now render all, potentially skipping based on collapseOn
    let collapse:boolean = (RenderConfig.collapseOn >= 0 &&
          bars.length >= RenderConfig.collapseOn);
    let drawn:number=0;
    for (let i:number = 0; i < bars.length; i++) {
      if (!collapse || !this.collapseable(bars[i]))
        this.renderBar(drawn++, bars[i]);
    }
    while (barIndex+1 < this.barcount) this.removeBar();
    if (!this._lock) // if locked, op is still running
      this.lastRenderBlockids = cBlockids;
  }
  protected collapseable(blocklist:Block[]) : boolean {
    for (let b of blocklist) {
      if (b.empty) return false;
      if (b.special) return false;
    }
    return true;
  }

  protected renderBar(barIndex:number, blocks : Block[]) {
    while (barIndex >= this.barcount) {
      this.addBar();
    }
    this.context = this.bars[barIndex];
    // fill background
    this.context.fillStyle = RenderConfig.mbarBackground;
    this.context.fillRect(0,0, this.width, this.height);
    // reset pointer
    this.pointer = 0;
    for (let i : number = 0; i < blocks.length; i++) {
      this.draw(blocks[i], i+1==blocks.length);
    }
  }
  protected draw(block:Block, is_last:boolean) {
    let credit : number = this.costs(block);
    if (block.empty) {
      this.context.fillStyle = '#000000';
      this.drawBase(block);
      this.pointer += credit;
      return;
    }
    let piecetype : number = block.itag.charCodeAt(0);
    let is_new : boolean = (-1==this.lastRenderBlockids.indexOf(block.id));
    this.drawPiece(credit, piecetype, is_last, is_new);
    this.drawBase(block);
    this.drawText(block);
    this.drawTag(block);
    if (block.special)
      this.drawSpecials(block);
    this.pointer += credit;
  }
  protected drawBase(block:Block) {
    // lets keep the background :')
    let credit : number = this.costs(block);
    let x : number = this.getXCenter(credit);
    let y = this.height/2 * 1.4;
    this.context.font = RenderConfig.smallFont;
    this.context.fillText(block.description, x, y);
  }
  protected drawText(b:Block) {
    let credit : number = this.costs(b);
    let x : number = this.getXCenter(credit);
    let y = this.height/2;
    this.context.font = RenderConfig.regularFont;
    this.context.fillText(b.name, x, y);
  }
  protected drawTag(b:Block) {
    let credit : number = this.costs(b);
    let x : number = this.puzzlePieceOverflow*.75+this.ptrLocation;
    let y = this.height/8;
    this.context.font = RenderConfig.smallFont;
    this.context.fillText(b.itag, x, y);
  }
  protected drawSpecials(b:Block) {
    let x : number = this.getXCenter(this.costs(b));
    let y = this.height/8*7;
    this.context.fillText(b.typename, x, y);
  }
  protected drawPiece(credit:number, type:number, is_last:boolean, is_new:boolean) {
    let is_first:boolean = this.pointer==0;
    if (is_last) credit=this.piecesPerBar-this.pointer;
    let basenr : number = this.getBasePieceNr(type);
    this.context.save();
    this.context.shadowBlur = 10;
    this.context.shadowOffsetY = 0;
    if (!is_new) this.context.globalAlpha = .65;
    let horizontalLoc : number = this.ptrLocation;
    let horizontalSize : number = this.puzzlePieceOverflow;
    if (is_first) {
      // replace left-piece with middle piece
      this.context.drawImage(this.images[basenr+1], horizontalLoc, 0,
          horizontalSize, this.height);
    } else {
      this.context.shadowOffsetX = -3;
      this.context.drawImage(this.images[basenr+0], horizontalLoc, 0,
          horizontalSize, this.height);
    }
    // middle section
    horizontalLoc += horizontalSize;
    horizontalSize = this.sizeCountToActualSize(credit)-horizontalSize;
    this.context.shadowOffsetX = 0;
    this.context.drawImage(this.images[basenr+1], horizontalLoc, 0,
        horizontalSize, this.height);
    // right-side overflow (onto next piece! so no drawing upon last)
    if (!is_last) {
      this.context.shadowOffsetX = 3;
      horizontalLoc += horizontalSize;
      horizontalSize = this.puzzlePieceOverflow;
      this.context.drawImage(this.images[basenr+2], horizontalLoc, 0,
          horizontalSize, this.height);
    }
    // done drawing piece, now restore and end
    this.context.restore();
    this.context.fillStyle = RenderConfig.PuzzlePieceTextColours[type%RenderConfig.PuzzlePieceTextColours.length];
    return;
  }

} // end class
