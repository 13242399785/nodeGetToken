// 引入express模块
var express = require("express");
var request = require('request'); 
var app = express();
var config = require("./config"); //引入配置文件
const sign = require("./sign.js"); //微信提供在开发文档可以找到下载到本地
var WeChat = require("./wechat/wechat"); 
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: true}));//创建 application/x-www-form-urlencoded 编码解析
app.use(bodyParser.json())
var wechat = new WeChat(config); //实例化一个WeChat对象
app.use(express.static("public"))
var sha1 = require("sha1"); //引入加密模块

const NodeCache = require('node-cache')
const myCache = new NodeCache({stdTTL: 3600, checkperiod: 3600}) //3600秒后过过期
//设置跨域访问
app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By",' 3.2.1');
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
});
app.get("/", (req, res, next)=> {
    wechat.auth(req, res, next);
})

// let wxData=sign('jsapi_ticket', 'http://35e44127a4.zicp.vip/airkiss');
// console.log(config.appID,config.appScrect);

app.use('/wxJssdk/getJssdk', (req, res) => {
    const grant_type = 'client_credential'
    const appid = config.appID
    const secret = config.appScrect
    let cacheTicket=myCache.get('ticket',true);//获取缓存
    console.log(cacheTicket)
    if(cacheTicket){
      let jsapi_ticket = cacheTicket
          let nonce_str = 'tokendemo'    // 密钥，字符串任意，可以随机生成
          let timestamp = new Date().getTime()  // 时间戳
          let url = req.query.url   // 使用接口的url链接，不包含#后的内容
          // console.log(req.body)
          let str = 'jsapi_ticket=' + jsapi_ticket + '&noncestr=' + nonce_str + '&timestamp=' + timestamp + '&url=' + url
          // 用sha1加密
          let signature = sha1(str)
          res.send({
            jsapi_ticket:jsapi_ticket,
            appId: appid,
            timestamp: timestamp,
            nonceStr: nonce_str,
            signature: signature,
          })
    }else{
      // 获取token
      request('https://api.weixin.qq.com/cgi-bin/token?grant_type=' + grant_type + '&appid=' + appid + '&secret=' + secret, (err, response, body) => {
        let access_token = JSON.parse(body).access_token
        // 获取jsapi_ticket
        request('https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=' + access_token + '&type=jsapi', (err, response, body) => {
          let jsapi_ticket = JSON.parse(body).ticket
          let nonce_str = 'tokendemo'    // 密钥，字符串任意，可以随机生成
          let timestamp = new Date().getTime()  // 时间戳
          let url = req.query.url   // 使用接口的url链接，不包含#后的内容
          myCache.set("ticket", jsapi_ticket, 7000);//时间单位为S

          // 将请求以上字符串，先按字典排序，再以'&'拼接，如下：其中j > n > t > u，此处直接手动排序
          let str = 'jsapi_ticket=' + jsapi_ticket + '&noncestr=' + nonce_str + '&timestamp=' + timestamp + '&url=' + url
          
          // 用sha1加密
          let signature = sha1(str)

          res.send({
            jsapi_ticket:jsapi_ticket,
            appId: appid,
            timestamp: timestamp,
            nonceStr: nonce_str,
            signature: signature,
          })
        })
      })
    }
    
})

// 监听3030端口
app.listen(3030, function() { 
    console.log('run server')
})