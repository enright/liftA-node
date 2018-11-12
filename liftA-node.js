/*
MIT License

Copyright (c) 2017-2018 Bill Enright

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

let freeze = Object.freeze;

// x is { emitter, name }
// continues with e
// node.js event emitter arrow
// one-shot listen for an event
let eventEmitterA = (x, cont, p) => {
  let cancelId,
    listener = (e) => {
      p.advance(cancelId);
      cont(freeze(e), p);
    };
  cancelId = p.add(() => x.emitter.removeListener(x.name, listener));
  x.emitter.once(x.name, listener);
};

// x is { emitter, name, property, value }
// continues with e
// keep listening until an event that contains property value occurs
let eventPropertyEmitterA = (x, cont, p) => {
  let cancelId,
    listener,
    remove = () => {
      x.emitter.removeListener(x.name, listener);
    };
  listener = (e) => {
    if (e[x.property] === x.value) {
      p.advance(cancelId);
      remove();
      cont(freeze(e), p);
    }
  };
  cancelId = p.add(remove);
  x.emitter.addListener(x.name, listener);
};

// tuple-aware, first contains name, second contains emitter
// continue with [e, second]
let eventA = (x, cont, p) => {
  let cancelId,
    name = x.first.name,
    emitter = x.second.emitter,
    listener = (e) => {
      p.advance(cancelId);
      cont(freeze([freeze(e), x.second]), p);
    };
  cancelId = p.add(() => emitter.removeListener(name, listener));
  emitter.once(name, listener);
};

// tuple aware, first contains name, property and value, second contains emitter
// continue with [e, second]
let eventPropertyA = (x, cont, p) => {
  let cancelId, {
      name,
      property,
      value
    } = x.first,
    emitter = x.second.emitter,
    listener,
    remove = () => {
      emitter.removeListener(name, listener);
    };
  listener = (e) => {
    if (e[property] === value) {
      p.advance(cancelId);
      remove();
      cont(freeze([freeze(e), x.second]), p);
    }
  };
  cancelId = p.add(remove);
  emitter.addListener(name, listener);
};

module.exports = {
  eventEmitterA: eventEmitterA,
  eventPropertyEmitterA: eventPropertyEmitterA,
  eventA: eventA,
  eventPropertyA: eventPropertyA
};