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
	console.log("user connected  -- id: " + socket.id);
	users.set(socket.id, socket.id); // NOTE: id ja nimi sama toistaseks
	ids.set(socket.id, socket);
	
	socket.emit("chat message", "Welcome to DiipaChat ");
	
	// NOTE: allaoleva näyttäis uuden tulokkaan id:n eikä nimeä joten kommentoitu pois
	/*
	let arr = Array.from(users.values());
	let str = "ONLINE: " + arr;
	socket.emit("chat message", str);
	*/
	
	socket.emit("chat message", "#write  /users  to see who is online");
	socket.emit("chat message", "#write  /beep  to turn beep sounds on/off  (default: ON)");
	socket.emit("chat message", "#write  /history  to see history (you should turn beep sounds off)");
	socket.emit("chat message", "#write  /msg  user_name  message  to send private messages to other users");
	socket.emit("chat message", "##########");

	
	let start = history.length - 5;
	if(start < 0) start = 0;
		
	for(let q=start; q<history.length; q++)
		socket.emit("chat message", history[q]);
	
	socket.on("disconnect", () => {
		let dt = new Date().toLocaleTimeString();
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
			// NOTE: koska tehty näin niin nimessä ei sais olla välilyöntejä, vain eka alkio otetaan käyttöön (arr[0])
			let arr = msg.split(" ", 2);
			users.set(socket.id, arr[0]); // lisää nimi hashmappiin [id, name]
			msg += " ###";
		}

		if(msg.includes(": /"))   // name: /  <- jos viestissä esiintyy : / jostain syystä, se ei näy kenellekään
		{
			if(msg.includes("/users"))
			{
				//console.log("KEYS: "+ Array.from(users.keys()));
				//console.log("VALUES: "+ Array.from(users.values()));
					
				let arr = Array.from(users.values());
				let str = "ONLINE: " + arr;
				socket.emit("chat message", str);
			}
				
			if(msg.includes("/history"))
			{
				socket.emit("chat message", "HISTORY: ### (" + history.length + " lines)");
				for(let q=0; q<history.length; q++)
					socket.emit("chat message", history[q]);

				socket.emit("chat message", "#######");
			}

			if(msg.includes("/weather"))
			{
				socket.emit("chat message", "Varmaanki myrskysää. Ehkä aurinko paistaa. Kato ulos!");
			}

			if(msg.includes("/msg")) // privaviesti
			{
				let arr = msg.split(" ", 1000);
				let str = "";
				for(let q=3; q<arr.length; q++)
					str += arr[q] + " ";

				let to = arr[2];
				arr = Array.from(users.values()); // nimet

				let found = false;
				for(let q=0; q<arr.length; q++)
				{
					if(arr[q].includes(to))
					{
						found = true;
						let arrID = Array.from(users.keys()); // id:t
						let usrID = arrID[q];
						let client = ids.get(usrID);

						if(client != null)
						{
							let dt = new Date().toLocaleTimeString();
							msg = "(private message from " + arr[0] + ") ["+dt+"]  " + str;
							console.log(msg);
							socket.emit("chat message", msg); // viesti näkyviin itelle
							client.emit("chat message", msg); // viesti toiselle
							break;
						}
					}
				}
				
				if(found == false)
				{
					socket.emit("chat message", to + " user not found.");
					return;
				}					

			}

			return; // jos käytetty  /jotain  niin se rivi ei näy muille joten pois
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