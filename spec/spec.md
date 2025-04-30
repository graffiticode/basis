# Graffiticode Core Language Specification

```
Version: 0.1.0
Date: 2025-04-30
```

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

```
let double = <x: mul 2 x>..
map (double) [1 2 3]..
```

The top-level expression must always be followed by `..`.

## Expressions

### Function Application

Function application is written in prefix style:
```
add 1 2
```

Parentheses are used to defer application:
```
map (double) [1 2 3]
```

### Lists
```
[1 2 3]
```

### Records
```
{ name: "Alice", age: 30 }
```

### Lambdas
```
<x: add x 1>
```
Multiple parameters:
```
<x y: add x y>
```

### Let Bindings
```
let double = <x: mul 2 x>..
```

## Pattern Matching

Pattern matching is done using `case`:
```
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

### Tag Values

A **tag value** is an arity-0 symbolic value that can be used in pattern matching or to encode variant types.

```
red
```

Tag values:

- Are unbound identifiers that appear in expression position.
- May optionally be introduced via implicit enum definitions.
- Match directly in `case` expressions:

```
case color of
  red: "warm"
  blue: "cool"
  _: "other"
end
```

Tags are resolved as special constants with symbolic identity. They are case-sensitive and may be compared for equality using regular pattern match semantics.

# Semantics

## Evaluation Model

- **Purely functional**: no side effects
- **Strict evaluation**: arguments evaluated before function application
- **Immutable data**: all values are immutable

Many built-in functions in Graffiticode follow a model-threading pattern. In this pattern, functions are defined to take one or more arguments followed by a model, which represents the current state of the program or view. The function uses the earlier arguments to compute an update to the model and returns a new model as its result.

This style enables a declarative and order-independent composition of functions. Since each function call returns a new model, multiple calls can be reordered without changing the final result, provided the functional dependencies are preserved.

This approach draws inspiration from **Model-View-Update** (MVU) architectures, in which the model represents the application state and functions describe pure, deterministic transformations of that state.



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
| :------- | :-------- | :---------- |
| `add` | `<number number: number>` | Adds two numbers |
| `and` | `<bool bool: bool>` | Logical AND operation |
| `apply` | `<function list: any>` | Applies a function to a list of arguments |
| `div` | `<number number: number>` | Divides numbers |
| `equiv` | `<any any: bool>` | Tests if two values are strictly equivalent |
| `filter` | `<function list: list>` | Keeps items matching predicate |
| `get` | `<string record: any>` | Retrieves a value from a record by key |
| `hd` | `<list: any>` | First item of list |
| `isEmpty` | `<list: bool>` | Returns true if the list is empty |
| `map` | `<function list: list>` | Applies function to each item |
| `max` | `<number number: number>` | Returns the larger of two numbers |
| `min` | `<number number: number>` | Returns the smaller of two numbers |
| `mod` | `<number number: number>` | Remainder of division |
| `mul` | `<number number: number>` | Multiplies numbers |
| `not` | `<bool: bool>` | Logical NOT operation, inverts a boolean value |
| `nth` | `<number list: any>` | Nth element of list |
| `or` | `<bool bool: bool>` | Logical OR operation |
| `range` | `<number number number: list>` | Generates a range list |
| `reduce` | `<function any list: any>` | Combines list using a reducer with initial value |
| `set` | `<string any record: record>` | Returns a new record with a key set to a value |
| `sub` | `<number number: number>` | Subtracts numbers |
| `tl` | `<list: list>` | All items except first |

### add

Add two numbers.

```
add 2 3  | returns 5
```

### and

Logical AND operation

```
and false false  | returns false
and false true   | returns false
and true false   | returns false
and true true    | returns true
```

### apply

Apply a function to an argument list

```
apply add [1 2]  | returns 3
```

### div

Divide the first number by the second

```
div 10 2  | returns 5
```

### equiv

Tests if two values are strictly equivalent

```
equiv 1 1        | returns true
equiv "a" "a"    | returns true
equiv true true  | returns true
equiv 1 2        | returns false
equiv "a" "b"    | returns false
```

### filter

Filter elements matching predicate

```
filter (<x: mod x 2>) [1 2 3 4]  | returns [1 3]
```

### get

Retrieve a record field

```
get "b" {a: 1, b: 2}  | returns 2
```

### hd

Return the first item

```
hd [10 20 30]  | returns 10
```

### isEmpty

Return true if list is empty, otherwise return false

```
isEmpty []  | returns true
```

### map

Apply a function to each element

```
map (<x: add x 1>) [1 2 3]  | returns [2 3 4]
```

### max

Return the larger of two numbers

```
max 5 10  | returns 10
```

### min

Return the smaller of two numbers

```
min 5 10  | returns 5
```

### mod

Compute the remainder

```
mod 10 3  | returns 1
```

### mul

Multiply two numbers

```
mul 4 3  | returns 12
```

### not

Logical NOT that inverts a boolean value

```
not true   | returns false
not false  | returns true
```

### nth

Get the nth item (0-based)

```
nth 1 [10 20 30]  | returns 20
```

### or

Logical OR operation

```
or false false  | returns false
or false true   | returns true
or true false   | returns true
or true true    | returns true
```

### range

Produce a range list from start to end (exclusive) with step

```
range 1 10 2  | returns [1 3 5 7 9]
```

### reduce

Reduce a list to a single value, starting with an initial value

```
reduce (<a b: add a b>) 0 [1 2 3 4]  | returns 10
```

### set

Return a new record with an updated field

```
set "a" 2 {a: 1}  | returns {a: 2}
```

### sub

Subtract the second number from the first

```
sub 5 2  | returns 3
```

### tl

Return all but the first item

```
tl [10 20 30]  | returns [20 30]
```

# Program Examples

```
let double = <x: mul 2 x>..
map (double) [1 2 3]..
```

```
case age of
  18: "adult"
  _: "other"
end..
```

---

