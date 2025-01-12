// SERVER

const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const users = new Map();
const ids = new Map();
let history = [];

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/index.html");
});

io.on("connection", (socket) => {
	let dt = new Date();
	console.log("user connected " + dt + "  -- ID: " + socket.id + "    IP: " + socket.handshake.address);

	socket.emit("chat message", "Welcome to DiipaChat ");

	let arr = Array.from(users.values());
	let str = "OTHER USERS ONLINE: " + arr;
	socket.emit("chat message", str);

	users.set(socket.id, socket.id); // NOTE: id and name are the same for now
	ids.set(socket.id, socket);
	
	socket.emit("chat message", "#write  /users  to see who is online");
	socket.emit("chat message", "#write  /beep  to turn beep sounds on/off  (default: ON)");
	socket.emit("chat message", "#write  /history  to see history");
	socket.emit("chat message", "#write  /msg  user_name  message  to send private messages to other users");
	socket.emit("chat message", "##########");
	
	let start = history.length - 5;
	if(start < 0) start = 0;
		
	for(let q=start; q<history.length; q++)
		socket.emit("chat message", history[q]);
	
	socket.on("disconnect", () => {
		let dt = new Date();
		let str = "["+dt+"] " + users.get(socket.id) + " disconnected ###";
		console.log(str + " -- id: " + socket.id);
		io.emit("chat message", str);
		users.delete(socket.id);
		ids.delete(socket.id);
	});
});

io.on("connection", (socket) => {
	socket.on("chat message", (msg) => {
		if(msg.includes("joined"))
		{
			let dt = new Date();
			let arr = msg.split(" ");
			users.set(socket.id, arr[0]); // add name to hashmap [id, name]
			msg += " ### " + dt;
			
			console.log(" [[" + dt + "   " + arr[0] + "  ID: " + socket.id + "]]"); // voi yhdistää ID:n ja IP:n
		}

		if(msg.includes(": /"))   // name: /  <- if message includes : / for some reason, it does not be written to public 
		{
			if(msg.includes("/users"))
			{
				let arr = Array.from(users.values());
				let str = "ONLINE: " + arr;
				socket.emit("chat message", str);
			}
			else				
			if(msg.includes("/history"))
			{
				socket.emit("chat message", "<### HISTORY: (" + history.length + " lines)");
				for(let q=0; q<history.length; q++)
					socket.emit("chat message", history[q]);

				socket.emit("chat message", "###/>");
			}
			else
			if(msg.includes("/msg")) // privatemessage
			{
				let msgArr = msg.split(" ");
				let str = "";
				for(let q=3; q<msgArr.length; q++)
					str += msgArr[q] + " ";

				let to = msgArr[2];  // nick:[0]  /msg[1]  user_name[2]
				let namesArr = Array.from(users.values()); // names

				for(let q=0; q<namesArr.length; q++)
				{
					if(namesArr[q].includes(to))
					{
						let arrID = Array.from(users.keys()); // id:t
						let usrID = arrID[q];
						let otherClient = ids.get(usrID);

						if(otherClient != null)
						{
							let dt = new Date().toLocaleTimeString();
							socket.emit("chat message", "(private message to "+to+") ["+dt+"]  " + str); // viesti näkyviin itelle
							
							otherClient.emit("chat message", "(private message from " + msgArr[0] + ") ["+dt+"]  " + str); // viesti toiselle
							
							// privmesg to servlog ---
							//console.log("   [[ " + new Date() + ": privatemsg " + msgArr[0] + "->" + to + "]: " + str + "] ------ ");
							
							return;
						}
					}
				}
				socket.emit("chat message", to + " user not found.");
			}
			else
			if(msg.includes("/weather"))
			{
				socket.emit("chat message", "Varmaanki myrskysää. Ehkä aurinko paistaa. Kato ulos!");
			}			

			return; // if used /something, that line does not show to anyone
		}
		
		let dt = new Date().toLocaleTimeString();
		msg = "["+dt+"]  " + msg;
		
		history.push(msg);
		console.log(msg);
		io.emit("chat message", msg);

	});
});

server.listen(3000, () => {
	console.log("listening on *:3000");
});
