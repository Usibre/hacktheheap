import random, math
from db_info import *
import pymysql

level_settings = dict()
level_settings[0] = dict()
level_settings[0]["FIT"] = ["F"]
level_settings[0]["ATTACK"] = ["OVF"]
level_settings[0]["OPCOUNT"] = range(3,7)
level_settings[0]["STEPCOUNT"] = range(1,3)
level_settings[0]["SIZE"] = list(range(16,1024,16)) + [1]
level_settings[0]["NMEMB"] = range(1,8)
level_settings[0]["ALIGNMENT"] = [1,8,16,32,64]
level_settings[0]["TOTAL"] = [1024*4*i for i in range(1,10)]
level_settings[0]["BASE_NOBASE"] = [3,2]
# malloc, calloc, memalign, realloc, free
level_settings[0]["WEIGHTS"] = [8, 5, 0, 0, 2]
level_settings[0]["INIT_WEIGHT_MODIFIER"] = [3]
level_settings[0]["HAS_INIT"] = [False]



# level 1: basics
level_settings[1] = level_settings[0].copy()
# Level 2: add realloc
level_settings[2] = level_settings[1].copy()
level_settings[2]["WEIGHTS"] = [8, 5, 0, 1, 2]
# Level 3: add init
level_settings[3] = level_settings[2].copy()
level_settings[3]["HAS_INIT"] = [False, True]
# Level 4: Add next fit
level_settings[4] = level_settings[3].copy()
level_settings[4]["FIT"] = ["F","N"]
# Level 5: add best fit
level_settings[5] = level_settings[4].copy()
level_settings[5]["FIT"] = ["F","N", "B"]
# Level 6: Add memalign
level_settings[6] = level_settings[5].copy()
level_settings[6]["WEIGHTS"] = [8, 5, 1, 2, 3]
# Level 7: Add OFD
level_settings[7] = level_settings[6].copy()
level_settings[7]["ATTACK"] = ["OVF", "OFD"]
# Level 8: Add listfit
level_settings[8] = level_settings[7].copy()
level_settings[8]["FIT"] = ["F","N","B","L"]
# Level 9: Add OFA
level_settings[9] = level_settings[8].copy()
level_settings[9]["ATTACK"] = ["OVF", "OFD", "OFA"]
# Level 10: Add PTMalloc2
level_settings[10] = level_settings[9].copy()
level_settings[10]["FIT"] = ["F","N","B","L","P"]
# Todo: ptmalloc; underflow; random fit;
# UaF?
"""
level_settings[9] = level_settings[8].copy()

level_settings[10] = level_settings[9].copy()

level_settings[11] = level_settings[10].copy()

level_settings[12] = level_settings[11].copy()

level_settings[13] = level_settings[12].copy()

level_settings[14] = level_settings[13].copy()

level_settings[15] = level_settings[14].copy()
"""
level_settings[-1] = level_settings[0].copy()
level_settings[-1]["FIT"] = ["F", "N", "B", "R", "P"]
level_settings[-1]["ATTACK"] = ["OVF", "OFA", "OFD", "UNF"]
level_settings[-1]["STEPCOUNT"] = range(1,8)
level_settings[-1]["WEIGHTS"] = [8, 5, 1, 2, 3]




class PuzzleCron:
    def __init__(self, level=-1):
        self.db = pymysql.connect(host=DB_HOST, \
                user=DB_USER, \
                password=DB_PASSWORD, \
                db=DB_DATABASE, \
                charset="utf8")
        self.cursor = self.db.cursor()
        self._level = level

    def create_new(self, count):
        if count <= 0:
            return 0
        sql_query = "INSERT INTO `puzzles` (`code`, `level`) VALUES "
        pg = PuzzleGenerator()
        pg.level = self._level
        if pg.level != self._level:
            print("Level does not exist.")
            return 0
        puzzles = ['("'+pg.create_puzzle().replace('"', '\"')+'", '+str(self._level)+')' for x in range(count)]
        sql_query += ", ".join(puzzles)
        try:
            self.cursor.execute(sql_query)
            self.db.commit()
        except Exception as e:
            print("Saving failed.")
            print(e)
            print("Query: *** {:s} ***".format(sql_query))
            self.db.rollback()
        return len(puzzles)

    def count(self):
        query = "SELECT COUNT(id) FROM `puzzles` WHERE `level` = {:d}".format(self._level)
        self.cursor.execute(query)
        return int(list(self.cursor.fetchall())[0][0])

