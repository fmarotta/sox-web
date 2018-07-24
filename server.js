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
const winston = require('../node_modules/winston')

// Config
// TODO: config file
const logFile = '/home/fmarotta/sox-web/log/server.log'
const baseMusicPath = '/mnt/media/music/'
const serverIp = ip.address()
const serverPort = 3001

// Logging
const logger = winston.createLogger({
    exitOnError: true,
    transports: [
        new winston.transports.File({
            filename: logFile,
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        }),
        new winston.transports.Console({
            level: 'debug',
            format: winston.format.simple()
        })
    ]
})

// Initializations
const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({server})
server.listen(serverPort, function() {
	//logger.info("Server listening on port "+serverPort)
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
app.post('/myMusicDir', function(req, res) {
	var path = baseMusicPath+req.body.path+'/'

	getDirContents(path).then((contents) => {
		res.json(JSON.stringify(contents))
	}).catch((error) => {
		logger.info(error)
	})
})

app.get('/radios', function(req, res) {
	var contents = []

	contents[0] = new Object
	contents[0].stationName = 'BBC World Service'
	contents[0].stationUrl = 'http://bbcwssc.ic.llnwd.net/stream/bbcwssc_mp1_ws-einws'
	contents[1] = new Object
	contents[1].stationName = 'Star Talk'
	contents[1].stationUrl = 'http://tunein.streamguys1.com/StarTalkRadio?aw_0_1st.playerid=RadioTime&aw_0_1st.skey=1512841995'
	contents[2] = new Object
	contents[2].stationName = 'Rai Radio 1'
	contents[2].stationUrl = 'http://icestreaming.rai.it/1.mp3'

	res.json(JSON.stringify(contents))
})

app.get('/serverInfo', function(req, res) {
	var server = 'ws://'+serverIp+':'+serverPort
	res.json(JSON.stringify(server))
})

app.post('/allMyMusic', function(req, res) {
	var allMyMusicPromise = new Promise(function(resolve, reject) {
		var path = baseMusicPath+req.body.path
		// FIXME add other file formats as well
		var command = 'find '+path+' -name "*.mp3" | sort'
		var allMyMusic = child_process.exec(command, function(error, stdout, stderr) {
			if (error)
				reject(Error(error))
			resolve(stdout.replace(new RegExp (baseMusicPath, 'g'), ''))
		})
	})
	allMyMusicPromise.then((allMyMusic) => {
		allMyMusic = allMyMusic.split('\n').slice(0, -1)
		res.json(JSON.stringify(allMyMusic))
	}).catch((error) => {
		logger.info(error)
	})
})

// volume {{{
app.get('/volume', function(req, res) {
	var volumePromise = new Promise(function(resolve, reject) {
		var volume = child_process.exec('pactl list sinks | grep "Volume: front-left:" | awk \'{print ($3+$10)*100/131070}\'', function(error, stdout, stderr) {
			if (error)
				reject(Error(error))
			resolve(stdout)
		})
	})
	volumePromise.then(function(volume) {
		res.json(JSON.stringify(volume))
	}).catch(function(error) {
		logger.info(Error(error))
	})
})

app.post('/volume', function(req, res) {
	var sinkvol = child_process.exec('pactl set-sink-volume @DEFAULT_SINK@ '+req.body.vol+'%', function(error, stdout, stderr) {
		if (error)
			logger.info(error)
		res.json(JSON.stringify('OK'))
	})
})
// }}}

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
		default:
			res.json(JSON.stringify('I did not understand'))
			logger.info('did not understand action')
	}
})
// }}}

// Web Socket {{{
wss.on('connection', function connection(ws, req) {
	//logger.info(req.url)

	ws.on('message', function incoming(message) {
		if (message.match('queue:')) {
			var path = message.replace('queue:', '').replace(/baseMusicPath\//g, baseMusicPath)
			serverExec(['-c', 'play '+path])

			pty.on('data', function(data) {
				ws.send(data, function(error) {
					if (error)
						logger.info('error: web socket closed before the data was sent.' + error)
				})
			})
			pty.on('exit', function(code, signal) {
				if (signal == 9)
					ws.send('Stopped.', function (error) {
						if (error)
							logger.info('error: web socket closed before the exit code was sent.\n' + error)
					})
				// wait for the client to close the connection
				//ws.terminate()
				pty = null
			})
		}else if (message.match('radio:')) {
			var url = message.replace('radio:', '')
			serverExec(['-c', 'play -t mp3 "|wget -q -o '+logFile+' -O - '+url+'"'])

			pty.on('data', function(data) {
				if (!/Cache/.test(data))
					ws.send(data)
				//if (/source disconnected/.test(data)) {
					//kill the process.
				//}
			})
			pty.on('exit', function(code, signal) {
				//logger.info('code: '+code+' signal: '+signal)
				if (signal == 9)
					ws.send('Stopped.')
				pty = null
			})
		}
	})
	ws.on('close', function() {
		try {
			process.kill(pty.pid, 'SIGTERM')
			pty = null
		}catch (e) {}
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

function getDirContents(path) {
	return new Promise((resolve, reject) => {
		fs.readdir(path, function(err, files) {
			if (err)
				reject(Error(err))

			var i
			var stats
			var contents = []

			for (i = 0; i < files.length; i++) {
				contents[i] = new Object

				stats = fs.lstatSync(path+files[i])
				if (stats.isDirectory()) {
					contents[i].contentType = 'dir'
					contents[i].contentName = files[i]
				}else if (stats.isFile()) {
					contents[i].contentType = 'file'
					contents[i].contentName = files[i]
				}
			}

			resolve(contents)
		})
	})
}

function serverExec(command) {
	if (pty !== null) {
		try {
			// SIGTERM is not noticed by pty.on('exit'); that is, the
			// resulting signal is 0.
			//process.kill(pty.pid, 'SIGSTOP')
			process.kill(pty.pid, 'SIGTERM')
			pty = null
		}catch (e) {
			logger.info(e)
			// TODO
		}
	}

	pty = Pty.spawn('/bin/bash', command, {
		name: 'dumb',
		cols: 256,
		rows: 16,
		cwd: process.cwd(),
		env: getEnv()
	})
}
// }}}
