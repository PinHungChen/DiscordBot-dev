// const config = require('./config.json');
const { Client,Collection, Intents,MessageEmbed} = require('discord.js');
const auth = require('./auth.json');
const {CLIENT_ID, CHANNEL_ID } = require(`./config.json`);
var { holidays, userInfo } = require(`./config.json`);
const fs = require('fs')
const request = require('request');
const cheerio = require('cheerio');


const client = new Client(
    { intents: [
  Intents.FLAGS.GUILDS,
  Intents.FLAGS.GUILD_MESSAGES,
  Intents.FLAGS.DIRECT_MESSAGES
], partials: [
  Intents.FLAGS.CHANNEL
]}
); //v13 需聲明 intents
const channel = client.channels.cache;
// console.log(auth.key);
client.login(auth.key)//使用bot鴨子帳戶


client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  checkTime();
});

client.on('messageCreate', message => {
    console.log(`[${message.channel.name}]${message.author.username}: ${message.content}`);
    //message.channel.name 房名
    //message.author.username username
    //message.content 說話內容
    console.log(message.author.id);
    console.log(message.channel.id);
    if (message.member.user.bot) return; //判斷是否為機器人回覆

    if (message.content === 'ping') {
    message.channel.send('ping');
    }
    else if (message.content === 'Good') {
      message.channel.send('duck');
     }
     else if (message.content ==="幾點"){
      let now = new Date();
       message.channel.send('伺服器時間' + now.getHours() +' 時');
       message.channel.send( '台灣時間');
       now.setHours(now.getHours() + 8);
       message.channel.send((now.getMonth() + 1)+' 月');
       message.channel.send(now.getDate()+' 日');
       message.channel.send(now.getHours() + ' 時');
       message.channel.send(now.getMinutes()+' 分');

     }
     else if (message.content === `<@!${CLIENT_ID}>` || message.content === `<@${CLIENT_ID}>`) {
      message.channel.send("?");}
    else if (message.content === '安安') {
      message.channel.send('歡迎咱們的小客');
     }

     else if (message.content === `<@!${CLIENT_ID}> alturl` || message.content === `<@${CLIENT_ID}> alturl`) {
      message.reply('請告訴我您的簽到網址').then(() => {
        
        const filter = m => message.author.id === m.author.id;
        console.log(filter);
        const collector = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });
        collector.on('collect', m => {
          let newUser = {
            "id": parseInt(message.author.id),
            "url": m.content
          }
          updateUrl(newUser)
          m.reply('我知道了！建議您@我輸入`checkin`指令測試自動簽到');
          setTimeout(() => m.delete(), 10000)
        });
      });
    }

    else if (message.content === `<@!${CLIENT_ID}> checkin` || message.content === `<@${CLIENT_ID}> checkin`) {
      let idExist = false;
      for (let i = 0; i < userInfo.length; i++) {
        if (userInfo[i].id == message.author.id) {
          checkin(userInfo[i].url, message.channel.id);
          idExist = true;
        }
      }
      if (idExist == false) {
        message.reply('我還不知道您的簽到網址，請@我輸入`alturl`指令新增/修改您的簽到網址');
      }
    } else if (message.content === `<@!${CLIENT_ID}> checkinall` || message.content === `<@${CLIENT_ID}> checkinall`) {
      checkinAll();}
  });

  function checkTime() {
    let now = new Date();
    now.setHours(now.getHours() + 8); //甲骨文雲端時區為UTC+0 改為台灣UTC+8
    let month = now.getMonth() + 1;
    let date = now.getDate();
    let hour = now.getHours();
    let min = now.getMinutes();
    // channel.get(CHANNEL_ID).send(`${month}/${date} ${hour}:${min}`);
    //如果 date 不在休假日陣列裡回傳 -1
    if ((holidays[0][month].indexOf(date)) == -1) {
      if ((hour == 8 && min == 45) || (hour == 16 && min == 35)) {
        checkinAll();
        let embed = new MessageEmbed()
          .setColor('#FEE75C')
          .setTitle(`已經${hour}:${min}了，記得去打卡阿！`);
          channel.get(CHANNEL_ID).send({ embeds: [embed] });
      }
    }
    setTimeout(checkTime, 60000);
  }
  
  function updateUrl(newUser) {
    //先將原本的 json 檔讀出來
    fs.readFile(`./config.json`, function (err, jsondata) {
      if (err) {
        return console.error(err);
      }
      let idExist = false;
      //將二進制數據轉換為字串符再轉換為 JSON 對象
      let conf = JSON.parse(jsondata.toString());
      //將數據讀出來並修改指定部分，在這邊我是修改 id 最大的用戶的資料
      for (let i = 0; i < conf.userInfo.length; i++) {
        if (conf.userInfo[i].id == newUser.id) {
          conf.userInfo[i].url = newUser.url;
                  userInfo[i].url = newUser.url;
          idExist = true;
        }
      }
      if (idExist == false) {
        //將傳來的資訊推送到數組對象中
        conf.userInfo.push(newUser);
        userInfo.push(newUser);
      }
      //因為寫入文件（json）只認識字符串或二進制數，所以需要將json對象轉換成字符串
      let str = JSON.stringify(conf);
      //將字串符傳入您的 json 文件中
      fs.writeFile(`./config.json`, str, function (err) {
        if (err) {
          return console.error(err);
        }
      })
    })
  }
  
  function checkinAll() {
    for (let i = 0; i < userInfo.length; i++) {
      checkin(userInfo[i].url, CHANNEL_ID);
    }
  }
  
  function checkin(url, channelid) {
    request(url, function (error, _response, body) {
      if (!error) {
        let $ = cheerio.load(body);
        let x = $('p').eq().text();
        let course_name = $('p').eq(0).text().split('：');
        let student_name = $('p').eq(1).text().split('：');
        let attend_time = $('p').eq(2).text().split('：');
        let embed = new MessageEmbed()
          .setColor('#57F287')
          .addField(course_name[0], course_name[1], true)
          .addField(student_name[0], student_name[1], true)
          .addField(attend_time[0], attend_time[1], true);
          
        channel.get(channelid).send({ embeds: [embed] });
      } else {
        let embed = new MessageEmbed()
          .setColor('#ED4245')
          .setTitle('自動簽到失敗!');
        channel.get(channelid).send({ embeds: [embed] });
      }
    });
  }