class PuzzleGenerator:
    def __init__(self):
        global level_settings
        self._level_settings = level_settings
        self._level = -1
        self._stepchoice = []
        self._stepchoiceweights = []
        self.tag_generator = None
        self.name_generator = None
        self.bugged_probability = 0
        self.target_probability = 0

    @property
    def level(self):
        return self._level
    @level.setter
    def level(self, level):
        if int(level) in self._level_settings:
            self._level = int(level)

    def _get_option(self, option):
        x = self._level_settings[self.level][option]
        try:
            iterator = iter(x)
            return random.choice(x)
        except TypeError:
            return x
    def _get_all_options(self, option):
        return self._level_settings[self.level][option]

    def create_puzzle(self):
        puzzlecode = self._create_puzzle()
        # Now check the puzzle quality?
        # Triviality check
        # Impossibility check
        # ...
        return puzzlecode

    def _create_puzzle(self):
        print("Generating puzzle on level {:d}...".format(self.level))
        pstr = "HPM2/"
        pstr += self._get_option("FIT")
        pstr += self._get_option("ATTACK")
        pstr += str(self._get_option("TOTAL")) + "T"
        operations = self._create_operations()
        pstr += ".".join(operations)
        return pstr

    def _create_operations(self):
        self.tag_generator = _tag_generator()
        self.name_generator = _name_generator(namelist)
        self._stepchoice = ["NM", "NC", "NA"] # new malloc, new calloc, new align
        self._base_stepchoice = self._stepchoice.copy()
        weight_modifier = self._get_option("INIT_WEIGHT_MODIFIER")
        self._stepchoiceweights = [x*weight_modifier for x in self._get_all_options("WEIGHTS")[:3]]
        self._base_stepchoiceweights = self._stepchoiceweights.copy()
        operation_count = self._get_option("OPCOUNT")
        self.target_probability = 1.0/float(operation_count+1.0)
        self.bugged_probability = 1.0/float(operation_count+1.0)
        operations = []
        for i in range(operation_count):
            if i==0 and self._get_option("HAS_INIT"):
                op = ".init:"
                is_init=True
            else:
                if i!=0:
                    self.bugged_probability = self.bugged_probability*float(i+1)/float(i)
                    self.target_probability = self.target_probability*float(i+1)/float(i)
                is_init=False
                op = next(self.name_generator) + ":"
            choices, weights = random.choices(\
                [(self._base_stepchoice,self._base_stepchoiceweights),(self._stepchoice,self._stepchoiceweights)],\
                self._get_all_options("BASE_NOBASE"))[0]
            for j in range(self._get_option("STEPCOUNT")):
                is_bugged = random.choices([True,False],[self.bugged_probability, 1-self.bugged_probability])[0]
                is_target = random.choices([True,False],[self.target_probability, 1-self.target_probability])[0]
                op += self._create_step(choices, weights, is_bugged, is_target, is_init)
            operations.append(op)
        return operations

    def _create_step(self, choices, weights, is_bugged=False, is_target=False, is_init=False):
        choice = random.choices(population=choices, \
                weights=weights, k=1)[0]
        tag = ""
        number = -1
        args = []
        name = ""
        weight_modifier = 1 if is_init else self._get_option("INIT_WEIGHT_MODIFIER")
        if choice[0]=="N":
            tag = next(self.tag_generator)
            name = next(self.name_generator)
            self._stepchoice.append("R{:s}".format(tag))
            self._stepchoiceweights.append(weight_modifier*(self._get_all_options("WEIGHTS")[3]))
            self._stepchoice.append("F{:s}".format(tag))
            self._stepchoiceweights.append(weight_modifier*(self._get_all_options("WEIGHTS")[4]))
            if choice[1]=="M":
                number = 0
                args.append(str(self._get_option("SIZE")))
            elif choice[1]=="C":
                number = 1
                args.append(str(self._get_option("NMEMB")))
                args.append(str(math.floor(self._get_option("SIZE")/int(args[-1]))))
            elif choice[1]=="A":
                number = 2
                args.append(str(self._get_option("ALIGNMENT")))
                args.append(str(self._get_option("SIZE")))
            else:
                print("Unknown create request.")
                number = -1
        elif choice[0]=="R":
            number = 3
            tag = choice[1:]
            args.append(str((self._get_option("SIZE"))))
        elif choice[0]=="F":
            tag = choice[1:]
            number = 4
            try:
                index = self._stepchoice.index("F"+tag)
                del self._stepchoice[index]
                del self._stepchoiceweights[index]
                index = self._stepchoice.index("R"+tag)
                del self._stepchoice[index]
                del self._stepchoiceweights[index]
            except ValueError as e:
                print("Error: Failed in removing all stepchoices ({:s}) due to: {:s}. ".format(tag, str(e)))
                print(self._stepchoice)
                pass
        else:
            print("unknown choice: {:s}".format(choice))
        bt = ""
        if number < 4 and is_bugged:
            bt = "&B"
            self.bugged_probability=0
        elif number < 4 and is_target:
            bt = "&T"
            self.target_probability=0
        return "{:d}{:s}{:s}({:s}{:s}{:s})".format(number, tag, bt, name, ":" if number!=4 else "", ",".join(args))

    def creates_requires_removes(self, opstr):
        creates = []
        requires = []
        removes = []
        opstr = opstr.split(":",1)[1]
        if opstr[0]=='0' or opstr[0]=='1' or opstr[0]=='2':
            pass


