const {
	BufferJSON,
	WA_DEFAULT_EPHEMERAL,
	generateWAMessageFromContent,
	proto,
	generateWAMessageContent,
	generateWAMessage,
	prepareWAMessageMedia,
	areJidsSameUser,
	getContentType 
} = require("@adiwajshing/baileys");
const fs = require("fs");
const util = require("util");
const write = require("../modules/console");
const config = require("../shop/config")
const db = require("../shop/db.json")
const articles = require('../shop/articles.json');
const exec = require('child_process').exec
var save = true;
module.exports = handler = async (m, client) => {
	type=Object.keys(m.message)[0];
    var prefix = '/'; 
	try {
		var body =
			type === "conversation"
        	? m.message.conversation
        	: type == "imageMessage"
        	? m.message.imageMessage.caption
        	: type == "videoMessage"
        	? m.message.videoMessage.caption
        	: type == "extendedTextMessage"
        	? m.message.extendedTextMessage.text
        	: type == "buttonsResponseMessage"
        	? m.message.buttonsResponseMessage.selectedButtonId
        	: type == "listResponseMessage"
        	? m.message.listResponseMessage.singleSelectReply.selectedRowId
        	: type == "templateButtonReplyMessage"
        	? m.message.templateButtonReplyMessage.selectedId
        	: type === "messageContextInfo"
        	? m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text
        	: "";
    	const isCmd = body.startsWith(prefix) || body.includes("@"+config.botNumber);
    	const command = body.replace(prefix, "").trim().split(/ +/).shift().toLowerCase();
    	const args = body.trim().split(/ +/).slice(1);
    	const pushname = m.pushName || "No Name";
    	const text = (q = args.join(" "));
    	const chat = m.key.remoteJid;
    // Group
		const isGroup = m.key.remoteJid.includes("@g.us"); 
    	const from=isGroup ? m.key.participant : chat;
	    const groupMetadata = isGroup ? await client.groupMetadata(chat).catch((e) => {}) : "";
    	const groupName = isGroup ? groupMetadata.subject : "";
		const participants = isGroup ? groupMetadata.participants.map(k => k.id) :[];
		const admins = isGroup ? groupMetadata.participants.map(k =>{return k.admin ? k.id:null; }):[];
		
		const isOwner = config.owner.includes(from.split("@")[0]);
		const isAdmin = admins.includes(from);
    // Push Message To Console
	    let msgLog = body.length > 30 ? `${q.substring(0, 30)}...` : body;

    	if (isCmd && !isGroup) {
    		write(msgLog+" From "+pushname+` [${chat.replace("@s.whatsapp.net", "")}]`, "ylw", 1);
    	} else if (isCmd && isGroup) {
			write(msgLog+" From "+pushname+` [${from.replace("@s.whatsapp.net", "")}]`+" IN " +groupName, "ylw", 1);
    	}
		async function reply(txt){
			await client.sendMessage(chat, { text: txt}, {quoted:m});
		}
		if(save && isCmd){
			if(isGroup){
				if(!db.groups.map(k => k.id).includes(groupMetadata.id)){
					write("New Group "+groupName, "grn", 1)
					db.groups.push(groupMetadata)
					writeJson("shop/db.json", db)	
				}
			}
			if(!db.users.map(k => k.id).includes(from)){
				write("New User "+ pushname, "grn", 1)
				db.users.push({"id":from, "name":pushname})
				writeJson("shop/db.json", db)
			}
		}

const commands = {
	hola:(args=[])=>({
    	args,
    	help:"Devuelve un saludo",
    	run(){
        	if(this.args[0]=="-h"){
                reply(this.help)
                return this.help
            }
            reply('🌱 Hola '+pushname+" 🌱");
        }
    }),
	tag:(args=[])=>({
    	args,
    	help:"\tMenciona a todos los integrantes de un grupo",
    	run(){
        	if(this.args[0]=="-h"){
                reply(this.help)
                return this.help
            }
            if(isAdmin) client.sendMessage(chat , {text:text, mentions:participants})
        }
    }),
	info:(args=[])=>({
        args,
		help:"Muestra la informacion del servidor",
        run(){
            if(this.args[0]=="-h"){
                reply(this.help)
                return this.help
            }
            segundosP=process.uptime()
            const segundos = (Math.round(segundosP % 0x3C)).toString();
            const horas    = (Math.floor(segundosP / 0xE10)).toString();
            const minutos  = (Math.floor(segundosP / 0x3C ) % 0x3C).toString();    
            let time=`${horas} HH, ${minutos} MM, ${segundos} SS`;
	        info="> Online: \t`"+ time +"`\n"+"> RAM: \t`"+Math.round((process.memoryUsage().rss)/1024/1024) + " mb`\n> Node: `"+process.version+"`";
    	    reply(info);
        }
    }),
	lista:(args=[])=>({
		args,
		help:"Muestra la lista de plantitas disponibles",
		run(){
            if(this.args[0]=="-h"){reply(this.help); return;}
			i=1;
			strList="";
			articles.map(k=>{
				strList=strList.concat("🌱  "+ i + " : ");
				strList=strList.concat(k.name + " 🌱\n")
				i++;
			});
			reply(strList);
		}
	}),
	ver:(args=[])=>({
		args,
		help:"Muestra una plantita",
		run(){
            if(this.args[0]=="-h"){reply(this.help); return;}
			if(this.args[0]>articles.length) return;
			article=articles[args[0]-1];
			strMsg="> ```🌱 Nombre:``` \n\t\t" + article.name;
			strMsg=strMsg.concat("\n> ```🌱 Precio:``` \n\t\tBs. " + article.price);
			strMsg=strMsg.concat("\n> ```🌱 Nombre Cientifico:``` \n\t\t" + article.scientificName);
			strMsg=strMsg.concat("\n> ```🌵 CUIDADOS 🌵```\n\t_" + article.cuidados+"_");
			client.sendMessage(chat, {image:{url:"media/"+article.picture}, caption:strMsg})
		}
	}),
	add:(args=[])=>({
		args,
		help:"Agrega un articulo\nEjemplo:\n\t/add nombre, precio, nombre cientifico, cuidados",
		run(){
            if(this.args[0]=="-h"){reply(this.help); return;}
			if(!isOwner) return
			id=Math.floor(Math.random()*100)
			param=text.split(", ")
			json={
				"id": id,
				"price": param[1],
				"name": param[0],
				"picture": "plant.jpg",
				"scientificName": param[2],
				"anotherNames": "voidplant goodPlant",
				"cuidados": param[3]
			}
			articles.push(json)
			writeJson("shop/articles.json", articles)
			reply("Articulo agregado con exito");
		}
	}),
	del:(args=[])=>({
		args,
		help:"elimina un articulo\nEjemplo\n\t/del 1",
		run(){
			if(this.args[0]=="-h"){reply(this.help); return;}
			if(!isOwner) return
			articles.splice(args[0]-1,1)
			writeJson("shop/articles.json", articles)
			reply("Articulo eliminado con exito");

		}
	}),
	menu:(args=[])=>({
    	args,
    	help:"Muestra la lista de comandos disponibles",
    	run(){
        	if(this.args[0]=="-h"){
            	reply(this.help)
            	return this.help
            }
            let menutext=""
            for(key in commands){
                help=commands[key]({}).help.split("\n")[0];
                menutext=menutext.concat(prefix+key+"\t```"+help+"```\n")
            }
            reply(menutext)
        }
    }),
	broadcast:(args=[])=>({
    	args,
    	help:"Envia un mensaje a todos los usuarios registrados",
    	run(){
        	if(this.args[0]=="-h"){
                reply(this.help)
                return this.help
            }
			if(!isOwner) return
			db.users.map(user => {
				client.sendMessage(user.id, {text: text } )
			})
        }
    })
}
		if (isCmd) {
			try{
				commands[command](args).run();	
			}catch(e){
				write(e.toString(), "red", 2)
				suggest=""
		        porc=100/command.length
        		sim=0
		        for(key in commands){
        	    	d=key.split('')
        			e=command.split('')
            		act=0
            		for(j in d){
                		if(d[j]==e[j]){act+=porc}
            		}
            		if(act>sim){
                		suggest=key
                		sim=act
            		}
        		}
        		if(sim>=50){
            		reply("Comando no encontrado\n\nSugerencia:  *"+suggest+"*  "+sim+"%\n\n*"+prefix+"menu*   Para ver todos los comandos" )
            		return
        		}else{
					write("Command: \""+command+"\" not found", "wht", 1)
				}
			}
		}
		if(body.startsWith(">") && isOwner){
        	cmd = body.slice(2);
			try{
				a=await JSON.stringify(eval(cmd),null,'\t')
				reply(a)
			} catch(e){
				reply('[#] '+e)
            	console.log(e)
			}
		}
		if(body.startsWith("$") && isOwner){
	        cmd = body.slice(2);
			exec(cmd, (err, stdout) => {
				if (err) return reply(`[#] ${err}`);
				if (stdout) {
					reply(stdout);
				}
			});
		}
	} catch (err) {
    	//reply(util.format(err), chat);
		write(err, "red", 2)
	}
};

const writeJson = (file, data)=>{
    try{
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        return 1;
    } catch(e){
		write(e.toString(), "red", 2)
        return e;
    }
}

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(`Update ${__filename}`);
  delete require.cache[file];
  require(file);
});
