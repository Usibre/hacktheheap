class BlockTy {
  protected static ppctr : number = 0;
  protected Size : number;
  protected isBugged : boolean;
  protected isTarget : boolean;
  protected Name : string;
  public Colour : string;
  protected puzzlePieceType : number;
  protected _tag : string;

  constructor(size: number, name: string, has_piece:boolean=true) {
    this.Size = size;
    this.isBugged = false;
    this.isTarget = false;
    this.Name = name;
    this.Colour = "#123546";
    if (has_piece) {
      this.pieceType = BlockTy.ppctr++%RenderConfig.AmountOfPieces;
    }
  }
  get name() : string { return this.Name; }
  get size() : number { return this.Size;}
  set size(s : number) {/*fml*/this.Size = s;}

  get target() : boolean { return this.isTarget;}
  get bugged() : boolean { return this.isBugged;}
  get special() : boolean {return this.target || this.bugged;}
  get tyChar() : string {
    if (this.bugged) return 'B';
    if (this.target) return 'T';
    return 'R';
  }
  set tyChar(s:string) {
    if ('B'==s.toUpperCase()) {
      this.isBugged=true;
      this.isTarget=false;
    } else
    if ('T'==s.toUpperCase()) {
      this.isTarget=true;
      this.isBugged=false;
    } else {
      this.isTarget=false;
      this.isBugged=false;
    }
  }
  get tag() : string {return this._tag;}
  set tag(s:string) {this._tag = s;}

  set bugged(b : boolean) { this.isBugged = b;}
  set target(b : boolean) { this.isTarget = b;}

  set colour(Colour : string) { this.Colour = Colour;}
  get colour() : string { return this.Colour; }

  set pieceType(type : number) { this.puzzlePieceType = type;}
  get hasPieceType() : boolean { return this.puzzlePieceType >= 0; }
  get pieceType() : number { return this.puzzlePieceType; }

  copy_from(blockty : BlockTy) {
    this.bugged = blockty.bugged;
    this.target = blockty.target;
    this.colour = blockty.colour;
    this.pieceType = blockty.pieceType;
  }

  get typename() : string {
    if (!this.special) return "";
    if (this.bugged) return RenderConfig.buggedName;
    if (this.target) return RenderConfig.targetName;
    return "Unknown";
  }


}

/*
Colour palette by Manouk:
#5dbcb2
#654068
#000000
#fec80e
#c0017d
*/

class BlockIdCtr {
  static ctr : number = 0;
  static max : number = 1000000 - 1;
  static reset() : void { BlockIdCtr.ctr = 0; }
  static next() : number {
    if (BlockIdCtr.ctr == BlockIdCtr.max) BlockIdCtr.ctr=0;
    return BlockIdCtr.ctr++;
  }
}

// We could fix the potential clash with BlockIdCtr here, especially if we
// automatically let computers search for solutions. However, any human
// clash in this instance almost certainly points towards malice.
class EmptyBlockIdCtr {
  static ctr : number = 1000000;
  static reset() : void { EmptyBlockIdCtr.ctr = 1000000; }
  static next() : number { return EmptyBlockIdCtr.ctr++; }
}


class Block {
  private ty : BlockTy ;
  protected _id : number;
  protected _itag : string;

  constructor(blockTy : BlockTy, use_counter : boolean = true) {
    this.ty = blockTy;
    if (use_counter)
      this._id = BlockIdCtr.next();
  }

  get id() : number {return this._id; }
  set id(no : number) {this._id = no; return;}
  get empty () : boolean { return false; }
  get special() : boolean {return this.ty.special;}
  get size() : number { return this.ty.size;}
  get bugged() : boolean { return this.ty.bugged;}
  get target() : boolean { return this.ty.target;}
  get colour() : string { return this.ty.colour;}
  get name() : string { return this.ty.name;}
  get typename() : string { return this.ty.typename; }
  get btype() : BlockTy {return this.ty; }
  get tyChar() : string {
    if (this.empty) return 'E';
    return this.ty.tyChar;
  }
  set tyChar(s : string) {
    if (this.empty)return;
    this.ty.tyChar = s;
  }
  get tag() : string {return this.ty.tag;}
  set tag(s:string) {this.ty.tag = s;}
  get itag() : string { return this._itag; }
  set itag(s:string) {this._itag=s;}


  get hasPieceType() : boolean { return this.ty.hasPieceType; }
  get pieceType() : number { return this.ty.pieceType; }

  get description() : string {
    if (this.size >= 16)
      return "" + this.size + " bytes";
    return String(this.size);
  }
  set size(newSize : number) {
    //console.log('Cannot change size of non-empty block!');
    // I'd really like to keep this impossible but it works much nicer for
    // reallocs and whatnot
    this.ty.size = newSize;
    return;
  }
}

class EmptyBlock extends Block {
  protected Size : number;
  get empty () : boolean { return true; }
  get special() : boolean { return true; }
  get size() : number { return this.Size; }
  set size(newSize : number) { this.Size = newSize;}
  get colour() : string { return "#dddddd"; }
  get name() : string {return "";}
  get typename() : string { return "";}
  constructor(size : number) {
    super(new BlockTy(0, "empty"), false);
    this._id = EmptyBlockIdCtr.next();
    this.Size = size;
  }
}
