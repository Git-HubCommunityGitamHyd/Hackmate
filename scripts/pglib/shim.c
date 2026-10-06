/*
 * ICU ABI shim: forwards ICU-60-suffixed symbols (needed by the embedded
 * PostgreSQL binaries) to the system ICU-76 library.
 * Compile: gcc -shared -fPIC shim.c -o libicushim.so -licuuc -licui18n
 */
#include <stdint.h>

typedef int8_t   UBool;
typedef int32_t  UChar32;
typedef uint16_t UChar;
typedef int32_t  UErrorCode;

/* ---------- libicuuc forwards ---------- */
extern const char* u_errorName_76(UErrorCode);
extern UBool u_isalnum_76(UChar32);
extern UBool u_isalpha_76(UChar32);
extern UBool u_isdigit_76(UChar32);
extern UBool u_isgraph_76(UChar32);
extern UBool u_islower_76(UChar32);
extern UBool u_isprint_76(UChar32);
extern UBool u_ispunct_76(UChar32);
extern UBool u_isspace_76(UChar32);
extern UBool u_isupper_76(UChar32);
extern UChar32 u_tolower_76(UChar32);
extern UChar32 u_toupper_76(UChar32);
extern void u_versionToString_76(uint8_t*);
extern int32_t u_strlen_76(const UChar*);
extern UChar* u_strcpy_76(UChar*, const UChar*);
extern UChar* u_strcat_76(UChar*, const UChar*);
extern int32_t ucnv_fromUChars_76(void*, char*, int32_t, const UChar*, int32_t, UErrorCode*);
extern void* ucnv_open_76(const char*, UErrorCode*);
extern int32_t ucnv_toUChars_76(void*, UChar*, int32_t, const char*, int32_t, UErrorCode*);
extern void uiter_setString_76(void*, const UChar*, int32_t);
extern void uiter_setUTF8_76(void*, const char*, int32_t);
extern int32_t uloc_countAvailable_76(void);
extern const char* uloc_getAvailable_76(int32_t);
extern int32_t uloc_getDisplayName_76(const char*, const char*, UChar*, int32_t, UErrorCode*);
extern int32_t uloc_getLanguage_76(const char*, char*, int32_t, UErrorCode*);
extern int32_t uloc_toLanguageTag_76(const char*, char*, int32_t, UBool, UErrorCode*);

/* ---------- libicui18n forwards ---------- */
extern int32_t u_strFoldCase_76(UChar*, int32_t, const UChar*, int32_t, uint32_t, UErrorCode*);
extern int32_t u_strToLower_76(UChar*, int32_t, const UChar*, int32_t, const char*, UErrorCode*);
extern int32_t u_strToTitle_76(UChar*, int32_t, const UChar*, int32_t, void*, const char*, UErrorCode*);
extern int32_t u_strToUpper_76(UChar*, int32_t, const UChar*, int32_t, const char*, UErrorCode*);
extern void* ucol_open_76(const char*, UErrorCode*);
extern void ucol_close_76(void*);
extern int32_t ucol_getRules_76(const void*, const uint8_t**);
extern int32_t ucol_getSortKey_76(const void*, const UChar*, int32_t, uint8_t*, int32_t);
extern void ucol_getVersion_76(const void*, uint8_t*);
extern int32_t ucol_nextSortKeyPart_76(const void*, void*, uint32_t*, uint8_t*, int32_t, UErrorCode*);
extern void* ucol_openRules_76(const UChar*, int32_t, int, int, void*, UErrorCode*);
extern int ucol_strcoll_76(const void*, const UChar*, int32_t, const UChar*, int32_t);
extern int ucol_strcollUTF8_76(const void*, const char*, int32_t, const char*, int32_t, UErrorCode*);
extern void ucnv_close_76(void*);
extern void ucnv_convertEx_76(void*, void*, char*, char*, const char*, const char*, UChar*, UChar*, UChar*, const UChar*, UBool, UBool, UErrorCode*);
extern void ucnv_setFromUCallBack_76(void*, void*, const void*, void*, const void**, UErrorCode*);
extern void ucnv_setToUCallBack_76(void*, void*, const void*, void*, const void**, UErrorCode*);
extern void UCNV_FROM_U_CALLBACK_STOP_76(const void*, void*, const UChar*, int32_t, int32_t, int32_t, UErrorCode*);
extern void UCNV_TO_U_CALLBACK_STOP_76(const void*, void*, const char*, int32_t, int32_t, UErrorCode*);