########################


def _name_generator(namelist):
    while True:
        pick_from = namelist.copy()
        while len(pick_from)>0:
            i = random.randint(0,len(pick_from)-1)
            name = pick_from[i]
            del pick_from[i]
            yield name

def _tag_generator():
  ctr = 0
  while True:
    i = ctr
    newCharacter = i % 26
    i //= 26
    s = "" +chr(newCharacter + ord('A') )
    while i != 0:
      newCharacter = i % 26
      i //= 26
      s = chr(newCharacter + ord('A') ) + s
    yield s
    ctr += 1

## Namelist
namelist = [
"instal",
"anticipation",
"present",
"researcher",
"attic",
"contemporary",
"wage",
"democratic",
"discount",
"sailor",
"float",
"lean",
"project",
"jewel",
"value",
"harmful",
"step",
"landscape",
"leader",
"irony",
"snow",
"relief",
"wild",
"capital",
"pest",
"symptom",
"trace",
"revoke",
"honest",
"spray",
"soul",
"belt",
"rough",
"beer",
"stem",
"overcharge",
"assumption",
"stunning",
"packet",
"wind",
"marketing",
"name",
"suppress",
"organisation",
"council",
"road",
"pan",
"worm",
"matter",
"finished",
"route",
"prefer",
"lip",
"spit",
"knot",
"pasta",
"strain",
"celebration",
"stunning",
"pottery",
"queen",
"explicit",
"hen",
"acquaintance",
"imposter",
"favourite",
"tactic",
"painter",
"stay",
"surprise",
"rebellion",
"betray",
"remind",
"jump",
"pocket",
"provision",
"sunrise",
"bishop",
"ignorance",
"chew",
"jewel",
"so",
"drawing",
"hardware",
"reveal",
"investment",
"lobby",
"door",
"expectation",
"period",
"disk",
"privacy",
"flower",
"image",
"prosecute",
"degree",
"ground",
"notion",
"embark",
"recession"
]


if __name__ == "__main__":
    import sys
    x = PuzzleGenerator()
    if len(sys.argv)>2 and sys.argv[1].upper()=="GENERATE":
        if len(sys.argv)>3:
            x = PuzzleCron(int(sys.argv[3]))
        else:
            x = PuzzleCron()
        x.create_new(int(sys.argv[2]))
        print("Now we have {:d} puzzles on this level.".format(x.count()))
        exit(0)
    if len(sys.argv)>1:
        x.level = int(sys.argv[1])
    print(x.create_puzzle())
