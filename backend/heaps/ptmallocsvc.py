#!/usr/bin/env python3
import socket, selectors
from queue import Queue, Empty
import logging
# pip3 install pymysql
import pymysql
from db_info import *

READSIZE = 1024*4
HOST = '127.0.0.1'
PORT = 1337

# python3 -m pip install ComplexHTTPServer

from http.server import BaseHTTPRequestHandler,HTTPServer
import socketserver, json, sys, threading
import cgi, copy, parse
import time
from subprocess import Popen, PIPE as spPIPE
#############################################################################

ON_POSIX = 'posix' in sys.builtin_module_names

def enqueue_output(out, queue):
    """
    while True:
        try:
            output = out.read(1)
            if output is not None and len(output)>0:
                queue.put(output)
    """
    try:
        for line in iter(out.readline, b''):
            if len(line)>0:
                queue.put(line)
    except ValueError:
        self.logger.warning("ValueError on the queue.")
    out.close()

def idle_process_kill_loop(malloc_server):
    every = 60*5 # 5 minutes sleep in between runs
    kill_after = 15*60 # kill if idle for over 15 minutes
    Server.logger.info("Starting process kill loop.")
    while True:
        time.sleep(every)
        timestamp = time.time()
        indices = copy.copy(list(malloc_server.svcMap.keys()))
        for svcindex in indices:
            # racecond against an explicit end
            if svcindex not in malloc_server.svcMap:
                continue
            svc = malloc_server.svcMap[svcindex]
            if int(timestamp - svc.timestamp) > kill_after:
                Server.logger.info("Killing idle service {}".format(svc.id))
                svc.destroy()
                del malloc_server.svcMap[svcindex]
###### End Stuff #########################



