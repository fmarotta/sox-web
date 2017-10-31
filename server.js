#!/usr/bin/node

// Server that listens for requests from SoX's web client and runs the
// appropriate commands

// Modules
const bodyParser = require('/usr/lib/node_modules/body-parser')
const child_process = require('child_process')
const express = require('/usr/lib/node_modules/express')
const fs = require('fs')
const http = require('http')
const ip = require('/usr/lib/node_modules/ip')
const Pty = require('/usr/lib/node_modules/node-pty')
const WebSocket = require('/usr/lib/node_modules/ws')

// Config
// TODO: config file
const baseMusicPath = '/home/fmarotta/Music/'
const serverIp = ip.address()
const serverPort = 3001

// Initializations
const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({server})
server.listen(serverPort, function() {
	console.log("Server listening on port "+serverPort)
})

var pty = null
var playLists = []

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
app.post('/myMusic', function(req, res) {
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
				// SIGTERM is not noticed by pty.on('exit'); that is, the
				// resulting signal is 0.
				process.kill(pty.pid, 'SIGTERM')
				pty = null
			}catch (e) {
				// TODO
			}

			var volumePromise = new Promise(function(resolve, reject) {
				var volume = child_process.exec('pactl list sinks | grep "Volume: front-left:" | awk \'{print ($3+$10)*100/131070}\'', function(error, stdout, stderr) {
					if (error)
						reject(Error(error))
					resolve(stdout)
				})
			})
			volumePromise.then(function(volume) {
				response.type = 'f'
				response.server = 'ws://'+serverIp+':'+serverPort
				response.volume = volume
				res.json(JSON.stringify(response))
			}).catch(function(error) {
				console.log(error)
			})
		}
	})
})

app.get('/allMyMusic', function(req, res) {
	try {
		// SIGTERM is not noticed by pty.on('exit'); that is, the
		// resulting signal is 0.
		process.kill(pty.pid, 'SIGTERM')
		pty = null
	}catch (e) {
		// TODO
	}

	var response = {songs: '', server: '', volume: ''}
	var volumePromise = new Promise(function(resolve, reject) {
		var volume = child_process.exec('pactl list sinks | grep "Volume: front-left:" | awk \'{print ($3+$10)*100/131070}\'', function(error, stdout, stderr) {
			if (error)
				reject(Error(error))
			resolve(stdout)
		})
	})
	var allMyMusicPromise = new Promise(function(resolve, reject) {
		var command = 'find '+baseMusicPath+' -name "*.mp3" | sort --random-sort'
		var allMyMusic = child_process.exec(command, function(error, stdout, stderr) {
			if (error)
				reject(Error(error))
			resolve(stdout.replace(new RegExp (baseMusicPath, 'g'), ''))
		})
	})
	Promise.all([allMyMusicPromise, volumePromise]).then(function(a) {
		response.server = 'ws://'+serverIp+':'+serverPort
		response.songs = a[0]
		response.volume = a[1]
		res.json(JSON.stringify(response))
	}).catch(function(error) {
		console.log(error)
	})
})

app.post('/volume', function(req, res) {
	var sinkvol = child_process.exec('pactl set-sink-volume @DEFAULT_SINK@ '+req.body.vol+'%', function(error, stdout, stderr) {
		if (error)
			console.log(error)
		res.json(JSON.stringify('OK'))
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
				// SIGKILL makes the pty exit with code 0 and signal 9. I use
				// this to know if the process has been stopped or not. if it
				// has, I have to clean the bars, so I send a 'Done.' through
				// the web socket. If it was killed by SIGTERM I do not send
				// anything, otherwise the message sent through the socket will
				// arrive later and overwrite the new messages of the bars.
				process.kill(pty.pid, 'SIGKILL')
			}catch (e) {}
			res.json(JSON.stringify('OK'))
			break
		case 'next':
			try {
				process.kill(pty.pid, 'SIGINT')
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

	ws.on('message', function incoming(message) {
		if (message.match('path:')) {
			var path = ''
			if (message.match('\n')) {
				path = message.replace('path:', '"'+baseMusicPath).replace(/\n/g, '" "'+baseMusicPath).replace(new RegExp(' "'+baseMusicPath+'$'), '')
			}else {
				path = '\''+baseMusicPath+message.replace('path:', '')+'\''
			}
			pty = Pty.spawn('/bin/bash', ['-c', 'play '+path], {
				name: 'dumb',
				cols: 256,
				rows: 16,
				cwd: process.cwd(),
				env: getEnv()
			})
			pty.on('data', function(data) {
				ws.send(data)
			})
			pty.on('exit', function(code, signal) {
				//console.log('code: '+code+' signal: '+signal)
				if (signal == 9)
					ws.send('Done.')
				ws.terminate()
			})
		}else {
		}
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
