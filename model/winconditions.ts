abstract class Wincondition {
  protected hasWon : boolean;
  protected winConStrs:string[] = [];
  constructor() { this.hasWon = false; }
  get won() : boolean { return this.hasWon; }
  give_wincon(s:string):boolean {
    if (this.winConStrs.indexOf(s)>=0) {
      this.hasWon = true;
      return true;
    }
    return false;
  }
  abstract _win(heap : Heap, triggerIndex : number, triggerType : string) : boolean;
  win(heap : Heap, triggerIndex : number, triggerType : string) : boolean {
    if (this._win(heap, triggerIndex, triggerType)) {
      this.hasWon = true;
      return true;
    }
    return false;
  }

  static getWinCondition(type : AttackType) {
    let triggerCond : string = "";
    switch (type) {
      case AttackType.OFA:
        return new OFAWinCondition();
      case AttackType.OFO:
        return new OVFWinCondition();
      case AttackType.OFD:
        return new OFDWinCondition();
      case AttackType.OVF:
        return new OVFWinCondition();
      case AttackType.UFA:
        return new UFAWinCondition();
      case AttackType.UFO:
        return new UNFWinCondition();
      case AttackType.UFD:
        return new UFDWinCondition();
      case AttackType.UNF:
        return new UNFWinCondition();
      // case AttackType.UAF:
    }
    return null;
  }
}
class OVFWinCondition extends Wincondition {
  protected winConStrs:string[] = ["OVF", "OFA","OFD"];
  _win(heap : Heap, triggerIndex : number, triggerType : string) : boolean {
    let triggeredBlock : Block = heap.block(triggerIndex);
    if (!triggeredBlock || !triggeredBlock.special) return false;
    return (
        (triggeredBlock.bugged &&
        heap.getNextFromId(triggeredBlock.id) &&
        heap.getNextFromId(triggeredBlock.id).target)
      ||
        (triggeredBlock.target &&
        heap.getPrevFromId(triggeredBlock.id) &&
        heap.getPrevFromId(triggeredBlock.id).bugged));
  }
}
class OFAWinCondition extends OVFWinCondition {
  protected winConStrs:string[] = ["OFA"];
  _win(heap : Heap, triggerIndex : number, triggerType : string) : boolean {
    if (!super._win(heap, triggerIndex, triggerType)) return false;
    let triggeredBlock : Block = heap.block(triggerIndex);
    if (!triggeredBlock.bugged) return false;
    return triggerType=='A';
  }
}
class OFDWinCondition extends OVFWinCondition {
  protected winConStrs:string[] = ["OFD"];
  _win(heap : Heap, triggerIndex : number, triggerType : string) : boolean {
    if (!super._win(heap, triggerIndex, triggerType)) return false;
    let triggeredBlock : Block = heap.block(triggerIndex);
    if (!triggeredBlock.bugged) return false;
    return triggerType=='F';
  }
}
/// underflows
class UNFWinCondition extends Wincondition {
  protected winConStrs:string[] = ["UNF", "UFA", "UFD"];
  _win(heap : Heap, triggerIndex : number, triggerType : string) : boolean {
    let triggeredBlock : Block = heap.block(triggerIndex);
    if (!triggeredBlock.special) return false;
    if (triggeredBlock.bugged && heap.getPrevFromId(triggeredBlock.id) &&
          heap.getPrevFromId(triggeredBlock.id).target)
      return true;
    if (triggeredBlock.target && heap.getPrevFromId(triggeredBlock.id) &&
          heap.getPrevFromId(triggeredBlock.id).bugged)
      return true;
    return false;
  }
}
class UFAWinCondition extends UNFWinCondition {
  protected winConStrs:string[] = ["UFA"];
  _win(heap : Heap, triggerIndex : number, triggerType : string) : boolean {
    if (!super._win(heap, triggerIndex, triggerType)) return false;
    let triggeredBlock : Block = heap.block(triggerIndex);
    if (!triggeredBlock.bugged) return false;
    return triggerType=='A';
  }
}
class UFDWinCondition extends UNFWinCondition {
  protected winConStrs:string[] = ["UFD"];
  _win(heap : Heap, triggerIndex : number, triggerType : string) : boolean {
    if (!super._win(heap, triggerIndex, triggerType)) return false;
    let triggeredBlock : Block = heap.block(triggerIndex);
    if (!triggeredBlock.bugged) return false;
    return triggerType=='F';
  }
}
