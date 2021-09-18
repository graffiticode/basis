// Copyright 2014-2021, ARTCOMPILER INC

import Ast from 'ast.js';

/*
 TODO
 -- Fold expressions until fully applied or there are no more arguments:
    (<x y: add x y> 10) 20..
 */

if (typeof CodeMirror === "undefined") {
  CodeMirror = {
    Pos: function () {
      return {};
    }
  };
}

if (typeof window === "undefined") {
  window = {};
  window = {
    gcexports: {
      coords: {},
    },
    errors: [],
    isSynthetic: true,
  };
}

function assert(b, str) {
  if (!b) throw str;
}

// ast module

// env

var env = (function () {
  return {
    findWord: findWord,
    addWord: addWord,
    enterEnv: enterEnv,
    exitEnv: exitEnv,
    addPattern: addPattern,
  };

  // private functions

  function findWord(ctx, lexeme) {
    var env = ctx.state.env;
    for (var i = env.length-1; i >= 0; i--) {
      var word = env[i].lexicon[lexeme];
      if (word) {
        return word;
      }
    }
    return null;
  }

  function addWord(ctx, lexeme, entry) {
    window.gcexports.topEnv(ctx).lexicon[lexeme] = entry;
    return null;
  }

  function addPattern(ctx, pattern) {
    window.gcexports.topEnv(ctx).pattern.push(pattern);
  }

  function enterEnv(ctx, name) {
    // recursion guard
    if (ctx.state.env.length > 380) {
      //return;  // just stop recursing
      throw new Error("runaway recursion");
    }
    window.gcexports.topEnv(ctx).paramc = ctx.state.paramc;
    ctx.state.env.push({
      name: name,
      lexicon: {},
      pattern: [],
    });
  }

  function exitEnv(ctx) {
    ctx.state.env.pop();
    ctx.state.paramc = window.gcexports.topEnv(ctx).paramc;
  }

})();

function getCoord(ctx) {
  let ln = ctx.scan.stream.lineOracle && ctx.scan.stream.lineOracle.line || 0;
  return {
    from: CodeMirror.Pos(ln, ctx.scan.stream.start),
    to: CodeMirror.Pos(ln, ctx.scan.stream.pos),
  };
}