class MallocService:
    timeout = 3
    timeout_tries = 9
    max_alloc_per_run = 2000000 # 2MB per client is currently a max.
    def __init__(self, recv_json):
        self.logger = logging.getLogger("hthbackend.mallocsvc")
        self.id = recv_json['id']
        self.probe = "malloc_probe"
        if "allocator" in recv_json:
            if recv_json['allocator'].lower()=='ptmalloc':
                pass
            elif recv_json['allocator'].lower()=='tcmalloc':
                self.probe = "tcmalloc_probe"
            elif recv_json['allocator'].lower()=='dlmalloc':
                self.probe = "dlmalloc_probe"
            elif recv_json['allocator'].lower()=='jemalloc':
                self.probe = "jemalloc_probe"
        self.timestamp = time.time()
        self.proc = None
        self.start_service()
        self.layout = []
        self.layout.append(HeapBlock(size=MallocService.max_alloc_per_run, name='filler', ty='E'))
        self.allocated = 0
        self.error_msg = ""
        self.tags = dict()
        self.events = []
        self.ptrlist = []
        self.handling = False
        self.prevops = []
        # now execute the given operation at init
        if "operation" in recv_json:
            recv_json['action'] = 'execute'
            self.handle(recv_json)


    def destroy(self):
        if self.proc is None or self.proc.poll() is not None:
            return
        self.logger.info("Killing process pid {:d}...".format(self.proc.pid))
        self.proc.stdin.write("q\n")
        try:
            # note that output shouldn't deadlock because of our output queue.
            self.proc.wait(timeout=2)
        except TimeoutExpired as e:
            self.proc.kill()

    def start_service(self):
        self.logger.info("Starting heap probe subprocess (id {}).".format(self.id))
        # so, so ugly :((
        self.proc = Popen(["stdbuf", "-i0", "-o0", "-e0", self.probe], \
                stdout=spPIPE, stdin=spPIPE, stderr=spPIPE, \
                encoding='utf-8', bufsize=1, universal_newlines=True, \
                close_fds=ON_POSIX)

        self.q = Queue()
        self.queue_t = threading.Thread(target=enqueue_output, args=(self.proc.stdout, self.q))
        self.queue_t.daemon = True
        self.queue_t.start()

        try:
            line = self.q.get(timeout=1)
            self._base = int(line, 16)
        except Empty:
            self.logger.warning("stdout reading error: Could not read initial pointer?")


    @property
    def setup_json(self):
        return "[" + ",".join([x.toJSON() for x in self.layout]) + "]"

    @property
    def taglist(self):
        listjson = ''
        for tag,val in self.tags.items():
            listjson += '{"tag":"%s","value":%d},'%(tag,val)
        listjson = listjson[:-1] # last comma
        return '[' + listjson + ']'

    @property
    def show(self):
        val = '{"id":%d,"layout":%s'%(self.id, self.setup_json)
        if self.tags:
            val += ',"tags":{:s}'.format(self.taglist)
            self.tags.clear()
        if (len(self.events)) > 0:
            evts = ['"'+x+'"' for x in self.events]
            val += ',"events":[{:s}]'.format(",".join(evts))
            self.events=[]
        if len(self.error_msg) > 0:
            val += ',"errors":"{:s}"'.format(self.error_msg)
            self.error_msg = ''
        return val+'}'

    def handle(self, recv_json):
        self.error_msg = ""
        assert(recv_json['action'].lower() == 'execute'),'non-execute operation.'
        assert('operation' in recv_json),'no operation in execute request'
        while (self.handling):
            time.sleep(.5)
        self.handling = True
        op = recv_json['operation']
        keep_context = False if 'state' not in recv_json or recv_json['state'].lower()!='keep' else True
        self.ctr = 0
        res = self._handle_op(op, keep_context)
        self.handling = False
        return res

    def _handle_op(self, op, keep_context=False):
        if not keep_context:
            self.prevops = []
        self.timestamp = time.time()
        for action in op:
            try:
                self._handle_action(action, action['action'])
            except (RuntimeError, AssertionError,AttributeError) as e:
                self.logger.warning("Failed action: {}".format(str(e)))
                self.error_msg = ';'.join(self.error_msg.split(';') + [str(e)])
            continue
        self.timestamp = time.time()
        return

    def _handle_action(self, action, actionty):
        ptr = None
        self.prevops.append(-1)
        self.ctr+=1
        assert(self.ctr==len(self.prevops)),"prevops misaligned!"
        action["name"] = "No" if "name" not in action else action["name"]
        try:
            if 'malloc' == actionty or 'allocate'==actionty:
                ptr = self._handle_malloc(action)
                self.prevops[-1] = ptr;
            elif 'calloc'==actionty:
                ptr = self._handle_calloc(action)
                self.prevops[-1] = ptr;
            elif 'memalign'==actionty:
                ptr = self._handle_memalign(action)
                self.prevops[-1] = ptr;
            elif 'realloc'==actionty:
                ptr = self._handle_realloc(action)
                self.prevops[-1] = ptr;
            elif 'free'==actionty:
                self._handle_free(action)
                self.tags['-'+action['itag']] = 0
                self._check_wincons(action)
                return;
            elif 'mallopt'==actionty:
                return self._handle_mallopt(action)
        except KeyError as e:
            self.logger.warning("Action failed: {}".format(e))
            raise RuntimeError("Unknown action:{:s}".format((str(action))))
        if ptr is None:
            raise RuntimeError('Unknown action: "{:s}"'.format(str(action)))
        self._check_wincons(action, ptr)
        if 'itag' in action:
            self.tags[action['itag']] = ptr
        elif 'tag' in action:
            self.tags[action['tag']] = ptr

    def _check_specials(self, action, ptr=None):
        if not 'itag' in action:
            return
        if action['action'] in ['malloc', 'calloc', 'memalign', 'realloc']:
            if not 'ty' in action or action['ty'].upper()=='R':
                return
            if ptr is None or ptr < 0:
                return
            self.events.append('"A'+action['itag']+'"')
        if action['action'] in ['realloc','free']:
            self.events.append('"F'+action['itag']+'"')

    def _check_wincons(self, action, ptr=None):
        if action['action'] in ['malloc', 'calloc', 'memalign', 'realloc']:
            if ptr is None:
                return
            if not 'ty' in action or action['ty'].upper()=='R':
                return
            index = self._rel_ptr_to_index(ptr)
            try:
                if self.layout[index].ty=='B' and self.layout[index+1].ty=='T':
                    self.events.append("OVF")
                    self.events.append("OFA")
                if self.layout[index].ty=='T' and self.layout[index+1].ty=='B':
                    self.events.append("UNF")
            except IndexError:
                pass
            try:
                if self.layout[index].ty=='B' and self.layout[index-1].ty=='T':
                    self.events.append("UNF")
                    self.events.append("UFA")
                if self.layout[index].ty=='T' and self.layout[index-1].ty=='B':
                    self.events.append("OVF")
            except IndexError:
                pass
        if action['action'] in ['realloc', 'free']:
            pass

    def _handle_malloc(self, action):
        handle_str='0 ' # 0 == malloc
        size = self._to_int(action["size"])
        if self.allocated+size > MallocService.max_alloc_per_run:
            raise RuntimeError("Max heap size exceeded.")
        handle_str += "0x{:x}\n".format(size)
        res = self.process_str(handle_str)
        try:
            ty, retptr, totalsize = parse.parse("{:d} 0x{:x} + {:d}", res)
            self._place(retptr, totalsize, action)
            self.ptrlist.append(retptr-self._base)
        except (TypeError, IndexError,AssertionError) as e: 
            raise RuntimeError('Received invalid malloc data type from probe: {} ({})'.format(res, str(e)))
        return retptr-self._base

    def _handle_calloc(self, action):
        handle_str='1 ' # 1 == calloc
        size = self._to_int(action["size"])
        nmemb = self._to_int(action["nmemb"])
        if self.allocated+size*nmemb > MallocService.max_alloc_per_run:
            raise RuntimeError("Max heap size exceeded.")
        handle_str += "0x{:x} 0x{:x}\n".format(nmemb, size)
        res = self.process_str(handle_str)
        try:
            ty, retptr, totalsize = parse.parse("{:d} 0x{:x} + {:d}", res)
            self._place(retptr, totalsize, action)
            self.ptrlist.append(retptr-self._base)
        except (TypeError, IndexError,AssertionError):
            raise RuntimeError('Received invalid calloc data type from probe: {}'.format(res))
        return retptr-self._base

    def _handle_memalign(self, action):
        handle_str='2 ' # 2 == memalign
        size = self._to_int(action["size"])
        memalign = self._to_int(action["alignment"])
        if self.allocated+size > MallocService.max_alloc_per_run:
            raise RuntimeError("Max heap size exceeded.")
        handle_str += "{:d} 0x{:x}\n".format(memalign, size)
        res = self.process_str(handle_str)
        try:
            ty, retptr, totalsize = parse.parse("{:d} 0x{:x} + {:d}", res)
            self._place(retptr, totalsize, action)
            self.ptrlist.append(retptr-self._base)
        except (TypeError, IndexError,AssertionError):
            raise RuntimeError('Received invalid memalign data type from probe: {}'.format(res))
        return retptr-self._base

    def _handle_realloc(self, action):
        handle_str='3 ' # 3 == realloc
        size = self._to_int(action["size"])
        ptr = -1
        try:
            if "ptr" in action:
                ptr = self._to_int(action["ptr"])
        except (AttributeError, ValueError, IndexError):
            pass
        try:
            if "prevptr" in action:
                ptr = self.prevops[self._to_int(action["prevptr"])]
        except (AttributeError, ValueError, IndexError):
            pass
        if ptr not in self.ptrlist:
            raise RuntimeError("Unknown realloc pointer")
        if self.allocated+size > MallocService.max_alloc_per_run:
            raise RuntimeError("Max heap size exceeded.")
        handle_str += "0x{:x} 0x{:x}\n".format(ptr + self._base, size)
        res = self.process_str(handle_str)
        try:
            ty, retptr, totalsize = parse.parse("{:d} 0x{:x} + {:d}", res)
            self.ptrlist.remove(ptr)
            self.ptrlist.append(retptr-self._base)
            if retptr==0:
                self._rm(ptr, totalsize)
            else:
                self._re_place(ptr, retptr-self._base, totalsize, action)
        except (TypeError, IndexError, AssertionError) as e:
            raise RuntimeError("Received invalid realloc data type from probe: '{}' ({:s})".format(res, str(e)))
        return retptr-self._base

    def _handle_free(self, action):
        handle_str='4 ' # 4 == free
        ptr = -1
        try:
            if "ptr" in action:
                ptr = self._to_int(action["ptr"])
        except (AttributeError, ValueError, IndexError):
            pass
        try:
            if "prevptr" in action:
                ptr = self.prevops[self._to_int(action["prevptr"])]
        except (AttributeError, ValueError, IndexError) as e:
            self.logger.warning("Unable to fetch prevptr: "+str(e))
            self.logger.warning("prevops:"+str(len(self.prevops)))
            pass
        if ptr!=0 and ptr not in self.ptrlist:
            self.logger.warning("Free action without ptr? :(")
            self.logger.warning(action)
            raise RuntimeError("Unknown free pointer: "+str(ptr))
        handle_str += "0x{:x}\n".format(ptr + self._base)
        res = self.process_str(handle_str)
        if res.upper().startswith("ERROR"):
            self.logger.warning("Free failed: {}".format(res))
        else:
            # wht not remove duplicates? :)
            self.ptrlist = list(set(self.ptrlist))
            self.ptrlist.remove(ptr)
            self._rm(ptr,0)

    def _handle_mallopt(self, action):
        handle_str='5 ' # 3 == mallopt
        param = self._to_int(action["param"])
        value = self._to_int(action["value"])
        handle_str += "0x{:x} 0x{:x}\n".format(param, value)
        res = self.process_str(handle_str)
        self._rm(ptr,0)

    def process_str(self, handle_str):
        try:
            self.proc.stdin.write(handle_str)
            self.logger.debug("{}: sent: '{}'".format(self.ctr, handle_str[:-1]))
        except BrokenPipeError as e:
            raise RuntimeError("Broken pipe: "+str(self.proc.returncode))
        i = 0
        while 1:
            try:
                if self.proc.poll() is not None:
                    raise RuntimeError('Subprocess does not exist: '+str(self.proc.returncode))
                outs = self.q.get(timeout=MallocService.timeout/MallocService.timeout_tries)
                break
            except Empty:
                self.logger.info('stdout reading error: No output yet.')
                i += 1
        self.logger.debug("Received: '{}'".format(outs.strip()))
        return outs.strip()

    def _to_int(self, val):
        if isinstance(val, int):
            return val
        if not isinstance(val, str):
            return int(val,10)
        if val.lower().startswith('0x'):
            return int(val,16)
        return int(val,10)

    def _rel_ptr_to_index(self, ptr):
        i = 0
        while ptr > 0 and len(self.layout)>i:
            ptr -= self.layout[i].size
            i+=1
        if ptr==0:
            return i
        return -1
    def _rel_ptr_to_next_index(self, ptr):
        i = 0
        while ptr >= 0 and len(self.layout)>i:
            ptr -= self.layout[i].size
            i+=1
        return i

    def _re_place(self, ptr, retptr, totalsize, action):
        i = 0
        oldptr = ptr
        while ptr > 0: # here we just assume we're right, since its already worked in practic
            ptr -= self.layout[i].size
            i += 1
        oldblock = self.layout[i]
        action['name'] = oldblock.name
        action['ty'] = oldblock.ty
        #action['id'] = oldblock.id
        action['itag'] = oldblock.itag
        self._rm(oldptr, oldblock.size)
        self._place(retptr+self._base, totalsize, action)

    def _place(self, ptrloc, size, action):
        name = action['name']
        ty = 'R' if 'ty' not in action else action['ty']
        id = -1 if 'id' not in action else int(action['id'])
        itag = '' if 'itag' not in action else action['itag']
        ptrloc -= self._base
        # Base address change
        if ptrloc < 0:
            self.logger.warning("Warning! Changing base addr! {:d} at base 0x{:x}".format(ptrloc, self._base))
            if self.layout[0].ty.lower()=='e':
                self.layout[0].size += abs(ptrloc)
            else:
                self.layout.insert(0, HeapBlock(size=abs(ptrloc), name='E', ty='E'))
            self._base -= abs(ptrloc)
            ptrloc=0
        # Find its location
        i = 0
        while ptrloc > 0 and len(self.layout)>i:
            if self.layout[i].size > ptrloc:
                assert(self.layout[i].ty.lower()=='e'),'Malloc overlaps with existing one'
                self.layout.insert(i, HeapBlock(size=ptrloc, name='E',ty='E'))
                self.layout[i+1].size -= ptrloc
                ptrloc=0
                i+=1
                break
            ptrloc -= self.layout[i].size
            i+=1
        # either we ran out of layout or ptrloc==0
        if ptrloc > 0:
            self.layout.append(HeapBlock(size=ptrloc, name='newfiller', ty='E'))
            self.layout.append(HeapBlock(size=1024*1024, name='newfiller', ty='E'))
            i+=1
            ptrloc = 0
        if i+1==len(self.layout) and self.layout[i].size < size:
            self.layout[i].size = size;
        assert(ptrloc == 0),'malloc location calculation failed.'
        assert(self.layout[i].ty.lower()=='e'),'Malloc overlaps with existing one'
        if not self.layout[i].size>=size:
            self.logger.warning("Trying to fit new block of size {} in {}".format(size, self.layout[i]))
            self.logger.warning("Block is {}/{}".format(i, len(self.layout)-1))
        assert(self.layout[i].size>=size),'Malloc does not fit in given block'
        self.layout.insert(i, HeapBlock(size=size, name=name, ty=ty, id=id, itag=itag))
        self.layout[i+1].size -= size
        if self.layout[i+1].size <= 0:
            del self.layout[i+1]

    def _rm(self, ptrloc, size):
        i = 0
        while ptrloc > 0: # here we just assume we're right, since its already worked in practic
            ptrloc -= self.layout[i].size
            i += 1
        self.layout[i].ty = 'e'
        self.layout[i].name += 'freed'
        self._cleanup()
        return

    def _cleanup(self):
        oldlen = len(self.layout)
        for i in range(len(self.layout)-2, -1, -1):
            if self.layout[i].ty.lower() !='e':
                continue
            if self.layout[i+1].ty.lower() !='e':
                continue;
            # now merge i with i+1
            self.layout[i].size += self.layout[i+1].size
            del self.layout[i+1]
        return len(self.layout)!=oldlen

