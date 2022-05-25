#ifndef __NOHEAP_UTILS_H
#define __NOHEAP_UTILS_H 1
#include "stdint.h"
#include "stddef.h"
/**
 * C++ version 0.4 char* style "itoa":
 * Written by Lukás Chmela
 * Released under GPLv3.
 */

char* nh_itoa(int value, char* result, int base);
void nh_add_ptr_to_string(char *buf, void *ptr);
void nh_add_nr_to_string(char *buf, size_t number);
void nh_print_rec(char c, void *ptr, size_t size);
void nh_stderr_write(char *buf);
void nh_write_ptr(void *x);
void nh_write_error();
void nh_parse_input(char *buf, char *opty, size_t *size);
size_t nh_atoi_consume(char** const buf, uint16_t base);
size_t nh_get_number(char** const buffer);

uint8_t written=0;

// ll functions
typedef struct ptrLL {
  void *ptr;
  struct ptrLL *prev;
  struct ptrLL *next;
} ptrLL;
void add_LL(void *ptr);
void rm_LL(void *ptr);
uintptr_t in_ll(void *ptr);
void add_to_empty_LL(ptrLL *obj);
void stitch_LL(ptrLL *prev, ptrLL *next);
ptrLL *get_empty();

#ifndef STIN
#define STDIN 0
#endif
#ifndef STDOUT
#define STDOUT 1
#endif
#ifndef STDERR
#define STDERR 2
#endif

#ifndef ARRSIZE
#define ARRSIZE 8096*64
#endif
ptrLL memspace[ARRSIZE] = {0};
size_t llptr = 0;
ptrLL *llfree = NULL;
ptrLL *llused_last = NULL;

#endif
