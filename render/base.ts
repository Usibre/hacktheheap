class GameRenderEngine {
  protected memoryBar : MemoryBarRender;
  protected buttonBar : ButtonBarRender;
  protected playMusic : boolean = false;
  protected music : HTMLAudioElement;
  // 0 is unknown, -1 is nogrow, 1 is growable
  protected grown : number = 0;
  protected winShown : boolean;
  protected showImpossible : boolean;
  protected _showCustom : boolean = false;
  protected heap : Heap;
  protected loading : MutableTutorialFrame = null;


  constructor(heap : Heap, showImpossible : boolean){
    console.log("Initialising new render engine.");
    this.memoryBar = new MemoryBarRender(heap);
    this.buttonBar = new ButtonBarRender(RenderConfig.buttonBar);
    this.winShown = false;
    this.showImpossible = showImpossible;
    this.heap = heap;
    this.loadImages();
    // resize images to canvassize next

    if (false) {
      this.music = new Audio(RenderConfig.MusicFile);
      this.music.addEventListener( 'load', function() {
        // start if playmusic iguess, need to find a nice music file :)
      });
    }
  }

  async delay(ms: number) {
    await new Promise<void>(resolve => setTimeout(()=>resolve(), ms)).then(()=>{});
  }

  potentiallyImpossible() : void {
    this.showImpossible = true;
  }

  showCustom() {
    this._showCustom = true;
  }

  destruct() : void {
    console.log("Killing render engine.");
    this.buttonBar.destruct();
    this.memoryBar.destruct();
  }
  lock() : boolean {
    return (this.memoryBar.lock() && this.buttonBar.lock());
  }
  unlock() : void {
    this.memoryBar.unlock();
    this.buttonBar.unlock();
  }
  async wait_until_load_message() {
    await this.delay(500);
    if (this.buttonBar.locked) {
      console.log("Adding loading message.");
      await this.showLoadingMessage();
      while (this.buttonBar.locked) {
        await this.delay(150);
      }
      console.log("Removing loading message.");
      await this.removeLoadingMessage();
    }
  }
  async showLoadingMessage() {
    if (this.loading && this.loading.active) return;
    if (!this.loading) {
      this.loading = new MutableTutorialFrame(true, true, MascotType.Sadge, false);
      this.loading.text = "Loading...";
      this.loading.removeUponButton = false;
      this.loading.removeUponClick = false;
    }
    this.loading.draw();
  }
  async removeLoadingMessage() {
    if (!this.loading || !this.loading.active) return;
    this.loading.removeMyself();
    console.log("Removing!");console.log("Removing!");console.log("Removing!");console.log("Removing!");
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

  loadImages() {
    let mBar : MemoryBarRender = this.memoryBar;
    let bBar : ButtonBarRender = this.buttonBar;
    let imgs : HTMLImageElement[] = <HTMLImageElement[]>this.memoryBar.images.concat(this.buttonBar.images);
    let len : number = imgs.length;
    let counter : number = 0;
    [].forEach.call( imgs, function( img : HTMLImageElement ) {
      if(img.complete) {
        incrementLoadCounter();
      } else {
        img.addEventListener( 'load', incrementLoadCounter, false );
      }
    });
    function incrementLoadCounter() {
        counter++;
        if ( counter === len ) {
            mBar.resize();
            bBar.loaded();
            mBar.render();
            bBar.render();
        }
    }
  }

  get buttonRender() : ButtonBarRender {
    return this.buttonBar;
  }

  showWinMessage(overwriteStr : string = "") {
    if (this.winShown) return;
    else this.winShown = true;
    let type : string;
    let winframe : MutableTutorialFrame = new MutableTutorialFrame(true, true, MascotType.Happy);
    winframe.text = "Congratulations, you solved the puzzle! <br />";
    if (overwriteStr != "" && overwriteStr.split(":").length == 3) {
      switch (overwriteStr.split(":")[0]) {
        case 'href':
          winframe.text += "<a href=\"" + overwriteStr.split(":")[1] + "\">" + overwriteStr.split(":")[2] + "</a>";
          break;
        case 'onclick':
          winframe.text += "<a style=\"cursor:pointer;\" onclick=\"" + overwriteStr.split(":")[1] + "\">" + overwriteStr.split(":")[2] + "</a>";
      }
    } else {
      // fall back on the defaults, based on the filename
      let curr_file : string = window.location.pathname.split('/')[window.location.pathname.split('/').length-1];
      curr_file = curr_file.split('?')[0]; // remove get vars
      switch (curr_file) {
        case 'game.htm':
          winframe.text += "<a style=\"cursor:pointer;\" onclick=\"window.location.reload()\">Play the next puzzle</a>";
          break;
        case 'play.htm':
          winframe.text += "<a style=\"cursor:pointer;\" onclick=\"window.location.reload()\">Play the next puzzle</a>";
          break;
        case 'tut.htm':
          winframe.text += "<a href=\"play.htm?easy\">Start playing!</a>";
          break;
        default:
          winframe.text += "<a style=\"cursor:pointer;\" onclick=\"window.location.reload()\">Play the next puzzle</a>";
          break;
      }
    }
    winframe.removeUponClick = false;
    winframe.removeUponButton = false;
    winframe.showBar = true;
    winframe.draw();
  }

  showImpossibleMessage() {
    let type : string;
    let winframe : MutableTutorialFrame = new MutableTutorialFrame(true, true, MascotType.Sadge, false);
    winframe.text = "Puzzles can sometimes be impossible, unfortunately. Are you sure this puzzle is impossible? "
        + "<a style=\"cursor:pointer;\" onclick=\"game.impossible()\">Yes</a> or "
        + "<a style=\"cursor:pointer;\" >No</a>.";
    winframe.removeUponClick = true;
    winframe.removeUponButton = false;
    winframe.draw();
  }

  render(resized : boolean = false) {
    // also see loadImages function that has a callback on when all images are loaded in
    if (resized) {
      this.memoryBar.resize();
    }
    console.log("Rendering.");
    this.memoryBar.render();
    this.buttonBar.render();
  }

  getImportantTags(puzzle:Puzzle):string[] {
    let uninteresting:string[]=[];
    let interesting:string[]=[];
    for (let bp of puzzle.OpBlueprints) {
      let tag:string;
      let taglist:string[] = bp.createdTags.concat(bp.reqTags).concat(bp.removedTags);
      for (tag of taglist) {
        if (interesting.indexOf(tag)>=0) continue;
        if (uninteresting.indexOf(tag)>=0) {
          interesting.push(tag);
          uninteresting.splice(uninteresting.indexOf(tag),1);
        } else {
          uninteresting.push(tag);
        }
      }
    }
    return interesting;
  }

  getOperationDetails(puzzle:Puzzle) :string {
    let opDetails:string = "<hr />";
    opDetails += "<table><tr><th>"+RenderConfig.buggedName+":</th><th>";
    opDetails += puzzle.buggedTags.join(", ") + "</th>";
    opDetails += "<td width=\"30\">&nbsp;</td>";
    opDetails += "<th>"+RenderConfig.targetName+":</th>";
    opDetails += "<th>";
    opDetails += puzzle.targetTags.join(", ") + "</th></tr></table><hr />";
    opDetails += "<table>";
    opDetails += "<tr>\
      <th class='rightspace'>Operation</th>\
      <th class='rightspace'>Creates</th>\
      <th class='rightspace'>Requires</th>\
      <th>Removes</th></tr>";
    for (let bp of puzzle.OpBlueprints) {
      let name : string;
      if (bp.isInit) {
        name = "("+bp.name+")";
      }
      else {
        name = bp.name;
      }
      let important:string[] = [];
      if (bp.createdTags.length > 10 || bp.reqTags.length > 10 || bp.removedTags.length > 10)
        important = this.getImportantTags(puzzle);
      let createds:string
      let created:string[] = bp.createdTags;
      if (created.length > 15)
        created = intersection(created,important);
      if (created.length > 15) {
        createds = created.slice(0,15).join(", ")+", ..";
      } else { createds = created.join(", "); }
      let req:string[] = bp.reqTags;
      let reqs:string;
      if (req.length > 15)
        req = intersection(req,important);
      if (req.length > 15) {
        reqs = req.slice(0,15).join(", ") + ", ..";
      } else { reqs = req.join(", "); }
      let rm:string[] = bp.removedTags;
      let rms:string;
      if (rm.length > 15) {
        rm = intersection(rm,important);
      }
      if (rm.length > 15) {
        rms = rm.slice(0,15).join(", ")+", ..";
      } else { rms = rm.join(", "); }

      opDetails += "<tr>";
      opDetails += "<td class='rightspace'>"+name+"</td>";
      opDetails += "<td class='rightspace'>"+createds+"</td>";
      opDetails += "<td class='rightspace'>" +reqs+ "</td>";
      opDetails += "<td>" + rms + "</td>";
      opDetails += "</tr>";
    }
    opDetails += "</table><hr />";
    return opDetails;
  }

  writeDetails(puzzle : Puzzle) {
    let elt : HTMLElement = document.getElementById(RenderConfig.detailPar);
    let detailString : string = this.getOperationDetails(puzzle) + "<table><tr>";
    if (puzzle.allocatorType==AllocateType.CustomFit || puzzle.allocatorType==AllocateType.PTMalloc)
      detailString += "<th>Size:</th><td>Dynamic</td>";
    else
      detailString += "<th>Size:</th><td>" + puzzle.heapsize + " bytes</td>";
    detailString += "</tr><tr>";
    if (this.grown == 0)
      this.grown = (puzzle.growtimes > 0) ? 1 : -1;
    if (this.grown > 0) {
      detailString += "<th>Size can still grow:</th><td>" + puzzle.growtimes + " times</td>";
      detailString += "</tr><tr>";
      detailString += "<th>Size will grow by:</th><td>" + puzzle.growsize + " bytes</td>";
      detailString += "</tr><tr>";
    }
    detailString += "<th>Fitting:</th><td>";
    switch (puzzle.allocatorType) {
      case AllocateType.FirstFit:
        detailString += "First fit"; break;
      case AllocateType.NextFit:
        detailString += "Next fit"; break;
      case AllocateType.BestFit:
        detailString += "Best fit"; break;
      case AllocateType.RandomFit:
        detailString += "Random fit"; break;
      case AllocateType.ListFit:
        detailString += "Previous fit"; break;
      case AllocateType.CustomFit:
        detailString += "Replay mode"; break;
      case AllocateType.PTMalloc:
        detailString += "PTMalloc2 (svc)"; break;
      case AllocateType.DLMalloc:
        detailString += "DLMalloc (svc)"; break;
      case AllocateType.TCMalloc:
        detailString += "TCMalloc (svc)"; break;
      case AllocateType.JEMalloc:
        detailString += "JEMalloc (svc)"; break;
      default:
        detailString += "Unknown"; break;
    }
    detailString += "</td></tr><tr>";
    detailString += "<th>Attack:</th><td>";
    switch (puzzle.attackType) {
      case AttackType.OVF:
        detailString += "Left Right"; break;
      case AttackType.OFA:
        detailString += "Left after Right"; break;
      case AttackType.OFO:
        detailString += "OverFlow at Operation"; break;
      case AttackType.OFD:
        detailString += "Left Right Remove Left"; break;
      case AttackType.UNF:
        detailString += "Right Left"; break;
      case AttackType.UFA:
        detailString += "UnderFlow at Allocation <br />(right after left)"; break;
      case AttackType.UFO:
        detailString += "UnderFlow at Operation"; break;
      case AttackType.UFD:
        detailString += "UnderFlow at Deallocation"; break;
      case AttackType.UAF:
        detailString += "Use after Free"; break;
      default:
        detailString += "Unknown"; break;
    }
    detailString += "</td></tr>";
    detailString += "<td colspan=\"2\" style=\"height:1em\"> </td></tr><tr>";
    detailString += "<td colspan=\"2\">";
    let codeboxHidden : boolean =
      (window.getComputedStyle(document.getElementById("puzzlecodebox"))
      .getPropertyValue('display') == "none");
    if (this._showCustom) {
      if (codeboxHidden) {
        detailString += "<button id=\"customButton\" class=\"btn btn-sidebar\" onClick='document.getElementById(\"puzzlecodebox\").style.display = \"block\";game.changed()'>Show editor</button>";
      } else {
        detailString += "<button id=\"customButton\" class=\"btn btn-sidebar\" onClick='document.getElementById(\"puzzlecodebox\").style.display = \"none\";game.changed()'>Hide editor</button>";
      }
      detailString += "&nbsp;&nbsp;";
    }
    if (this.showImpossible) {
      detailString += "<button id=\"impbutton\" class=\"btn btn-sidebar\" onClick=\"game.impossibleMessage()\" style=\"cursor:pointer\">Declare impossible</button>";
    } else {
      detailString += "<button class=\"btn btn-sidebar\" disabled>Is possible.</button>";
    }
    detailString += "&nbsp;&nbsp;";
    detailString += "<button id=\"resetbutton\" class=\"btn btn-sidebar\" onClick='game.restart()'>Reset</button>";
    detailString += "&nbsp;&nbsp;";
    detailString += "<button id=\"nextgamebutton\" class=\"btn btn-sidebar\" onClick='location.reload()'>Next Game</button>";
    detailString += "</td></tr>";
    detailString += "</table>";
    elt.innerHTML = detailString;
    return;
  }


}


function intersection(arr1:any[], arr2:any[]) {
  let iarr = [];
  for (let x of arr1) {
    if (arr2.indexOf(x)>=0) iarr.push(x);
  }
  return iarr;
}
