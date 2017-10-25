#!/usr/bin/node

// Server that listens for requests from SoX's web client and runs the
// appropriate commands

// Modules
const bodyParser = require('/usr/lib/node_modules/body-parser')
const child_process = require('child_process')
const express = require('/usr/lib/node_modules/express')
const fs = require('fs')
const http = require('http')
const Pty = require('/usr/lib/node_modules/node-pty')
const WebSocket = require('/usr/lib/node_modules/ws')

// Config
// TODO: config file
const baseMusicPath = '/home/fmarotta/Music'
const port = 3001

// Initializations
const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({server})
server.listen(port, function() {
	console.log("Server listening on port "+port)
})

// global variable for the pseudoterminal
var pty = null

// Allows cross-origin requests
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
})

// Allows to serve the contents of this directory
app.use(express.static(__dirname))

// Allow post requests
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

// Router {{{
app.post('/music', function(req, res) {
	var path = baseMusicPath+req.body.path
	var response = {type: '', songs: '', message: '', volume: ''}

	fs.lstat(path, function(err, stats) {
		if (err)
			return console.log(err)

		if (stats.isDirectory()) {
			fs.readdir(path, function(err, files) {
				response.type = 'd'
				response.songs = files
				res.json(JSON.stringify(response))
			})
		}else if (stats.isFile()) {
			try {
				process.kill(pty.pid, 'SIGINT')
				pty = null
			}catch (e) {
			}

			var soxiPromise = new Promise(function(resolve, reject) {
				var soxi = child_process.exec('soxi \''+path+'\'', function(error, stdout, stderr) {
					if (error)
						reject(Error(error))
					resolve(stdout.replace(/\n/g, '<br/>'))
				})
			})
			var volumePromise = new Promise(function(resolve, reject) {
				var volume = child_process.exec('pactl list sinks | grep "Volume: front-left:" | awk \'{print ($3+$10)*100/131070}\'', function(error, stdout, stderr) {
					if (error)
						reject(Error(error))
					resolve(stdout)
				})
			})
			Promise.all([soxiPromise, volumePromise]).then(function(results) {
				response.type = 'f'
				response.port = port
				response.message = results[0]
				response.volume = results[1]
				res.json(JSON.stringify(response))
			})
		}
	})
})

app.post('/volume', function(req, res) {
	var sinkvol = child_process.exec('pactl set-sink-volume @DEFAULT_SINK@ '+req.body.vol+'%', function(error, stdout, stderr) {
		if (error)
			console.log(error)
	})
})

app.post('/actions', function(req, res) {
	var action = req.body.action
	
	switch (action) {
		case 'pause':
			try {
				process.kill(pty.pid, 'SIGSTOP')
			}catch (e) {}
			res.json(JSON.stringify('OK'))
			break
		case 'play':
			try {
				process.kill(pty.pid, 'SIGCONT')
			}catch (e) {}
			res.json(JSON.stringify('OK'))
			break
		case 'stop':
			try {
				process.kill(pty.pid, 'SIGTERM')
			}catch (e) {}
			res.json(JSON.stringify('OK'))
			break
		default:
			res.json(JSON.stringify('I did not understand'))
			console.log('did not understand action')
	}
})
// }}}

// Web Socket {{{
wss.on('connection', function connection(ws, req) {
	//console.log(req.url)

	ws.on('message', function incoming(relPath) {
		var path = baseMusicPath+relPath
		pty = Pty.spawn('/bin/bash', ['-c', 'play \''+path+'\''], {
			name: 'dumb',
			cols: 256,
			rows: 16,
			cwd: process.cwd(),
			env: getEnv()
		})
		pty.on('data', function(data) {
			if (data.match(/In:[0-9]*\.[0-9]*/))
				ws.send(data.replace(/ /g, '&nbsp;'))
		})
		pty.on('close', function() {
			ws.send('Done.')
			ws.terminate()
		})
	})
})
// }}}

// functions {{{
function getEnv() {
    // Adapted from the source code of the module pty.js
    var env = {}

    Object.keys(process.env).forEach(function (key) {
      env[key] = process.env[key]
    })

    // Make sure we didn't start our
    // server from inside tmux.
    delete env.TMUX
    delete env.TMUX_PANE

    // Make sure we didn't start
    // our server from inside screen.
    // http://web.mit.edu/gnu/doc/html/screen_20.html
    delete env.STY
    delete env.WINDOW

    // Delete some variables that
    // might confuse our terminal.
    delete env.WINDOWID
    delete env.TERMCAP
    delete env.COLUMNS
    delete env.LINES

    // Set $TERM to screen. This disables multiplexers
    // that have login hooks, such as byobu.
    env.TERM = "screen"

    // Set the home directory.
    env.HOME = '/home/fmarotta/'

    return env
}
// }}}
