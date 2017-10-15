// TODO: it is useless to have two servers; put the contents of this page
// in the server on port 3001, like with transmission web.
// also, the path displayed should be the current folder.

$(document).ready(function() {
	var path = '';
	getPath(path);
});

function getPath(path) {
	var serverUrl = 'http://192.168.1.200:3001';

	$.get(serverUrl+path, function(response, status) {
		if (status !== 'success') {
			alert('Error: ' + status);
		}
		response = JSON.parse(response);
		switch(response.type) {
			case 'd':
				updateLocation(path);
				printSongs(JSON.parse(response.body));
				break;
			case 'f':
				printSongStatus(response.body);
				break;
			default:
				alert("Did not expect this response from server.");
				console.log(response);
		}
	});
}

function printSongs(songs) {
	var i;
	var innerHTML = '';
	var artistsNode = document.getElementById('songs');
	var locationNode = document.getElementById('location');

	if (locationNode.innerHTML !== '')
		innerHTML += '<li><p class="up">'+
			'..</p></li>\n';

	// Set the content of the element
	for (i = 0; i < songs.length; i++) {
		innerHTML += '<li><p class="path">'+
			songs[i]+'</p></li>\n';
	}
	artistsNode.innerHTML = innerHTML;

	// Add event listeners (until now there were no elements)
	$('.path').click(function() {
		var location = locationNode.innerHTML;
		var path = location + '/' + $(this).text();
		getPath(path);
	});
	$('.up').click(function() {
		var location = locationNode.innerHTML;
		var path = location.split('/').slice(0, -1).join('/')
		getPath(path);
	});
}

// TODO: print options like stop, pause...
// TODO: try to show the progress, or at least when the song is over.
// NOTE: if I play two songs, they overlap: avoid this.
function printSongStatus(status) {
	var songStatusNode = document.getElementById('songStatus');

	songStatusNode.innerHTML = status;
}

// TODO: use multiple spans elements, so that if the user clicks of the
// name of one directory, she returns to that directory (like in nautilus).
// TODO: even better, make a locationBar object with methods to get the
// current/previous path and to update it. each span supports clicking.
function updateLocation(path) {
	var locationNode = document.getElementById('location');

	locationNode.innerHTML = path;
}
