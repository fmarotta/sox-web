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
	printRadios() {
		getRadios().then((stations) => {
			var i;
			var content = '';

			for (i = 0; i < stations.length; i++)
				content += '<li id="'+stations[i].stationUrl+'" '+
					'class="w3-padding-16 musicPanelRadio">'+
					stations[i].stationName+'</li>\n';
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

// MusicQueue {{{
class MusicQueue {
	constructor(elementId) {
		this.element = document.getElementById(elementId);
		this.playingEq = -1;
	}
	getLastEq() {
		return $('#musicQueue span').length - 1;
	}
	addToQueue(path) {
		this.element.innerHTML += '<span class="w3-panel">\n'+
			'<header class="w3-container w3-teal cardHeader">'+
				'<h4>'+path+'</h4></header>\n'+
			'<div class="w3-container w3-white cardBody" style="padding:0"></div>\n'+
			'<div class="w3-container w3-white cardProgress" style="padding:0"></div>\n'+
			'<footer class="w3-display-container w3-teal w3-bar cardFooter">\n'+
				'<div class="w3-container w3-bar w3-small effects">TODO: effects</div>\n'+
				'<div class="w3-container w3-bar w3-display-right">'+
					'<button class="w3-button w3-right w3-tiny removeFromQueue"><i class="fa fa-close"></i></button>'+
					'<button class="w3-button w3-right w3-tiny playFromQueue"><i class="fa fa-caret-right"></i></button>'+
				'</div>\n'+
			'</footer>\n'+
			'</span>';
	}
	removeFromQueue(eq) {
		if (this.playingEq === eq) {
			var action = 'stop';
			$.post('./actions', {action: action}, function(data, status) {
				if (status !== 'success')
					alert('Error: ' + status);
				if (JSON.parse(data) !== 'OK')
					console.log('Something went wrong');

				$('#musicQueue span:eq('+eq+')').remove();
				$('#playPause').text('play');
			});
		}else {
			$('#musicQueue span:eq('+eq+')').remove();
		}
	}
	emphasize(eq) {
		$('#musicQueue span:eq('+eq+') header').attr('class', 'w3-container w3-green cardHeader');
		$('#musicQueue span:eq('+eq+') footer').attr('class', 'w3-display-container w3-bar w3-green cardFooter');
	}
	deEmphasize(eq) {
		$('#musicQueue span:eq('+eq+') header').attr('class', 'w3-container w3-teal cardHeader');
		$('#musicQueue span:eq('+eq+') footer').attr('class', 'w3-display-container w3-bar w3-teal cardFooter');
		this.clearBody(eq);
		this.playingEq = -1;
	}
	addBody(eq, line) {
		var text = $('#musicQueue span:eq('+eq+') .cardBody').html();
		$('#musicQueue span:eq('+eq+') .cardBody').html(text + line + '<br/>\n');
	}
	printProgress(eq, line) {
		$('#musicQueue span:eq('+eq+') .cardProgress').html('</br>'+line+'\n');
	}
	clearBody(eq) {
		// it also clear the progress
		$('#musicQueue span:eq('+eq+') .cardBody').html('');
		$('#musicQueue span:eq('+eq+') .cardProgress').html('');
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
		this.playingEq = eq;
		this.emphasize(eq);

		var queue;
		var path = $('#musicQueue span:eq('+eq+') header').text();
		if (/https?:\/\//.test(path)) {
			queue = 'radio:\''+path+'\'';
		}else {
			queue = 'queue:\'baseMusicPath/'+path+'\'';
		}

		if ($('#statusActions #playPause').text() === 'play')
			$('#statusActions #playPause').text('pause');

		// connect to web socket
		var connection = new WebSocket(soxServer, ['soap', 'xmpp']);
		connection.onopen = function() {
			connection.send(queue);
		};
		connection.onmessage = function(e) {
			if (/\n/.test(e.data)) {
				var i;
				var lines = e.data.split(/\n/);
				for (i = 0; i < lines.length; i++) {
					// NOTE: `this' is not the music queue in the scope of this function, I can't use it.
					musicQueue.sortOutput(eq, lines[i], connection);
				}
			}else {
				musicQueue.sortOutput(eq, e.data, connection);
			}
		};
		connection.onclose = function() {
			// It is often too late for the server to be warned
		};
		connection.onerror = function(err) {
			console.log(err);
		};
	}
	sortOutput(eq, line, connection) {
		if (/In:[0-9]*\.[0-9]*/.test(line)) {
			musicQueue.printProgress(eq, line.replace(/ /g, '&nbsp;'));
		}else if (line.match(/Done\./)) {
			connection.close();
			this.deEmphasize(eq);
			if (eq === this.getLastEq())
				$('#playPause').text('play');
			else
				this.playQueued(eq + 1);
		}else if (line.match(/Stopped\./)) {
			this.deEmphasize(eq);
			$('#playPause').text('play');
		}else if (/\S/.test(line) && !line.match(/(Aborted|Skipped)/)) {
			if (/\//.test(line)) {
				;
			}else {
				this.addBody(eq, line);
			}
		}else if (/\S/.test(line) && line.match(/(Aborted|Skipped)/)) {
			console.log('Aborted/Skipped');
			this.deEmphasize(eq);
			$('#playPause').text('play');
		}else if (/\S/.test(line)) {
			alert(line);
		}
	}
	clear() {
		this.element.innerHTML = '';
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

	getVolume().then((volume) => {
		document.getElementById('volumeSlider').value = Math.round(volume);
	}).catch((error) => {
		alert(error);
	});
	document.getElementById('volumeSlider').oninput = function() {
		$.post('./volume', {vol: this.value}, function(data, status) {
			if (status !== 'success')
				alert('Error: ' + status);
		});
	}

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
	});
	$('#musicPanel').on('click', '.musicPanelRadio', function() {
		musicQueue.addToQueue($(this).attr('id'));
	});

	// TODO: function to find music
	$('#actionsBar').on('click', '#addAll', function() {
		getAllMyMusic(locationBar.getPath()).then((allMyMusic) => {
			var i;
			for (i = 0; i < allMyMusic.length; i++) {
				musicQueue.addToQueue(allMyMusic[i]);
			}
		}).catch((error) => {
			alert(error);
		});
	});

	// TODO effects and sox options
	$('#statusActions').on('click', '#playPause', function() {
		var eq = musicQueue.playingEq;
		var lastEq = musicQueue.getLastEq();

		if (eq === -1 && lastEq === -1)
			return;
		else if (eq === -1 && lastEq !== -1)
			musicQueue.playQueued(0);
		else {
			var action = $(this).text();
			$.post('./actions', {action: action}, function(data, status) {
				if (status !== 'success')
					alert('Error: ' + status);
				if (JSON.parse(data) !== 'OK')
					console.log('Something went wrong');
			});
		}

		if (action === 'pause')
			$('#playPause').text('play');
		else
			$('#playPause').text('pause');
	});
	$('#statusActions').on('click', '#stop', function() {
		var eq = musicQueue.playingEq;
		if (eq === -1)
			return;

		var action = 'stop';
		$.post('./actions', {action: action}, function(data, status) {
			if (status !== 'success')
				alert('Error: ' + status);
			if (JSON.parse(data) !== 'OK')
				console.log('Something went wrong');

			$('#playPause').text('play');
		});
	});
	$('#statusActions').on('click', '#next', function() {
		var eq = musicQueue.playingEq;
		if (eq === -1)
			return;

		var action = 'stop';
		$.post('./actions', {action: action}, function(data, status) {
			if (status !== 'success')
				alert('Error: ' + status);
			if (JSON.parse(data) !== 'OK')
				console.log('Something went wrong');

			musicQueue.deEmphasize(eq);
			if (eq === musicQueue.getLastEq())
				$('#playPause').text('play');
			else
				musicQueue.playQueued(eq + 1);
		});
	});
	$('#statusActions').on('click', '#prev', function() {
		var eq = musicQueue.playingEq;
		if (eq === -1)
			return;

		var action = 'stop';
		$.post('./actions', {action: action}, function(data, status) {
			if (status !== 'success')
				alert('Error: ' + status);
			if (JSON.parse(data) !== 'OK')
				console.log('Something went wrong');

			musicQueue.deEmphasize(eq);
			if (eq > 0) {
				musicQueue.playQueued(eq - 1);
			}else
				musicQueue.playQueued(0);
		});
	});
	$('#statusActions').on('click', '#shuffle', function() {
		musicQueue.shuffleQueue();
	});

	$('#musicQueue').on('click', '.removeFromQueue', function() {
		var eq = $(this).parent().parent().parent().index();
		musicQueue.removeFromQueue(eq);
	});
	$('#musicQueue').on('click', '.playFromQueue', function() {
		var eq = musicQueue.playingEq;
		var newEq = $(this).parent().parent().parent().index();

		if (eq === -1) {
			musicQueue.playQueued(newEq);
		}else {
			var action = 'stop';
			$.post('./actions', {action: action}, function(data, status) {
				if (status !== 'success')
					alert('Error: ' + status);
				if (JSON.parse(data) !== 'OK')
					console.log('Something went wrong');

				musicQueue.deEmphasize(eq);
				musicQueue.playQueued(newEq);
			});
		}
		$('#playPause').text('pause');
	});

	openNav('myMusicNav');
});
// }}}

// getDirContents {{{
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

// getRadios {{{
function getRadios() {
	return new Promise((resolve, reject) => {
		$.get('./radios', function(data, status) {
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

// w3 functions {{{
function w3_open() {
	// FIXME: when I increase the window size with the sidebar open, the width remains 61.8%
    document.getElementById("mySidebar").style.display = "block";
    document.getElementById("mySidebar").style.width = "61.8%";
    document.getElementById("myOverlay").style.display = "block";
}

function w3_close() {
    document.getElementById("mySidebar").style.display = "none";
    document.getElementById("mySidebar").style.width = "38.2%";
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
	}else if (id === "radioNav") {
		locationBar.clear();
		musicPanel.printRadios();
    	document.getElementById('actionsBar').innerHTML = '';
	}
}
// }}}
