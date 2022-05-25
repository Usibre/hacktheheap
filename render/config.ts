abstract class RenderConfig {
  static Names : string = "simplified"; // or descriptive
  static SVCSubdirectory : string = "/puzzles/";
  static get buggedName() : string {
    return (RenderConfig.Names=="simplified") ? "Left" : "Bugged";
  }
  static get targetName() : string {
    return (RenderConfig.Names=="simplified") ? "Right" : "Target";
  }

  // html IDs
  static readonly gameWindow : string = "gameWindow";
  static readonly memoryBar : string = "memoryBar";
  static readonly buttonBar : string = "buttondiv";
  static readonly detailPar : string = "puzzleDetails";

  // memorybar defaults
  static readonly horizontalButtons : number = 3;
  static readonly collapseOn : number = 20;
  //static MultiBar : boolean  = true;
  static barHeight : number = 100;
  static readonly logarithmicScaleconst : number = 8;
  static readonly EmptyBlockColour : string = "#dddddd";
  static readonly defaultBlockColour : string = "#123456";
  // this does not make sense unless it's broken rn because any background
  // is filled with empty blocks
  static readonly mbarBackground : string = RenderConfig.EmptyBlockColour;
  static readonly puzzlepieceOverflow : number = 30;
  static readonly imagesPerPuzzlePiece : number = 3;
  static readonly puzzlePieceImageSources : string[] = [
      'static/images/violet-l.png',
      'static/images/violet.png',
      'static/images/violet-r.png',

      'static/images/yellow-l.png',
      'static/images/yellow.png',
      'static/images/yellow-r.png',

      'static/images/black-l.png',
      'static/images/black.png',
      'static/images/black-r.png',

      'static/images/blue-l.png',
      'static/images/blue.png',
      'static/images/blue-r.png',

      'static/images/purple-l.png',
      'static/images/purple.png',
      'static/images/purple-r.png',
  ];
  // the amount of different pieces we have as images for the memorybar
  static readonly AmountOfPieces : number = RenderConfig.puzzlePieceImageSources.length/RenderConfig.imagesPerPuzzlePiece;
  static readonly PuzzlePieceTextColours : string[] = [
    '#ffffff',
    '#000000',
    '#ffffff',
    '#ffffff',
    '#ffffff',
  ];
  static readonly multibarFiller = 'static/images/multibarfiller.png';

  // buttontext, [..]
  static readonly largeFont : string = "16px Comic Sans";
  static readonly regularFont : string = "14px Comic Sans";

  // button subtext, [..]
  static readonly smallFont : string = "12px Comic Sans";

  // buttons
  static readonly buttonHeightRatio = 3; // button height is a third of its width
  static readonly buttonTextAlign : string = "center";
  static readonly buttonShadowBlur = 13;
  static readonly buttonShadowOffsetX = 3;
  static readonly buttonShadowOffsetY = 3;
  static readonly buttonToMarginRation = 12; // margin is 1/12 of the button width now
  static readonly buttonBackground = "#8899bb";
  static readonly buttonColour = '#000';
  static readonly topButton = 'static/images/bluebutton.png';
  static readonly derivativeButton = 'static/images/redbutton.png';

  // misc
  static readonly MusicFile : string = "todo.mp3";
  static readonly MaxActionsPerRequest : number = 150000000;
}