// parser
window.gcexports.parser = (function () {
  function assert(b, str) {
    if (!b) {
      throw new Error(str);
    }
  }
  var keywords = window.gcexports.keywords = {
    "let" : { "tk": 0x12, "cls": "keyword" },
    "if" : { "tk": 0x05, "cls": "keyword" },
    "then" : { "tk": 0x06, "cls": "keyword" },
    "else" : { "tk": 0x07, "cls": "keyword" },
    "case" : { "tk": 0x0F, "cls": "keyword" },
    "of" : { "tk": 0x10, "cls": "keyword" },
    "end" : { "tk": 0x11, "cls": "keyword", "length": 0 },
    "true" : { "tk": 0x14, "cls": "val", "length": 0 },
    "false" : { "tk": 0x14, "cls": "val", "length": 0 },
    "null" : { "tk": 0x15, "cls": "val", "length": 0 },
  };
  function addError(ctx, str) {
    let ln = ctx.scan.stream.lineOracle && ctx.scan.stream.lineOracle.line || 0;
    window.gcexports.errors.push({
      from: CodeMirror.Pos(ln, ctx.scan.stream.start),
      to: CodeMirror.Pos(ln, ctx.scan.stream.pos),
      message: str,
      severity : "error",
    });
  }

  var CC_DOUBLEQUOTE = 0x22;
  var CC_DOLLAR = 0x24;
  var CC_SINGLEQUOTE = 0x27;
  var CC_BACKTICK = 0x60;
  var CC_LEFTBRACE = 0x7B;
  var CC_RIGHTBRACE = 0x7D;

  var TK_IDENT  = 0x01;
  var TK_NUM  = 0x02;
  var TK_STR  = 0x03;
  var TK_EQUAL  = 0x04;
  var TK_IF   = 0x05;
  var TK_THEN   = 0x06;
  var TK_ELSE   = 0x07;
  var TK_RETURN = 0x08;
  var TK_IS   = 0x09;
  var TK_POSTOP = 0x0A;
  var TK_PREOP  = 0x0B;
  var TK_FUN  = 0x0C;
  var TK_VAL  = 0x0D;
  var TK_BINOP  = 0x0E;
  var TK_CASE   = 0x0F;
  var TK_OF   = 0x10;
  var TK_END  = 0x11;
  var TK_LET  = 0x12;
  var TK_OR   = 0x13;
  var TK_BOOL   = 0x14;
  var TK_NULL   = 0x15;
  var TK_IN     = 0x16;

  var TK_LEFTPAREN  = 0xA1;
  var TK_RIGHTPAREN   = 0xA2;
  var TK_LEFTBRACKET  = 0xA3;
  var TK_RIGHTBRACKET = 0xA4;
  var TK_LEFTBRACE  = 0xA5;
  var TK_RIGHTBRACE   = 0xA6;
  var TK_PLUS     = 0xA7;
  var TK_MINUS    = 0xA8;
  var TK_DOT      = 0xA9;
  var TK_COLON    = 0xAA;
  var TK_COMMA    = 0xAB;
  var TK_BACKQUOTE  = 0xAC;
  var TK_COMMENT    = 0xAD;
  var TK_LEFTANGLE  = 0xAE;
  var TK_RIGHTANGLE = 0xAF;
  var TK_DOUBLELEFTBRACE = 0xB0;
  var TK_DOUBLERIGHTBRACE = 0xB1;
  var TK_STRPREFIX = 0xB2;
  var TK_STRMIDDLE = 0xB3;
  var TK_STRSUFFIX = 0xB4;

  function tokenToLexeme(tk) {
    switch (tk) {
    case TK_EQUAL: return "a '=' symbol";
    case TK_IF: return "the 'if' keyword";
    case TK_THEN: return "the 'then' keyword";
    case TK_ELSE: return "the 'else' keyword";
    case TK_RETURN: return "the 'return' keyword";
    case TK_IS: return "the 'is' keyword";
    case TK_FUN: return "the 'fun' keyword";
    case TK_VAL: return "the 'val' keyword";
    case TK_CASE: return "the 'case' keyword";
    case TK_OF: return "the 'of' keyword";
    case TK_END: return "the 'end' keyword";
    case TK_LET: return "the 'let' keyword";
    case TK_OR: return "the 'or' keyword";
    case TK_POSTOP:
    case TK_PREOP:
    case TK_BINOP:
      return "an operator";
    case TK_LEFTPAREN: return "a '('";
    case TK_RIGHTPAREN: return "a ')'";
    case TK_LEFTBRACKET: return "a '['";
    case TK_RIGHTBRACKET: return "a ']'";
    case TK_LEFTBRACE: return "a '{'";
    case TK_RIGHTBRACE: return "a '}'";
    case TK_LEFTANGLE: return "a '<'";
    case TK_RIGHTANGLE: return "a '>'";
    case TK_PLUS: return "a '+'";
    case TK_MINUS: return "a '-'";
    case TK_DOT: return "a '.'";
    case TK_COLON: return "a ':'";
    case TK_COMMA: return "a ','";
    case TK_BACKQUOTE: return "a '`'";
    case TK_COMMENT: return "a comment";
    case 0: return "the end of the program";
    }
    return "an expression";
  }

  function eat(ctx, tk) {
    var nextToken = next(ctx);
    if (nextToken !== tk) {
      throw new Error("Expecting " + tokenToLexeme(tk) +
                      ", found " + tokenToLexeme(nextToken) + ".");
    }
  }

  function match(ctx, tk) {
    if (peek(ctx) === tk) {
      return true;
    } else {
      return false;
    }
  }

  function next(ctx) {
    var tk = peek(ctx);
    ctx.state.nextToken = -1;
    return tk;
  }

  function peek(ctx) {
    var tk;
    var nextToken = ctx.state.nextToken;
    if (nextToken < 0) {
      var t0 = new Date();
      tk = ctx.scan.start(ctx);
      var t1 = new Date();
      ctx.state.nextToken = tk;
    } else {
      tk = nextToken;
    }
    return tk;
  }

  // Parsing functions -- each parsing function consumes a single token and
  // returns a continuation function for parsing the rest of the string.

  function nul(ctx, cc) {
    eat(ctx, TK_NULL);
    cc.cls = "number";
    Ast.nul(ctx);
    return cc;
  }

  function bool(ctx, cc) {
    eat(ctx, TK_BOOL);
    cc.cls = "number";
    Ast.bool(ctx, lexeme==="true");
    return cc;
  }

  function number(ctx, cc) {
    eat(ctx, TK_NUM);
    cc.cls = "number";
    Ast.number(ctx, lexeme, getCoord(ctx));
    return cc;
  }

  function string(ctx, cc) {
    eat(ctx, TK_STR);
    var coord = getCoord(ctx);
    cc.cls = "string";
    Ast.string(ctx, lexeme.substring(1,lexeme.length-1), coord) // strip quotes;
    return cc;
  }

  /*
  Str :
    STR
    STRPREFIX StrSuffix

  StrSuffix :
    Expr STRMIDDLE StrSuffix
    Expr STRSUFFIX
  */

  function str(ctx, cc) {
    if (match(ctx, TK_STR)) {
      eat(ctx, TK_STR);
      var coord = getCoord(ctx);
      Ast.string(ctx, lexeme, coord); // strip quotes;
      cc.cls = "string";
      return cc;
    } else if (match(ctx, TK_STRPREFIX)) {
      ctx.state.inStr++;
      eat(ctx, TK_STRPREFIX);
      startCounter(ctx);
      var coord = getCoord(ctx);
      Ast.string(ctx, lexeme, coord) // strip quotes;
      countCounter(ctx);
      var ret = function(ctx) {
        return strSuffix(ctx, function (ctx) {
          ctx.state.inStr--;
          eat(ctx, TK_STRSUFFIX);
          var coord = getCoord(ctx);
          Ast.string(ctx, lexeme, coord) // strip quotes;
          countCounter(ctx);
          Ast.list(ctx, ctx.state.exprc, getCoord(ctx));
          stopCounter(ctx);
          Ast.concat(ctx);
          cc.cls = "string";
          return cc;
        });
      }
      ret.cls = "string";
      return ret;
    }
    assert(false);
  }
  function strSuffix(ctx, resume) {
    if (match(ctx, TK_STRSUFFIX)) {
      // We have a STRSUFFIX so we are done.
      return resume;
    }
    return strPart(ctx, function (ctx) {
      if (match(ctx, TK_STRMIDDLE)) {
        // Not done yet.
        eat(ctx, TK_STRMIDDLE);
        var coord = getCoord(ctx);
        Ast.string(ctx, lexeme, coord) // strip quotes;
        countCounter(ctx);
        var ret = function (ctx) {
          return strSuffix(ctx, resume);
        };
        ret.cls = "string";
        return ret;
      }
      var ret = function (ctx) {
        return strSuffix(ctx, resume);
      };
      ret.cls = "string";
      return ret;
    });
  }
  function strPart(ctx, resume) {
    return expr(ctx, function(ctx) {
      countCounter(ctx);
      return resume(ctx);
    });
  }
  function ident(ctx, cc) {
    eat(ctx, TK_IDENT);
    Ast.name(ctx, lexeme, getCoord(ctx));
    cc.cls = "variable";
    return cc;
  }
  function identOrString(ctx, cc) {
    if (match(ctx, TK_IDENT)) {
      return ident(ctx, cc);
    }
    return str(ctx, cc);
  }
  function defList(ctx, resume) {
    eat(ctx, TK_LEFTBRACKET);
    var ret = (ctx) => {
      return params(ctx, TK_RIGHTBRACKET, (ctx) => {
        eat(ctx, TK_RIGHTBRACKET);
        Ast.list(ctx, ctx.state.paramc, null, true);
        ctx.state.paramc = 1;
        return resume;
      });
    };
    ret.cls = "punc";
    return ret;
  }
  function defName(ctx, cc) {
    if (match(ctx, TK_LEFTBRACKET)) {
      return defList(ctx, cc);
    } else {
      eat(ctx, TK_IDENT);
      env.addWord(ctx, lexeme, {
        tk: TK_IDENT,
        cls: "val",
        name: lexeme,
        offset: ctx.state.paramc,
        nid: 0,
      });
      Ast.name(ctx, lexeme, getCoord(ctx));
      cc.cls = "val";
      return cc;
    }
  }
  function name(ctx, cc) {
    eat(ctx, TK_IDENT);
    var coord = getCoord(ctx);
    var word = env.findWord(ctx, lexeme);
    if (word) {
      cc.cls = word.cls;
      if (word.cls==="number" && word.val) {
        Ast.number(ctx, word.val, coord);
      } else if (word.cls==="string" && word.val) {
        Ast.string(ctx, word.val, coord);
      } else {
        if (word.nid) {
          Ast.push(ctx, word.nid);
        } else {
          Ast.name(ctx, lexeme, coord);
        }
      }
    } else {
      cc.cls = "comment";
      addError(ctx, "Name '" + lexeme + "' not found.");
    }
    assert(cc, "name");
    return cc;
  }
  function record(ctx, cc) {
    // Parse record
    eat(ctx, TK_LEFTBRACE);
    startCounter(ctx);
    var ret = function(ctx) {
      return bindings(ctx, function (ctx) {
        eat(ctx, TK_RIGHTBRACE);
        Ast.record(ctx);
        stopCounter(ctx);
        cc.cls = "punc";
        return cc;
      })
    }
    ret.cls = "punc";
    return ret;
  }
  function bindings(ctx, cc) {
    if (match(ctx, TK_RIGHTBRACE)) {
      return cc;
    }
    return binding(ctx, function (ctx) {
      if (match(ctx, TK_COMMA)) {
        eat(ctx, TK_COMMA);
        Ast.binding(ctx);
        var ret = function (ctx) {
          return bindings(ctx, cc);
        };
        ret.cls = "punc";
        return ret;
      }
      return function (ctx) {
        Ast.binding(ctx);
        return bindings(ctx, cc);
      };
    })
  }
  function binding(ctx, cc) {
    return identOrString(ctx, function(ctx) {
      eat(ctx, TK_COLON);
      var ret = function(ctx) {
        countCounter(ctx);
        return expr(ctx, cc);
      }
      ret.cls = "punc";
      return ret;
    })
  }
  function lambda(ctx, cc) {
    eat(ctx, TK_LEFTANGLE);
    var ret = function (ctx) {
      ctx.state.paramc = 0;
      env.enterEnv(ctx, "lambda");
      return params(ctx, TK_COLON, function (ctx) {
        eat(ctx, TK_COLON);
        var ret = function(ctx) {
          return exprsStart(ctx, TK_RIGHTANGLE, function (ctx) {
            eat(ctx, TK_RIGHTANGLE);
            var nid = Ast.pop(ctx);   // save body node id for aliased code
            Ast.lambda(ctx, topEnv(ctx), nid);
            env.exitEnv(ctx);
            return cc
          });
        };
        ret.cls = "punc"
        return ret
      })
    };
    return ret;
  }
  function parenExpr(ctx, cc) {
    let coord = getCoord(ctx);
    eat(ctx, TK_LEFTPAREN);
    var ret = function(ctx) {
      return exprsStart(ctx, TK_RIGHTPAREN, function (ctx) {
        eat(ctx, TK_RIGHTPAREN);
        coord.to = getCoord(ctx).to;
        Ast.parenExpr(ctx, coord);
        cc.cls = "punc";
        return cc;
      })
    }
    ret.cls = "punc";
    return ret;
  }
  function list(ctx, cc) {
    let coord = getCoord(ctx);
    eat(ctx, TK_LEFTBRACKET);
    startCounter(ctx);
    var ret = function(ctx) {
      return elements(ctx, function (ctx) {
        eat(ctx, TK_RIGHTBRACKET);
        coord.to = getCoord(ctx).to;
        Ast.list(ctx, ctx.state.exprc, coord);
        stopCounter(ctx);
        cc.cls = "punc";
        return cc;
      });
    }
    ret.cls = "punc";
    return ret;
  }
  function elements(ctx, resume) {
    if (match(ctx, TK_RIGHTBRACKET)) {
      return resume;
    }
    return element(ctx, function (ctx) {
      if (match(ctx, TK_COMMA)) {
        eat(ctx, TK_COMMA);
        var ret = function (ctx) {
          return elements(ctx, resume);
        };
        ret.cls = "punc";
        return ret;
      }
      return function (ctx) {
        return elements(ctx, resume);
      };
    });
  }
  function element(ctx, resume) {
    return expr(ctx, function(ctx) {
      countCounter(ctx);
      return resume(ctx);
    });
  }
  function primaryExpr(ctx, cc) {
    if (match(ctx, TK_NUM)) {
      return number(ctx, cc);
    } else if (match(ctx, TK_STR) || match(ctx, TK_STRPREFIX)) {
      return str(ctx, cc);
    } else if (match(ctx, TK_BOOL)) {
      return bool(ctx, cc);
    } else if (match(ctx, TK_NULL)) {
      return nul(ctx, cc);
    } else if (match(ctx, TK_LEFTBRACE)) {
      return record(ctx, cc);
    } else if (match(ctx, TK_LEFTPAREN)) {
      return parenExpr(ctx, cc);
    } else if (match(ctx, TK_LEFTBRACKET)) {
      return list(ctx, cc);
    } else if (match(ctx, TK_LEFTANGLE)) {
      return lambda(ctx, cc);
    }
    return name(ctx, cc);
  }
  function postfixExpr(ctx, cc) {
    return primaryExpr(ctx, function (ctx) {
      if (match(ctx, TK_POSTOP)) {
        eat(ctx, TK_POSTOP);
        cc.cls = "operator";
        Ast.postfixExpr(ctx, lexeme);
        return cc;
      }
      return cc(ctx);
    })
  }

  function prefixExpr(ctx, cc) {
    if (match(ctx, TK_MINUS)) {
      eat(ctx, TK_MINUS);
      var ret = function(ctx) {
        return postfixExpr(ctx, function (ctx) {
          Ast.prefixExpr(ctx, "NEG");
          return cc;
        })
      }
      ret.cls = "number"   // use number because of convention
      return ret;
    }
    return postfixExpr(ctx, cc);
  }

  function getPrecedence(op) {
    return {
      "": 0
      , "OR": 1
      , "AND": 2
      , "EQ": 3
      , "NE": 3
      , "LT": 4
      , "GT": 4
      , "LE": 4
      , "GE": 4
      , "CONCAT": 5
      , "ADD": 5
      , "SUB": 5
      , "MUL": 6
      , "DIV": 6
      , "MOD": 6
      , "POW": 7
    }[op];
  }

  function binaryExpr(ctx, prevOp, cc) {
    return prefixExpr(ctx, function (ctx) {
      if (match(ctx, TK_BINOP)) {
        eat(ctx, TK_BINOP)
        var ret = function (ctx) {
          var op = env.findWord(ctx, lexeme).name
          if (getPrecedence(prevOp) < getPrecedence(op)) {
            return binaryExpr(ctx, op, function(ctx, prevOp) {
              // This continuation's purpose is to construct a right recursive
              // binary expression node. If the previous node is a binary node
              // with equal or higher precedence, then we get here from the left
              // recursive branch below and there is no way to know the current
              // operator unless it gets passed as an argument, which is what
              // prevOp is for.
              if (prevOp !== void 0) {
                op = prevOp
              }
              Ast.binaryExpr(ctx, op)
              return cc(ctx)
            })
          } else {
            Ast.binaryExpr(ctx, prevOp)
            return binaryExpr(ctx, op, function(ctx, prevOp) {
              if (prevOp !== void 0) {
                op = prevOp
              }
              return cc(ctx, op)
            })
          }
        }
        ret.cls = "operator"
        return ret
      }
      return cc(ctx)
    })
  }

  function relationalExpr(ctx, cc) {
    return binaryExpr(ctx, "", function (ctx) {
      return cc(ctx)
    })
  }

  function condExpr(ctx, cc) {
    if (match(ctx, TK_CASE)) {
      return caseExpr(ctx, cc)
    }
    return relationalExpr(ctx, cc)
  }

  function caseExpr(ctx, cc) {
    eat(ctx, TK_CASE);
    var ret = function (ctx) {
      return expr(ctx, function (ctx) {
        startCounter(ctx);
        return ofClauses(ctx, function (ctx) {
          Ast.caseExpr(ctx, ctx.state.exprc);
          stopCounter(ctx);
          eat(ctx, TK_END);
          cc.cls = "keyword";
          return cc;
        })
      })
    }
    ret.cls = "keyword";
    return ret;
  }

  function ofClauses(ctx, cc) {
    if (match(ctx, TK_OF)) {
      return ofClause(ctx, function (ctx) {
        countCounter(ctx);
        if (match(ctx, TK_OF)) {
          return ofClauses(ctx, cc);
        }
        return cc(ctx);
      });
    }
    return cc(ctx);
  }

  function ofClause (ctx, cc) {
    eat(ctx, TK_OF);
    var ret = function (ctx) {
      return pattern(ctx, function (ctx) {
        eat(ctx, TK_COLON);
        var ret = function(ctx) {
          return exprsStart(ctx, TK_OF, function(ctx) {
            Ast.ofClause(ctx);
            return cc(ctx);
          });
        }
        ret.cls = "punc";
        return ret;
      });
    }
    ret.cls = "keyword";
    return ret;
  }

  function pattern(ctx, cc) {
    // FIXME only matches number literals for now
    return primaryExpr(ctx, cc);
  }

  function thenClause(ctx, cc) {
    eat(ctx, TK_THEN)
    var ret = function (ctx) {
      return exprsStart(ctx, TK_ELSE, function (ctx) {
        if (match(ctx, TK_ELSE)) {
          return elseClause(ctx, cc)
        } else {
          return cc(ctx)
        }
      })
    }
    ret.cls = "keyword"
    return ret
  }

  function elseClause(ctx, cc) {
    eat(ctx, TK_ELSE)
    var ret = function (ctx) {
      return exprsStart(ctx, TK_END, cc)
    }
    ret.cls = "keyword"
    return ret
  }

  function expr(ctx, cc) {
    var ret;
    if (match(ctx, TK_LET)) {
      ret = letDef(ctx, cc);
    } else {
      ret = condExpr(ctx, cc);
    }
    return ret;
  }

  function emptyInput(ctx) {
    return peek(ctx) === 0
  }

  function emptyExpr(ctx) {
    return emptyInput(ctx)
      || match(ctx, TK_THEN)
      || match(ctx, TK_ELSE)
      || match(ctx, TK_OR)
      || match(ctx, TK_END)
      || match(ctx, TK_DOT);
  }

  function countCounter(ctx) {
    ctx.state.exprc++
  }

  function startCounter(ctx) {
    ctx.state.exprcStack.push(ctx.state.exprc)
    ctx.state.exprc = 0
  }

  function stopCounter(ctx) {
    ctx.state.exprc = ctx.state.exprcStack.pop()
  }

  function exprsStart(ctx, brk, cc) {
    startCounter(ctx);
    return exprs(ctx, brk, cc);
  }

  function exprsFinish(ctx, cc) {
    Ast.exprs(ctx, ctx.state.exprc)
    stopCounter(ctx)
    return cc(ctx)
  }

  function exprs(ctx, brk, cc) {
    if (match(ctx, TK_DOT)) {   // second dot
      eat(ctx, TK_DOT);
      var ret = function(ctx) {
        return exprsFinish(ctx, cc);
      }
      ret.cls = "punc";
      return ret;
    }
    return expr(ctx, function (ctx) {
      countCounter(ctx);
      if (match(ctx, TK_DOT)) {
        eat(ctx, TK_DOT);
        var ret = function (ctx) {
          if (emptyInput(ctx) || emptyExpr(ctx)) {
            return exprsFinish(ctx, cc);
          }
          return exprs(ctx, brk, cc);
        }
        ret.cls = "punc";
        return ret;
      } else if (match(ctx, brk)) {
        var ret = function (ctx) {
          return exprsFinish(ctx, cc);
        }
        ret.cls = "punc";
        return ret;
      } else {
        if (emptyInput(ctx) || emptyExpr(ctx)) {
          return exprsFinish(ctx, cc);
        }
        return exprs(ctx, brk, cc);
      }
      return exprsFinish(ctx, cc);
    });
  }

  function program(ctx, cc) {
    return exprsStart(ctx, TK_DOT, function (ctx) {
      var nid;
      while (Ast.peek(ctx) !== nid) {
        var nid = Ast.pop(ctx);
        folder.fold(ctx, nid)  // fold the exprs on top
      }
      Ast.exprs(ctx, ctx.state.nodeStack.length, true);
      Ast.program(ctx);
      assert(cc===null, "internal error, expecting null continuation");
      return cc;
    });
  }

  window.gcexports.program = program;

  /*

    fn = { head, body }

   */

  function letDef(ctx, cc) {
    if (match(ctx, TK_LET)) {
      eat(ctx, TK_LET);
      var ret = function (ctx) {
        var ret = defName(ctx, function (ctx) {
          var name = Ast.node(ctx, Ast.pop(ctx)).elts[0];
          // nid=0 means def not finished yet
          env.addWord(ctx, name, {
            tk: TK_IDENT,
            cls: "function",
            length: 0,
            nid: 0,
            name: name
          });
          ctx.state.paramc = 0;
          env.enterEnv(ctx, name);  // FIXME need to link to outer env
          return params(ctx, TK_EQUAL, function (ctx) {
            var func = env.findWord(ctx, topEnv(ctx).name);
            func.length = ctx.state.paramc;
            func.env = topEnv(ctx);
            eat(ctx, TK_EQUAL);
            var ret = function(ctx) {
              return exprsStart(ctx, TK_DOT, function (ctx) {
                var def = env.findWord(ctx, topEnv(ctx).name);
                def.nid = Ast.peek(ctx);   // save node id for aliased code
                env.exitEnv(ctx);
                Ast.letDef(ctx);  // Clean up stack
                return cc;
              });
            }
            ret.cls = "punc";
            return ret;
          })
        })
        ret.cls = "def";
        return ret;
      }
      ret.cls = "keyword";
      return ret;
    }
    return name(ctx, cc);
  }

  // TODO add argument for specifying the break token.
  // e.g. TK_EQUAL | TK_VERTICALBAR
  // params(ctx, brk, resume) {..}
  function params(ctx, brk, cc) {
    if (match(ctx, brk)) {
      return cc
    }
    var ret = function (ctx) {
      var ret = defName(ctx, (ctx) => {
        Ast.pop(ctx); // Throw away name.
        ctx.state.paramc++;
        return params(ctx, brk, cc);
      });
      ret.cls = "param";
      return ret;
    };
    ret.cls = "param";
    return ret;
  }

  function param(ctx, cc) {
    return primaryExpr(ctx, function (ctx) {
      return cc
    });
  }

  // Drive the parser

  window.gcexports.topEnv = topEnv;
  window.gcexports.firstTime = true;
  var lastAST;
  var lastTimer;
  function parse(stream, state, resume) {
    var ctx = {
      scan: scanner(stream, state.env[0].lexicon),
      state: state,
    };
    var cls
    try {
      var c;
      while ((c = stream.peek()) && (c===' ' || c==='\t')) {
        stream.next()
      }
      // if this is a blank line, treat it as a comment
      if (stream.peek()===void 0) {
        throw "comment"
      }
      // call the continuation and store the next continuation
      if (state.cc === null) {
        next(ctx)
        return "comment"
      }
      var t0 = new Date;
      var lastCC = state.cc
      var cc = state.cc = state.cc(ctx, null)
      if (cc) {
        cls = cc.cls
      }
      if (cc === null) {
        if (resume) {
          // FIXME make all paths go through a resume function.
          if (state.errors.length > 0) {
            resume(state.errors);
          } else {
            resume(null, Ast.poolToJSON(ctx));
          }
        } else if (state.errors.length === 0) {
          window.gcexports.errors = [];
          var thisAST = Ast.poolToJSON(ctx);
          if (lastTimer) {
            // Reset timer to wait another second pause.
            window.clearTimeout(lastTimer);
          }
          if (JSON.stringify(lastAST) !== JSON.stringify(thisAST)) {
            // Compile code if not first time (newly loaded) and no edit
            // activity after 1 sec.
            if (!window.gcexports.firstTime) {
              lastTimer = window.setTimeout(function () {
                if (gcexports.errors && gcexports.errors.length === 0) {
                  compileCode(thisAST, true);
                }
              }, 1000);
            }
            window.gcexports.firstTime = false;
          } else {
            // The AST hasn't changed, but the text has so save the code.
            lastTimer = window.setTimeout(function () {
              window.gcexports.errors = window.gcexports.lastErrors;
              window.gcexports.editor.performLint();
              saveSrc();
            }, 1000);
          }
        } else {
          window.gcexports.errors = state.errors;
        }
      }
      var c;
      while ((c = stream.peek()) &&
           (c===' ' || c==='\t')) {
        stream.next()
      }
    } catch (x) {
      if (x instanceof Error) {
        next(ctx)
        addError(ctx, x.message);
        state.cc = null;  // done for now.
        cls = "error"
        console.log(x.stack);
        if (resume) {
          resume(window.gcexports.errors);
        }
      } else if (x === "comment") {
        cls = x
      } else {
        //throw x
        next(ctx)
        cls = "error"
        console.log(x.stack);
      }
    }
    var t1 = new Date;
    parseCount++
    parseTime += t1 - t0
    window.gcexports.coords = state.coords;
    return cls;
  }

  var lexeme = ""

  function scanner(stream, globalLexicon) {

    return {
      start: start ,
      stream: stream,
      lexeme: function () {
        return lexeme
      }
    }

    // begin private functions

    function peekCC() {
      return stream.peek() && stream.peek().charCodeAt(0) || 0;
    }

    function nextCC() {
      return stream.peek() && stream.next().charCodeAt(0) || 0;
    }

    function start(ctx) {
      var c;
      lexeme = "";
      while (stream.peek() !== void 0) {
        switch ((c = stream.next().charCodeAt(0))) {
        case 32:  // space
        case 9:   // tab
        case 10:  // new line
        case 13:  // carriage return
          c = ' ';
          continue
        case 46:  // dot
          if (isNumeric(stream.peek())) {
            return number(c);
          }
          lexeme += String.fromCharCode(c);
          return TK_DOT
        case 44:  // comma
          lexeme += String.fromCharCode(c);
          return TK_COMMA
        case 58:  // colon
          lexeme += String.fromCharCode(c);
          return TK_COLON
        case 61:  // equal
          lexeme += String.fromCharCode(c);
          return TK_EQUAL
        case 40:  // left paren
          lexeme += String.fromCharCode(c);
          return TK_LEFTPAREN
        case 41:  // right paren
          lexeme += String.fromCharCode(c);
          return TK_RIGHTPAREN
        case 45:  // dash
          lexeme += String.fromCharCode(c);
          return TK_MINUS
        case 60: // left angle
          lexeme += String.fromCharCode(c);
          return TK_LEFTANGLE
        case 62: // right angle
          lexeme += String.fromCharCode(c);
          return TK_RIGHTANGLE
        case 91:  // left bracket
          lexeme += String.fromCharCode(c);
          return TK_LEFTBRACKET
        case 93:  // right bracket
          lexeme += String.fromCharCode(c);
          return TK_RIGHTBRACKET
        case 123: // left brace
          lexeme += String.fromCharCode(c);
          return TK_LEFTBRACE
        case 125: // right brace
          lexeme += String.fromCharCode(c);
          if (ctx.state.inStr) {
            return stringSuffix(ctx);
          }
          return TK_RIGHTBRACE
        case CC_DOUBLEQUOTE:
        case CC_SINGLEQUOTE:
        case CC_BACKTICK:
          return string(ctx, c)

        case 96:  // backquote
        case 47:  // slash
        case 92:  // backslash
        case 33:  // !
        case 124: // |
          comment(c)
          throw "comment"
        case 94:  // caret
        case 44:  // comma
        case 42:  // asterisk
          lexeme += String.fromCharCode(c);
          return c; // char code is the token id
        default:
          if ((c >= 'A'.charCodeAt(0) && c <= 'Z'.charCodeAt(0)) ||
            (c >= 'a'.charCodeAt(0) && c <= 'z'.charCodeAt(0)) ||
            (c === '_'.charCodeAt(0))) {
            return ident(c);
          } else if (isNumeric(c) || c === '.'.charCodeAt(0) && isNumeric(stream.peek())) {
            //lex += String.fromCharCode(c);
            //c = src.charCodeAt(curIndex++);
            //return TK_NUM;
            return number(c);
          } else {
            return 0;
          }
        }
      }

      return 0;
    }

    function isNumeric(c) {
      if (typeof c === "string") {
        c = c.charCodeAt(0);
      }
      return c >= '0'.charCodeAt(0) && c <= '9'.charCodeAt(0);
    }

    function number(c) {
      // 123, 1.23, .123
      while (isNumeric(c) || c === '.'.charCodeAt(0) && isNumeric(stream.peek())) {
        lexeme += String.fromCharCode(c);
        var s;
        c = (s = stream.next()) ? s.charCodeAt(0) : 0
      }
      if (c) {
        stream.backUp(1);
      }  // otherwise, we are at the end of stream
      return TK_NUM;
    }

    // "abc" --> "abc"
    // "a${x}c" --> concat ["a", x, "b"]
    function string(ctx, c) {
      var quoteChar = c;
      ctx.state.quoteCharStack.push(c);
      lexeme += String.fromCharCode(c)
      c = nextCC();
      while (c !== quoteChar && c !== 0 &&
            (quoteChar === CC_BACKTICK || !(c === CC_DOLLAR && peekCC() === CC_LEFTBRACE))) {
        lexeme += String.fromCharCode(c);
        var s;
        c = nextCC();
      }
      if (c === CC_DOLLAR &&
          peekCC() === CC_LEFTBRACE) {
        nextCC(); // Eat CC_LEFTBRACE
        lexeme = lexeme.substring(1);  // Strip off punct.
        return TK_STRPREFIX;
      } else if (c) {
        lexeme = lexeme.substring(1);  // Strip off leading quote.
        return TK_STR;
      } else {
        return 0
      }
    }

    function stringSuffix(ctx) {
      var c, s;
      var quoteCharStack = ctx.state.quoteCharStack;
      var quoteChar = quoteCharStack[quoteCharStack.length - 1];
      c = nextCC();
      while (c !== quoteChar && c !== 0 &&
             !(c === CC_DOLLAR &&
               peekCC() === CC_LEFTBRACE)) {
        lexeme += String.fromCharCode(c);
        c = nextCC();
      }
      if (c === CC_DOLLAR &&
          peekCC() === CC_LEFTBRACE) {
        nextCC() ; // Eat brace.
        lexeme = lexeme.substring(1);  // Strip off leading brace and trailing brace.
        return TK_STRMIDDLE;
      } else if (c) {
        quoteCharStack.pop();
        lexeme = lexeme.substring(1);  // Strip off leading braces.
        return TK_STRSUFFIX;
      } else {
        return 0
      }
    }

    function comment(c) {
      var quoteChar = c
      c = (s = stream.next()) ? s.charCodeAt(0) : 0

      while (c !== quoteChar && c != 10 && c!= 13 && c !== 0) {
        var s;
        c = (s = stream.next()) ? s.charCodeAt(0) : 0
      }

      return TK_COMMENT
    }

    function ident(c) {
      while ((c >= 'A'.charCodeAt(0) && c <= 'Z'.charCodeAt(0)) ||
           (c >= 'a'.charCodeAt(0) && c <= 'z'.charCodeAt(0)) ||
           (c === '-'.charCodeAt(0)) ||
           (c === '@'.charCodeAt(0)) ||
           (c === '+'.charCodeAt(0)) ||
           (c === '#'.charCodeAt(0)) ||
           (c === '_'.charCodeAt(0)) ||
           (c === '~'.charCodeAt(0)) ||
           (c >= '0'.charCodeAt(0) && c <= '9'.charCodeAt(0)))
      {
        lexeme += String.fromCharCode(c);
        c = stream.peek() ? stream.next().charCodeAt(0) : 0
      }

      if (c) {
        stream.backUp(1);
      }  // otherwise, we are at the end of stream

      var tk = TK_IDENT
      if (keywords[lexeme]) {
        tk = keywords[lexeme].tk;
      } else if (globalLexicon[lexeme]) {
        tk = globalLexicon[lexeme].tk
      }
      return tk;
    }
  }

  var parser = {
    token: function(stream, state) {
      return parse(stream, state)
    },

    parse: parse,
    program: program,
  }

  window.gcexports.parse = parser.parse
  if (window.isSynthetic) {
    // Export in node.
    exports.parse = window.gcexports.parse;
    exports.StringStream = window.gcexports.StringStream;
    exports.program = program;
  }

  return parser
})(); // end parser

