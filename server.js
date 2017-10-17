#!/usr/bin/node

// Server that listens for requests from SoX's web client and runs the
// appropriate commands

// Modules
const exec = require('child_process').exec
const express = require('/usr/lib/node_modules/express')
const bodyParser = require('/usr/lib/node_modules/body-parser')
const fs = require('fs')

// Config
// TODO: config file
const baseMusicPath = '/mnt/media/music'
const port = 3001

// Initializations
const app = express();

const server = app.listen(port, function() {
	console.log("Server listening on port "+port)
})

// Allows cross-origin requests
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
})

// Allows to serve the contents of this folder
app.use(express.static('.'))

// Allow post requests
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

// Router {{{
app.post('/music', function(req, res) {
	var path = baseMusicPath+req.body.path
	var response = new Object()

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
			var soxi = exec('soxi '+path, function(error, stdout, stderr) {
				if (error)
					console.log('exec error: ' + error)
				response.message = stdout.replace(/\n/g, '<br/>')
				res.send(JSON.stringify(response))
			})
			var kill = exec('kill `pgrep play`', function (error, stdout, stderr) {
				// There is an error if nothing is running
				if (error)
					//console.log('exec error: ' + error)
				var play = exec('play -q '+path, function(error, stdout, stderr) {
					if (error)
						console.log('exec error: ' + error)
				})
			})
		}
	})
})
// }}}
