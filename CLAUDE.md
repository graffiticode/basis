# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm test` - Run Jest test suite
- `npm run build-spec` - Generate HTML spec from spec/spec.md
- `npm run watch-spec` - Watch spec.md and rebuild on changes

## Architecture

This is the **basis library for Graffiticode languages** - a compiler framework for building domain-specific languages.

### Compilation Pipeline (3-Stage Visitor Pattern)

All stages are in `src/compiler.js`:

1. **Checker** (lines 91-516): Validates AST nodes, collects errors
2. **Transformer** (lines 557-1391): Evaluates the program, manages environments/scope
3. **Renderer** (lines 1393-1403): Formats output (minimal pass-through)
4. **Compiler** (lines 1405-1450): Orchestrates Checker → Transformer → Renderer

### Key Files

- `src/compiler.js` - Core compiler with Visitor base class and all stages
- `src/lexicon.js` - Builtin function definitions (28 functions with types/descriptions)
- `src/share.js` - Shared utilities, error codes, assertion helpers
- `index.js` - Exports: Checker, Transformer, Renderer, Compiler, lexicon
- `spec/spec.md` - Language specification (source of truth for syntax/semantics)

### Implementation Details

- **AST representation**: Node pool as array of `{tag, elts}` objects with numeric IDs
- **Async traversal**: Uses `setTimeout(0)` to prevent stack overflow during deep recursion
- **Arithmetic**: Uses Decimal.js for precise numeric operations
- **Scope**: Stack-based environment management (`enterEnv`, `exitEnv`, `findWord`, `addWord`)

## Language Features

Graffiticode is a functional language with:
- Prefix notation for function application (`add 1 2`). Functions have fixed arity, so applications can be parsed unambiguously without grouping syntax (e.g., `add 1 mul 2 3` parses as `add(1, mul(2, 3))`)
- First-class lambdas (`<x: add x 1>`)
- Pattern matching (`case x of ... end`)
- Records and lists as first-class data
- Let bindings (`let name = value..`)
- Programs terminated with `..`

## Spec Synchronization

The language spec (`spec/spec.md`) should stay synchronized with `src/lexicon.js`. When adding/modifying builtin functions:
1. Update the function in `src/compiler.js` (Transformer handlers)
2. Add/update entry in `src/lexicon.js` with type signature and description
3. Document in `spec/spec.md` Built-in Functions table and detailed section
4. Run `npm run build-spec` to regenerate spec/spec.html
