// LocationBar {{{
class LocationBar {
	// constructor
	constructor(elementId) {
		this.element = document.getElementById(elementId);
		this.buttonClass = 'w3-bar-item w3-button'
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
		this.playingEq = -1;
	}
	getLastEq() {
		return $('#musicQueue span').length - 1;
	}
	clear() {
		this.element.innerHTML = '';
	}
	addToQueue(path) {
		this.element.innerHTML += '<span class="w3-panel">\n'+
			'<header class="w3-container w3-blue cardHeader">'+
				'<h4>'+path+'</h4></header>\n'+
			'<div class="w3-container w3-white" cardBody"></div>\n'+
			'<footer class="w3-container w3-blue w3-bar cardFooter">'+
				'<button class="w3-btn w3-small">TODO: effects</button>'+
				'<button class="w3-btn w3-circle w3-red w3-right w3-tiny removeFromQueue">-</button></footer>\n'+
			'</span>';
	}
	removeFromQueue(eq) {
		$('#musicQueue span:eq('+eq+')').remove();
		if (this.getLastEq() === -1)
			statusActions.clear();
	}
	emphasize(eq) {
		$('#musicQueue span:eq('+eq+') header').attr('class', 'w3-container w3-green cardHeader');
		$('#musicQueue span:eq('+eq+') footer').attr('class', 'w3-container w3-green cardHeader');
	}
	deEmphasize(eq) {
		$('#musicQueue span:eq('+eq+') header').attr('class', 'w3-container w3-blue cardHeader');
		$('#musicQueue span:eq('+eq+') footer').attr('class', 'w3-container w3-blue cardHeader');
		this.clearBody(eq);
		this.playingEq = -1;
	}
	addBody(eq, line) {
		var text = $('#musicQueue span:eq('+eq+') div').html();
		$('#musicQueue span:eq('+eq+') div').html(text + line + '<br/>\n');
	}
	clearBody(eq) {
		$('#musicQueue span:eq('+eq+') div').html('');
	}
	shuffleQueue() {
		var i;
		var queue = [];

		for (i = 0; i <= this.getLastEq(); i++)
			queue[i] = $('#musicQueue span:eq('+i+') header').text();

  		var currentIndex = queue.length, temporaryValue, randomIndex;

  		// While there remain elements to shuffle...
  		while (0 !== currentIndex) {

    		// Pick a remaining element...
    		randomIndex = Math.floor(Math.random() * currentIndex);
    		currentIndex -= 1;

    		// And swap it with the current element.
    		temporaryValue = queue[currentIndex];
    		queue[currentIndex] = queue[randomIndex];
    		queue[randomIndex] = temporaryValue;
  		}

		this.clear();
		for (i = 0; i < queue.length; i++) {
			this.addToQueue(queue[i]);
		}

	}
	playQueued(eq) {
		// check if eq is valid
		this.playingEq = eq;
		this.emphasize(eq);

		var path = $('#musicQueue span:eq('+eq+') header').text();
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
					// NOTE: `this' is not the music queue in the scope of this function, I can't use it.
					musicQueue.sortOutput(eq, lines[i]);
				}
			}else {
				musicQueue.sortOutput(eq, e.data);
			}
		};
	}
	sortOutput(eq, line) {
		if (/In:[0-9]*\.[0-9]*/.test(line)) {
			statusProgress.printProgress(line.replace(/ /g, '&nbsp;'));
		}else if (line.match(/Done\./)) {
			this.deEmphasize(eq);
			statusProgress.clear();
			if (eq === this.getLastEq())
				statusActions.printQueueActions();
			else
				this.playQueued(eq + 1);
		}else if (line.match(/Stopped\./)) {
			this.deEmphasize(eq);
			statusProgress.clear();
		}else if (/\S/.test(line) && !line.match(/(Aborted|Skipped)/)) {
			if (/\//.test(line)) {
				;
			}else {
				this.addBody(eq, line);
			}
		}else if (/\S/.test(line) && line.match(/(Aborted|Skipped)/)) {
			console.log('Aborted/Skipped');
			this.deEmphasize(eq);
			statusProgress.clear();
		}else if (/\S/.test(line)) {
			alert(line);
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
			'<button>effects</button>'+
			'<button id="shuffle">shuffle</button>';

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
		musicQueue.addToQueue(locationBar.getPath() + $(this).text());
		if (musicQueue.playingEq === -1) {
			statusActions.printQueueActions();
		}
	});

	// TODO: function to find music
	$('#actionsBar').on('click', '#addAll', function() {
		getAllMyMusic(locationBar.getPath()).then((allMyMusic) => {
			var i;
			for (i = 0; i < allMyMusic.length; i++) {
				musicQueue.addToQueue(allMyMusic[i]);
			}
			if (musicQueue.playingEq === -1) {
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
	$('#statusActions').on('click', '#shuffle', function() {
		musicQueue.shuffleQueue();
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
	});
	$('#statusActions').on('click', '#stop', function() {
		var action = 'stop';
		$.post('./actions', {action: action}, function(data, status) {
			if (status !== 'success')
				alert('Error: ' + status);
			if (JSON.parse(data) !== 'OK')
				console.log('Something went wrong');

			statusActions.printQueueActions();
		});
	});
	$('#statusActions').on('click', '#next', function() {
		var eq = musicQueue.playingEq;
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
	});
	$('#statusActions').on('click', '#prev', function() {
		var eq = musicQueue.playingEq;

		musicQueue.deEmphasize(eq);
		if (eq > 0) {
			musicQueue.playQueued(eq - 1);
		}else
			musicQueue.playQueued(0);
	});

	$('#musicQueue').on('click', '.removeFromQueue', function() {
		var eq = $(this).parent().parent().index();
		musicQueue.removeFromQueue(eq);
	});

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

// getAllMyMusic {{{
function getAllMyMusic(path) {
	return new Promise((resolve, reject) => {
		$.post('./allMyMusic', {path: path}, function(data, status) {
			if (status !== 'success')
				reject(Error(status));
			resolve(JSON.parse(data));
		});
	});
}
// }}}

// w3 functions {{{
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
    	document.getElementById('actionsBar').innerHTML = '<button id="addAll" class="w3-button w3-block">all of \'em</button>';
	}else if (id === "myPlaylistsNav") {
		locationBar.clear();
		musicPanel.clear();
    	document.getElementById('actionsBar').innerHTML = '';
	}
}
// }}}
