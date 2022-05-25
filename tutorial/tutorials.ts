abstract class Tutorials {

  static CookieBanner() : TutorialEngine {
    let builder : TutorialBuilder = new TutorialBuilder();
    let frame : MutableTutorialFrame;
    frame = builder.addMessage(
      "We use cookies to keep track of your current level and score in the game, and we save any solutions you may find. "
      + "Please <a style=\"cursor:pointer;\" onclick=\"initCookies();window.location.href='tut.htm'\">accept our cookies</a> or <a href=\"game.htm\">play the game without levels</a>. "
      , null, "first");
    frame.removeUponClick = false;
    frame.removeUponButton = false;
    let engine : TutorialEngine = builder.finalise();
    engine.puzzleCode = "HPM2/FOVF256T";
    return engine;
  }



  static CookieBannerCS() : TutorialEngine {
    let builder : TutorialBuilder = new TutorialBuilder();
    let frame : MutableTutorialFrame;
    frame = builder.addMessage(
      "We use cookies to keep track of your current level and score in the game, and we save any solutions you may find. "
      + "Please <a style=\"cursor:pointer;\" onclick=\"initCookies();window.location.href='levelupcs.htm'\">accept our cookies</a> or <a href=\"game.htm\">play the game without levels</a>. "
      , null, "first");
    frame.removeUponClick = false;
    frame.removeUponButton = false;
    let engine : TutorialEngine = builder.finalise();
    engine.puzzleCode = "HPM2/FOVF256T";
    return engine;
  }

  static HowTo(levelupnext : boolean = false) : TutorialEngine {
    let builder : TutorialBuilder = new TutorialBuilder();
    let frame : MutableTutorialFrame;
    let leftSide : MutableTutorialFrame;
    let rightSide : MutableTutorialFrame;
    frame = builder.addMessage("Welcome to the HTH Puzzle! ", null, "first|happy");
    frame = builder.addMessage("The HTH puzzle is a one-dimensional jigsaw puzzle. Let me quickly explain what you are looking at. ", frame, "");
    frame = builder.addMessage("First, at the top we have the puzzle area. This is where puzzle pieces will be placed. ", frame, "bar");
    frame = builder.addMessage("Filling the puzzle area is done with the buttons on the right-hand side. ", frame, "left");
    frame = builder.addMessage("Details of the puzzle are shown on the left-hand side, but will be explained later. ", frame, "right");
    frame = builder.addMessage("Since the puzzles may never have been played before, it could unfortunately occur that a puzzle is impossible. ", frame, "right");
    frame = builder.addMessage("If you believe the puzzle is impossible, you can click here on the bottom left. ", frame, "right");
    frame = builder.addMessage("After solving a puzzle or clicking the impossible button, you will automatically get a new puzzle. ", frame, "");
    frame = builder.addMessage("Once you are ready for more difficult puzzles, you can try leveling up by clicking on the top right!", frame, "happy|left");
    frame = builder.addMessage("Then I will explain a new challenge for you to solve.", frame, "left");
    frame = builder.addMessage("If you succeed in that challenge, you will gain a level on the top left and get more difficult puzzles in the game.", frame, "happy|right");
    if (!levelupnext) {
      frame = builder.addMessage("<a href=\"./play.htm\">Let's play!</a> ", frame, "happy");
    } else {
      frame = builder.addMessage("<a href=\"./levelup.htm\">Let's play!</a> ", frame, "happy");
    }
    frame.removeUponClick = false;
    frame.removeUponButton = false;
    frame = builder.addMessage("You should not be able to reach this.", frame, "last");

    let engine : TutorialEngine = builder.finalise();
    engine.puzzleCode = "HPM2/FOVF12000Tleft:0A(left:128).right:0B(right:512)";
    //
    engine.showimpanyway();
    engine.impossibleMessage = function() {}
    return engine;
  }

  // Levels
  static LevelBlueprint() : TutorialEngine {
    let builder : TutorialBuilder = new TutorialBuilder();
    let frame : MutableTutorialFrame;
    frame = builder.addMessage("Hi! Click on me!", null, "first|happy|lock");
    frame = builder.addMessage("Now click on a button :3", frame, "left|unlock");
    let frame2 : MutableTutorialFrame = builder.addButtonConditional(
        "You clicked the left button", frame, 0, "left");
    let frame3 : MutableTutorialFrame = builder.addButtonConditional(
        "You clicked the right button", frame, 1, "left");
    builder.addExistingButtonConditional(frame3, frame2, 1, "left");
    builder.addExistingButtonConditional(frame2, frame3, 0, "left");
    builder.addExistingButtonConditional(frame3, frame3, 1, "left");
    frame = builder.addButtonElse("Final message: cya!", frame2, "last");
    frame.removeUponClick = true;
    // puzzle codes an finalise
    builder.postTutGame = "HPM2/FOVF256T" // challenge
    let engine : TutorialEngine = builder.finalise();
    engine.puzzleCode = "HPM2/FOVF12000Tleft:0A(left:128).right:0B(right:512)"; // Puzzle to explain concept
    return engine;
  }

// Basic puzzle type: no init, first fit, ovf attack, lowered stepcount
  static ToLevel1() : TutorialEngine {
    let builder : TutorialBuilder = new TutorialBuilder();
    let frame : MutableTutorialFrame;
    frame = builder.addMessage("Hello and welcome, I'm happy to see you here! ", null, "first|happy");
    frame = builder.addMessage("I will help you solve your first puzzle. ", frame, "happy|lock");
    frame = builder.addMessage("We can add different puzzle pieces by clicking on buttons. ", frame, "left");
    frame = builder.addMessage("Every next puzzle piece we place, will be in the left-most fitting position.", frame, "left");
    frame = builder.addMessage("Right now, we only have one button. Click it!", frame, "left|unlock");
    let frame2:MutableTutorialFrame = builder.addButtonConditional("Wow, you added an arm and a foot into the puzzle area!", frame, 0, "bar|lock");
    frame2.removeUponClick = true;
    frame = builder.addExistingButtonElse(frame, frame);
    frame = builder.addMessage("The foot is a special puzzle piece here, called the `left` piece.", frame2, "bar|lock");
    frame = builder.addMessage("This puzzle piece needs to end up on the left of the `right` piece to solve the puzzle.", frame, "bar");
    frame = builder.addMessage("And wait, another button appeared!", frame, "left");
    frame = builder.addMessage("Click on the newly appeared `output` button. ", frame, "left|happy|unlock");
    frame.removeUponClick = false;
    frame2 = builder.addButtonConditional("Wow, that placed the right next to the left and solved the puzzle!", frame, 1, "bar|happy");
    frame2.removeUponClick = true;
    frame = builder.addButtonElse("Not that button, the other one!", frame, "Sadge|left");
    builder.addExistingButtonConditional(frame, frame, 0);
    builder.addExistingButtonElse(frame2, frame);

    frame = builder.addMessage("Well done! ", frame2, "bar|happy");
    frame = builder.addMessage("Now I will give you a challenge. This one is a little harder than the last. ", frame, "bar");
    frame = builder.addMessage("If you can solve it, you level up and you will officially be on level 1! ", frame, "bar");
    frame = builder.addMessage("Good luck!", frame, "happy|last|bar");
    frame.removeUponClick = true;

    // puzzle codes an finalise
    builder.setWinMessage("onclick", "levelup()", "Click here to continue on level 1!");
    builder.postTutGame = "HPM2/FOVF12000Tinput:0A&B(Arm:28)0B(Foot:84).process:4B().output:0C&T(Leg:64)0D(Face:845)" // challenge
    let engine : TutorialEngine = builder.finalise();
    engine.puzzleCode = "HPM2/FOVF12000Tinput:0A(Arm:28)0B&B(Foot:84).output:0C&T(Leg:64)4A()"; // Puzzle to explain concept
    return engine;
  }
  // Add realloc
  static ToLevel2() : TutorialEngine {
    let builder : TutorialBuilder = new TutorialBuilder();
    let frame : MutableTutorialFrame;
    frame = builder.addMessage("Welcome back! Are you ready for a challenge?", null, "first|happy");
    frame = builder.addMessage("Before, buttons could either add new puzzle pieces, or remove them.", frame, "lock");
    frame = builder.addMessage("Now, we will add a third type: resizing the puzzle piece. ", frame, "");
    frame = builder.addMessage("Let's see how it works. ", frame, "");
    frame = builder.addMessage("Let's first make a block with the left button. ", frame, "left|unlock");
    frame = builder.addButtonConditional("Now we created a button. Let's now click the new button to resize it!", frame, 0, "left|happy|bar");
    frame = builder.addExistingButtonConditional(frame, frame, 0, "left");
    frame = builder.addButtonElse("It completely changed in size! If it does not fit anymore, it will be placed in a new spot. ", frame, "bar");
    frame = builder.addMessage("Now, let's see if you can solve the next challenge!", frame, "last");

    // puzzle codes an finalise
    builder.setWinMessage("onclick", "levelup()", "Click here to continue on level 2!");
    builder.postTutGame = "HPM2/FOVF12000Tinput:0A&B(Arm:28)0B(Foot:84).process:0C&T(Finger:20).postprocess:3A(:32).output:3C(:30)0D(Leg:64)0D(Face:845)" // challenge
    let engine : TutorialEngine = builder.finalise();
    engine.puzzleCode = "HPM2/FOVF12000Tinput:0A(Arm:28).process:3A(:5300)"; // Puzzle to explain concept
    return engine;
  }
  // Add init
  static ToLevel3() : TutorialEngine {
    let builder : TutorialBuilder = new TutorialBuilder();
    let frame : MutableTutorialFrame;
    frame = builder.addMessage("Welcome back! Are you ready for a challenge?", null, "first|happy");
    frame = builder.addMessage("So far, we have started with an empty playing field, like now!", frame, "lock|bar");
    frame = builder.addMessage("From hereon, we can add a few pieces at the start of the game. ", frame, "bar");
    frame = builder.addMessage("The actions that happen at the start cannot be repeated by you!", frame, "");
    frame = builder.addMessage("Sometimes this can help you, but it can also mean that you can lose buttons.", frame, "");
    frame = builder.addMessage("If you get stuck, there is always a reset button on the left to start over.", frame, "right");
    frame = builder.addMessage("Do you think you can beat my next challenge? Good luck!", frame, "unlock|last");

    // puzzle codes an finalise
    builder.setWinMessage("onclick", "levelup()", "Click here to continue on level 3!");
    builder.postTutGame = "HPM2/FOVF12000T.init:0P(init:28)0A(init:28)4P().input:0B&B(Arm:28)0C(Foot:84).process:0D&T(Finger:20).postprocess:3B(:32)3A(:64).output:3D(:30)0E(Leg:64)0F(Face:845)" // challenge
    let engine : TutorialEngine = builder.finalise();
    engine.puzzleCode = "HPM2/FOVF12000Tinput:0A(Arm:28).process:3A(:53)"; // Puzzle to explain concept
    return engine;
  }
  // Add next fit
  static ToLevel4() : TutorialEngine {
    let builder : TutorialBuilder = new TutorialBuilder();
    let frame : MutableTutorialFrame;
    frame = builder.addMessage("Welcome back! Are you ready for a challenge?", null, "first|happy");

    frame = builder.addMessage("If you paid close attention to part one, all pieces were added in the left-most fitting position.", frame);
    frame = builder.addMessage("This is called 'First Fit', where it takes the first spot where the puzzle piece fits.", frame);
    frame = builder.addMessage("We can also place it in the <i>next</i> position, called 'Next fit'.", frame);
    frame = builder.addMessage("As you can see, our details now state that the fitting is Next fit.", frame, "right");
    frame = builder.addMessage("After leveling up, don't forget to check this before starting the puzzle!", frame, "right");
    frame = builder.addMessage("Now, add a puzzle piece and remove it again. ", frame, "left");
    frame.removeUponClick = false;
    frame.removeUponButton = true;
    frame = builder.addMessage("Great, now remove it with the new button. ", frame, "left");
    builder.addExistingButtonConditional(frame, frame, 0, "left");
    frame = builder.addButtonElse("If we add a new piece now, it will be placed where we had left off. Let's try!", frame, "left");
    let frame2 : MutableTutorialFrame = builder.addButtonConditional("As you can see, it is not placed in the left-most position. ", frame, 0, "bar");
    builder.addExistingButtonElse(frame, frame);
    frame2.removeUponClick=true;
    frame = builder.addMessage("If you want to place a piece there again, you first need to get to the end of the puzzle space.", frame2, "bar");
    frame = builder.addMessage("Then it will loop around to the beginning!", frame, "bar|happy");
    frame = builder.addMessage("Do you think you can solve my next fit challenge? Click me and find out!", frame, "happy|last");

    // puzzle codes an finalise
    builder.setWinMessage("onclick", "levelup()", "Click here to continue on level 4!");
    builder.postTutGame = "HPM2/NOVF512T.init:0X(init:24)0B&T(Target:64)4A().input:0C&B(Arm:64)0D(Foot:84).process:4D()4C().postprocess:3C(:24)" // challenge
    let engine : TutorialEngine = builder.finalise();
    engine.puzzleCode = "HPM2/NOVF120Tinput:0A(Arm:28).process:4A()"; // Puzzle to explain concept
    return engine;
  }
  // Add best fit
  static ToLevel5() : TutorialEngine {
    let builder : TutorialBuilder = new TutorialBuilder();
    let frame : MutableTutorialFrame;
    frame = builder.addMessage("Welcome back! Are you ready for a new challenge?", null, "first|happy");
    frame = builder.addMessage("The next addition is 'Best Fit'. Best Fit places the puzzle piece in the smallest fitting location.", frame);
    frame = builder.addMessage("When a location is found, it will always align the piece on the left. ", frame);
    frame = builder.addMessage("Try it out! ", frame, "left|happy");
    frame.removeUponClick = false;
    frame.removeUponButton = true;
    frame = builder.addMessage("The middle space was the smallest and it fit, so it was placed there. Let's try again! ", frame, "left");
    frame.removeUponClick = false;
    frame.removeUponButton = true;
    frame = builder.addMessage("Now the right space was the smallest space where it fit. Click one more time!  ", frame, "left");
    frame.removeUponClick = false;
    frame.removeUponButton = true;
    frame = builder.addMessage("The empty space on the right was not big enough this time, so we start filling the empty space on the left now. ", frame, "bar");
    frame = builder.addMessage("Now you know all about Best Fit!  ", frame, "happy");
    frame = builder.addMessage("Do you think you can solve my best fit challenge? Click me and find out!", frame, "happy|last");
    // puzzle codes an finalise
    builder.setWinMessage("onclick", "levelup()", "Click here to continue on level 5!");
    builder.postTutGame = "HPM2/BOVF512T.init:0A(init:24)0B&T(Target:64)4A().input:0C&B(Arm:64)0D(Foot:84).process:4D()4C().postprocess:3C(:24)" // challenge
    let engine : TutorialEngine = builder.finalise();
    engine.puzzleCode = "HPM2/BOVF130T.init:0A(init:60)0C(init:10)0D(init:20)0B(Leg:10)4A()4D().input:0A(Arm:28)"; // Puzzle to explain concept
    return engine;
  }
  // Add memalign
  static ToLevel6() : TutorialEngine {
    let builder : TutorialBuilder = new TutorialBuilder();
    let frame : MutableTutorialFrame;
    frame = builder.addMessage("Welcome back! Are you ready for a new challenge?", null, "first|happy");
    frame = builder.addMessage("The next addition is the aligned block. The aligned block always needs to be aligned to the start of the puzzle area. ", frame);
    frame = builder.addMessage("This means that it could need a bigger space. Let's take a look at an example. ", frame);
    frame = builder.addMessage("Let's create an aligned block by clicking on the button. ", frame, "left");
    frame.removeUponClick = false;
    frame.removeUponButton = true;
    frame = builder.addMessage("The aligned block we created wants to be at a multiple of 16 from the start of the puzzle area. ", frame, "bar");
    frame = builder.addMessage("Yet, the first puzzle piece already filled the first 10 spaces. The next available space was at 16! ", frame, "bar|happy");
    frame = builder.addMessage("Always be wary of this! Let's see what happens if we create another aligned block now.", frame, "left");
    frame.removeUponClick = false;
    frame.removeUponButton = true;
    frame = builder.addMessage("The puzzle space looks a bit like a mess now. It will be a challenge to solve puzzles with these pesky aligned pieces!", frame, "bar|sadge");
    frame = builder.addMessage("Do you think you can solve my aligned block challenge? Click me and find out!", frame, "happy|last");
    // puzzle codes an finalise
    builder.setWinMessage("onclick", "levelup()", "Click here to continue on level 6!");
    // Revamp puzzle?
    builder.postTutGame = "HPM2/BOVF512T.init:2A(init:24,16)2B&T(Target:64)4A().input:2C&B(Arm:32,32)0D(Foot:84).process:4D()4C().postprocess:3C(:24)" // challenge
    let engine : TutorialEngine = builder.finalise();
    engine.puzzleCode = "HPM2/BOVF120T.init:0A(Finger:10).input:2A(Arm:28,16)"; // Puzzle to explain concept
    return engine;
  }
  // Add OFD
  static ToLevel7() : TutorialEngine {
    let builder : TutorialBuilder = new TutorialBuilder();
    let frame : MutableTutorialFrame;
    frame = builder.addMessage("Welcome back! Are you ready for a new challenge?", null, "first|happy");
    frame = builder.addMessage("Here in level 7, we will introduce a new way of winning. ", frame);
    frame = builder.addMessage("In some challenges, placing the left and right puzzle pieces next to each other is not enough. ", frame);
    frame = builder.addMessage("In this new mode, 'Left Right Remove Left', we will need to solve the puzzle and then remove the left piece ", frame);
    frame = builder.addMessage("Once you remove the left puzzle piece, you win like you are used to", frame, "happy");

    frame = builder.addMessage("Do you think you can solve my challenge? Click me and find out!", frame, "happy|last");
    // puzzle codes an finalise
    builder.setWinMessage("onclick", "levelup()", "Click here to continue on level 7!");
    // Revamp puzzle?
    builder.postTutGame = "HPM2/BOFD512T.init:0A(init:24)0B&T(Target:64)4A().input:0C&B(Arm:64)0D(Foot:84).process:4D()4C().postprocess:3C(:24)" // challenge
    let engine : TutorialEngine = builder.finalise();
    engine.puzzleCode = "HPM2/BOFD120Tinput:0A(Arm:28).process:4A()"; // Puzzle to explain concept
    return engine;
  }
  // Add List Fit
  static ToLevel8() : TutorialEngine {
    let builder : TutorialBuilder = new TutorialBuilder();
    let frame : MutableTutorialFrame;
    frame = builder.addMessage("Welcome back! Are you ready for a new challenge?", null, "first|happy");
    frame = builder.addMessage("Level 8 introduces another new way to place puzzle pieces, called 'List Fit' as you can see here. ", frame, "right");
    frame = builder.addMessage("With list fit, the game remembers where the puzzle pieces used to be, even if you remove them!", frame, "right");
    frame = builder.addMessage("When placing another puzzle piece of the same size, it will use the last emptied spot for that size. ", frame, "");
    frame = builder.addMessage("If your puzzle piece has a different size, that spot cannot be used! ", frame, "sadge");
    frame = builder.addMessage("Try it out here, or click me to continue. ", frame, "left");
    frame = builder.addMessage("Do you think you can solve my list fit challenge? Click me and find out!", frame, "happy|last");
    // puzzle codes an finalise
    builder.setWinMessage("onclick", "levelup()", "Click here to continue on level 8!");
    // Revamp puzzle?
    builder.postTutGame = "HPM2/LOFA512T.init:0A(init:24)0B&T(Target:64)4A().input:0C&B(Arm:64)0D(Foot:84).process:4D()4C().postprocess:3C(:24)" // challenge
    let engine : TutorialEngine = builder.finalise();
    engine.puzzleCode = "HPM2/LOFA128Tinput:0A(Arm:16).output:4A().preprocess:0B(Leg:32).postprocess:4B()"; // Puzzle to explain concept
    return engine;
  }
  // OFA
  static ToLevel9() : TutorialEngine {
    let builder : TutorialBuilder = new TutorialBuilder();
    let frame : MutableTutorialFrame;
    frame = builder.addMessage("Welcome back! Are you ready for a new challenge?", null, "first|happy");
    frame = builder.addMessage("We have already introduced a couple ways of winning the game. ", frame);
    frame = builder.addMessage("You guessed it, here's a new one!  ", frame, "happy");
    frame = builder.addMessage("Let me introduce you to 'Left after Right'. Just placing left and right next to each other won't work anymore. ", frame, "right");
    frame = builder.addMessage("Instead, you need to place the left puzzle piece after you have already placed the right puzzle piece. ", frame, "");
    frame = builder.addMessage("Only then you successfully solve the puzzle. ", frame, "");
    // ...
    frame = builder.addMessage("Do you think you can do this and solve my challenge? Click me and find out!", frame, "happy|last");
    // puzzle codes an finalise
    builder.setWinMessage("onclick", "levelup()", "Click here to continue on level 9!");
    // Revamp puzzle?
    builder.postTutGame = "HPM2/BOFA512Tnew:0A(record:32)0B(password:32).alter:3B(:48)" // challenge
    let engine : TutorialEngine = builder.finalise();
    engine.puzzleCode = "HPM2/BOFA120Tinput:0A(Arm:28).process:4A()"; // Puzzle to explain concept
    return engine;
  }
  // ptmalloc
  static ToLevel10() : TutorialEngine {
    let builder : TutorialBuilder = new TutorialBuilder();
    let frame : MutableTutorialFrame;
    frame = builder.addMessage("Welcome back! Are you ready for thje final level?", null, "first|happy");
    frame = builder.addMessage("As the final level, the puzzles will become even more difficult. ", frame);
    frame = builder.addMessage("But, you will be able to play real-world puzzles, because I taught you everything I know!", frame, "happy");
    frame = builder.addMessage("Actually, I do not know what level 10 does either...", frame, "sadge");
    frame = builder.addMessage("I found out that the fitting is different again, so where the puzzle pieces are placed is different again. ", frame, "right");
    frame = builder.addMessage("It seems to be a combination of everything we learnt, but I'm a little lost here", frame, "sadge|right");
    frame = builder.addMessage("Maybe you can help me out here and solve the challenge?", frame, "happy|last");
    // ...
    //frame = builder.addMessage("Do you think you can solve my best fit challenge? Click me and find out!", frame, "happy|last");
    // puzzle codes an finalise
    builder.setWinMessage("onclick", "levelup()", "Click here to continue on level 10!");
    // Revamp puzzle?
    builder.postTutGame = "HPM2/POFA512T.init:0A(init:24)0B&T(Target:64)4A().input:0C&B(Arm:64)0D(Foot:84).process:4D()4C().postprocess:3C(:24)" // challenge
    let engine : TutorialEngine = builder.finalise();
    engine.puzzleCode = "HPM2/POFA120Tinput:0A(Arm:28).process:4A()"; // Puzzle to explain concept
    return engine;
  }






}