class HeapBlock:
    def __init__(self, size=0, name='', ty='', id=-1, itag=''):
        self.size = size
        self.name = name
        self.ty = ty
        self._id = id
        self.itag = itag

    def __repr__(self):
        return "{:s} (size {:d},{:s})".format(self.name, self.size, self.ty)

    def toJSON(self):
        if self.ty is None or self.ty == '':
            self.ty = 'R'
        return '{"id":%d,"name":"%s","size":%d,"ty":"%s","itag":"%s"}' %\
                (int(self._id), str(self.name), int(self.size), str(self.ty), self.itag)
        return json.dumps(self, default=lambda o: o.__dict__,
            sort_keys=True)#, indent=4)
##############################################################################

class PuzzleDatabase:
    def __init__(self):
        self.db = pymysql.connect(host=DB_HOST, \
                user=DB_USER, \
                password=DB_PASSWORD, \
                db=DB_DATABASE, \
                charset="utf8")
        self.cursor = self.db.cursor()
        self._level = -1
        self._id = None

    @property
    def id(self):
        return self._id

    @id.setter
    def id(self, id):
        try:
            if id>=0:
                self._id = id
        except Exception:
            pass

    @property
    def level(self):
        return self._level
    @level.setter
    def level(self, level):
        if int(level) >= -2 and int(level) < 10:
            self._level = int(level)

    def get_puzzle(self):
        try:
            if self.id is not None:
                query = "SELECT `id`, `code` FROM `puzzles` WHERE `id`='{:d}' ORDER BY RAND() LIMIT 1"
                argument = self.id
            else:
                query = "SELECT `id`, `code` FROM `puzzles` WHERE `level`='{:d}' ORDER BY RAND() LIMIT 1"
                argument = self.level
            self.cursor.execute(query.format(argument))
            return list(self.cursor.fetchall())[0]
        except Exception as e:
            if self.id is not None:
                self._id = None
                self.cursor.close()
                self.cursor = self.db.cursor()
                return self.get_puzzle()
            Server.logger.warning("Warning: unable to fetch data: {}".format(e))
            return ('-1','')

    def save_solution(self, action):
        try:
            pid = int(action['pid'])
        except ValueError:
            pid = -1
        query = "INSERT INTO `solutions` (`pid`, `code`,`solution`,`player`) VALUES (%s,%s,%s,%s)"
        # check on pid and resort to -1
        try:
            self.cursor.execute(query, (pid,action['puzzlecode'],action['solution'],action['player']))
            self.db.commit()
        except Exception as e:
            Server.logger.warning("Error: unable to save solution: {}".format(e))

    def save_impossible(self, action):
        # in contrast, here we want to drop if pid < 0 since we don't care about impossible custom puzzles
        try:
            pid = int(action['pid'])
            if pid < 0:
                raise ValueError("no negative impossibles.")
        except ValueError:
            return
        query = "INSERT INTO `impossible` (`pid`, `player`) VALUES (%s,%s)"
        try:
            self.cursor.execute(query, (pid,action['player']))
            self.db.commit()
        except Exception as e:
            Server.logger.warning("Error: unable to save impobru: {}".format(e))



