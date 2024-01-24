colors={
	"wht":"\033[00m",
	"red":"\033[31m",
	"grn":"\033[32m",
	"ylw":"\033[33m",
	"blu":"\033[34m",
}

module.exports = write = (txt, color="wht", type=0)=>{
	toWrite= type==0 ? "" : type == 1 ? `${colors["grn"]}[LOG]${colors["wht"]} ` : type==2 ? `${colors["red"]}[ERROR]${colors["wht"]} ` : `${colors["ylw"]}[#]${colors["wht"]} `;
	if(colors[color]){
		toWrite=toWrite+colors[color]+txt+colors["wht"];
	}else{
		toWrite=toWrite+txt;
	}
	console.log(toWrite);
}
