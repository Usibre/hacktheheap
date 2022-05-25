#include "stdio.h"
#include "stdlib.h"
#include "stdint.h"
#include "string.h"
#include "unistd.h"
#include "malloc.h"
#include "alloca.h"
#include "noheap-utils.h"

#define STR_EVALUATE(x)   #x
#define STRINGIFY(x)      STR_EVALUATE(x)

#ifndef BUFSIZE
#define BUFREADSIZE 1023
#define BUFSIZE BUFREADSIZE+1
#endif
#ifndef DEBUG
#define DEBUG 0
#endif


size_t get_true_size(void *malloced) {
	size_t flagsandsize = *(size_t*) ((uintptr_t)malloced-sizeof(size_t));
	return (flagsandsize | 0x7) - 0x7;
}

uint8_t in_free(void **all, size_t size, uintptr_t val) {
	for (size_t i = size; i > 0; --i) {
		if ((uintptr_t)all[i-1] == val) {
			all[i-1] = (void*)0; // reset
			return 1;
		} //else fprintf(stderr, "Not in %ld.\n", i-1);
	}
	return 0;
}

int main() {
	char buffer[BUFSIZE];
  char *buff = (char*)buffer;
  char** const bufptr = &buff;
  char opty;
  mallopt(M_CHECK_ACTION, 5);
	void *x = malloc(50);
	// skip the x
	uintptr_t afterX = (uintptr_t)x + 50;//get_true_size(x);
	nh_write_ptr((void*)afterX);
  written=1;
	while (1) {
    if (!written) nh_write_error();
    *bufptr = (char*)buffer;
		read(STDIN, buff, BUFREADSIZE);
    written=0;
		if (strlen(buff)<1 || buff[0]=='\n') {
			nh_stderr_write("Reading stdin failed.\n");
      nh_write_error();
			continue;
		}
    size_t size, nmemb, ptr, param, value, alignment;
    opty = buff[0];
    (*bufptr)++;
    (*bufptr)++; // opty [space]
		switch (opty) {
			case '0':
        size = nh_get_number(bufptr);
				x = malloc(size);
				if (x==NULL) {
					nh_stderr_write("MALLOC FAILED.\n");
          nh_write_error();
					break;
				}
        add_LL(x);
				nh_print_rec('0', x, size);
				break;
      case '1':
        nmemb = nh_get_number(bufptr);
        size = nh_get_number(bufptr);
        x = calloc(nmemb, size);
        if (x==NULL) {
          nh_stderr_write("CALLOC FAILED.\n");
          nh_write_error();
          break;
        }
        add_LL(x);
        nh_print_rec('1', x, size);
        break;
      case '2':;
        alignment = nh_get_number(bufptr);
        size = nh_get_number(bufptr);
        x = memalign(alignment, size);
        if (x==NULL) {
          nh_stderr_write("MEMALIGN FAILED.\n");
          nh_write_error();
          break;
        }
        add_LL(x);
        nh_print_rec('2', x, size);
        break;
      case '3': // realloc
        ptr = nh_get_number(bufptr);
        size = nh_get_number(bufptr);
        if (ptr && !in_ll((void*)ptr)) {
          nh_stderr_write("Unrecognised ptr in realloc.\n");
          nh_write_error();
          break;
        }
        x = realloc((void*)ptr, size);
        if (x==NULL && size>0) { // note that size==0 represents a free
          nh_stderr_write("REALLOC FAILED.\n");
          nh_write_error();
          break;
        }
        rm_LL((void*)ptr);
        add_LL(x);
        nh_print_rec('3', x, size); 
        break;
      case '4':
			case 'F':
        ptr = nh_get_number(bufptr);
        if (!in_ll((void*)ptr)) {
          nh_stderr_write("Unrecognised ptr in free.\n");
          nh_write_error();
        } else {
          free((void*)ptr);
          rm_LL((void*)ptr);
  				nh_print_rec('4', (void*)ptr, size);
        }
        break;
      case '5':
        // mallopt
        param = nh_get_number(bufptr);
        value = nh_get_number(bufptr);
        int mallopt_result = mallopt(param, value);
        nh_print_rec('5', (void*)0, (size_t)mallopt_result);
        break;
			case 'Q':
			case 'q':
				exit(0);
			default:
				nh_stderr_write("Unknown opty:");
        nh_write_error();
				break;
		}
	} // end while 1
}