##############################################################################

class ThreadingSimpleServer(socketserver.ThreadingMixIn,HTTPServer):
    pass


class Server(BaseHTTPRequestHandler):
    svcMap = {}
    kill_loop = None
    logger = None
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if Server.logger is None:
            self._set_logger(**kwargs)
        if Server.kill_loop is None:
            Server.kill_loop = threading.Thread(target=idle_process_kill_loop, args=(self,))
            Server.kill_loop.daemon = True
            Server.logger.info("Starting kill loop...")
            Server.kill_loop.start()


    def _set_logger(self, **kwargs):
        print("Creating logger.")
        level = logging.WARNING if "debug" not in kwargs else kwargs["debug"]
        Server.logger = logging.getLogger("hthbackend")
        Server.logger.setLevel(level)
        ch = logging.StreamHandler()
        ch.setLevel(level)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        ch.setFormatter(formatter)
        Server.logger.addHandler(ch)
        if "logfile" in kwargs and kwargs["logfile"] is not None:
            ch = logging.FileHandler(kwargs["logfile"])
            ch.setLevel(logging.DEBUG)
            ch.setFormatter(formatter)
            Server.logger.addHandler(ch)
        Server.logger = logging.getLogger("hthbackend.server")

    def _set_headers(self, response_code = 200, response_text="OK", end_headers=True, contentlength=-1):
        self.send_response(response_code, response_text)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header("Access-Control-Allow-Methods", "OPTIONS, GET, POST")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header('Allow', 'OPTIONS, GET, POST')
        if contentlength > 0:
            self.send_header('Content-Length', "{:d}".format(contentlength))
        if end_headers:
            self.send_header('Content-type', 'application/json')
            self.end_headers()

    def do_HEAD(self):
        self._set_headers()

    def do_GET(self):
        if not hasattr(self, '_headers_buffer'):
            self._headers_buffer = []
        # refuse to receive non-json content
        if self.headers.get_content_type() != 'application/json':
            self.end_headers()
            self.send_response(406, message="No json")
            return
	# get the right response
        length = int(self.headers['content-length'])
        data = self.rfile.read(length)
        try:
            json_data = json.loads(data)
            if not "action" in json_data:
                raise AttributeError("No action defined.")
            json_resp = self.get_json_resp(json_data)
        except (json.decoder.JSONDecodeError, AttributeError) as e:
            self.end_headers()
            self.wfile.write((str(e) + '\n').encode('utf-8'))
            Server.logger.warning(str(e))
            Server.logger.warning("On request:" + data.decode("utf-8"))
            self.send_response(406, message="No json")
            return
        except AssertionError as e:
            #self.end_headers()
            self._set_headers(409, "Illegal Operation", contentlength=len(str(e))+12)
            self.wfile.write(('{"Error":"' + str(e) + '"}').encode('utf-8'))
            self.send_response(409, message="Illegal Operation")
            return
        # and send it
        self._set_headers(contentlength=len(json_resp)+1)
        self.wfile.write(json_resp.encode('utf-8'))
        self.wfile.write(b'\n')
        return

    # POST echoes the message adding a JSON field
    def do_POST(self):
        self.do_GET()
        return
        # refuse to receive non-json content
        if self.headers.get_content_type() != 'application/json':
            self.end_headers()
            self.send_response(418, message="I'm a JSON teapot.")
            return

        # read the message and convert it into a python dictionary
        length = int(self.headers.getheader('content-length'))
        message = json.loads(self.rfile.read(length))

        # add a property to the object, just to mess with data
        message['received'] = 'ok'

        # send the message back
        self._set_headers()
        self.wfile.write(json.dumps(message))
        #self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(204, "No Content", end_headers=False)
        self.end_headers()

    def get_json_resp(self, recv_json):
        if recv_json['action'].lower() == "puzzlerequest":
            db = PuzzleDatabase()
            if "level" in recv_json:
                db.level = recv_json["level"]
            if "id" in recv_json :
                db.id = recv_json["id"]
            id, puzzle = db.get_puzzle()
            return '{"id":"%d","puzzle":"%s"}'%(id, puzzle)
        if recv_json['action'].lower() == "export":
            db = PuzzleDatabase()
            db.save_solution(recv_json)
            return '{}'
        elif recv_json['action'].lower() == "impossible":
            db = PuzzleDatabase()
            db.save_impossible(recv_json)
            return '{}'
        gid = recv_json['id']
        if gid in Server.svcMap:
            if recv_json['action'].lower() == "end":
                if gid in Server.svcMap:
                    Server.svcMap[gid].destroy()
                    del Server.svcMap[gid]
                return '{}'
            elif recv_json['action'].lower() == "execute":
                Server.svcMap[gid].handle(recv_json)
                return Server.svcMap[gid].show
            elif recv_json['action'].lower() == "show":
                return Server.svcMap[gid].show
            else:
                raise AssertionError("Unknown action: {}".format(recv_json['action']))
        elif recv_json['action'].lower() == "init":
            return self.new_svc(recv_json)
        elif recv_json['action'].lower() == "end":
            return '{}'
        else:
            raise AssertionError("Unknown id: {}".format(recv_json['id']))
        return '{"ERROR":true}'

    def new_svc(self, recv_json):
        Server.svcMap[recv_json['id']] = MallocService(recv_json)
        return Server.svcMap[recv_json['id']].show



def run(server_class=ThreadingSimpleServer, handler_class=Server, port=1337): 
    server_address = ('', port) # 127.0.0.1
    with server_class(server_address, Server) as httpd:
        print('Starting httpd on port {:d}...'.format(port))
        httpd.serve_forever()


if __name__ == "__main__":
    if len(sys.argv) == 2:
        run(port=int(sys.argv[1]))
    else:
        run()
