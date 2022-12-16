import * as Colyseus from "colyseus.js";

/*================================================
| Array with current online players
*/

export enum Animation {
    IDLE = 'Idle',
    RUN = 'Run'
}

interface Player {
    sessionId: string;
    x: number;
    z: number;
    model: any;
    animations: any,
    mixer: any;
    currentAnimation: Animation
}

let onlinePlayers: Record<string, Player> = {};

/*================================================
| Colyseus connection with server
*/
var client = new Colyseus.Client('ws://localhost:3000');
let room: Promise<any> = client.joinOrCreate("factory_world").then(room => {
    console.log(room.sessionId, "joined", room.name);
    return room
}).catch(e => {
    console.log("JOIN ERROR", e);
});

export {onlinePlayers, room};
