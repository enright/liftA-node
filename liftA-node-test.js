aea = require('lifta')();
naea = require('./liftA-node');

//const EventEmitter = require('events');
//const myevents = new EventEmitter();
const myevents = new (require('events'))();

// a utility function that takes a label and
// creates an arrow that logs x to the console
// and continues with x
let consoleLogXA = (label) => ((x) => {
  console.log(label, x);
  return x;
}).liftA();

// this arrow, when run, will wait for the event 'fred' to be fired
// it will then log the event to the console
// note that it operates on the first of a pair
// this is all construction...the arrow is not running yet
let emitterTest = naea.eventEmitterA(myevents, 'fred')
  .thenA(consoleLogXA('emit fred:'))
  .firstA();

// in three seconds, emit the fred event
setTimeout(() => { myevents.emit('fred', 25, 'dog'); }, 3000);

// run the fred emitter arrow with a pair [1, 'amazing']
// the arrow only operates on the first of the pair
// when the arrow completes, we will see that the second of the pair is preserved
let emitterCancel = emitterTest([1, 'amazing'], (x) => {
  console.log('fred event arrow completed x: ', x);
}, aea.p);

const myevents2 = new (require('events'))();

// test emitter with property and value
let emitterTest2 = naea.eventPropertyEmitterA(myevents2, 'frodo', 'bing', 'bang')
  .thenA(consoleLogXA('emitted frodo'))
  .firstA();

// the first event will be ignored (we are not looking for 'ding')
// the second event will be ignored (we are not looking for a value of 'dang')
// the third event will progress the arrow
setTimeout(() => { myevents2.emit('frodo', {'ding': 'dang'}); }, 2000);
setTimeout(() => { myevents2.emit('frodo', {'bing': 'dang'}); }, 2500);
setTimeout(() => { myevents2.emit('frodo', {'bing': 'bang'}); }, 2900);
let test2p = aea.P();
emitterTest2([1, 'real cool'], (x) => {
  console.log('frodo-bing-bang event arrow completed x: ', x);
}, test2p);
//setTimeout(() => test2p.cancelAll(), 1500);

const myevents3 = new (require('events'))();

// repeat with an emitter - it keeps going...
let emitterTest3 = naea.eventPropertyEmitterA(myevents3, 'ferris', 'knick', 'knack')
  .thenA(consoleLogXA('ferris'))
  .firstA()
  .thenA(aea.justRepeatA)
  .repeatA();

setTimeout(() => { myevents3.emit('ferris', {'ding': 'dang'}); }, 2000);
setTimeout(() => { myevents3.emit('ferris', {'knick': 'knack'}); }, 4000);
setTimeout(() => { myevents3.emit('ferris', {'knick': 'bang'}); }, 5000);
setTimeout(() => { myevents3.emit('ferris', {'knick': 'knack'}); }, 6000);
setTimeout(() => { myevents3.emit('ferris', {'knick': 'knack'}); }, 8500);
setTimeout(() => { myevents3.emit('ferris', {'knick': 'knack'}); }, 9000);
let test3p = aea.P();
emitterTest3([1, 'real cool'], () => {}, test3p);
setTimeout(() => {
  console.log('cancel the knick-knack arrow');
  test3p.cancelAll();
}, 8000);

const eventATestEvents = new (require('events'))();
let eventATest =
  aea.constA(['fred', eventATestEvents])
  .thenA(naea.eventA)
  .thenA(consoleLogXA('emit fred:'))
  .runA();
eventATestEvents.emit('dave', { 'one': 1 });
eventATestEvents.emit('fred', [3, 4, 5]);

let eventValueATest =
  aea.constA([{ name: 'dave', property: 'buster', value: 3 }, eventATestEvents])
  .thenA(naea.eventValueA)
  .thenA(consoleLogXA('emit fred:'))
  .runA();
eventATestEvents.emit('dave', { 'buster': 1 });
eventATestEvents.emit('dave', { 'bluster': 3 });
eventATestEvents.emit('dave', { 'buster': 3 });