/* ---------- ICU-60 exported wrappers ---------- */
const char* u_errorName_60(UErrorCode code) { return u_errorName_76(code); }
UBool u_isalnum_60(UChar32 c) { return u_isalnum_76(c); }
UBool u_isalpha_60(UChar32 c) { return u_isalpha_76(c); }
UBool u_isdigit_60(UChar32 c) { return u_isdigit_76(c); }
UBool u_isgraph_60(UChar32 c) { return u_isgraph_76(c); }
UBool u_islower_60(UChar32 c) { return u_islower_76(c); }
UBool u_isprint_60(UChar32 c) { return u_isprint_76(c); }
UBool u_ispunct_60(UChar32 c) { return u_ispunct_76(c); }
UBool u_isspace_60(UChar32 c) { return u_isspace_76(c); }
UBool u_isupper_60(UChar32 c) { return u_isupper_76(c); }
UChar32 u_tolower_60(UChar32 c) { return u_tolower_76(c); }
UChar32 u_toupper_60(UChar32 c) { return u_toupper_76(c); }
void u_versionToString_60(uint8_t* v) { u_versionToString_76(v); }
int32_t u_strlen_60(const UChar* s) { return u_strlen_76(s); }
UChar* u_strcpy_60(UChar* d, const UChar* s) { return u_strcpy_76(d, s); }
UChar* u_strcat_60(UChar* d, const UChar* s) { return u_strcat_76(d, s); }
int32_t ucnv_fromUChars_60(void* c, char* d, int32_t dc, const UChar* s, int32_t sl, UErrorCode* e) { return ucnv_fromUChars_76(c, d, dc, s, sl, e); }
void* ucnv_open_60(const char* n, UErrorCode* e) { return ucnv_open_76(n, e); }
int32_t ucnv_toUChars_60(void* c, UChar* d, int32_t dc, const char* s, int32_t sl, UErrorCode* e) { return ucnv_toUChars_76(c, d, dc, s, sl, e); }
void uiter_setString_60(void* i, const UChar* s, int32_t l) { uiter_setString_76(i, s, l); }
void uiter_setUTF8_60(void* i, const char* s, int32_t l) { uiter_setUTF8_76(i, s, l); }
int32_t uloc_countAvailable_60(void) { return uloc_countAvailable_76(); }
const char* uloc_getAvailable_60(int32_t n) { return uloc_getAvailable_76(n); }
int32_t uloc_getDisplayName_60(const char* id, const char* in, UChar* r, int32_t m, UErrorCode* e) { return uloc_getDisplayName_76(id, in, r, m, e); }
int32_t uloc_getLanguage_60(const char* id, char* l, int32_t c, UErrorCode* e) { return uloc_getLanguage_76(id, l, c, e); }
int32_t uloc_toLanguageTag_60(const char* id, char* t, int32_t c, UBool s, UErrorCode* e) { return uloc_toLanguageTag_76(id, t, c, s, e); }

int32_t u_strFoldCase_60(UChar* d, int32_t dc, const UChar* s, int32_t sl, uint32_t o, UErrorCode* e) { return u_strFoldCase_76(d, dc, s, sl, o, e); }
int32_t u_strToLower_60(UChar* d, int32_t dc, const UChar* s, int32_t sl, const char* loc, UErrorCode* e) { return u_strToLower_76(d, dc, s, sl, loc, e); }
int32_t u_strToTitle_60(UChar* d, int32_t dc, const UChar* s, int32_t sl, void* it, const char* loc, UErrorCode* e) { return u_strToTitle_76(d, dc, s, sl, it, loc, e); }
int32_t u_strToUpper_60(UChar* d, int32_t dc, const UChar* s, int32_t sl, const char* loc, UErrorCode* e) { return u_strToUpper_76(d, dc, s, sl, loc, e); }
void* ucol_open_60(const char* loc, UErrorCode* st) { return ucol_open_76(loc, st); }
void ucol_close_60(void* coll) { ucol_close_76(coll); }
int32_t ucol_getRules_60(const void* coll, const uint8_t** rules) { return ucol_getRules_76(coll, rules); }
int32_t ucol_getSortKey_60(const void* coll, const UChar* src, int32_t sl, uint8_t* res, int32_t rl) { return ucol_getSortKey_76(coll, src, sl, res, rl); }
void ucol_getVersion_60(const void* coll, uint8_t* info) { ucol_getVersion_76(coll, info); }
int32_t ucol_nextSortKeyPart_60(const void* coll, void* iter, uint32_t* state, uint8_t* dest, int32_t count, UErrorCode* st) { return ucol_nextSortKeyPart_76(coll, iter, state, dest, count, st); }
void* ucol_openRules_60(const UChar* rules, int32_t rl, int nm, int str, void* pe, UErrorCode* st) { return ucol_openRules_76(rules, rl, nm, str, pe, st); }
int ucol_strcoll_60(const void* coll, const UChar* src, int32_t sl, const UChar* tgt, int32_t tl) { return ucol_strcoll_76(coll, src, sl, tgt, tl); }
int ucol_strcollUTF8_60(const void* coll, const char* src, int32_t sl, const char* tgt, int32_t tl, UErrorCode* st) { return ucol_strcollUTF8_76(coll, src, sl, tgt, tl, st); }
void ucnv_close_60(void* c) { ucnv_close_76(c); }
void ucnv_convertEx_60(void* tc, void* sc, char* t, char* tl, const char* s, const char* sl, UChar* ps, UChar* psrc, UChar* ptgt, const UChar* plim, UBool rst, UBool fl, UErrorCode* st) { ucnv_convertEx_76(tc, sc, t, tl, s, sl, ps, psrc, ptgt, plim, rst, fl, st); }
void ucnv_setFromUCallBack_60(void* c, void* na, const void* nc, void* oa, const void** oc, UErrorCode* e) { ucnv_setFromUCallBack_76(c, na, nc, oa, oc, e); }
void ucnv_setToUCallBack_60(void* c, void* na, const void* nc, void* oa, const void** oc, UErrorCode* e) { ucnv_setToUCallBack_76(c, na, nc, oa, oc, e); }
void UCNV_FROM_U_CALLBACK_STOP_60(const void* ctx, void* args, const UChar* cu, int32_t l, int32_t cp, int32_t r, UErrorCode* e) { UCNV_FROM_U_CALLBACK_STOP_76(ctx, args, cu, l, cp, r, e); }
void UCNV_TO_U_CALLBACK_STOP_60(const void* ctx, void* args, const char* cu, int32_t l, int32_t r, UErrorCode* e) { UCNV_TO_U_CALLBACK_STOP_76(ctx, args, cu, l, r, e); }
