var Ast = (function () {
  var ASSERT = true;
  var assert = function (val, str) {
    if ( !ASSERT ) {
      return;
    }
    if ( str === void 0 ) {
      str = "failed!";
    }
    if (!val) {
      throw new Error(str);
    }
  }

  var AstClass = function() { }

  AstClass.prototype = {
    intern: intern,
    node: node,
    dump: dump,
    dumpAll: dumpAll,
    poolToJSON: poolToJSON,
    number: number,
    string: string,
    name: name,
    apply: apply,
    fold: fold,
    expr: expr,
    binaryExpr: binaryExpr,
    unaryExpr: unaryExpr,
    parenExpr: parenExpr,
    prefixExpr: prefixExpr,
    lambda: lambda,
    applyLate: applyLate,
    letDef: letDef,
    caseExpr: caseExpr,
    ofClause: ofClause,
    record: record,
    binding: binding,
    exprs: exprs,
    program: program,
    pop: pop,
    topNode: topNode,
    peek: peek,
    push: push,
    mod: mod,
    add: add,
    sub: sub,
//    mul: mul,
    div: div,
    pow: pow,
    concat: concat,
    orelse: orelse,
    andalso: andalso,
    eq: eq,
    ne: ne,
    lt: lt,
    gt: gt,
    le: le,
    ge: ge,
    neg: neg,
    list: list,
    bool: bool,
    nul: nul,
  };

  return new AstClass;

  // private implementation

  function push(ctx, node) {
    var nid;
    if (typeof node === "number") {   // if already interned
      nid = node;
    } else {
      nid = intern(ctx, node);
    }
    ctx.state.nodeStack.push(nid);
  }

  function topNode(ctx) {
    var nodeStack = ctx.state.nodeStack;
    return nodeStack[nodeStack.length-1];
  }

  function pop(ctx) {
    var nodeStack = ctx.state.nodeStack;
    return nodeStack.pop();
  }

  function peek(ctx, n) {
    if (n === undefined) {
      n = 0;
    }
    var nodeStack = ctx.state.nodeStack;
    return nodeStack[nodeStack.length - 1 - n];
  }

  function intern(ctx, n) {
    if (!n) {
      return 0;
    }
    var nodeMap = ctx.state.nodeMap;
    var nodePool = ctx.state.nodePool;
    var tag = n.tag;
    var elts = "";
    var elts_nids = [ ];
    var count = n.elts.length;
    for (var i = 0; i < count; i++) {
      if (typeof n.elts[i] === "object") {
        n.elts[i] = intern(ctx, n.elts[i]);
      }
      elts += n.elts[i];
    }
    var key = tag+count+elts;
    var nid = nodeMap[key];
    if (nid === void 0) {
      nodePool.push({tag: tag, elts: n.elts});
      nid = nodePool.length - 1;
      nodeMap[key] = nid;
      if (n.coord) {
        ctx.state.coords[nid] = n.coord;
      }
    }
    return nid;
  }

  function node(ctx, nid) {
    var n = ctx.state.nodePool[nid];
    if (!nid) {
      return null;
    } else if (!n) {
      return {};
    }
    var elts = [];
    switch (n.tag) {
    case "NULL":
      break;
    case "NUM":
    case "STR":
    case "IDENT":
    case "BOOL":
      elts[0] = n.elts[0];
      break;
    default:
      for (var i=0; i < n.elts.length; i++) {
        elts[i] = node(ctx, n.elts[i]);
      }
      break;
    }
    return {
      tag: n.tag,
      elts: elts,
      coord: getCoord(ctx),
    };
  }

  function dumpAll(ctx) {
    var nodePool = ctx.state.nodePool;
    var s = "\n{"
    for (var i=1; i < nodePool.length; i++) {
      var n = nodePool[i];
      s = s + "\n  " + i+": "+dump(n) + ",";
    }
    s += "\n  root: " + (nodePool.length-1);
    s += "\n}\n";
    return s;
  }

  function poolToJSON(ctx) {
    var nodePool = ctx.state.nodePool;
    var obj = { };
    for (var i=1; i < nodePool.length; i++) {
      var n = nodePool[i];
      obj[i] = nodeToJSON(n);
    }
    obj.root = (nodePool.length-1);
    obj.version = window.gcexports.version;
    return obj;
  }

  function nodeToJSON(n) {
    if (typeof n === "object") {
      switch (n.tag) {
      case "num":
        var obj = n.elts[0];
        break;
      case "str":
        var obj = n.elts[0];
        break;
      default:
        var obj = {};
        obj["tag"] = n.tag;
        obj["elts"] = [];
        for (var i=0; i < n.elts.length; i++) {
          obj["elts"][i] = nodeToJSON(n.elts[i]);
        }
        break;
      }
    } else if (typeof n === "string") {
      var obj = n;
    } else {
      var obj = n;
    }
    return obj;
  }

  function dump(n) {
    if (typeof n === "object") {
      switch (n.tag) {
      case "num":
        var s = n.elts[0];
        break;
      case "str":
        var s = "\""+n.elts[0]+"\"";
        break;
      default:
        if (!n.elts) {
          s += "<invalid>";
        } else {
          var s = "{ tag: \"" + n.tag + "\", elts: [ ";
          for (var i=0; i < n.elts.length; i++) {
            if (i > 0) {
              s += " , ";
            }
            s += dump(n.elts[i]);
          }
          s += " ] }";
        }
        break;
      }
    } else if (typeof n === "string") {
      var s = "\""+n+"\"";
    } else {
      var s = n;
    }
    return s;
  }

  function fold(ctx, fn, args) {
    // Local defs:
    // -- put bindings in env
    // Three cases:
    // -- full application, all args are available at parse time
    // -- partial application, only some args are available at parse time
    // -- late application, args are available at compile time (not parse time)
    //        apply <[x y]: add x y> data..
    //    x: val 0 data
    //    y: val 1 data
    env.enterEnv(ctx, fn.name);
    if (fn.env) {
      var lexicon = fn.env.lexicon;
      var pattern = Ast.node(ctx, fn.env.pattern);
      var outerEnv = null;
      // setup inner environment record (lexicon)
      if (pattern && pattern.elts &&
          pattern.elts.length === 1 &&
          pattern.elts[0].tag === "LIST") {
        // For now we only support one pattern per param list.
        var isListPattern = true;
      }
      for (var id in lexicon) {
        // For each parameter, get its definition assign the value of the argument
        // used on the current function application.
        if (!id) continue;
        var word = JSON.parse(JSON.stringify(lexicon[id])); // poor man's copy.
        var index = args.length - word.offset - 1;
        // TODO we currently ignore list patterns
        // if (isListPattern) {
        //   // <[x y]: ...> foo..
        //   word.nid = Ast.intern(ctx, {
        //     tag: "VAL",
        //     elts: [{
        //       tag: "NUM",
        //       elts: [
        //         String(word.offset),
        //       ]}, {
        //         tag: "ARG",
        //         elts: [{
        //           tag: "NUM",
        //           elts: ["0"]
        //         }]
        //       }]
        //   });
        // } else
        if (index >= 0 && index < args.length) {
          word.nid = args[index];
        }
        if (index < 0) {
          // We've got an unbound variable or a variable with a default value,
          // so add it to the new variable list.
          // <x:x> => <x:x>
          // (<x y: add x y> 10) => <y: add 10 y>
          // (<y: let x = 10.. add x y>) => <y: add 10 y>
          if (!outerEnv) {
            outerEnv = {};
          }
          outerEnv[id] = word;
        }
        env.addWord(ctx, id, word);
      }
      folder.fold(ctx, fn.nid);
      if (outerEnv) {
        lambda(ctx, {
          lexicon: outerEnv,
          pattern: pattern,  // FIXME need to trim pattern if some args where applied.
        }, pop(ctx));
      }
    }
    env.exitEnv(ctx);
  }

  function applyLate(ctx, count) {
    // Ast.applyLate
    var elts = [];
    for (var i = count; i > 0; i--) {
      elts.push(pop(ctx));
    }
    push(ctx, {
      tag: "APPLY",
      elts: elts,
    });
  }

  function apply(ctx, fnId, argc) {
    // Construct function and apply available arguments.
    var fn = node(ctx, fnId);
    // if (fn.tag !== "LAMBDA") {
    //   // Construct an APPLY node for compiling later.
    //   return {
    //     tag: "APPLY",
    //     elts: [
    //       fnId,
    //     ]
    //   };
    // }
    // Construct a lexicon
    var lexicon = {};
    var paramc = 0;
    fn.elts[0].elts.forEach(function (n, i) {
      var name = n.elts[0];
      var nid = Ast.intern(ctx, fn.elts[3].elts[i]);
      lexicon[name] = {
        cls: "val",
        name: name,
        offset: i,
        nid: nid,
      };
      if (!nid) {
        // Parameters don't have nids.
        // assert that there are parameters after a binding without a nid.
        paramc++;
      }
    });
    var def = {
      name: "lambda",
      nid: Ast.intern(ctx, fn.elts[1]),
      env: {
        lexicon: lexicon,
        pattern: Ast.intern(ctx, fn.elts[2]),
      },
    };
    var len = fn.elts[0].elts.length;
    var elts = [];
    // While there are args on the stack, pop them.
    while (argc-- > 0 && paramc-- > 0) {
      var elt = pop(ctx);
      elts.unshift(elt);  // Get the order right.
    }
    fold(ctx, def, elts);
  }

  // Node constructors

  function bool(ctx, val) {
    if (val) {
      var b = true;
    } else {
      var b = false;
    }
    push(ctx, {
      tag: "BOOL",
      elts: [b]
    });
  }

  function nul(ctx) {
    push(ctx, {
      tag: "NULL",
      elts: []
    });
  }

  function number(ctx, str, coord) {
    assert(typeof str === "string" || typeof str === "number");
    push(ctx, {
      tag: "NUM",
      elts: [String(str)],
      coord: coord,
    });
  }

  function string(ctx, str, coord) {
    push(ctx, {
      tag: "STR",
      elts: [str],
      coord: coord,
    });
  }

  function name(ctx, name, coord) {
    push(ctx, {
      tag: "IDENT",
      elts: [name],
      coord: coord,
    });
  }

  function expr(ctx, argc) {
    // Ast.expr -- construct a expr node for the compiler.
    var elts = [];
    while (argc--) {
      var elt = pop(ctx);
      elts.push(elt);
    }
    var nameId = pop(ctx);
    var e = node(ctx, nameId).elts;
    assert(e && e.length > 0, "Ill formed node.");
    var name = e[0];
    push(ctx, {
      tag: name,
      elts: elts,
      coord: getCoord(ctx),
    });
  }

  function parenExpr(ctx, coord) {
    // Ast.parenExpr
    var elts = [];
    var elt = pop(ctx);
    elts.push(elt);
    push(ctx, {
      tag: "PAREN",
      elts: elts,
      coord: coord,
    });
  }

  function list(ctx, count, coord, reverse) {
    // Ast.list
    var elts = [];
    for (var i = count; i > 0; i--) {
      var elt = pop(ctx);
      if (elt !== void 0) {
        elts.push(elt);
      }
    }
    push(ctx, {
      tag: "LIST",
      elts: reverse ? elts : elts.reverse(),
      coord: coord,
    });
  }

  function binaryExpr(ctx, name) {
    var elts = [];
    // args are in the order produced by the parser
    elts.push(pop(ctx));
    elts.push(pop(ctx));
    push(ctx, {
      tag: name,
      elts: elts.reverse()
    });
  }
  function unaryExpr(ctx, name) {
    var elts = [];
    elts.push(pop(ctx));
    push(ctx, {
      tag: name,
      elts: elts
    });
  }

  function prefixExpr(ctx, name) {
    var elts = [];
    elts.push(pop(ctx));
    push(ctx, {
      tag: name,
      elts: elts
    });
  }

  function neg(ctx) {
    var v1 = +node(ctx, pop(ctx)).elts[0];
    number(ctx, -1*v1);
  }

  function add(ctx, coord) {
    var n2 = node(ctx, pop(ctx));
    var n1 = node(ctx, pop(ctx));
    var v2 = n2.elts[0];
    var v1 = n1.elts[0];
    if (n1.tag !== "NUM" || n2.tag !== "NUM") {
      push(ctx, {
        tag: "ADD",
        elts: [n1, n2],
        coord: coord
      });
    } else {
      number(ctx, +v1 + +v2);
    }
  }

  function sub(ctx) {
    var n2 = node(ctx, pop(ctx));
    var n1 = node(ctx, pop(ctx));
    var v2 = n2.elts[0];
    var v1 = n1.elts[0];
    if (n1.tag !== "NUM" || n2.tag !== "NUM") {
      push(ctx, {tag: "SUB", elts: [n1, n2]});
    } else {
      number(ctx, +v1 - +v2);
    }
  }

  function mul(ctx) {
    var n2 = node(ctx, pop(ctx));
    var n1 = node(ctx, pop(ctx));
    var v2 = n2.elts[0];
    var v1 = n1.elts[0];
    if (n1.tag === undefined) {
      n1 = n1.elts[0];
    }
    if (n2.tag === undefined) {
      n2 = n2.elts[0];
    }
    if (n1.tag !== "NUM" || n2.tag !== "NUM") {
      push(ctx, {tag: "MUL", elts: [n2, n1]});
    } else {
      number(ctx, +v1 * +v2);
    }
  }

  function div(ctx) {
    var n2 = node(ctx, pop(ctx));
    var n1 = node(ctx, pop(ctx));
    var v2 = n2.elts[0];
    var v1 = n1.elts[0];
    if (n1.tag !== "NUM" || n2.tag !== "NUM") {
      push(ctx, {tag: "DIV", elts: [n1, n2]});
    } else {
      number(ctx, +v1 / +v2);
    }
  }

  function mod(ctx) {
    var n2 = node(ctx, pop(ctx));
    var n1 = node(ctx, pop(ctx));
    var v1 = n1.elts[0];
    var v2 = n2.elts[0];
    if (n1.tag !== "NUM" || n2.tag !== "NUM") {
      push(ctx, {tag: "MOD", elts: [n1, n2]});
    } else {
      number(ctx, +v1 % +v2);
    }
  }

  function pow(ctx) {
    var n2 = node(ctx, pop(ctx));
    var n1 = node(ctx, pop(ctx));
    var v2 = n2.elts[0];
    var v1 = n1.elts[0];
    if (n1.tag !== "NUM" || n2.tag !== "NUM") {
      push(ctx, {tag: "POW", elts: [n1, n2]});
    } else {
      number(ctx, Math.pow(+v1, +v2));
    }
  }

  function concat(ctx) {
    var n1 = node(ctx, pop(ctx));
    push(ctx, {
      tag: "CONCAT",
      elts: [n1]
    });
  }

  function orelse(ctx) {
    var v2 = +node(ctx, pop(ctx)).elts[0];
    var v1 = +node(ctx, pop(ctx)).elts[0];
    throw "not implemented";
  }

  function andalso(ctx) {
    var v2 = +node(ctx, pop(ctx)).elts[0];
    var v1 = +node(ctx, pop(ctx)).elts[0];
    throw "not implemented";
  }

  function eq(ctx) {
    var v2 = node(ctx, pop(ctx)).elts[0];
    var v1 = node(ctx, pop(ctx)).elts[0];
    bool(ctx, v1==v2);
  }

  function ne(ctx) {
    var v2 = +node(ctx, pop(ctx)).elts[0];
    var v1 = +node(ctx, pop(ctx)).elts[0];
    bool(ctx, v1!=v2);
  }

  function lt(ctx) {
    var v2 = +node(ctx, pop(ctx)).elts[0];
    var v1 = +node(ctx, pop(ctx)).elts[0];
    bool(ctx, v1<v2);
  }

  function gt(ctx) {
    var v2 = +node(ctx, pop(ctx)).elts[0];
    var v1 = +node(ctx, pop(ctx)).elts[0];
    bool(ctx, v1>v2);
  }

  function le(ctx) {
    var v2 = +node(ctx, pop(ctx)).elts[0];
    var v1 = +node(ctx, pop(ctx)).elts[0];
    bool(ctx, v1<=v2);
  }
  function ge(ctx) {
    var v2 = +node(ctx, pop(ctx)).elts[0];
    var v1 = +node(ctx, pop(ctx)).elts[0];
    bool(ctx, v1>=v2);
  }
  function caseExpr(ctx, n) {
    var elts = [];
    for (var i = n; i > 0; i--) {
      elts.push(pop(ctx))  // of
    }
    elts.push(pop(ctx))  // exprs
    push(ctx, {tag: "CASE", elts: elts.reverse()});
  }
  function ofClause(ctx) {
    var elts = [];
    elts.push(pop(ctx));
    elts.push(pop(ctx));
    push(ctx, {tag: "OF", elts: elts.reverse()});
  }

  function record(ctx) {
    // Ast.record
    var count = ctx.state.exprc;
    var elts = [];
    for (var i = count; i > 0; i--) {
      var elt = pop(ctx);
      if (elt !== void 0) {
        elts.push(elt);
      }
    }
    push(ctx, {
      tag: "RECORD",
      elts: elts
    });
  }

  function binding(ctx) {
    // Ast.binding
    var elts = [];
    elts.push(pop(ctx));
    elts.push(pop(ctx));
    push(ctx, {
      tag: "BINDING",
      elts: elts.reverse()
    });
  }

  function lambda(ctx, env, nid) {
    // Ast.lambda
    var names = [];
    var nids = [];
    for (var id in env.lexicon) {
      var word = env.lexicon[id];
      names.push({
        tag: "IDENT",
        elts: [word.name],
        coord: getCoord(ctx),
      });
      nids.push(word.nid || 0);
    }
    var pattern = env.pattern;
    push(ctx, {
      tag: "LAMBDA",
      elts: [{
        tag: "LIST",
        elts: names
      }, nid, {
        tag: "LIST",
        elts: pattern
      }, {
        tag: "LIST",
        elts: nids
      }]
    });
  }

  function exprs(ctx, count, inReverse) {
    // Ast.exprs
    var elts = [];
    assert(ctx.state.nodeStack.length >= count);
    if (inReverse) {
      for (var i = count; i > 0; i--) {
        var elt = pop(ctx);
        var n;
        if (false && (n = node(ctx, elt)) && n.tag === "EXPRS") {
          elts = elts.concat(n.elts);
        } else {
          elts.push(elt);  // Reverse order.
        }
      }
    } else {
      for (var i = count; i > 0; i--) {
        var elt = pop(ctx);
        var n;
        if (false && (n = node(ctx, elt)) && n.tag === "EXPRS") {
          elts = elts.concat(n.elts);
        } else {
          elts.push(elt);  // Reverse order.
        }
      }
      elts = elts.reverse();
    }
    push(ctx, {
      tag: "EXPRS",
      elts: elts
    });
  }

  function letDef(ctx) {
    // Clean up stack and produce initializer.
    pop(ctx); // body
    pop(ctx); // name
    for (var i = 0; i < ctx.state.paramc; i++) {
      pop(ctx); // params
    }
    ctx.state.exprc--; // don't count as expr.
  }

  function program(ctx) {
    var elts = [];
    elts.push(pop(ctx));
    push(ctx, {
      tag: "PROG",
      elts: elts
    });
  }
})();
