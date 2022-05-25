class MallocSVC extends Heap {
  protected requestOps : string;
  protected id : number;
  protected opsLoaded : number = 0;
  protected _locked : boolean = false;
  protected _lock_invoked : number = 0;
  private _wait_time : number = 5000; // 20 seconds total
  private _wait_tries : number = 5*10;
  private svc_running : boolean = false;
  protected requestsToBeSent : string[] = [];
  protected serving : boolean = false;
  protected finalise_request :boolean = false;
  protected allocator : string = "ptmalloc";


  constructor(puzzle : Puzzle, contr : GameController) {
    super(puzzle, contr);
    this.id = Math.floor(Math.random() * 10000000);
    this.start_svc();
    this.resetOp();
    if (puzzle.allocatorType==AllocateType.DLMalloc)
      this.allocator = "dlmalloc";
    else if (puzzle.allocatorType==AllocateType.TCMalloc)
      this.allocator = "tcmalloc";
      else if (puzzle.allocatorType==AllocateType.JEMalloc)
        this.allocator = "jemalloc";
  }
  get wait_time() : number {
    return this._wait_time/this._wait_tries;
  }

  async delay(ms: number) {
    await new Promise<void>(resolve => setTimeout(()=>resolve(), ms)).then(()=>{});
  }
  protected Lock() : boolean {
    if (this._locked) {
      this._lock_invoked++;
      if (this._lock_invoked<this._wait_tries)
        return false; // lets not make the base function blocking
      return false; // change of heart: lets override the override
    }
    this._lock_invoked = 0;
    this._locked = true;
    return true;
  }
  protected Unlock() : void {
    this._locked = false;
  }

  protected async start_svc() {
    // hacky but makes sure all objects have been created in the main thread before locking
    await this.delay(200);
    while (!this.Lock()) await this.delay(this.wait_time);
    await fetch(window.location.origin + RenderConfig.SVCSubdirectory, {
      method: 'POST',
      body: '{"id":' + this.id.toString() +
        ', "action":"init","allocator":"' + this.allocator + '"}',
      headers: {'Content-Type': 'application/json; charset=UTF-8'}
      }).then((response) => response.json())
      .then((response) => {this.renderJson(response);this.svc_running=true;this.Unlock();});
      //  let x : EventListener =
    window.addEventListener("onunload", async function(e : any) {
      await this.stop_svc();
    });
    this.serve_svc();
  }
  protected async stop_svc() {
    await fetch(window.location.origin + RenderConfig.SVCSubdirectory, {
      method: 'POST',
      body: '{"id":' + this.id.toString() + ', "action":"end"}',
      headers: {'Content-Type': 'application/json; charset=UTF-8'}
    });
    this.svc_running = false;
  }
  protected async serve_svc() {
    while (this.svc_running) {
      if (this.requestsToBeSent.length <= 0) {
        await this.delay(1000);
      } else if (!this.Lock()) {
        await this.delay(this.wait_time);
      } else {
        this._changed_feedback.lock();
        let req : string = this.requestsToBeSent[0];
        this.requestsToBeSent.splice(0,1);
        console.log("Sending request, "+ this.requestsToBeSent.length.toString() +" left.");
        this._send(req);
      }
    }
  }

  get moreToProcess() : boolean {
    return this.requestsToBeSent.length>0;
  }

  async await_destruct() {
    await this.stop_svc();
    return true;
  }

  destruct() {
    this.stop_svc();
  }

  resetOp() : boolean {
    this.requestOps = "";
    this.opsLoaded = 0;
    return true;
  }

  // operation.handle calls
  // heap.triggerBug; removeById; heap.add
  add(newBlock : Block) : boolean {
    if (this.requestOps.length > 0) {
      this.requestOps += ",";
    }
    this.requestOps += '{"action":"allocate","value":' +
        newBlock.size.toString() + ',"name":"' + newBlock.name + '","id":' +
        newBlock.id.toString();
    this.requestOps += ',"itag":"' + newBlock.itag + '"';
    if (newBlock.bugged) this.requestOps += ',"ty":"B"';
    if (newBlock.target) this.requestOps += ',"ty":"T"';
    this.requestOps += '}';
    if (this.blocktys.indexOf(newBlock.btype) < 0)
      this.blocktys.push(newBlock.btype);
    return true;
  }
  public malloc(size : number, name:string, itag:string='', bty:string='') : number {
    let b : Block = this.getBlock(size,name,itag,bty);
    this.addToRequest(
      '"action":"malloc"' +
      ',"size":' + size.toString() +
      ',"name":"' + name + '"' +
      ',"id":' + b.id +
      ',"ty":"'+ b.tyChar + '"' +
      ',"itag":"' + b.itag + '"');
    return -1;
  }
  public calloc(nmemb : number, size : number, name:string,itag:string='', bty:string='') : number {
    let b : Block = this.getBlock(size*nmemb,name,itag,bty);
    this.addToRequest('\
      "action":"calloc"\
      ,"nmemb":' + nmemb.toString() + '\
      ,"size":' + size.toString() + '\
      ,"name":"' + name + '"\
      ,"id":' + b.id + '\
      ,"ty":"' + b.tyChar + '"' +
      ',"itag":"' + b.itag + '"');
    return -1;
  }
  public memalign(alignment : number, size : number, name : string, itag:string='', bty:string='') : number {
    let b : Block = this.getBlock(size,name,itag,bty);
    this.addToRequest('\
      "action":"memalign"\
      ,"alignment":' + alignment.toString() + '\
      ,"size":' + size.toString() + '\
      ,"name":"' + name + '"\
      ,"id":' + b.id + '\
      ,"ty":"' + b.tyChar + '"' +
      ',"itag":"' + b.itag + '"');
    return -1;
  }
  public realloc(ptr : number, size : number, is_index : boolean = false, itag:string='', bty:string='') : number {
    let request : string = '\
      "action":"realloc"\
      ,"size":' + size.toString();
      if (is_index)
        request += ',"prevptr":' + ptr.toString();
      else {
        request += ',"ptr":' + ptr.toString();
        let [index, _] = this._relative_offset(ptr);
        let b : Block = this.CurrentLayout[index];
        b.tyChar=bty;
      }
    this.addToRequest(request);
    return -1;
  }
  public free(ptr : number, is_index : boolean = false, itag:string='') : boolean {
    if (is_index) {
      this.addToRequest('"action":"free","prevptr":' +
        ptr.toString() + ',"itag":"' + itag + '"');

    } else {
      this.addToRequest('"action":"free","ptr":' +
        ptr.toString() + ',"itag":"' + itag + '"');
    }
    return false;
  }
  public mallopt(param:number, value:number, itag:string='') {
    this.addToRequest('"action":"mallopt",\
        "param":' + param.toString() + ',\
        "value":' + value.toString() + '');
    return;
  }
  protected addToRequest(part : string) {
    if (this.opsLoaded > 0) {
      this.requestOps += ",";
    }
    part += ',"tag":"' + this.lastOp.getTag(this.opsLoaded) + '"';
    this.requestOps += "{"+part+"}";
    this.opsLoaded+=1;
    if (this.opsLoaded >= RenderConfig.MaxActionsPerRequest) {
      this.flush();
    }
  }

  commit() {
    this.finalise_request = true;
    this.flush();
  }

  removeById(id : number, prevop_id : number = -1) : boolean {
    if (this.requestOps.length > 0) {
      this.requestOps += ",";
    }
    if (prevop_id >= 0) {
      // prevop
      this.requestOps += '{"action":"freeprev","value":' +
          prevop_id.toString() + '}';
    } else {
      let index : number = this.getIndexFromId(id);
      // check if index >= 0
      this.requestOps += '{"action":"free","value":' +
          this._absolute_offset(index, 0).toString() + '}';
    }
    return true;
  }

  forceRender(force:boolean=true) : void {
    if (force)
      this.flush();
    //super.forceRender(force);
  }

  flush() : void {
    if (this.requestOps.length < 1) return;
    let reqStr : string = '{"id":' + this.id.toString() +
        ', "action":"execute","operation":[' +
        this.requestOps + ']';
    if (!this.finalise_request) {
      reqStr += ',"state":"keep"';
    } else {
      this.finalise_request = false;
    }
    reqStr += '}';
    this.resetOp();
    this.requestsToBeSent.push(reqStr);
  }

  protected async renderJson(json_val :any) {
    console.log("Processing response");
    if (json_val["id"] != this.id) {
	     console.log("Mismatching ids with malloc svc?");
    }
    if (!this.moreToProcess) {
      let newLayout : Block[] = [];
      for (let i = 0; i < json_val["layout"].length; i++) {
        let item = json_val["layout"][i];
        newLayout.push(this.getBlockFromJsonItem(item));
      } // end layout for loop
      this.CurrentLayout = newLayout;
    }
    // console show the errors if present
    if (json_val.hasOwnProperty("errors"))
      console.warn(json_val["errors"]);
    // now read out the tags
    this.processTags(json_val);
    // and trigger the potential bugs
    this.triggerEvents(json_val);
    this._changed_feedback.changed();
  }
  protected getBlockFromJsonItem(item : any) : Block {
    let id : number;
    let b : Block;
    if (item["ty"].toLowerCase()=='e') {
      let bb : EmptyBlock = new EmptyBlock(item["size"]);
      return bb;
    }
    if (item.hasOwnProperty("id")) {
      id = item["id"];
      b = this.getBlockById(id);
      if (b == null) b = this.getBlock(item["size"], item["name"], item["itag"],item["ty"]);
      b.size = item["size"];
      b.tyChar = item["ty"];
    } else {
      b = this.getBlock(item["size"], item["name"], item["itag"], item["ty"]);
    }
    // just in case it's not copied well
    if (item.hasOwnProperty("tag")) b.tag = item["tag"];
    return b;
  }
  protected processTags(json_val : any) : void {
    if (!json_val.hasOwnProperty("tags")) return;
    let m : Map<string,number> = new Map();
    for (let i = 0; i < json_val["tags"].length; i++) {
      let tuple = json_val["tags"][i];
      let tag : string = tuple["tag"];
      let value : number = tuple["value"];
      m.set(tag,value);
    }
    this._changed_feedback.OpController.process_map(m, this.lastOp);
  }

  protected triggerEvents(json_val:any) : void {
    if (!json_val.hasOwnProperty("events")) {
      return;
    }
    let events:string[] = json_val["events"];
    for (let i = 0; i < json_val["events"].length; i++) {
      if (this.wincondition.give_wincon(json_val["events"][i])) {
        console.log("We altwon!");
        this.won = true;
        break;
      }
      let index:number=this.getIndexFromItag(json_val["events"][i].substring(1));
      if (index < 0) continue;
      if (this.wincondition.win(this,index, json_val["events"][i].substring(0,1))){
        console.log("We won!");
        this.won = true;
        break;
      } //else {}
    }
  }

  protected async _send(content : string) {
    while (!this.svc_running) await this.delay(this.wait_time);
    await fetch(window.location.origin + RenderConfig.SVCSubdirectory, {
      method: 'POST',
      body: content,
      headers: {'Content-Type': 'application/json; charset=UTF-8'}
      }).then((response) => response.json())
      .then((response) => {/*console.log(response);*/
        this.Unlock();
        this.renderJson(response);
        if (this.requestsToBeSent.length <= 0) {
          this._changed_feedback.changed(true);
          this._changed_feedback.unlock();
        }
      });
  }

} // end class
