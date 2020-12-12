const http = require('http');
const fs = require('fs');

const port = 3000;

var games = {};

var words = [];

fs.readFile('dico.txt', 'utf8', (err, data) => {
    words = data.split('\n');
    console.log(words);
    console.log(words.length);
    console.log(data);
});

class Game {
    constructor(players) {
        this.state = "starting";
        this.word = '';
        this.remainingWords = words;
        this.send = {};
        this.matcher = '';
        this.matcher_id = 0;

        this.players = {};

        decodeURIComponent(players).split(';').forEach((player) => {
            this.players[player] = -1;
        });
    }

    newWord() {
        var idx = Math.floor(Math.random() * Math.floor(this.remainingWords.length));
        this.word = this.remainingWords.splice(idx, 1)[0];
        this.state = "waitingPlayers";
        this.matcher = Object.keys(this.players)[this.matcher_id];
        this.matcher_id = (this.matcher_id + 1) % Object.keys(this.players).length;
        this.send = {};

        return this.word + '#' + this.matcher;
    }
}

function getGetParameters(req) {
    var get = {};
    var idx;

    if(idx = req.url.indexOf('?')) {
        var paramList = req.url.substring(idx+1);
        if(paramList.indexOf('&')) {
            paramList.split('&').forEach((param) => {
                get[param.split('=')[0]] = decodeURIComponent(param.split('=')[1]);
            });
        } else {
            get[paramList.split('=')[0]] = decodeURIComponent(paramList.split('=')[1]);
        }
    }

    return get;
}

const server = http.createServer((req, res) => {
    const get = getGetParameters(req);

    /*
        /compatibility
        Print the form to create the game
    */
    if(req.url == '/compatibility') {
        fs.readFile('create.html', 'utf8', (err, data) => {
            if(err) {
                res.statusCode = 500;
                console.log('Unable to read create.html');
                res.end('Server error');
            } else {
                res.statusCode = 200;
                res.end(data);
            }
        });
    }
    /*
        /compatibility/create
        Create a new game and print the link to give to the players
    */
    else if(req.url == '/compatibility/create') {
        var body = '';
        req.on('data', (chunk) => {
            body += chunk;
        });

        req.on('end', () => {
            var players = decodeURIComponent(body.split('=')[1]);
            if(!games[players]) {
                games[players] = new Game(players);
            }
            fs.readFile('play.tmpl', 'utf8', (err, data) => {
                if(err) {
                    res.statusCode = 500;
                    console.log('Unable to read play.tmpl');
                    res.end('Server error');
                } else {
                    res.statusCode = 200;
                    res.end(data.replace(/<PLAYERS>/g, players));
                }
            });
        });
    }
    /*
        /compatibility/start
        Print one link for each players in the game
    */
    else if(req.url.startsWith('/compatibility/start')) {
        var links = '';
        get["players"].split(';').forEach((player) => {
            links += '<p><a href="/compatibility/game?player='+player+'&amp;players='+encodeURIComponent(get["players"])+'">'+player+'</a></p>';
        });

        fs.readFile('start.tmpl', 'utf8', (err, data) => {
            if(err) {
                res.statusCode = 500;
                console.log('Unable to read start.tmpl');
                res.end('Server error');
            } else {
                res.statusCode = 200;
                res.end(data.replace(/<LINKS>/g, links));
            }
        });
    }
    /*
        /compatibility/game
        Load the HTML page corresponding to the player
    */
    else if(req.url.startsWith('/compatibility/game')) {
        var file;
        if(get['master'] == 1) {
            file = 'master.html';
        } else {
            file = 'player.html';
        }

        fs.readFile(file, 'utf8', (err, data) => {
            if(err) {
                res.statusCode = 500;
                console.log('Unable to read ' + file);
                res.end('Server error');
            } else {
                if(get['master'] != 1) {
                    // This is a player
                    // We need to replace <IMAGES>

                    var html = '';

                    for(i = 1; i < 53; i++) {
                        html += '<img src="img/' + i.toString() + '.jpg" />';
                    }

                    res.end(data.replace(/<IMAGES>/g, html));
                } else {
                    res.statusCode = 200;
                    res.end(data);
                }
            }
        });
    }
    /*
        /compatibility/load
        Returns the Game object
    */
    else if(req.url.startsWith('/compatibility/load')) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(games[get['players']]));
    }
    /*
        /comptatibility/connect
        A new player is connecting
    */
    else if(req.url.startsWith('/compatibility/connect')) {
        if(games[get['players']].players[get['player']] == -1) {
            games[get['players']].players[get['player']] = 0;

            var allConnected = 1;

            for(const [player, score] of Object.entries(games[get['players']].players)) {
                if(score == -1) {
                    allConnected = 0;
                    break;
                }
            }

            if(allConnected) {
                games[get['players']].state = "waitingWord";
            }
        }
        res.statusCode = 200;
        res.end();
    }
    /*
        /compatibility/newWord
        Start a new round with a new word
    */
    else if(req.url.startsWith('/compatibility/newWord')) {
        var currentGame = games[get['players']];
        if(currentGame.state != "waitingWord" && currentGame.state != "computingResults") {
            res.statusCode = 500;
            console.log("Bad /compatibility/newWord");
            console.log(req);
            res.end();
        } else {
            var data = currentGame.newWord();
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
            res.end(data);
        }
    }
    else if(req.url.startsWith('/compatibility/send')) {
        var currentGame = games[get['players']];
        currentGame.send[get['player']] = get['images'];

        if(currentGame.state == 'waitingPlayers' && Object.keys(currentGame.send).length == Object.keys(currentGame.players).length) {
            currentGame.state = 'computingResults';

            const matcher_images = currentGame.send[currentGame.matcher];

            for(const [player, images] of Object.entries(currentGame.send)) {
                if(player != currentGame.matcher) {
                    images.split('-').forEach((image, idx) => {
                        matcher_images.split('-').forEach((matcher_image, matcher_idx) => {
                            if(image == matcher_image) {
                                if(idx == matcher_idx) {
                                    currentGame.players[player] += 3;
                                } else {
                                    currentGame.players[player] += 2;
                                }
                            }
                        });
                    });
                }
            }
        }

        res.statusCode = 200;
        res.end();
    }

    /*
        Load *.js file
    */
    else if(req.url.startsWith('/compatibility/') && req.url.endsWith('.js')) {
        var file = req.url.replace(/\/compatibility\//, '');
        fs.readFile(file, 'utf8', (err, data) => {
            if(err) {
                res.statusCode = 500;
                console.log('Unable to read ' + file);
                res.end('Server error');
            } else {
                res.statusCode = 200;
                res.end(data);
            }
        });
    }
    /*
        Load *.img file
    */
    else if(req.url.startsWith('/compatibility/img/') && req.url.endsWith('.jpg')) {
        var file = req.url.replace(/\/compatibility\//, '');
        fs.readFile(file, (err, data) => {
            if(err) {
                res.statusCode = 500;
                console.log('Unable to read ' + file);
                res.end('Server error');
            } else {
                res.statusCode = 200;
                res.end(data);
            }
        });
    }
    else {
        res.statusCode = 404;
        res.end('Not found');
    }

});

server.listen(port);
