class LocationBar {
	// constructor
	constructor(elementId) {
		this.element = document.getElementById(elementId);
	}
	// methods
	getPath() {
		return this.element.innerHTML.replace(/<\/?span>/g, '');
	}
	setPath(path) {
		this.element.innerHTML = path.replace(/.*\//g, '<span>$&</span>');
		/*
		var i;
		var innerHTML = '';
		var splittedPath = path.split('/');

		for (i = 1; i < splittedPath.length; i++)
			innerHTML += '<span>'+splittedPath[i]+'/</span>';
		this.element.innerHTML = innerHTML;
		*/
	}
}

class SongsPanel {
	constructor(elementId) {
		this.element = document.getElementById(elementId);
	}
	printSongs(songs) {
		var i;
		var innerHTML = '';

		// update the list
		if (locationBar.getPath() !== '/')
			innerHTML += '<li><p class="up">'+
				'..</p></li>\n';
		for (i = 0; i < songs.length; i++) {
			innerHTML += '<li><p class="path">'+
				songs[i]+'</p></li>\n';
		}
		this.element.innerHTML = innerHTML;

		// add event listeners (until now there were no elements)
		$('.path').click(function() {
			var newPath = locationBar.getPath()+$(this).text();
			getMusic(newPath);
		});
		$('.up').click(function() {
			var newPath = locationBar.getPath().split('/').slice(0, -2).join('/');
			getMusic(newPath);
		});
	}
}

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
		}
		// message
		this.message.innerHTML = message;
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
				if (JSON.parse(data) != "OK")
					console.log('Something went wrong');

				if (action == 'pause')
					$('#playPause').text('play');
				else
					$('#playPause').text('pause');
			});
		})

		// stop
		// TODO fare una class action per cui al click posto l'id o il testo. per playPause è diverso, ma stop, prev, next possono andar bene.
		$('#stop').on('click', function() {
			var action = 'stop';
			$.post('./actions', {action: action}, function(data, status) {
				if (status !== 'success')
					alert('Error: ' + status);
				if (JSON.parse(data) != "OK")
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

$(document).ready(function() {
	locationBar = new LocationBar('locationBar');
	songsPanel = new SongsPanel('songsPanel');
	statusPanel = new StatusPanel('statusPanel', 'message', 'progress', 'actions');
	statusPanel.printMessage();

	getMusic('');
});

function getMusic(path) {
	// choose if we update the songs list or we play the song
	$.post('./music', {path: path}, function(data, status) {
		if (status !== 'success')
			alert('Error: ' + status);

		data = JSON.parse(data);
		switch(data.type) {
			case 'd':
				locationBar.setPath(path+'/');
				songsPanel.printSongs(data.songs);
				break;
			case 'f':
				statusPanel.printMessage(data.message);
				statusPanel.printActions(data.volume);

				var webSocketServer = 'ws://localhost';
				var webSocketPort = data.port;

				// connect to web socket
				var connection = new WebSocket(webSocketServer+':'+webSocketPort, ['soap', 'xmpp']);
				connection.onopen = function() {
					connection.send(path);
				};
				connection.onmessage = function (e) {
					// TODO: use a monospace font for the progress
					statusPanel.printProgress(e.data);
					if (e.data == 'Done.') {
						statusPanel.printMessage();
						statusPanel.printActions();
						statusPanel.printProgress();
					}
				};

				break;
			default:
				alert("Did not expect this response from server.");
				console.log(data);
		}
	});
}
