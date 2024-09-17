const {
	default: makeWASocket,
	useMultiFileAuthState,
	DisconnectReason,
	makeInMemoryStore,
	jidDecode,
	proto,
	getContentType,
} = require("@adiwajshing/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const axios = require("axios");
const _ = require("lodash");
const write = require("./modules/console");
//const handler = require("./modules/handler")
const config = require("./shop/config");

async function connectWa() {
	const { state, saveCreds } = await useMultiFileAuthState(`./${config.sessionName ? config.sessionName : "session"}`);
	write("starting connection", "ylw", 1);
	
	const client = makeWASocket({
    	logger: pino({ level: 'silent' }),
		printQRInTerminal: true,
    	auth: state,
	});

	client.ev.on("messages.upsert", async (chatUpdate) => {
    	try {
			msg = chatUpdate.messages[0];
			if (!msg.message) return;
			msg.message = Object.keys(msg.message)[0] === "ephemeralMessage" ? msg.message.ephemeralMessage.message : msg.message;
			if (msg.key && msg.key.remoteJid === "status@broadcast") return;
			if (!client.public && !msg.key.fromMe && chatUpdate.type === "notify") return;
			if (msg.key.id.startsWith("BAE5") && msg.key.id.length === 16) return;
    		require("./modules/handler")(msg, client)
			//handler(msg, client);
    	} catch (err) {
    		write(err, "red", 2);
		}
	});
	// Handle error
	const unhandledRejections = new Map();
	process.on("unhandledRejection", (reason, promise) => {
		unhandledRejections.set(promise, reason);
    	write("Unhandled Rejection at:"+ promise+ "reason: "+ reason, "ylw", 3);
	});
	process.on("rejectionHandled", (promise) => {
    	unhandledRejections.delete(promise);
	});
	process.on("Something went wrong", function (err) {
    	write("Caught exception: "+ err, "red", 2);
	});   // console.log('Connected...', update)
	client.public = true;

	client.ev.on("connection.update", async (update) => {
    	const { connection, lastDisconnect } = update;
    	if (connection === "close") {
    		let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
    		if (reason === DisconnectReason.badSession) {
        		write("Bad Session File, Please Delete Session and Scan Again", "ylw", 3);
        		process.exit();
    		} else if (reason === DisconnectReason.connectionClosed) {
        		write("Connection closed, reconnecting....", "ylw", 3);
        		connectWa();
    		} else if (reason === DisconnectReason.connectionLost) {
    			write("Connection Lost from Server, reconnecting...", "ylw", 3);
        		connectWa();
    		} else if (reason === DisconnectReason.connectionReplaced) {
        		write("Connection Replaced, Another New Session Opened, Please Restart Bot", "ylw", 3);
        		//process.exit();
    		} else if (reason === DisconnectReason.loggedOut) {
        		write("Device Logged Out, Please Delete Folder Session and Scan Again.", "ylw", 3);
        		process.exit();
    		} else if (reason === DisconnectReason.restartRequired) {
        		write("Restart Required, Restarting...", "ylw", 3);
        		connectWa();
    		} else if (reason === DisconnectReason.timedOut) {
        		write("Connection TimedOut, Reconnecting...", "ylw", 3);
        		connectWa();
    		} else {
    			write(`Unknown DisconnectReason: ${reason}|${connection}`, "ylw", 3);
        		connectWa();
    		}
    	} else if (connection === "open") {
    		write("Bot success connected to server", "grn", 1);
    		client.sendMessage(config.owner[0] + "@s.whatsapp.net", { text: `*Bot started!* \n\n\n\`${config.important}\`` });
    	}
	});
	client.ev.on("creds.update", saveCreds);
	return client;
}

connectWa();

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  write(`Update ${__filename}`,"grn",1);
  delete require.cache[file];
  require(file);
});
