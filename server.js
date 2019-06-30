class Vector3f{
	constructor(x,y,z){
		this.x = x || 0;
		this.y = y || 0;
		this.z = z || 0;
	}
	add(vec){
		this.x += vec.x;
		this.y += vec.y;
		this.z += vec.z;
	}
	mult(scl){
		this.x *= scl;
		this.y *= scl;
		this.z *= scl;
	}
}
class User{
	constructor(id, name){
		this.id = id
		this.name = name || "User";

		this.controller  = null;
		this.reciever = null;
	}
}
class Player{
	constructor(id){
		this.id = id;
		this.position = new Vector3f();
		this.rotation = new Vector3f();
	}
}

const express = require('express');
const app = express();

const server = require('http').createServer(app);
const io = require('socket.io')(server);

const clients = [];
const players = [];

function getUser(id){
	return clients.find(el => {return el.id == id});
}
function getUserIndex(id){
	return clients.findIndex(el => {return el.id == id});
}
function getPlayer(id){
	return players.find(el => {return el.id == id});
}
function getPlayerIndex(id){
	return players.findIndex(el => {return el.id == id});
}

io.on('connection', client => {
	clients.push(new User(client.id));
	players.push(new Player(client.id));

	client.on('syncTo',function(reciver,callback){
		const user = getUser(this.id);
		const lastController = getUser(user.controller);
		const lastControlling = getUser(user.reciever);
		if(lastControlling){
			lastControlling.controller = null;
			user.reciever = null;
		}
		if(lastController){
			lastController.reciever = null;
			user.controller = null;
		}
		if(reciver){
			if (getUser(reciver).reciever){
				getUser(getUser(reciver).reciever).controller = null;
				getUser(reciver).reciever = null;
			}
			getUser(reciver).controller = this.id;
			user.reciever = reciver;
		}
		callback();
	});

	client.on('unsync',function(callback){
		getUser(getUser(this.id).controller).reciever = null;
		getUser(this.id).controller = null;
		client.broadcast.emit('unsync',this.id);
		callback();
	});

	client.on('getClients',function(callback){
		let arr = [];
		clients.forEach(c => {
			if (c.id != this.id && getUser(c.id).controller != this.id && getUser(c.id).reciever != this.id){
				arr.push({id:c.id,name:c.name});
			}
		});
		callback({clients:arr});
	});

	client.on('update',function(data,callback){
		const user = getUser(this.id);
		const player = getPlayer(this.id);
		player.input = data.input;
		player.position = data.pos;
		player.rotation = data.rot;
		
		if (user.controller) {
			const controller = getPlayer(getUser(this.id).controller);
			callback({ pos: controller.position, rot: controller.rotation, input: controller.input});
		} else {
			callback({ pos: player.position, rot: player.rotation, input: player.input});
		}
	});

	client.on('status',function(callback){
		const user = getUser(this.id);
		callback({
			id: user.id,
			name: user.name,
			controller: getUser(user.controller),
			reciever: getUser(user.reciever)
		});
	});

	client.on('disconnect',function(){
		if (getUser(getUser(this.id).reciever)){
			getUser(getUser(this.id).reciever).controller = null;
			getUser(this.id).reciever = null;
			client.broadcast.emit('unsync',this.id);
		}
		clients.splice(getUserIndex(this.id),1);
		players.splice(getPlayerIndex(this.id),1);
	});
});

app.use(express.static(__dirname + '/public'));
server.listen(80);

console.clear();
setInterval(() => {
	console.clear();
	console.log('Connected clients:');
	clients.forEach(client => {
		console.log(` - ${client.id}`);
		console.log(`\t- Controller : ${client.controller}`);
		console.log(`\t- Reciever   : ${client.reciever}`);
	});
},100);