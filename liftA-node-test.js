/* globals require,describe,it,setTimeout,clearTimeout */
"use strict"; // enables proper tail calls (PTC) in Node 6 harmony

// mocha tests
const lifta = require('lifta-syntax');
const expect = require('chai').expect;
const lolex = require('lolex');
const myevents = require('events');

const liftaNode = require('./liftA-node');
let freeze = Object.freeze;

describe('eventEmitterA', () => {
  it('continues with an event value', (done) => {
    const emitter = new myevents();
    const name = 'fred';
    liftaNode.eventEmitterA(freeze({
      emitter,
      name
    }), (e) => {
      expect(e).equal(25);
      done();
    }, lifta.P());
    setTimeout(() => {
      emitter.emit('fred', 25, 'dog');
    }, 0);
  });
  it('continues with a frozen event if event is an object', (done) => {
    const emitter = new myevents();
    const name = 'fred';
    liftaNode.eventEmitterA(freeze({
      emitter,
      name
    }), (e) => {
      expect(e).is.frozen;
      expect(e.value).equal(25);
      done();
    }, lifta.P());
    setTimeout(() => {
      emitter.emit('fred', {
        value: 25,
        somethingElse: 'something'
      });
    }, 0);
  });
});

describe('eventPropertyEmitterA', () => {
  it('continues with an event containing a specific property value', (done) => {
    const emitter = new myevents();
    const name = 'fred';
    const property = 'a property';
    const value = 'this value';
    const x = {
      emitter,
      name,
      property,
      value
    };
    let clock = lolex.install();

    liftaNode.eventPropertyEmitterA(freeze(x), (x) => {
      expect(x).is.frozen;
      expect(x[property]).equal(value);
      clock.uninstall();
      done();
    }, lifta.P());
    setTimeout(() => {
      // emit an unmatching property value
      emitter.emit('fred', {
        [property]: 34
      });
    }, 1);
    setTimeout(() => {
      // emit an object which doesn't have the property
      emitter.emit('fred', {
        dontcare: 67
      });
    }, 2);
    setTimeout(() => {
      // emit the matching property value
      emitter.emit('fred', {
        [property]: value
      });
    }, 3);
    clock.runAll();
  });
});

describe('eventA', () => {
  it('continues with an event', (done) => {
    const name = 'fred';
    const emitter = new myevents();
    const first = freeze({
      name
    });
    const second = freeze({
      emitter
    });
    const x = freeze([first, second]);
    liftaNode.eventA(x, (x) => {
      expect(x.first).equal(25);
      expect(x.second).equal(second);
      done();
    }, lifta.P());
    setTimeout(() => {
      emitter.emit('fred', 25, 'dog');
    }, 0);
  });
  it('continues with a frozen event if event is an object', (done) => {
    const name = 'fred';
    const emitter = new myevents();
    const first = freeze({
      name
    });
    const second = freeze({
      emitter
    });
    const x = freeze([first, second]);
    liftaNode.eventA(x, (x) => {
      expect(x).is.frozen;
      expect(x.first).is.frozen;
      expect(x.first.value).equal(25);
      expect(x.second).equal(second);
      done();
    }, lifta.P());
    setTimeout(() => {
      emitter.emit('fred', {
        value: 25,
        somethingElse: 'hmmm'
      });
    }, 0);
  });
});

describe('eventPropertyA', () => {
  it('continues with an event containing a specific property value', (done) => {
    const name = 'fred';
    const property = 'a property';
    const value = 'this value';
    const emitter = new myevents();
    const first = freeze({
      name,
      property,
      value
    });
    const second = freeze({
      emitter
    });
    const x = freeze([first, second]);
    let clock = lolex.install();

    liftaNode.eventPropertyA(x, (x) => {
      expect(x).is.frozen;
      expect(x.first).is.frozen;
      expect(x.first[property]).equal(value);
      expect(x.second).equal(second);
      clock.uninstall();
      done();
    }, lifta.P());
    setTimeout(() => {
      // emit an unmatching property value
      emitter.emit('fred', {
        [property]: 34
      });
    }, 1);
    setTimeout(() => {
      // emit an object which doesn't have the property
      emitter.emit('fred', {
        dontcare: 67
      });
    }, 2);
    setTimeout(() => {
      // emit the matching property value
      emitter.emit('fred', {
        [property]: value
      });
    }, 3);
    clock.runAll();
  });
});