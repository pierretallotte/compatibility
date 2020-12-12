/*
    getUrlParameter
        Return the corresponding HTTP GET parameter.
*/
var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
};

var refreshInterval;

/*
    refreshGame
        Function called every seconds to update the data of the game
*/
function refreshGame() {
    $.get("/compatibility/load", { players: getUrlParameter('players') }).done( game => {
        $('#load').hide();
        if(game['state'] == 'starting') {
            var html = '';
            for(const [player, score] of Object.entries(game['players'])) {
                html += '<p>' + player + ' : ' + ( score == -1 ? 'Non connecté' : 'Connecté' ) + '</p>';
            }
            $('#starting').html(html);
        } else if(game['state'] == 'waitingWord') {
            clearInterval(refreshInterval);
            $('#starting').hide();

            var html = '';
            for(const [player, score] of Object.entries(game['players'])) {
                html += '<p>' + player + ' : ' + score.toString() + '</p>';
            }

            $('#ranking').html(html);
            $('#newWord').show();
        } else if(game['state'] == 'waitingPlayers') {
            var html = '';
            for(const [player, images] of Object.entries(game['send'])) {
                html += '<p>' + player + ' : ' + images + '</p>';
            }
            $('#results').html(html);
        } else if(game['state'] == 'computingResults') {
            var html = '';
            for(const [player, images] of Object.entries(game['send'])) {
                html += '<p>' + player + ' : ' + images + '</p>';
            }
            $('#results').html(html);

            html = '';
            for(const [player, score] of Object.entries(game['players'])) {
                html += '<p>' + player + ' : ' + score.toString() + '</p>';
            }
            $('#ranking').html(html);

            $('#newWord').show();
            $('#game').show();
            clearInterval(refreshInterval);
        }
    });

}

/*
    newWord
        Ask to the server a new word
*/
function newWord() {
    $.get("/compatibility/newWord", { players: getUrlParameter('players') }).done ( data => {
        $('#word').text(data.split('#')[0]);
        $('#matcher').text(data.split('#')[1]);
        $('#game').show();
        $('#newWord').hide();
        $('#results').html('');
    });

    refreshInterval = setInterval(refreshGame, 1000);
}

/*
    loadGame
        Get the informations of the current game to the server and display them.
        This function is launched only once at the loading of the page
*/
function loadGame() {
    refreshInterval = setInterval(refreshGame, 1000);
}
