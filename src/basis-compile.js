/* Copyright (c) 2021, ARTCOMPILER INC */
import {assert, message, messages, reserveCodeRange} from "./share.js";
reserveCodeRange(1000, 1999, "compile");
messages[1001] = "Node ID %1 not found in pool.";
messages[1002] = "Invalid tag in node with Node ID %1.";
messages[1003] = "No async callback provided.";
messages[1004] = "No visitor method defined for '%1'.";

class Visitor {
  constructor(nodePool) {
    this.nodePool = nodePool;
  }
  visit(nid, options, resume) {
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
    this[node.tag](node, options, resume);
  }
}

export class BasisChecker extends Visitor {
  constructor(nodePool) {
    super(nodePool);
  }
  check(code, options, resume) {
    const nid = code.root;
    this.visit(nid, options, (err, data) => {
      resume(err, data);
    });
  }
  PROG(node, options, resume) {
    console.log("BasisChecker.PROG node=" + JSON.stringify(node, null, 2));
    this.visit(node.elts[0], options, (e0, v0) => {
      const err = [];
      const val = node;
      resume(err, val);
    });
  }
  EXPRS(node, options, resume) {
    console.log("BasisChecker.EXPRS node=" + JSON.stringify(node, null, 2));
    this.visit(node.elts[0], options, (e0, v0) => {
      const err = [];
      const val = node;
      resume(err, val);
    });
  }
  NUM(node, options, resume) {
    console.log("BasisChecker.NUM node=" + JSON.stringify(node, null, 2));
    const err = [];
    const val = node;
    resume(err, val);
  }
  LAMBDA(node, options, resume) {
    this.visit(node.elts[0], options, (e0, v0) => {
      const err = [];
      const val = node;
      resume(err, val);
    });
  }
  LIST(node, options, resume) {
    this.visit(node.elts[0], options, (e0, v0) => {
      const err = [];
      const val = node;
      resume(err, val);
    });
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
  CONCAT(node, options, resume) {
    this.visit(node.elts[0], options, (e0, v0) => {
      const err = [];
      const val = node;
      resume(err, val);
    });
  }
  ADD(node, options, resume) {
    console.log("Checker.ADD() node=" + JSON.stringify(node, null, 2));
    this.visit(node.elts[0], options, function (err1, val1) {
      val1 = +val1;
      if (isNaN(val1)) {
        err1 = err1.concat(error("Argument must be a number.", node.elts[0]));
      }
      this.visit(node.elts[1], options, function (err2, val2) {
        val2 = +val2;
        if (isNaN(val2)) {
          err2 = err2.concat(error("Argument must be a number.", node.elts[1]));
        }
        resume([].concat(err1).concat(err2), val1 + val2);
      });
    });
  }
}

