// LocationBar {{{
class LocationBar {
	// constructor
	constructor(elementId) {
		this.element = document.getElementById(elementId);
		this.buttonAttr = 'class="w3-button" onclick="getMyMusic(locationBar.getPathUpTo(this.id))"'
	}
	// methods
	setPath(path) {
		path = path.replace(/\/$/, ''); // removing trailing slashes
		var buttons = '<button id="locationButton0" '+this.buttonAttr+'><i class="fa fa-home"></i> Music</button>';

		if (/\//.test(path)) {
			var i;
			var splittedPath = path.split('/');
			for (i = 0; i < splittedPath.length; i++) {
				buttons += '<button id="locationButton'+(i+1)+'" '+this.buttonAttr+'>'+splittedPath[i]+'</button>';
			}
		}else if (path != '') {
			buttons += '<button id="locationButton1" '+this.buttonAttr+'>'+path+'</button>';
		}

		this.element.innerHTML = buttons;
	}
	getPath() {
		var i;
		var path = '';
		var buttons = this.element.childNodes;

		for (i = 1; i < buttons.length; i++) {
			path += buttons[i].innerHTML+'/';
		}

		return path;
	}
	getPathUpTo(buttonId) {
		var i;
		var path = '';
		var buttons = this.element.childNodes;
		var id = buttonId.replace('locationButton', '');

		for (i = 1; i <= id; i++) {
			path += buttons[i].innerHTML+'/';
		}

		return path;
	}
	getDotDot() {
		var i;
		var path = '';
		var buttons = this.element.childNodes;

		for (i = 1; i < buttons.length-1; i++) {
			path += buttons[i].innerHTML+'/';
		}

		return path;
	}
	clear() {
		this.element.innerHTML = '';
	}
}
// }}}

// MusicPanel {{{
class MusicPanel {
	constructor(elementId) {
		this.element = document.getElementById(elementId);
		this.liAttr = 'class="w3-padding-16" onclick="getMyMusic(locationBar.getPath()+this.innerHTML)"';
	}
	printMusic(music) {
		var i;
		var pieces = '';

		// update the list
		if (locationBar.getPath() !== '')
			pieces += '<li class="w3-padding-16" onclick="getMyMusic(locationBar.getDotDot())">..</li>\n';

		for (i = 0; i < music.length; i++) {
			pieces += '<li '+this.liAttr+'>'+
				music[i]+'</li>\n';
		}

		this.element.innerHTML = pieces;
	}
	clear() {
		this.element.innerHTML = '';
	}
}
// }}}

// StatusPanel {{{
class StatusPanel {
	constructor(elementId, messageId, progressId, actionsId) {
		this.element = document.getElementById(elementId);
		this.message = document.getElementById(messageId);
		this.progress = document.getElementById(progressId);
		this.actions = document.getElementById(actionsId);
	}
	printMessage(message) {
		if (message === undefined) {
			this.message.innerHTML = 'Choose a song from the list on the left';
			return;
		}else if (message === '') {
			this.message.innerHTML = '';
			return;
		}
		// message
		this.message.innerHTML += message;
	}
	printProgress(progress) {
		if (progress === undefined) {
			this.progress.innerHTML = '';
			return;
		}
		// progress
		this.progress.innerHTML = progress;
	}
	printActions(volume) {
		if (volume === undefined) {
			this.actions.innerHTML = '';
			return;
		}
		// actions
		this.actions.innerHTML = '<hr><button id="playPause">pause</button>'+
			'<button id="prev">prev</button>'+
			'<button id="stop">stop</button>'+
			'<button id="next">next</button>'+
			'<button id="shuffle">shuffle</button>'+
			'<button id="repeat">repeat</button>'+
			'<span>volume: <input type="range" min="0" max="100" step="5" '+
			'value='+ volume+' class="slider" id="volumeSlider"></span>';

		// playPause
		$('#playPause').on('click', function() {
			var action = $(this).text();
			$.post('./actions', {action: action}, function(data, status) {
				if (status !== 'success')
					alert('Error: ' + status);
				if (JSON.parse(data) !== 'OK')
					console.log('Something went wrong');

				if (action === 'pause')
					$('#playPause').text('play');
				else
					$('#playPause').text('pause');
			});
		})

		// stop
		$('#stop').on('click', function() {
			var action = 'stop';
			$.post('./actions', {action: action}, function(data, status) {
				if (status !== 'success')
					alert('Error: ' + status);
				if (JSON.parse(data) !== 'OK')
					console.log('Something went wrong');
			});
		})

		// next
		$('#next').on('click', function() {
			var action = 'next';
			$.post('./actions', {action: action}, function(data, status) {
				if (status !== 'success')
					alert('Error: ' + status);
				if (JSON.parse(data) !== 'OK')
					console.log('Something went wrong');
			});
		})

		// volume slider
		document.getElementById('volumeSlider').oninput = function() {
			$.post('./volume', {vol: this.value}, function(data, status) {
				if (status !== 'success')
					alert('Error: ' + status);
			});
		}
	}
}
// }}}

