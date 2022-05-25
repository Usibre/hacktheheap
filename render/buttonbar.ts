class ButtonBarRender {
  protected HtmlArea : HTMLDivElement;
  protected buttonText : string[] = []; // represents only the text inside
  protected buttonSubtext : string[] = []; // represents only the subtext
  protected imagesLoaded : boolean = false;
  protected horizontalButtons : number = RenderConfig.horizontalButtons;
  protected highestButtonBar : number = -1;
  protected _locked : boolean = false;

  /**********
  ** Buttons will be placed as [margin] [button] [margin] [..] [button] [margin]
  **********/
  constructor( area : string) { // document : DocumentType,
    this.HtmlArea = <HTMLDivElement>document.getElementById(area);
    if (!this.HtmlArea) console.warn("Could not find the button bar area!");
  }
  get images() : HTMLImageElement[] {return [];}
  destruct() : void {this.reset();}
  render() : void {}
  get locked():boolean {
    return this._locked;
  }
  lock() : boolean {
    if (this._locked) return false;
    this._locked = true;
    for (let i : number = 0; i < this.buttonText.length; i++) {
      (<HTMLButtonElement>
          document.getElementById("operation" + i)).disabled=true;
    }
  }
  unlock() : void {
    if (!this._locked) return;
    this._locked = false;
    for (let i:number = 0; i < this.buttonText.length; i++) {
      (<HTMLButtonElement>
          document.getElementById("operation" + i)).disabled=false;
    }
  }

  reset() {
    this.buttonText=[];
    this.buttonSubtext=[];
    this._locked=false;
    while (this.canRemoveTopRow)
      this.removeBootstrapRow();
  }
  get buttonCount() : number {
    return (this.highestButtonBar+1)*this.horizontalButtons;
  }
  get activeButtons() : number{
    return this.buttonText.length;
  }

  loaded() : void {
    // callback once all images are loaded
    // enable the buttons
    this.imagesLoaded = true;
    let button : HTMLButtonElement;
    for (let i : number = 0; i < this.buttonText.length; i++) {
      button = <HTMLButtonElement>document.getElementById("operation" + i);
      button.disabled = false;
    }
  }
  get requiresNewRow() : boolean {
    return (this.buttonCount < this.activeButtons);
  }
  get canRemoveTopRow() : boolean {
    return (this.buttonCount - this.horizontalButtons >= this.activeButtons);
  }

  addButton(text : string, subtext : string) : void {
    let index : number = this.activeButtons;
    this.buttonText.push(text);
    this.buttonSubtext.push(subtext);
    if (this.requiresNewRow) this.addBootstrapRow();
    this.addBootstrapButton(index);
  }

  protected addBootstrapButton(i : number) {
    let button : HTMLButtonElement = <HTMLButtonElement>
        document.getElementById("operation" + i);
    this.writeBootstrapButtonText(button, i);
    button.style.visibility = "visible";
    if (this.imagesLoaded)
      button.disabled = false;
  }

  writeBootstrapButtonText(button : HTMLButtonElement, i: number)  {
    if (this.activeButtons <= i) {
      console.warn("Trying to write a non-existent button text!");
    }
    let buttontext : string = this.buttonText[i]
          + "<br /><small>"
          + this.buttonSubtext[i] + "</small>";
    button.innerHTML = buttontext;
  }

  removeButton(i : number) : void {
    let highest : number = this.activeButtons-1;
    this.buttonText.splice(i,1);
    this.buttonSubtext.splice(i,1);
    let button : HTMLButtonElement = <HTMLButtonElement>
        document.getElementById("operation" + highest);
    button.style.visibility = "hidden";
    button.disabled = true;
    for (let j : number = i; j < highest; j++) {
      this.writeBootstrapButtonText(<HTMLButtonElement>
        document.getElementById("operation" + j),j);
    }
    if (this.canRemoveTopRow) this.removeBootstrapRow();
  }


  // call AFTER populating the next row in text and subtext
  addBootstrapRow() {
    let start : number = this.buttonCount;
    this.highestButtonBar++;
    let button : HTMLButtonElement;
    // let's check if it already exists?
    let flexboxdiv : HTMLDivElement = <HTMLDivElement>document.getElementById("buttonrow"+this.highestButtonBar);
    if (flexboxdiv !== null) {
      return;
    }
    flexboxdiv = document.createElement("div");
    flexboxdiv.classList.add("buttonrow");
    flexboxdiv.id = "buttonrow"+this.highestButtonBar.toString();
    this.HtmlArea.appendChild(flexboxdiv);
    for (let i : number = 0; i < this.buttonHCount; i++) {
      button = document.createElement("button");
      flexboxdiv.appendChild(button);
      button.setAttribute('type','button');
      button.classList.add("btn");
      if (this.highestButtonBar%2) {
        button.classList.add("btn-primary");
      } else {
        button.classList.add("btn-default");
      }
      let id : number = start+i;
      button.id = "operation" + id.toString();
      button.disabled = true;
      button.setAttribute('onclick', 'game.button('+(start+i).toString()+');');
      let padding : string = window.getComputedStyle(this.HtmlArea).getPropertyValue('padding-left');
      button.style.width = (this.buttonWidth-2*parseFloat(padding)).toString() + "px";
      button.style.minHeight = this.buttonHeight.toString() + "px";
      button.style.whiteSpace = "normal";
      button.style.visibility = "hidden"; // hidden
      button.style.margin = this.margin.toString() + "px";
    }
  }

  // call AFTER removing the last element from that row
  removeBootstrapRow(override : number = -1) {
    let rowToBeRemoved : number = this.highestButtonBar;
    if (override >= 0) rowToBeRemoved = override;
    let flexDiv : HTMLDivElement = <HTMLDivElement>document.getElementById("buttonrow"+rowToBeRemoved);
    flexDiv.parentNode.removeChild(flexDiv);
    flexDiv.remove();
    this.highestButtonBar--;
    return;
  }

  get buttonHCount() : number {
    return this.horizontalButtons;
  }

  checkHeight() {
    this.height = this.requiredHeight;
  }

  get width() : number {
    // here we assume that margin and padding are equal from left and right side
    let width : string = window.getComputedStyle(this.HtmlArea).getPropertyValue('width');
    let margin : string = window.getComputedStyle(this.HtmlArea).getPropertyValue('margin-left');
    return parseFloat(width) - 2*parseFloat(margin);
  }

  get height() : number {
    // here we assume that margin and padding are equal from top and bottom side
    let height : string = window.getComputedStyle(this.HtmlArea).getPropertyValue('height');
    let margin : string = window.getComputedStyle(this.HtmlArea).getPropertyValue('margin-top');
    let padding : string = window.getComputedStyle(this.HtmlArea).getPropertyValue('padding-top');
    return parseFloat(height) - 2*parseFloat(margin) - 2*parseFloat(padding);
  }

  set height(h : number) {
    let margin : string = window.getComputedStyle(this.HtmlArea).getPropertyValue('margin-top');
    let padding : string = window.getComputedStyle(this.HtmlArea).getPropertyValue('padding-top');
    let newHeight : number = h+2*parseFloat(margin) - 2*parseFloat(padding);
    this.HtmlArea.style.height = newHeight.toString + "px";
  }

  get requiredHeight() : number {
    return (this.buttonHeight + this.margin)*this.depth + this.margin;
  }

  get depth() : number {
    return this.highestButtonBar+1;
  }

  get margin() : number {
    let ratio : number = RenderConfig.buttonToMarginRation;
    // In bootstrap: every button has margin on either side
    //so the margin becomes 2+ratio* instead of 1+ratio* .. +1
    // this means we have "double margin" between buttons in contrast to canvas
    return this.width / (this.buttonHCount * (2+ratio));
  }

  get buttonWidth() : number {
    return this.margin * (RenderConfig.buttonToMarginRation);
  }

  get buttonHeight() : number {
    return 75;
  }

  protected get buttonloc() {
    return [this.HtmlArea.offsetLeft + this.HtmlArea.clientLeft,
          this.HtmlArea.offsetTop + this.HtmlArea.clientTop];
  }

}
