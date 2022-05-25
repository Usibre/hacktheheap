abstract class TutorialConfig {
  static readonly mascotmap : string[] = [
    'static/images/robot/robot.png', // regular
    'static/images/robot/robot-sadge.png', // Sadge
    'static/images/robot/robot-happy.png', // happy
    'static/images/robot/robot-left.png', // looking to the left
  ];
  static readonly OverlayID = "tutoverlay";
  static readonly OverlayColourFallback = '#888888';
  static readonly OverlayColour = 'rgba(180,180,180,0.5)';
  static readonly MascotID = "tutorial-mascot";
  static readonly TextBoxImageID = "tut-textbox";
  static readonly TextAreaID = "tut-textarea";
  static readonly TextboxSource = "static/images/robot/textbox.png";
}


enum MascotType {
  Regular = 0,
  Sadge = 1,
  Happy = 2,
  LookingLeft = 3
}