$(document).ready(function() {
	locationBar = new LocationBar('locationBar');
	musicPanel = new MusicPanel('musicPanel');
	statusPanel = new StatusPanel('statusPanel', 'statusMessage', 'statusProgress', 'statusActions');

	openNav('myMusicNav');
});

// getMyMusic {{{
function getMyMusic(path) {
	$.post('./myMusic', {path: path}, function(data, status) {
		if (status !== 'success')
			alert('Error: ' + status);

		data = JSON.parse(data);
		switch(data.type) {
			case 'd':
				locationBar.setPath(path);
				musicPanel.printMusic(data.songs);
				break;
			case 'f':
				statusPanel.printMessage('');
				connectToSocket(data.server, path);
				statusPanel.printActions(data.volume);
				break;
			default:
				alert("Did not expect this response from server.");
				console.log(data);
		}
	});
}
// }}}

// connectToSocket {{{
function connectToSocket(server, path) {
	// connect to web socket
	var connection = new WebSocket(server, ['soap', 'xmpp']);
	connection.onopen = function() {
		connection.send('path:'+path);
	};
	connection.onmessage = function (e) {
		// TODO: use a monospace font for the progress
		if (/\n/.test(e.data)) {
			var i;
			var lines = e.data.split(/\n/);
			for (i = 0; i < lines.length; i++) {
				if (/In:[0-9]*\.[0-9]*/.test(lines[i])) {
					statusPanel.printProgress(lines[i].replace(/ /g, '&nbsp;'));
				}else if (lines[i].match(/Done\./)) {
					statusPanel.printMessage();
					statusPanel.printProgress();
					statusPanel.printActions();
				}else if (/\S/.test(lines[i]) && !lines[i].match(/(Aborted|Skipped)/)) {
					if (lines[i].match(path)) {
						statusPanel.printMessage('<hr/><h3>'+lines[i]+'</h3><br/>');
					}else {
						statusPanel.printMessage(lines[i]+'<br/>');
					}
				}
			}
		}else {
			if (/In:[0-9]*\.[0-9]*/.test(e.data)) {
				statusPanel.printProgress(e.data.replace(/ /g, '&nbsp;'));
			}else if (e.data.match(/Done\./)) {
				statusPanel.printMessage();
				statusPanel.printProgress();
				statusPanel.printActions();
			}else if (/\S/.test(e.data) && !e.data.match(/(Aborted|Skipped)/)) {
				if (path.match(e.data)) {
					statusPanel.printMessage('<hr/><h3>'+e.data+'</h3><br/>');
				}else {
					statusPanel.printMessage(e.data+'<br/>');
				}
			}
		}
	};
}
// }}}

// playRandom {{{
function playRandom() {
	$.get('./allMyMusic', function(data, status) {
		data = JSON.parse(data);
		statusPanel.printMessage('');
		connectToSocket(data.server, data.songs);
		statusPanel.printActions(data.volume);
	});
}
// }}}

function w3_open() {
    document.getElementById("mySidebar").style.display = "block";
    document.getElementById("myOverlay").style.display = "block";
}

function w3_close() {
    document.getElementById("mySidebar").style.display = "none";
    document.getElementById("myOverlay").style.display = "none";
}

function openNav(id) {
	if (id === "myMusicNav") {
		document.getElementById('actionsBar').innerHTML = '';
		getMyMusic('');
	}else if (id === "myPlaylistsNav") {
		locationBar.clear();
		musicPanel.clear();
		document.getElementById('actionsBar').innerHTML = '<button class="w3-button" onclick="playRandom()">Random</button>';
	}
}
