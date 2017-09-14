module.exports.start = function (configuration) {
	'use strict';

	var server = (function () {
			var restify = require('restify'),
				server = restify.createServer({
					name: 'tos-thumbnail',
					version: '0.0.1'
				});
			server.use(restify.bodyParser({}));
			return server;
		}()),
		s3 = (function () {
			var aws = require('aws-sdk');
			aws.config = configuration['aws-config'];
			return new aws.S3();
		}()),
		jade = require('jade'),
		fs = require('fs'),
		uuid = require('uuid'),
		phantom = require('./lib/launchPhantom'),
		request = require('superagent')
		arw = require('./liftA-node');

	function handleError(err) {
		this.res.send(400, { message: 'thumbnail failed', userid: this.userid, mapid: this.mapid, error: err });
	}

	function reqParamsGetSpritesheet(x) {
		return { Bucket: x.second().spriteheetBucket, Key: x.first().sheet };
	}

	function extractTiles(x) {
		let tilesCapture,
			parsedTiles;
		// body from s3 is a buffer, so toString before regex
		tilesCapture = /function \(\) \{\s*return (.*);\s*\};/.exec(x.Body.toString());
		if (tilesCapture && tilesCapture.length > 1) {
			// json parse the tiles (it is a string, we need an object)
			JSONParse(tilesCapture[1]);
		}
		return { tiles: parsedTiles };
	}

  let s3getA = (reqParams) => (x, cont, p) => {
		let cancelId;
		function cb(err, data) {
			if (err) {
				x = [Error(err), x.second()];
			} else {
				x = [data, x.second()];
			}
			p.advance(cancelId);
			cont(x, p);
		}
		let req = s3.getObject(reqParams(x), cb);
		cancelId = p.add(() => req.abort());
		return cancelId;
	}

	let s3putA = (reqParams) => (x, cont, p) => {
		let cancelId;
		function cb(err, data) {
			if (err) {
				x = [Error(err), x.second()];
			} else {
				x = [data, x.second()];
			}
			p.advance(cancelId);
			cont(x, p);
		}
		let req = s3.putObject(reqParams(x), cb)
		cancelId = p.add(() => req.abort());
		return cancelId;
	}

	function reqParamsPutThumb(x) {
		let readStream = fs.createReadStream(x.first().tempHTMLFileName + '.png');
		return { Bucket: x.second().thumbnailBucket, Key: x.second().mapid + '.png', Body: readStream, ACL: 'public-read',
			CacheControl: 'no-cache' };
	}

	function getGameURL(x) {
		return x.getGameURL + x.mapid;
	}

	function renderHTML(x) {
		let rendered, tile_width, png_width, png_height;
		// generate html for the thumbnail using jade template
		if (!x.isHexMap) {
			try {
				tile_width = Math.floor(256/x.files);
				png_width = tile_width*x.files;
				png_height = tile_width*x.ranks;
				rendered = jade.renderFile(__dirname + '/views/squareMapHTML.jade', { layout:false, tile_width: tile_width, png_width: png_width,
					png_height: png_height, map: x.map, tiles: x.tiles, ranks: x.ranks, files: x.files });
			} catch (e) {
				return Error(e);
			}
		} else {
			try {
				tile_width = Math.floor(256/(x.files*1.5 + 0.25)); // width of image is half a tile wider
				png_width = tile_width*(x.files*1.5 + 0.25);
				png_height = tile_width*(x.ranks + 1)/2;
				rendered = jade.renderFile(__dirname + '/views/hexMapHTML.jade', { layout:false, tile_width: tile_width, png_width: png_width,
					png_height: png_height, map: x.map, tiles: x.tiles, ranks: x.ranks, files: x.files });
			} catch (e) {
				return Error(e);
			}
		}
		return { fileData: rendered,
			png_width: png_width,
			png_height: png_height};
	}

	function writeTempFileA(x, cont, p) {
		fs.writeFile(x.fileName, x.fileData, (err) => {
			if (err) {
				cont(Error(err), p);
			} else {
				cont(x, p);
			}
		});
	}

	function prepareHTMLWrite(x) {
		let second = x.second();
		return ([{ fileName:  second.localTempDir + uuid.v4() + '.html',
			fileData: x.first().fileData }, second])
	}

	// two pairs...second is the same in each pair
	// first of first was given the temp file name
	let HTMLResults = (x) => {
		let first = x.second().first(),
			second = x.second().second(),
			tempHTMLFileName = x.first().first().fileName;
		first.tempHTMLFileName = tempHTMLFileName;
		second.tempFiles.push(tempHTMLFileName);
		return [first, second];
	}

	// preserve the input across writeTempFileA
	let writeTempHTMLfileA = prepareHTMLWrite.liftA()
		.thenA(writeTempFileA)
		.fanA(returnA)
		.thenA(HTMLResults.liftA());

	// from the game data, convert the tiles and render the html
	// operates only on x.first()
	// when finished x.first() will contain the html (or an error)
	// x.second() has been preserved
	let extractAndRenderA = extractTiles.liftA()
		.thenA(failOrA(renderHTML.liftA()))
		.first();

	// write the rendered html
	let extractRenderWriteA =
		extractAndRenderA.thenA(failOrA(writeTempHTMLfileA));

	let preparePhantom = (x) => { return {
			htmlFileName: x.fileName,
			pngFileName: x.fileName + '.png',
			png_width: x.png_width,
			png_height: x.png_height
		};
	};

	function phantomCreatePNG(x, cont, p) {
		phantom(__dirname + '/lib/toPng.js', x.htmlFileName, x.pngFileName,
			x.png_width, x.png_height, (err, data) => {

			});
	}

	let phantomResults = (x) => {
		x.second().tempFiles.push(x.first().pngFileName);
		return x;
	}

	let createPNGA = preparePhantom.liftA().thenA(phantomCreatePNG).firstA()
		.thenA(failOrA(phantomResults.liftA()));

	function successToClient() {
		this.res.send(200, { message: 'freakin awesome dude!' });
	}

	// delete files
	function cleanupTempFiles(x) {
		var i,
			files = x.tempFiles,
			length = files.length;
		for (i = 0; i < length; i += 1) {
			if (files[i]) {
				// default error handler throws, so instead catch and log
				fs.unlink(files[i], (e) => {
					if (e) {
						console.log(e);
					}
				});
			}
		}
	}

	let gameReq = (x) => request
		.get(x.getGameURL + x.mapid)
		.set({ Accept: 'application/json'});

	function JSONParse(s) {
		let parsed;
		try {
			parsed = JSON.Parse(s)
		} catch (e) {
			console.log(e);
		}
		return parsed;
	}

	let gameResponse = (r) => { return {
			status: r.status,
			isHexMap: r.body.game.maptype === 'hex',
			ranks: r.body.game.ranks,
			files: r.body.game.files,
			sheet: r.body.game.sheet,
			map: JSONParse(r.body.game.map)
		};
	};

	// on errors, go left
	let leftOnErrorA = ((x) => x.first() instanceof Error ? Left(x) : Right(x)).liftA();

	// propagate errors to left to carry failure through
	let failOrA = ifteA.bind(undefined, leftOnError, arw.returnA);

	// finale response to client, error on left, success on right
	let respondToClientA = ifteA(leftOnError, failureToClient.liftA(), successToClient.liftA());

	// get the game data from the service
	let getGameA = superA(gameReq,
		(err, res) => Error({ error: err, status: res.status }),
		gameResponse);

	// get the spritesheet from s3
	let getSpriteSheetA = s3getA(reqParamsGetSpritesheet);
	// put the thumbnail image to s3
	let putThumbnailA = s3putA(reqParamsPutThumb);

  let doit = getGameA.thenA(failOrA(
			getSpriteSheetA.thenA(failOrA(
				extractRenderWriteA.thenA(failOrA(
					createPNGA.thenA(failOrA(
						putThumbnailA.thenA(
							respondToCientA
						)
					))
				))
			))
		))
		.thenA(cleanupTempFiles.liftA().secondA());

	server.put('/thumbnail', function (req, res) {
		doit.runA([{}, {
			res: res,
			userid: req.body.userid,
			mapid: req.body.mapid,
			spriteheetBucket: configuration['spritesheet-bucket'],
			getGameURL: configuration['get-game-url'],
			localTempDir: __dirname + '/bucket/',
			thumbnailBucket: configuration['thumbnail-bucket'],
			tempFiles: []
		}]);
	});

	//start listening to client requests
	server.listen(configuration['service-port']);
	console.log("tos-thumbnail service listening on port ", configuration['service-port']);
};
