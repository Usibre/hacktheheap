#include "noheap-utils.h"
#include "stdio.h"
#include "string.h"
#include "unistd.h"
/**
 * C++ version 0.4 char* style "itoa":
 * Written by Lukás Chmela
 * Released under GPLv3.
 */

char* nh_itoa(int value, char* result, int base) {
    // check that the base if valid
    if (base < 2 || base > 36) { *result = '\0'; return result; }

    char* ptr = result, *ptr1 = result, tmp_char;
    int tmp_value;

    do {
        tmp_value = value;
        value /= base;
        *ptr++ = "zyxwvutsrqponmlkjihgfedcba9876543210123456789abcdefghijklmnopqrstuvwxyz" [35 + (tmp_value - value * base)];
    } while ( value );

    // Apply negative sign
    if (tmp_value < 0) *ptr++ = '-';
    *ptr-- = '\0';
    while(ptr1 < ptr) {
        tmp_char = *ptr;
        *ptr--= *ptr1;
        *ptr1++ = tmp_char;
    }
    return result;
}

size_t nh_atoi(char *buf, uint16_t base) {
  size_t val = 0, tempval;
  if (buf[0]=='0' && (buf[1]=='x'||buf[1]=='X')) buf+=2;
  while (1) {
    if (*buf >= '0' && *buf <= '9') {
      tempval = (*buf)-'0';
    } else if (*buf >='A' && *buf <='Z') {
      tempval = (*buf)-'A'+10;
    } else if (*buf >='a' && *buf <='z') {
      tempval = (*buf)-'a'+10;
    } else {
      break;
    }
    if (tempval >= base) break;
    val *= base;
    val += tempval;
    buf++;
  } // end while
  return val;
}

size_t nh_strlen(char *buf) {
  size_t i = 0;
  while (buf[i++] != '\0'){}
  return i;
}
void nh_strcat(char *dst, char *src) {
  char *dstptr = (char*) ((uintptr_t) dst + nh_strlen(dst)-1); // -1 to overwrite the null
  while (*src != 0)
    *dstptr++ = *src++;
  *dstptr = 0;
}
void nh_add_ptr_to_string(char *buf, void *ptr) {
  char *charset = "0123456789abcdef";
  uintptr_t ptrval = (uintptr_t)ptr;
  // 64-bit ptr, 4 bits per char in repr, 16 characters needed max
  char internal_buf[20];
  internal_buf[0]='0';
  internal_buf[1]='x';
  size_t loc = 2+15;
  internal_buf[loc+1] = '\0';
  while ( loc >=2) {
      internal_buf[loc--] = charset[ptrval%16];
      ptrval = ptrval >> 4;
  }
  nh_strcat(buf, internal_buf);
}
void nh_add_nr_to_string(char *buf, size_t number) {
  char *charset = "0123456789";
  char intbuf[128];
  intbuf[127] = 0;
  size_t loc = 126;
  while (number != 0) {
    intbuf[loc--] = charset[number%10];
    number /= 10;
  }
  nh_strcat(buf, intbuf+loc+1);
}

void nh_print_rec(char c, void *ptr, size_t size) {
  char buf[1024];
  buf[0] = c;
  buf[1] = ' ';
  buf[2] = 0;
  nh_add_ptr_to_string(buf, ptr);
  nh_strcat(buf, " + ");
  nh_add_nr_to_string(buf, size);
  nh_strcat(buf, "\n");
  write(STDOUT, buf, strlen(buf));
  written=1;
}
void nh_stderr_write(char *buf) {
  #if DEBUG
    write(STDERR, buf, strlen(buf));
  #endif
}
void nh_write_ptr(void *x) {
  char buf[1024];
  buf[0]='\0';
  nh_add_ptr_to_string(buf,x);
  nh_strcat(buf, "\n");
  write(STDOUT, buf, strlen(buf));
  written=1;
}
void nh_write_error() {
  write(STDOUT, "ERROR\n", strlen("ERROR\n"));
  written=1;
}

size_t nh_atoi_consume(char** const buf, uint16_t base) {
  size_t val = 0, tempval;
  if ((*buf)[0]=='0' && ((*buf)[1]=='x'||(*buf)[1]=='X')) {
    (*buf)+=2;
    base=16;
  }
  while (1) {
    if (**buf >= '0' && **buf <= '9') {
      tempval = (**buf)-'0';
    } else if (**buf >='A' && **buf <='Z') {
      tempval = (**buf)-'A'+10;
    } else if (**buf >='a' && **buf <='z') {
      tempval = (**buf)-'a'+10;
    } else {
      break;
    }
    if (tempval >= base) break;
    val *= base;
    val += tempval;
    (*buf)++;
  } // end while
  return val;
}

size_t nh_get_number(char** const buffer) {
  size_t val = nh_atoi_consume(buffer, 10); // 10 gets overriden upon 0x start
  if (*buffer[0]==' ') (*buffer)++;
  return val;
}

void nh_parse_input(char *buf, char *opty, size_t *size) {
  *opty = buf[0];
  buf+=2;
  if (buf[0]=='0'&&buf[1]=='x')
    *size = nh_atoi(buf, 16);
  else
    *size = nh_atoi(buf, 10);
  return;
}

// double linked list with pointers that are allowed to be freed?
void add_LL(void *ptr) {
  ptrLL *obj = get_empty();
  obj->ptr = ptr;
  obj->next = NULL;
  if (llused_last==NULL) {
    llused_last = obj;
    llused_last->prev = NULL;
  } else {
    llused_last->next = obj;
    obj->prev = llused_last;
    llused_last = obj;
  }
}
void rm_LL(void *ptr) {
  ptrLL *obj = (ptrLL*)in_ll(ptr);
  if (obj != NULL) {
    if (obj==llused_last) llused_last=obj->prev;
    stitch_LL(obj->prev, obj->next);
    add_to_empty_LL(obj);
  }
}

uintptr_t in_ll(void *ptr) {
  ptrLL *obj = llused_last;
  while (obj!=NULL) {
    if (obj->ptr == ptr) {
      return (uintptr_t)obj;
    }
    obj = obj->prev;
  }
  return 0;
}


ptrLL *get_empty() {
  if (llfree!=NULL) {
    // take from freelist
    ptrLL *obj = llfree;
    llfree = llfree->next;
    return obj;
  } else {
    return &(memspace[llptr++]);
  }
}

void add_to_empty_LL(ptrLL *obj) {
  obj->prev = NULL;
  if (llfree!=NULL) {
    llfree->prev = obj;
    obj->next = llfree;
  } else {
    obj->next = NULL;
  }
  llfree = obj;
}

void stitch_LL(ptrLL *prev, ptrLL *next) {
  if (prev!=NULL)
    prev->next = next;
  if (next!=NULL)
    next->prev = prev;
}
