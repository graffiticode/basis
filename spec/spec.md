# Graffiticode Core Language Specification

# Introduction

This document defines the **Graffiticode Core Language Specification**, covering syntax, semantics, and the base library. It excludes dialect-specific constructs, runtime behavior, and extended libraries.

# Lexical Structure

## Tokens

- **Identifiers**: Alphanumeric symbols beginning with a letter.
- **Numbers**: Integers and floats. Negative numbers start with `-`.
- **Strings**: Double-quoted UTF-8 strings.
- **Symbols**: `(`, `)`, `[`, `]`, `{`, `}`, `:`, `..`, `<`, `>`, `,`

## Comments

- **Line Comments**: Begin with `|` and continue to end of line.

# Syntax

## Programs

A **Graffiticode program** is a sequence of one or more `let` declarations, followed by a single top-level expression, and terminated with `..`.

```gc
let double = <x: mul 2 x>
map (double) [1 2 3]..
```

The top-level expression must always be followed by `..`.

## Expressions

### Tag Values

A **tag value** is an arity-0 symbolic value that can be used in pattern matching or to encode variant types.

```gc
red
```

Tag values:

- Are unbound identifiers that appear in expression position.
- May optionally be introduced via implicit enum definitions.
- Match directly in `case` expressions:

```gc
case color of
  red: "warm"
  blue: "cool"
  _: "other"
end
```

Tags are resolved as special constants with symbolic identity. They are case-sensitive and may be compared for equality using regular pattern match semantics.

### Function Application

Function application is written in prefix style:
```gc
add 1 2
```
Parentheses control grouping:
```gc
map (double) [1 2 3]
```

### Lists
```gc
[1 2 3]
```

### Records
```gc
{ name: "Alice", age: 30 }
```

### Tuples
```gc
(1, 2)
```

### Lambdas
```gc
<x: add x 1>
```
Multiple parameters:
```gc
<x y: add x y>
```

### Let Bindings
```gc
let double = <x: mul 2 x>..
```

## Pattern Matching

Pattern matching is done using `case`:
```gc
case x of
  0: "zero"
  1: "one"
  _: "other"
end
```

Supports:
- Literal values
- Tuple destructuring: `(a, b)`
- Record destructuring: `{ name, age }`
- Wildcard `_`

Pattern matching on function arguments is disallowed.

# Semantics

## Evaluation Model

- **Purely functional**: no side effects
- **Strict evaluation**: arguments evaluated before function application
- **Immutable data**: all values are immutable

## Functions

- **Fixed arity**: every function has a known number of parameters
- **Curried by default**: partial application supported

## Scoping

- **Lexical scoping**
- **Shadowing** allowed within nested scopes

## Errors

- **Syntax errors**: raised during parsing
- **Type errors**: raised during compilation
- **Runtime errors**: e.g., out-of-bounds access

# Base Library

## Types

- `number`
- `string`
- `bool`
- `list`
- `record`
- `tuple`
- `json`

## Built-in Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `add` | `<number number: number>` | Adds two numbers |
| `sub` | `<number number: number>` | Subtracts numbers |
| `mul` | `<number number: number>` | Multiplies numbers |
| `div` | `<number number: number>` | Divides numbers |
| `mod` | `<number number: number>` | Remainder of division |
| `range` | `<number number number: list>` | Generates a range list |
| `map` | `<function list: list>` | Applies function to each item |
| `filter` | `<function list: list>` | Keeps items matching predicate |
| `reduce` | `<function list: any>` | Combines list using a reducer |
| `hd` | `<list: any>` | First item of list |
| `tl` | `<list: list>` | All items except first |
| `nth` | `<number list: any>` | Nth element of list |
| `apply` | `<function list: any>` | Applies a function to a list of arguments |
| `isEmpty` | `<list: bool>` | Returns true if the list is empty |
| `get` | `<record string: any>` | Retrieves a value from a record by key |
| `set` | `<record string any: record>` | Returns a new record with a key set to a value |

# Built-in Function Details

### `add`
**Signature:** `<number number: number>`  
**Description:** Adds two numbers.
```gc
add 2 3  | returns 5
```

### `sub`
**Signature:** `<number number: number>`  
**Description:** Subtracts the second number from the first.
```gc
sub 5 2  | returns 3
```

### `mul`
**Signature:** `<number number: number>`  
**Description:** Multiplies two numbers.
```gc
mul 4 3  | returns 12
```

### `div`
**Signature:** `<number number: number>`  
**Description:** Divides the first number by the second.
```gc
div 10 2  | returns 5
```

### `mod`
**Signature:** `<number number: number>`  
**Description:** Computes the remainder.
```gc
mod 10 3  | returns 1
```

### `range`
**Signature:** `<number number number: list>`  
**Description:** Produces a range list from start to end (exclusive) with step.
```gc
range 1 10 2  | returns [1 3 5 7 9]
```

### `map`
**Signature:** `<function list: list>`  
**Description:** Applies a function to each element.
```gc
map (<x: add x 1>) [1 2 3]  | returns [2 3 4]
```

### `filter`
**Signature:** `<function list: list>`  
**Description:** Filters elements matching predicate.
```gc
filter (<x: mod x 2>) [1 2 3 4]  | returns [1 3]
```

### `reduce`
**Signature:** `<function any list: any>`  
**Description:** Reduces a list to a single value, starting with an initial value.
```gc
reduce (<a b: add a b>) 0 [1 2 3 4]  | returns 10
```

### `hd`
**Signature:** `<list: any>`  
**Description:** Returns the first item.
```gc
hd [10 20 30]  | returns 10
```

### `tl`
**Signature:** `<list: list>`  
**Description:** Returns all but the first item.
```gc
tl [10 20 30]  | returns [20 30]
```

### `nth`
**Signature:** `<number list: any>`  
**Description:** Gets nth item (0-based).
```gc
nth 1 [10 20 30]  | returns 20
```

### `apply`
**Signature:** `<function list: any>`  
**Description:** Applies a function to argument list.
```gc
apply add [1 2]  | returns 3
```

### `isEmpty`
**Signature:** `<list: bool>`  
**Description:** Returns true if list is empty.
```gc
isEmpty []  | returns true
```

### `get`
**Signature:** `<record string: any>`  
**Description:** Retrieves a record field.
```gc
get {a: 1, b: 2} "b"  | returns 2
```

### `set`
**Signature:** `<record string any: record>`  
**Description:** Returns a new record with an updated field.
```gc
set {a: 1} "a" 2  | returns {a: 2}
```

# Examples

```gc
let double = <x: mul 2 x>
map (double) [1 2 3]..
```

```gc
case age of
  18: "adult"
  _: "other"
end..
```

---

