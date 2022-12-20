const colyseus = require('colyseus');

const players = {};
exports.FactoryWorld = class extends colyseus.Room {
    onCreate(options) {
        console.log('ON CREATE')
    }

    onJoin(player, options) {
        console.log('ON JOIN');

        players[player.sessionId] = {
            sessionId: player.sessionId,
            x: 0,
            z: 0
        };

        const currentPlayers = JSON.parse(JSON.stringify(players))
        delete currentPlayers[player.sessionId]

        this.send(player, {event: "CURRENT_PLAYERS", players: currentPlayers});
        this.broadcast({event: "PLAYER_JOINED", ...players[player.sessionId]}, {except: player});
    }

    onMessage(player, data) {
        if (data.event === 'PLAYER_POSITION_UPDATE') {
            players[player.sessionId].x = data.x;
            players[player.sessionId].z = data.z;

            const response = {
                ...players[player.sessionId],
                keysPressed: data.keysPressed
            }

            this.broadcast({
                event: "PLAYER_POSITION_UPDATE",
                ...response
            }, {except: player})
        }
        if (data.event === 'BULLET_ADD') {
            this.broadcast({
                event: "BULLET_ADD",
                bullet: data.bullet
            }, {except: player})
        }
        if (data.event === 'IVE_BEEN_HIT') {
            this.broadcast({
                event: "BULLET_REMOVE",
                bulletId: data.bulletId
            }, {except: player})
        }
    }

    onLeave(player, consented) {
        console.log('ON LEAVE')

        this.broadcast({event: "PLAYER_LEFT", sessionId: player.sessionId, map: players[player.sessionId].map });
        delete players[player.sessionId];
    }

    onDispose() {
        console.log('ON DISPOSE')
    }
};
