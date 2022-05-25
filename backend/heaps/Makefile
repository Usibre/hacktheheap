CC =        gcc
CFLAGS =    -fPIC -Wall -Wextra -O0 -Wno-unused-parameter
LDFLAGS =   -fPIC -z muldefs
OUT =       malloc_probe
EXTRA_CFLAGS =
NOMALLOC_FLAGS = -fno-builtin-malloc -fno-builtin-calloc -fno-builtin-realloc -fno-builtin-free -fno-builtin-memalign -fno-builtin-mallopt

$(OUT): noheap-utils.o malloc_probe.o  
	$(CC) $^ -o $@ $(LDFLAGS)

dl: dlmalloc.o noheap-utils.o malloc_probe.o
	$(CC) $^ -o $@$(OUT) $(LDFLAGS)

# Requires yum/apt install google-perftools
# or yum install gperftools-libs-2.6.1-1.el7.x86_64.rpm
tc: noheap-utils.o tcprobe.o
	$(CC) $^ -o $@$(OUT) $(LDFLAGS) -ltcmalloc 

# sudo apt install libjemalloc-dev
je: noheap-utils.o tcprobe.o
	$(CC) $^ -o $@$(OUT) $(LDFLAGS) -ljemalloc

tcprobe.o: tcmalloc_probe.c
	$(CC) $^ -o $@ $(CFLAGS) $(NOMALLOC_FLAGS) -c

install: $(OUT)
	sudo cp ./*$(OUT) /usr/bin/ || echo "\e[31mStop the service before updating!\e[39m"

malloc_probe.o: malloc_probe.c noheap-utils.h
	$(CC) malloc_probe.c -c -o malloc_probe.o $(CFLAGS) $(EXTRA_CFLAGS)

noheap-utils.o: noheap-utils.c noheap-utils.h
	$(CC) noheap-utils.c -c -o noheap-utils.o $(CFLAGS) $(EXTRA_CFLAGS)

dlmalloc.o: dlmalloc-2.8.4.c
	$(CC) dlmalloc-2.8.4.c -c -o dlmalloc.o $(CFLAGS)
 


clean:
	rm -f *.o core
