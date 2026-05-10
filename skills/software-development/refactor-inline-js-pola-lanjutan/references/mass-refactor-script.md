# Mass Refactor Script — Object Method Migration

Python script pattern untuk migrate global `var funcName = function(){}` menjadi `JSController.<ctrl>.funcName: function(){}`.

## Core Logic

### Step 1: Replace semua cross-call dulu
```python
for fn in sorted(func_names, key=len, reverse=True):
    content = content.replace(f"{fn}(", f"JSController.{ctrl_name}.{fn}(")
```

### Step 2: Find function boundaries via brace tracking
```python
i = 0
while i < len(lines):
    m = re.match(r'^var (\w+) = function', lines[i])
    if m:
        name = m.group(1)
        if name in func_names:
            brace_count = 0
            started = False
            end_line = i
            for j in range(i, len(lines)):
                for ch in lines[j]:
                    if ch == '{': brace_count += 1; started = True
                    elif ch == '}': brace_count -= 1
                if started and brace_count == 0:
                    end_line = j; break
            func_ranges.append((i, end_line, name))
            i = end_line + 1; continue
    i += 1
```

### Step 3: Ekstrak & transform bodies
```python
first_line = re.sub(rf'^var {re.escape(name)} = function\s*\(', 
                    f'{name}: function(', first_line)
```

### Step 4: Merge ke JSController yang sudah ada
- Copy existing JSController methods (init, index, nota, dll)
- Append migrated functions dengan comma separator
- Tutup dengan `};`

## Pitfalls

- **JANGAN pakai `this.method()`** di dalam callback — ganti ke `JSController.ctrl.method()`
- **Sort by length descending** saat ganti cross-call — fungsi pendek bisa match substring fungsi panjang
- **Brace tracking with string awareness** — kalau file punya string literal yang mengandung `{` atau `}`, brace counter bisa salah. Untuk level kompleksitas ini biasanya aman karena JS era Rails 4 jarang pakai template literal.
- **Double prefix** — kalau script dijalankan dua kali, hasilnya `JSController.ctrl.JSController.ctrl.method()`. Cek dengan grep: `grep 'JSController\.\w+\.JSController' file.js`
- **Closing comma** — method terakhir di JSController object TIDAK boleh ada trailing comma. Hapus setelah append.

## Verifikasi Post-Refactor
```bash
# No remaining global var (kecuali namespace var di header)
grep -c '^var [a-z]' app/assets/javascripts/controllers/<ctrl>.js

# Semua onclick di ERB sudah full path
grep -rn 'onclick="[^J]' app/views/<ctrl>/

# No double prefix
grep 'JSController\.\w+\.JSController' app/assets/javascripts/controllers/<ctrl>.js
```
