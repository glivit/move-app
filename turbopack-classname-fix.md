# Turbopack Build Fix: Multiline className Strings

## The Error

```
FATAL: An unexpected Turbopack error occurred:
Error [TurbopackInternalError]: x Expected ',', got 'ident'
```

Turbopack's CSS parser chokes when a `className="..."` string literal contains **actual newline characters**. It misinterprets Tailwind pseudo-classes like `hover:` on the next line as CSS identifiers.

## What Breaks

```jsx
// ❌ BAD — literal newlines inside className string
<button
  className="w-full bg-[#1A1917] text-white rounded-2xl py-4
    hover:bg-[#333330] active:scale-[0.98]
    disabled:opacity-60 disabled:cursor-not-allowed
    transition-all duration-200"
>
```

## What Works

```jsx
// ✅ GOOD — single line
<button
  className="w-full bg-[#1A1917] text-white rounded-2xl py-4 hover:bg-[#333330] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
>
```

```jsx
// ✅ ALSO GOOD — template literal (backticks) with newlines
<button
  className={`
    w-full bg-[#1A1917] text-white rounded-2xl py-4
    hover:bg-[#333330] active:scale-[0.98]
    disabled:opacity-60 disabled:cursor-not-allowed
    transition-all duration-200
  `}
>
```

## The Rule

- `className="..."` with `"double quotes"` → **must be single line**
- `` className={`...`} `` with `` `backticks` `` → **multiline is fine**
- `className={clsx(...)}` or `className={cn(...)}` → **fine**

## How to Find All Occurrences

```bash
# Find className strings that don't close on the same line
grep -rn 'className="[^"]*$' src/ --include="*.tsx" --include="*.jsx"
```

If that returns results, either collapse them to one line or switch to backtick template literals.

## Why This Happens

Turbopack (Next.js bundler on Vercel) has a CSS-in-JS parser that scans string literals for CSS-like tokens. When it hits a newline inside `"..."`, it restarts token parsing on the next line and interprets `hover:` as a standalone CSS identifier instead of part of a Tailwind class string. Template literals are handled by a different parser path that doesn't have this issue.
