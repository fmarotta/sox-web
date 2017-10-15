#!/usr/bin/node

// Server that listens for requests from SoX's web client and runs the
// appropriate commands

// Modules
const exec = require('child_process').exec;
const express = require('/usr/lib/node_modules/express')
const fs = require('fs')

// Config
// TODO: config file
const basePath = '/mnt/media/music'
const port = 3001

// Initializations
const app = express();

const server = app.listen(port, function() {
	console.log("Server listening on port "+port)
})

app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
})

// Router {{{
app.get('/*', function(req, res) {
	var path = basePath+req.url
	var response = new Object

	fs.lstat(path, function(err, stats) {
		if (err)
			return console.log(err)

		if (stats.isDirectory()) {
			fs.readdir(path, function(err, files) {
				response.type = 'd'
				response.body = JSON.stringify(files)
				res.json(JSON.stringify(response))
			})
		}else if (stats.isFile()) {
			response.type = 'f'
			response.body = 'Now playing '+path
			var child = exec('play -q '+path, function(error, stdout, stderr) {
				if (error)
					console.log('exec error: ' + error)
			})
			//console.log(child)
			res.send(JSON.stringify(response))
		}
	})
})
// }}}
