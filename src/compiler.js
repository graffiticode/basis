/* Copyright (c) 2021, ARTCOMPILER INC */
import {assert, message, messages, reserveCodeRange} from "./share.js";
reserveCodeRange(1000, 1999, "compile");
messages[1001] = "Node ID %1 not found in pool.";
messages[1002] = "Invalid tag in node with Node ID %1.";
messages[1003] = "No async callback provided.";
messages[1004] = "No visitor method defined for '%1'.";

function error(msg, arg) {
  return msg + arg;
}

function newNode(tag, elts) {
  return {
    tag: tag,
    elts: elts,
  };
}

const ASYNC = true;

class Visitor {
  constructor(code) {
    this.nodePool = code;
    this.root = code.root;
  }
  visit(nid, options, resume) {
    try {
      assert(nid);
      let node;
      if (typeof nid === "object") {
        node = nid;
      } else {
        node = this.nodePool[nid];
      }
      assert(node && node.tag && node.elts, "2000: Visitor.visit() tag=" + node.tag + " elts= " + JSON.stringify(node.elts));
      assert(this[node.tag], "2000: Visitor function not defined for: " + node.tag);
      assert(typeof resume === "function", message(1003));
      if (!options.SYNC && ASYNC) {
        // This is used to keep from blowing the call stack.
        setTimeout(() => this[node.tag](node, options, resume), 0);
      } else {
        this[node.tag](node, options, resume);
      }
    } catch (x) {
      resume(error(x.stack));
    }
  }
  node(nid) {
    var n = this.nodePool[nid];
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
        elts[i] = this.node(n.elts[i]);
      }
      break;
    }
    return {
      tag: n.tag,
      elts: elts,
    };
  }
}

