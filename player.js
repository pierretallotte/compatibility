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
    waiting
        Function called every seconds when waiting something from the server
*/
function waiting() {
    $.get("/compatibility/load", { players: getUrlParameter('players') }).done( game => {
        if(game['state'] == 'starting') {
            $('#results').hide();
            if(game['players'][getUrlParameter('player')] == -1) {
                $.get("/compatibility/connect", { players: getUrlParameter('players'), player: getUrlParameter('player') }).done((data) => {
                });
            }
            $('#starting').show();
        } else if(game['state'] == 'waitingWord') {
            $('#results').hide();
            $('#starting').hide();
            $('#waiting').show();
        } else if(game['state'] == 'waitingPlayers') {
            $('#results').hide();
            if(!game['send'][getUrlParameter('player')]) {
                $('#waiting').hide();
                $('#word').text(game['word']);
                $('#matcher').text(game['matcher']);
                $('#game').show();

                clearInterval(refreshInterval);
            } else {
                $('#game').hide();
                $('#starting').show();
            }
        } else if(game['state'] == 'computingResults') {
            $('#starting').hide();
            $('#waiting').hide();
            
            var html = '';
            for(const [player, images] of Object.entries(game['send'])) {
                html += '<p>' + player + ' :</p>';// + images + '</p>';
                images.split('-').forEach((image) => {
                    html += '<img src="img/'+image+'.jpg" />';
                });
            }

            for(const [player, score] of Object.entries(game['players'])) {
                html += '<p>' + player + ' : ' + score.toString() + '</p>';
            }

            $('#results').html(html);
            $('#results').show();

            $('#image1').val('');
            $('#image2').val('');
            $('#image3').val('');
            $('#image4').val('');
            $('#image5').val('');
        }
    });
    
    $('#load').hide();
}

/*
    sendImages
        Send the list of images to the server.
*/
function sendImages() {
    var images = [];

    for(i = 1; i < 6; i++) {
        var image = $('#image' + i.toString()).val();

        if(image == '') {
            alert("Il faut renseigner tous les champs");
            return;
        }

        if(!/^[0-9]+$/.test(image)) {
            alert(image + " n'est pas un nombre");
            return;
        }

        var n = parseInt(image);

        if(n < 1 || n > 52) {
            alert(image + " doit être compris entre 1 et 52");
            return;
        }

        if(images.includes(n)) {
            alert(image + " est utilisé plusieurs fois");
            return;
        }

        images.push(n);
    }
    var images_text = images.join('-');

    $.get("/compatibility/send", { players: getUrlParameter('players'), player: getUrlParameter('player'), images: images_text }).done((data) => {
        $('#game').hide();
        $('#starting').show();
        refreshInterval = setInterval(waiting, 1000);
    });
}

/*
    loadGame
        Get the informations of the current game to the server and display them.
        This function is launched only once at the loading of the page
*/
function loadGame() {
    waiting();
    refreshInterval = setInterval(waiting, 1000);
}
