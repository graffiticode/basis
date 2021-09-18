var foldTime = 0

window.gcexports.foldTime = function () {
  return foldTime
}

var folder = function() {
  var _ = window.gcexports._;

  var table = {
    "PROG" : program,
    "EXPRS" : exprs,
    "PAREN" : parenExpr,
    "IDENT" : ident,
    "BOOL" : bool,
    "NUM" : num,
    "STR" : str,
    "PARENS" : unaryExpr,
    "APPLY" : apply,
    "LAMBDA" : lambda,
    // "MUL": mul,
    // "DIV": div,
    // "SUB": sub,
    "ADD": add,
    "POW": pow,
    "MOD": mod,
    "CONCAT": concat,
//    "OR": orelse,
//    "AND": andalso,
    "NE": ne,
    "EQ": eq,
    "LT": lt,
//    "GT": gt,
    "LE": le,
    "GE": ge,
    "NEG": neg,
    "LIST": list,
//    "CASE": caseExpr,
//    "OF": ofClause,
  };

  var canvasWidth = 0;
  var canvasHeight = 0;

  return {
    fold: fold,
  };

  // CONTROL FLOW ENDS HERE

  var nodePool;
  var ctx;

  function fold(cx, nid) {
    ctx = cx;
    nodePool = ctx.state.nodePool;
    var t0 = new Date;
    visit(nid);
    var t1 = new Date;
    foldTime += (t1-t0);
  }

  function visit(nid) {
    var node = nodePool[nid];
    if (node == null) {
      return null;
    }
    if (node.tag === void 0) {
      return [ ]  // clean up stubs;
    } else if (isFunction(table[node.tag])) {
      // Have a primitive operation so apply it to construct a new node.
      var ret = table[node.tag](node);
      return ret;
    }
    expr(node);
  }

  function isArray(v) {
    return v instanceof Array;
  }

  function isString(v) {
    return typeof v === "string";
  }

  function isPrimitive(v) {
    return (
      v === null ||
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean"
    );
  }

  function isFunction(v) {
    return v instanceof Function;
  }

  // BEGIN VISITOR METHODS

  var edgesNode;

  function program(node) {
    visit(node.elts[0]);
    Ast.program(ctx);
  }

  function caseExpr(node) {
    visit(node.elts[node.elts.length-1]);
    var expr = Ast.pop(ctx);
    for (var i = node.elts.length-2; i >= 0; i--) {
      var ofNode = ctx.state.nodePool[node.elts[i]];
      var patternNode = ofNode.elts[1];
      visit(patternNode);
      var pattern = Ast.pop(ctx);
//      if (Ast.intern(expr) === Ast.intern(pattern)) {
      if (expr === pattern) {
        visit(ofNode.elts[0]);
        return;
      }
    }
  }

  function ofClause(node) {
    for (var i = 0; i < node.elts.length; i++) {
      visit(node.elts[i]);
    }
    Ast.ofClause(ctx);
  }
  function pushNodeStack(ctx) {
    ctx.state.nodeStackStack.push(ctx.state.nodeStack);
    ctx.state.nodeStack = [];
  }
  function popNodeStack(ctx) {
    var stack = ctx.state.nodeStack;
    ctx.state.nodeStack = ctx.state.nodeStackStack.pop().concat(stack);
  }

  function list(node) {
    // Fold list
    // for (var i = 0; i < node.elts.length; i++) {
    //   visit(node.elts[i]);
    // }
    pushNodeStack(ctx);
    for (var i = node.elts.length - 1; i >= 0; i--) {
      visit(node.elts[i]);  // Keep original order.
    }
    Ast.list(ctx, ctx.state.nodeStack.length, null, true);
    popNodeStack(ctx);
  }

  function exprs(node) {
    // Fold exprs in reverse order to get precedence right.
    for (var i = node.elts.length - 1; i >= 0; i--) {
      visit(node.elts[i]);  // Keep original order.
    }
    ctx.state.exprc = node.elts.length;
  }

  function lambda(node) {
    // Fold initializers and apply args.
    var inits = Ast.node(ctx, node.elts[3]).elts;
    inits.forEach((init, i) => {
      if (init) {
        // If we have an init then fold it and replace in inits list.
        folder.fold(ctx, Ast.intern(ctx, init));
        inits[i] = Ast.pop(ctx);
      }
    });
    // FIXME don't patch old node. construct a new one.
    node.elts[3] = Ast.intern(ctx, {tag: "LIST", elts: inits});
    var fnId = Ast.intern(ctx, node);
    var argc = ctx.state.nodeStack.length;
    Ast.apply(ctx, fnId, argc);
  }

  function apply(node) {
    for (var i = node.elts.length-1; i >= 0; i--) {
      visit(node.elts[i]);
    }
    Ast.applyLate(ctx, node.elts.length);
  }

  function expr(node) {
    // Construct an expression node for the compiler.
    Ast.name(ctx, node.tag, getCoord(ctx));
    for (var i = node.elts.length-1; i >= 0; i--) {
      visit(node.elts[i]);
    }
    Ast.expr(ctx, node.elts.length);
  }

  function neg(node) {
    visit(node.elts[0]);
    Ast.neg(ctx);
  }

  function parenExpr(node) {
    pushNodeStack(ctx);
    visit(node.elts[0]);
    Ast.parenExpr(ctx);
    popNodeStack(ctx);
  }

  function unaryExpr(node) {
    visit(node.elts[0]);
    Ast.unaryExpr(ctx, node.tag);
  }

  function add(node) {
    visit(node.elts[0]);
    visit(node.elts[1]);
    Ast.add(ctx);
  }

  function sub(node) {
    visit(node.elts[0]);
    visit(node.elts[1]);
    Ast.sub(ctx);
  }

  function mul(node) {
    visit(node.elts[0]);
    visit(node.elts[1]);
    Ast.mul(ctx);
  }

  function div(node) {
    visit(node.elts[0]);
    visit(node.elts[1]);
    Ast.div(ctx);
  }

  function pow(node) {
    visit(node.elts[0]);
    visit(node.elts[1]);
    Ast.pow(ctx);
  }

  function concat(node) {
    visit(node.elts[0]);
    Ast.concat(ctx);
  }

  function mod(node) {
    visit(node.elts[0]);
    visit(node.elts[1]);
    Ast.mod(ctx);
  }

  function orelse(node) {
    visit(node.elts[0]);
    visit(node.elts[1]);
    Ast.orelse(ctx);
  }

  function andalso(node) {
    visit(node.elts[0]);
    visit(node.elts[1]);
    Ast.andalso(ctx);
  }

  function eq(node) {
    visit(node.elts[0]);
    visit(node.elts[1]);
    Ast.eq(ctx);
  }

  function ne(node) {
    visit(node.elts[0]);
    visit(node.elts[1]);
    Ast.ne(ctx);
  }

  function lt(node) {
    visit(node.elts[0]);
    visit(node.elts[1]);
    Ast.lt(ctx);
  }

  function gt(node) {
    visit(node.elts[0]);
    visit(node.elts[1]);
    Ast.gt(ctx);
  }

  function le(node) {
    visit(node.elts[0]);
    visit(node.elts[1]);
    Ast.le(ctx);
  }

  function ge(node) {
    visit(node.elts[0]);
    visit(node.elts[1]);
    Ast.ge(ctx);
  }

  function ident(node) {
    var name = node.elts[0];
    var word = env.findWord(ctx, name);
    if (word) {
      if (word.cls==="val") {
        if (word.val) {
          Ast.push(ctx, word.val);
          visit(Ast.pop(ctx));      // reduce the val expr
        } else if (word.nid) {
          var wrd;
          if ((wrd = Ast.node(ctx, word.nid)).tag === "LAMBDA") {
            var argc = wrd.elts[0].elts.length;
            Ast.apply(ctx, word.nid, argc);
          } else {
            Ast.push(ctx, word.nid);
          }
        } else if (word.name) {
          Ast.push(ctx, node);
        } else {
          // push the original node to be resolved later.
          Ast.push(ctx, node);
        }
      } else if (word.cls==="function") {
        let coord = getCoord(ctx);
        var elts = [];
        for (var i = 0; i < word.length; i++) {
          var elt = Ast.pop(ctx);
          elts.push(elt);
        }
        if (word.nid) {
          Ast.fold(ctx, word, elts);
        } else {
          Ast.push(ctx, {
            tag: word.name,
            elts: elts,
            coord: coord,
          });
          folder.fold(ctx, Ast.pop(ctx));
        }
      } else {
        assert(false);
      }
    } else {
      //assert(false, "unresolved ident "+name);
      Ast.push(ctx, node);
    }
  }

  function num(node) {
    Ast.number(ctx, node.elts[0]);
  }

  function str(node) {
    Ast.string(ctx, node.elts[0]);
  }

  function bool(node) {
    Ast.bool(ctx, node.elts[0]);
  }

  function nul(node) {
    Ast.nul(ctx);
  }

  function stub(node) {
    return "";
  }
}();

