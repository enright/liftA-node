/*
MIT License

Copyright (c) 2017 Bill Enright

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

let aea = require('liftA')();

// node.js event emitter arrow
// one-shot listen for an event
let eventEmitterArrow = (emitter, name) => (x, cont, p) => {
	let cancelId,
		listener = (e) => {
			console.log('event: ', name, ' payload: ', e);
			p.advance(cancelId);
			cont(e, p);
		};
	cancelId = p.add(() => emitter.removeListener(name, listener));
	emitter.once(name, listener);
	return cancelId;
}

// keep listening until an event that contains property value occurs
// assumes payload is an object
let eventPropertyEmitterArrow = (emitter, name, property, value) => (x, cont, p) => {
	let cancelId,
		listener = (e) => {
			console.log('event: ', name, ' payload: ', e);
			if (e[property] === value) {
				p.advance(cancelId);
				emitter.removeListener(name, listener);
				cont(e, p);
			}
		};
	cancelId = p.add(() => emitter.removeListener(name, listener));
	emitter.addListener(name, listener);
	return cancelId;
}
aea.node = {
	eventEmitterArrow: eventEmitterArrow,
	eventPropertyEmitterArrow: eventPropertyEmitterArrow
};

module.exports = aea;
