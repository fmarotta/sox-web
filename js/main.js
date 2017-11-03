// LocationBar {{{
class LocationBar {
	// constructor
	constructor(elementId) {
		this.element = document.getElementById(elementId);
		this.buttonClass = 'w3-button'
	}
	// methods
	setPath(path) {
		path = path.replace(/\/$/, ''); // removing trailing slashes
		var buttons = '<button id="locationButton0" class="'+this.buttonClass+'"><i class="fa fa-home"></i> Music</button>';

		if (/\//.test(path)) {
			var i;
			var splittedPath = path.split('/');
			for (i = 0; i < splittedPath.length; i++) {
				buttons += '<button id="locationButton'+(i+1)+'" class="'+this.buttonClass+'">'+splittedPath[i]+'</button>';
			}
		}else if (path != '') {
			buttons += '<button id="locationButton1" class="'+this.buttonClass+'">'+path+'</button>';
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
	}
	printDirContents(path) {
		getDirContents(path).then((contents) => {
			var i;
			var content = '';

			if (path !== '')
				content += '<li class="w3-padding-16 musicPanelDotDot">..</li>\n';
			for (i = 0; i < contents.length; i++) {
				if (contents[i].contentType === 'dir') {
					content += '<li class="w3-padding-16 musicPanelDir">'+
						contents[i].contentName+'</li>\n';
				}else if (contents[i].contentType === 'file') {
					content += '<li class="w3-padding-16 musicPanelFile">'+
						contents[i].contentName+'</li>\n';
				}
			}
			content += '<li class="w3-padding-16 musicPanelRandom">Random</li>\n';
			this.element.innerHTML = content;
			
			return i;
		}).catch((error) => {
			alert(error);
		});
	}
	clear() {
		this.element.innerHTML = '';
	}
}
// }}}

// StatusMessage {{{
class StatusMessage {
	constructor(elementId) {
		this.element = document.getElementById(elementId);
		this.messageType = '';
	}
	clear() {
		this.element.innerHTML = '';
	}
	appendMessage(message) {
		this.element.innerHTML += message;
	}
	printMessage(message) {
		this.element.innerHTML = message;
	}
}
// }}}

// StatusProgress {{{
class StatusProgress {
	constructor(elementId) {
		this.element = document.getElementById(elementId);
	}
	printProgress(progress) {
		if (progress === undefined) {
			this.element.innerHTML = '';
			return;
		}
		// progress
		this.element.innerHTML = progress;
	}
	clear() {
		this.element.innerHTML = '';
	}
}
// }}}

// MusicQueue {{{
class MusicQueue {
	constructor(elementId) {
		this.element = document.getElementById(elementId);
	}
	getPlayingEq() {
		return $('#musicQueue li:has(h3)').index();
	}
	getLastEq() {
		return $('#musicQueue li').length - 1;
	}
	addToQueue(fileName) {
		this.element.innerHTML += '<li><h4>' + locationBar.getPath() + fileName + '</h4></li>';
	}
	cleanPlaying() {
		var eq = this.getPlayingEq();
		var path = $('#musicQueue li:eq('+eq+') h3').html();

		$('#musicQueue li:eq('+eq+')').html('<h4>'+path+'</h4>');
	}
	playQueued(eq) {
		var playing = $('#musicQueue li:eq('+eq+')');
		var path = playing.text();
		var queue = 'queue:\'baseMusicPath/'+path+'\'';

		// connect to web socket
		var connection = new WebSocket(soxServer, ['soap', 'xmpp']);
		connection.onopen = function() {
			connection.send(queue);
		};
		connection.onmessage = function (e) {
			if (/\n/.test(e.data)) {
				var i;
				var lines = e.data.split(/\n/);
				for (i = 0; i < lines.length; i++) {
					sortOutput(lines[i]);
				}
			}else {
				sortOutput(e.data);
			}
		};

		function sortOutput(line) {
			if (/In:[0-9]*\.[0-9]*/.test(line)) {
				statusProgress.printProgress(line.replace(/ /g, '&nbsp;'));
			}else if (line.match(/Done\./)) {
				musicQueue.cleanPlaying();
				statusProgress.clear();
				musicQueue.playQueued(eq+1);
			}else if (line.match(/Stopped\./)) {
				playing.html('<h4>'+path+'</h4>');
				statusProgress.clear();
			}else if (/\S/.test(line) && !line.match(/(Aborted|Skipped)/)) {
				if (/\//.test(line)) {
					playing.html('<h3>'+path+'</h3>');
				}else {
					playing.html(playing.html()+line+'<br/>\n');
				}
			}else if (/\S/.test(line) && line.match(/(Aborted|Skipped)/)) {
				console.log('aborted');
				playing.html('<h4>'+path+'</h4>');
				statusProgress.clear();
			}else if (/\S/.test(line)) {
				alert(line);
			}
		}
	}
}
// }}}

// StatusActions {{{
class StatusActions {
	constructor(elementId) {
		this.element = document.getElementById(elementId);
	}
	clear() {
		this.element.innerHTML = '';
	}
	printQueueActions() {
		var queueActions = '<hr><button id="playQueue">play queue</button>'+
			'<button>options</button>'+
			'<button>effects</button>';

		this.element.innerHTML = queueActions;
	}
	printSoxActions(volume) {
		// actions
		this.element.innerHTML = '<hr><button id="playPause">pause</button>'+
			'<button id="prev">prev</button>'+
			'<button id="stop">stop</button>'+
			'<button id="next">next</button>'+
			'<span style="float:right">volume: <input type="range" min="0" max="100" step="3" '+
			'value='+volume+' class="slider" id="volumeSlider"></span>';

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

// get Sox Server {{{
var soxServer;
$.get('./serverInfo', function(data, status) {
	if (status !== 'success')
		alert('Error in getting server info');

	soxServer = JSON.parse(data);
});
// }}}

// document ready {{{
$(document).ready(function() {
	locationBar = new LocationBar('locationBar');
	musicPanel = new MusicPanel('musicPanel');
	statusMessage = new StatusMessage('statusMessage');
	musicQueue = new MusicQueue('musicQueue');
	statusProgress = new StatusProgress('statusProgress');
	statusActions = new StatusActions('statusActions');

	$('#locationBar').on('click', 'button', function() {
		var path = locationBar.getPathUpTo($(this).attr('id'));

		locationBar.setPath(path);
		musicPanel.printDirContents(path);
	});

	$('#musicPanel').on('click', '.musicPanelDir', function() {
		var path = locationBar.getPath() + $(this).text();

		locationBar.setPath(path);
		musicPanel.printDirContents(path);
	});
	$('#musicPanel').on('click', '.musicPanelDotDot', function() {
		var path = locationBar.getDotDot();

		locationBar.setPath(path);
		musicPanel.printDirContents(path);
	});
	$('#musicPanel').on('click', '.musicPanelFile', function() {
		musicQueue.addToQueue($(this).text());
		if (musicQueue.getPlayingEq() === -1) {
			statusActions.printQueueActions();
		}
	});
	// TODO get ordered music, but add a button (in queueActions) to shuffle the pieces.
	$('#musicPanel').on('click', '.musicPanelRandom', function() {
		getRandomMusic(locationBar.getPath()).then((randomMusic) => {
			var i;
			for (i = 0; i < randomMusic.length; i++) {
				musicQueue.addToQueue(randomMusic[i].replace(locationBar.getPath(), ''));
			}
			if (musicQueue.getPlayingEq() === -1) {
				statusActions.printQueueActions();
			}
		}).catch((error) => {
			alert(error);
		});
	});

	$('#statusActions').on('click', '#playQueue', function() {
		getVolume().then((volume) => {
			statusActions.printSoxActions(volume);
		}).catch((error) => {
			alert(error);
		});
		musicQueue.playQueued(0);
	});
	// TODO effects and sox options

	$('#statusActions').on('click', '#playPause', function() {
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
	$('#statusActions').on('click', '#stop', function() {
		var action = 'stop';
		$.post('./actions', {action: action}, function(data, status) {
			if (status !== 'success')
				alert('Error: ' + status);
			if (JSON.parse(data) !== 'OK')
				console.log('Something went wrong');

			statusActions.printQueueActions();
		});
	})
	$('#statusActions').on('click', '#next', function() {
		var eq = musicQueue.getPlayingEq();
		var action = 'stop';

		$.post('./actions', {action: action}, function(data, status) {
			if (status !== 'success')
				alert('Error: ' + status);
			if (JSON.parse(data) !== 'OK')
				console.log('Something went wrong');

			if (eq === musicQueue.getLastEq())
				statusActions.printQueueActions();
			else
				musicQueue.playQueued(eq + 1);
		});
	})
	$('#statusActions').on('click', '#prev', function() {
		var eq = musicQueue.getPlayingEq();

		musicQueue.cleanPlaying();
		if (eq > 0) {
			musicQueue.playQueued(eq - 1);
		}else
			musicQueue.playQueued(0);
	})

	openNav('myMusicNav');
});
// }}}

// getMyMusic {{{
function getDirContents(path) {
	return new Promise((resolve, reject) => {
		$.post('./myMusicDir', {path: path}, function(data, status) {
			if (status !== 'success')
				reject(Error(status));
			resolve(JSON.parse(data));
		});
	});
}
// }}}

// getVolume {{{
function getVolume() {
	return new Promise((resolve, reject) => {
		$.get('./volume', function(data, status) {
			if (status !== 'success')
				reject(Error(status));
			resolve(JSON.parse(data));
		});
	});
}
// }}}

// playRandom {{{
function getRandomMusic(path) {
	return new Promise((resolve, reject) => {
		$.post('./randomMusic', {path: path}, function(data, status) {
			if (status !== 'success')
				reject(Error(status));
			resolve(JSON.parse(data));
		});
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
		var path = '';

		locationBar.setPath(path);
		musicPanel.printDirContents(path);
	}else if (id === "myPlaylistsNav") {
		locationBar.clear();
		musicPanel.clear();
		document.getElementById('actionsBar').innerHTML = '<button class="w3-button" onclick="playRandom()">Random</button>';
	}
}