export class Checker extends Visitor {
  constructor(nodePool) {
    super(nodePool);
  }
  check(options, resume) {
    const nid = this.root;
    this.visit(nid, options, (err, data) => {
      resume(err, data);
    });
  }
  PROG(node, options, resume) {
    this.visit(node.elts[0], options, (e0, v0) => {
      const err = [];
      const val = node;
      resume(err, val);
    });
  }
  EXPRS(node, options, resume) {
    let err = [];
    let val = [];
    for (let elt of node.elts) {
      this.visit(elt, options, (e0, v0) => {
        err = err.concat(e0);
        val = val.concat(v0);
        if (val.length === node.elts.length) {
          resume(err, val);
        }
      });
    }
    if (node.elts.length === 0) {
      resume(err, val);
    }
  }
  NUM(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  LAMBDA(node, options, resume) {
    const err = [];
    const val = node;
    this.visit(node.elts[0], options, (e0, v0) => {
      resume(err, val);
    });
  }
  LIST(node, options, resume) {
    const err = [];
    const val = node;
    if (node.elts.length === 0) {
      resume(err, val);
    } else {
      this.visit(node.elts[0], options, (e0, v0) => {
        resume(err, val);
      });
    }
  }
  IDENT(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  STR(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  JSON(node, options, resume) {
    this.visit(node.elts[0], options, (e0, v0) => {
      assert(v0.tag === "STR", JSON.stringify(v0, null, 2));
      const err = [];
      const val = node;
      resume(err, val);
    });
  }
  CONCAT(node, options, resume) {
    this.visit(node.elts[0], options, (e0, v0) => {
      const err = [];
      const val = node;
      resume(err, val);
    });
  }
  ADD(node, options, resume) {
    this.visit(node.elts[0], options, (err1, val1) => {
      this.visit(node.elts[1], options, (err2, val2) => {
        if (isNaN(+val1)) {
          err1 = err1.concat(error("Argument must be a number.", node.elts[0]));
        }
        if (isNaN(+val2)) {
          err2 = err2.concat(error("Argument must be a number.", node.elts[1]));
        }
        const err = [].concat(err1).concat(err2);
        const val = node;
        resume(err, val);
      });
    });
  }
  BOOL(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  NULL(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  RECORD(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  BINDING(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  MUL(node, options, resume) {
    this.visit(node.elts[0], options, (err1, val1) => {
      this.visit(node.elts[1], options, (err2, val2) => {
        if (isNaN(+val1)) {
          err1 = err1.concat(error("Argument must be a number.", node.elts[0]));
        }
        if (isNaN(+val2)) {
          err2 = err2.concat(error("Argument must be a number.", node.elts[1]));
        }
        const err = [].concat(err1).concat(err2);
        const val = node;
        resume(err, val);
      });
    });
  }
  POW(node, options, resume) {
    this.visit(node.elts[0], options, (err1, val1) => {
      this.visit(node.elts[1], options, (err2, val2) => {
        if (isNaN(+val1)) {
          err1 = err1.concat(error("Argument must be a number.", node.elts[0]));
        }
        if (isNaN(+val2)) {
          err2 = err2.concat(error("Argument must be a number.", node.elts[1]));
        }
        const err = [].concat(err1).concat(err2);
        const val = node;
        resume(err, val);
      });
    });
  }
  VAL(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  KEY(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  LEN(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  ARG(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  DATA(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  PAREN(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  APPLY(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  MAP(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  STYLE(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  CASE(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  OF(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
}

function enterEnv(ctx, name, paramc) {
  if (!ctx.env) {
    ctx.env = [];
  }
  // recursion guard
  if (ctx.env.length > 380) {
    //return;  // just stop recursing
    throw new Error("runaway recursion");
  }
  ctx.env.push({
    name: name,
    paramc: paramc,
    lexicon: {},
    pattern: [],
  });
}
function exitEnv(ctx) {
  ctx.env.pop();
}
function findWord(ctx, lexeme) {
  let env = ctx.env;
  if (!env) {
    return null;
  }
  for (var i = env.length-1; i >= 0; i--) {
    var word = env[i].lexicon[lexeme];
    if (word) {
      return word;
    }
  }
  return null;
}
function addWord(ctx, lexeme, entry) {
  topEnv(ctx).lexicon[lexeme] = entry;
  return null;
}
function topEnv(ctx) {
  return ctx.env[ctx.env.length-1]
}
export class Transformer extends Visitor {
  constructor(nodePool) {
    super(nodePool);
    this.patternNodePool = ['unused'];
    this.patternNodeMap = {};
  }
  transform(options, resume) {
    const nid = this.root;
    this.visit(nid, options, (err, data) => {
      resume(err, data);
    });
  }
  internPattern(n) {
    if (!n) {
      return 0;
    }
    const nodeMap = this.patternNodeMap;
    const nodePool = this.patternNodePool;
    const tag = n.tag;
    const elts_nids = [];
    const count = n.elts.length;
    let elts = "";
    for (let i = 0; i < count; i++) {
      if (typeof n.elts[i] === "object") {
        n.elts[i] = this.internPattern(n.elts[i]);
      }
      elts += n.elts[i];
    }
    const key = tag+count+elts;
    let nid = nodeMap[key];
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
  match(options, patterns, node) {
    if (patterns.size === 0 || node === undefined) {
      return false;
    }
    let matches = patterns.filter((pattern) => {
      if (pattern.tag === undefined || node.tag === undefined) {
        return false;
      }
      const patternNid = this.internPattern(pattern); 
      if (patternNid === this.internPattern(node) ||
          patternNid === this.internPattern(newNode('IDENT', ['_']))) {
        return true;
      }
      if (pattern.tag === node.tag) {
        if (pattern.elts.length === node.elts.length) {
          // Same number of args, so see if each matches.
          return pattern.elts.every((arg, i) => {
            if (pattern.tag === 'VAR') {
              if (arg === node.elts[i]) {
                return true;
              }
              return false;
            }
            let result = this.match(options, [arg], node.elts[i]);
            return result.length === 1;
          });
        } else if (pattern.elts.length < node.elts.length) {
          // Different number of args, then see if there is a wildcard match.
          let nargs = node.elts.slice(1);
          if (pattern.elts.length === 2) {
            // Binary node pattern
            let result = (
              this.match(options, [pattern.elts[0]], node.elts[0]).length > 0 &&
              this.match(options, [pattern.elts[1]], newNode(node.tag, nargs)).length > 0
              // Match rest of the node against the second pattern argument.
            );
            return result;
          }
        }
      }
      return false;
    });
    // if (true || matches.length > 0) {
    //   console.log("match() node: " + JSON.stringify(node, null, 2));
    //   console.log("match() matches: " + JSON.stringify(matches, null, 2));
    // }
    return matches;
  }


  PROG(node, options, resume) {
    if (!options) {
      options = {};
    }
    this.visit(node.elts[0], options, (e0, v0) => {
      const err = e0;
      const val = v0.pop();  // Return the value of the last expression.
      resume(err, val);
    });
  }
  EXPRS(node, options, resume) {
    let err = [];
    let val = [];
    for (let elt of node.elts) {
      this.visit(elt, options, (e0, v0) => {
        err = err.concat(e0);
        val.push(v0);
        if (val.length === node.elts.length) {
          resume(err, val);
        }
      });
    }
    if (node.elts.length === 0) {
      val.push("");
      resume(err, val);
    }
  }
  NUM(node, options, resume) {
    const err = [];
    const val = +node.elts[0];
    resume(err, val);
  }
  LAMBDA(node, options, resume) {
    // Return a function value.
    this.visit(node.elts[0], options, (err0, params) => {
      let args = [].concat(options.args);
      enterEnv(options, "lambda", params.length);
      params.forEach((param, i) => {
        // let inits = this.nodePool[node.elts[3]].elts;
        if (args[i]) {
          // Got an arg so use it.
          addWord(options, param, {
            name: param,
            val: args[i],
          });
        // } else {
        //   // Don't got an arg so use the init.
        //   this.visit(inits[i], options, (err, val) => {
        //     addWord(options, param, {
        //       name: param,
        //       val: val,
        //     });
        //   });
        }
      });
      this.visit(node.elts[1], options, (err, val) => {
        exitEnv(options);
        resume([].concat(err0).concat(err).concat(err), val)
      });
    });
  }
  LIST(node, options, resume) {
    let err = [];
    if (node.elts.length === 0) {
      resume(err, []);
    } else {
      let len = 0;
      const ndx = [];
      for (let elt of node.elts) {
        this.visit(elt, options, (e0, v0) => {
          err = err.concat(e0);
          ndx[elt] = v0;
          if (++len === node.elts.length) {
            // This is a little trickery to restore the original order of the
            // elements, given that they may have been reordered due to the
            // nodes being visited asynchronously. The node ids are reversed,
            // so we need to add prepend the current v0 to the list.
            const val = ndx.reduce((acc, v0) => [v0, ...acc], []);
            resume(err, val);
          }
        });
      }
    }
  }
  IDENT(node, options, resume) {
    let word = findWord(options, node.elts[0]);
    const err = [];
    const val = word && word.val || node.elts[0];
    resume(err, val);
  }
  STR(node, options, resume) {
    const err = [];
    const val = node.elts[0];
    resume(err, val);
  }
  JSON(node, options, resume) {
    this.visit(node.elts[0], options, (e0, v0) => {
      const err = [];
      const val = JSON.parse(v0);
      resume(err, val);
    });
  }
  CONCAT(node, options, resume) {
    this.visit(node.elts[0], options, (e0, v0) => {
      const err = [];
      const val = ([].concat(v0)).join('');
      resume(err, val);
    });
  }
  ADD(node, options, resume) {
    this.visit(node.elts[0], options, (e0, v0) => {
      this.visit(node.elts[1], options, (e1, v1) => {
        const err = [].concat(e0).concat(e1);
        const val = +v0 + +v1;
        resume(err, val);
      });
    });
  }
  BOOL(node, options, resume) {
    const err = [];
    const val = node.elts[0];
    resume(err, val);
  }
  NULL(node, options, resume) {
    const err = [];
    const val = null;
    resume(err, val);
  }
  BINDING(node, options, resume) {
    const err = [];
    const val = node;
    this.visit(node.elts[0], options, (err1, val1) => {
      this.visit(node.elts[1], options, (err2, val2) => {
        resume([].concat(err1).concat(err2), {key: val1, val: val2});
      });
    });
  }
  RECORD(node, options, resume) {
    let err = [];
    if (node.elts.length === 0) {
      resume(err, {});
    } else {
      let len = 0;
      const ndx = [];
      for (let elt of node.elts) {
        this.visit(elt, options, (e0, v0) => {
          err = err.concat(e0);
          ndx[elt] = v0;
          if (++len === node.elts.length) {
            // This is a little trickery to restore the original order of the
            // fields, given that they may have been reordered due to the nodes
            // being visited asynchronously.
            const val = ndx.reduce((acc, v0) => ({...acc, [v0.key]: v0.val}), {});
            resume(err, val);
          }
        });
      }
    }
  }
  MUL(node, options, resume) {
    this.visit(node.elts[0], options, (err1, val1) => {
      this.visit(node.elts[1], options, (err2, val2) => {
        if (isNaN(+val1)) {
          err1 = err1.concat(error("Argument must be a number.", node.elts[0]));
        }
        if (isNaN(+val2)) {
          err2 = err2.concat(error("Argument must be a number.", node.elts[1]));
        }
        const err = [].concat(err1).concat(err2);
        const val = +val1 * +val2;
        resume(err, val);
      });
    });
  }
  POW(node, options, resume) {
    this.visit(node.elts[0], options, (err1, val1) => {
      this.visit(node.elts[1], options, (err2, val2) => {
        if (isNaN(+val1)) {
          err1 = err1.concat(error("Argument must be a number.", node.elts[0]));
        }
        if (isNaN(+val2)) {
          err2 = err2.concat(error("Argument must be a number.", node.elts[1]));
        }
        const err = [].concat(err1).concat(err2);
        const val = node;
        resume(err, val);
      });
    });
  }
  VAL(node, options, resume) {
    this.visit(node.elts[0], options, (e0, v0) => {
      this.visit(node.elts[1], options, (e1, v1) => {
        const err = [].concat(e0).concat(e1);
        const val = v1[v0];
        resume(err, val);
      });
    });
  }
  KEY(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  LEN(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  ARG(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  DATA(node, options, resume) {
    this.visit(node.elts[0], options, (e0, v0) => {
      const data = options.data || {};
      const err = e0;
      const val = v0;
      resume(err, {
        ...val,
        ...data,  // External data overrides internal data.
      });
    });
  }
  PAREN(node, options, resume) {
    this.visit(node.elts[0], options, (e0, v0) => {
      const err = [].concat(e0);
      const val = v0;
      resume(err, val);
    });
  }
  APPLY(node, options, resume) {
    // Apply a function to arguments.
    this.visit(node.elts[1], options, (e1, v1) => {
      options.args = v1;
      this.visit(node.elts[0], options, (e0, v0) => {
        //exitEnv(options);
        const err = [].concat(e1).concat(e0);
        const val = v0;
        resume(err, val);
      });
    });
  }
  MAP(node, options, resume) {
    this.visit(node.elts[1], options, (e1, v1) => {
      let err = [];
      let val = [];
      v1.forEach(args => {
        options.args = args;
        options = JSON.parse(JSON.stringify(options));  // Copy option arg support async.
        this.visit(node.elts[0], options, (e0, v0) => {
          val.push(v0);
          err = err.concat(e0);
          if (val.length === v1.length) {
            resume(err, val);
          }
        });
      });
    });
  }
  STYLE(node, options, resume) {
    const err = [];
    const val = node;
    resume(err, val);
  }
  CASE(node, options, resume) {
    // FIXME this isn't ASYNC compatible
    options.SYNC = true;
    this.visit(node.elts[0], options, (err, e0) => {
      const e0Node = this.node(node.elts[0]);
      const expr = (e0Node.tag === 'NUM' || e0Node.tag === 'NUM') && e0Node || {tag: 'STR', elts: [`${e0}`]};
      let foundMatch = false;
      const patterns = [];
      for (var i = 1; i < node.elts.length; i++) {
        this.visit(node.elts[i], options, (err, val) => {
          if (this.match(options, [this.node(node.elts[i]).elts[0]], expr).length) {
            this.visit(val.exprElt, options, resume);
            foundMatch = true;
          }
        });
        if (foundMatch) {
          return;
        }
      }
      if (!foundMatch) {
        resume([], {})
      }
    });
    options.SYNC = false;
  }
  OF(node, options, resume) {
    this.visit(node.elts[0], options, (err0, pattern) => {
      resume([].concat(err0), {
        pattern: pattern,
        exprElt: node.elts[1],
      });
    });
  }
}

export class Renderer {
  constructor(data) {
    this.data = data;
  }
  render(options, resume) {
    // Do some rendering here.
    const err = [];
    const val = this.data;
    resume(err, val);
  }
}

export class Compiler {
  constructor(config) {
    this.langID = config.langID;
    this.version = config.version;
    this.Checker = config.Checker || Checker;
    this.Transformer = config.Transformer || Transformer;
    this.Renderer = config.Renderer || Renderer;
  }
  compile(code, data, config, resume) {
    // Compiler takes an AST in the form of a node pool (code) and transforms it
    // into an object to be rendered on the client by the viewer for this
    // language.
    try {
      let options = {
        data: data,
        config: config,
        result: '',
      };
      const checker = new this.Checker(code);
      checker.check(options, (err, val) => {
        const transformer = new this.Transformer(code);
        transformer.transform(options, (err, val) => {
          if (err && err.length) {
            resume(err, val);
          } else {
            const renderer = new this.Renderer(val);
            renderer.render(options, (err, val) => {
              resume(err, val);
            });
          }
        });
      });
    } catch (x) {
      console.log("ERROR with code");
      console.log(x.stack);
      resume([{
        statusCode: 500,
        error: "Compiler error"
      }]);
    }
  }
}
