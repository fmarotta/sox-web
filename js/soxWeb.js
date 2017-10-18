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
		var i;
		var innerHTML = '';
		var splittedPath = path.split('/');

		for (i = 1; i < splittedPath.length; i++)
			innerHTML += '<span>'+splittedPath[i]+'/</span>';
		this.element.innerHTML = innerHTML;
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
			var newPath = '/'+locationBar.getPath()+$(this).text();

			getMusic(newPath);
		});
		$('.up').click(function() {
			var newPath = '/'+locationBar.getPath().split('/').slice(0, -2).join('/');

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
		this.progressTimer = null;
	}
	printStatus(data) {
		if (data === undefined) {
			this.message.innerHTML = 'Choose a song from the list on the left';
			this.progress.innerHTML = '';
			this.actions.innerHTML = '';
			if (this.progressTimer) {
				clearTimeout(this.progressTimer);
				this.progressTimer = null;
			}
			return;
		}

		// message
		this.message.innerHTML = data.message;
		
		// progress
		if (this.progressTimer) {
			clearTimeout(this.progressTimer);
			this.progressTimer = null;
		}
		var startTime = new Date().getTime();
		var durationMatch = /Duration\s*:\s*(\d+):(\d+):(\d+)\.(\d+)/gm.exec(data.message);
		var duration = durationMatch[4]*10 + durationMatch[3]*1000 + durationMatch[2]*60000 + durationMatch[1]*3600000; // milliseconds
		this.progressTimer = setInterval(showProgress, 375);

		// actions
		this.actions.innerHTML = '<span>pause</span>&nbsp;'+
			'<span><input type="range" min="0" max="100" value='+
			data.volume+' class="slider" id="volumeSlider"></span>';

		document.getElementById('volumeSlider').oninput = function() {
			$.post('./volume', {vol: this.value}, function(data, status) {
				if (status !== 'success')
					alert('Error: ' + status);
			});
		}

		function showProgress() {
			var time = new Date().getTime();
			var partial = (time - startTime) / 1000;
			this.progress.innerHTML = partial.toFixed(2);
			if (time - startTime >= duration) {
				this.message.innerHTML = 'Choose a song from the list on the left';
				this.progress.innerHTML = '';
				this.actions.innerHTML = '';
				clearTimeout(this.progressTimer);
				this.progressTimer = null;
			}
		}
	}
}

$(document).ready(function() {
	locationBar = new LocationBar('locationBar');
	songsPanel = new SongsPanel('songsPanel');
	statusPanel = new StatusPanel('statusPanel', 'message', 'progress', 'actions');

	getMusic('/');
});

function getMusic(path) {
	// choose if we update the songs list or we play the song
	$.post('./music', {path: path}, function(data, status) {
		if (status !== 'success')
			alert('Error: ' + status);

		data = JSON.parse(data);
		switch(data.type) {
			case 'd':
				locationBar.setPath(path);
				songsPanel.printSongs(JSON.parse(data.body));
				statusPanel.printStatus();
				break;
			case 'f':
				statusPanel.printStatus(data);
				break;
			default:
				alert("Did not expect this response from server.");
				console.log(data);
		}
	});
}
