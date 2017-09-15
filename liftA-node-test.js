naea = require('./liftA-node');

//const EventEmitter = require('events');
//const myevents = new EventEmitter();
const myevents = new (require('events'))();

// test emitter with no property value combo
let emitterTest = naea.thenA(naea.firstA(naea.node.eventEmitterA(myevents, 'fred')), (x) => console.log('done ', x));
setTimeout(() => { myevents.emit('fred', 25, 'dog') }, 3000);
let emitterCancel = emitterTest([1, 'amazing'], () => {}, naea.p);
//setTimeout(() => { p.cancel(emitterCancel) }, 1500);

const myevents2 = new (require('events'))();

// test emitter with property and value
let emitterTest2 = naea.thenA(naea.firstA(naea.node.eventPropertyEmitterA(myevents2, 'fred', 'bing', 'bang')), (x) => console.log('done ', x));
setTimeout(() => { myevents2.emit('fred', {'ding': 'dang'}) }, 2000);
setTimeout(() => { myevents2.emit('fred', {'bing': 'bang'}) }, 2900);
let emitterCancel2 = emitterTest2([1, 'real cool'], () => {}, naea.p);
//setTimeout(() => { p.cancel(emitterCancel2) }, 1500);
