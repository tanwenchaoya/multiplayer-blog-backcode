const redisClient = require("../db/redis");
const nodemailer = require("nodemailer");
let transporter;
const smtp = {
  host: "smtp.qq.com",
  port: 465,
  user: "1781104182@qq.com", // 发送邮件的邮箱
  pass: "wfuuwdnquqgldjbc", // 授权码
};
function verifyImageCaptcha(clientCode) {
  //从redis取出验证码信息
  return new Promise((resolve, reject) => {
    let serviceCaptcha;
    redisClient.get("imgCode", (err, data) => {
      serviceCaptcha = JSON.parse(data);
      let serverCode, serviceExprire;
      try {
        serverCode = serviceCaptcha.code.toLowerCase();
        serviceExprire = serviceCaptcha.expire;
      } catch (e) {
        //不论验证成功或失败都需要重新获取验证码，只能用一次
        redisClient.set("imgCode", "");
        // throw new Error("请重新获取验证码");
        reject("请重新获取验证码");
      }
      console.log(serverCode.toLowerCase(), clientCode);

      if (Date.now() > serviceExprire) {
        //不论验证成功或失败都需要重新获取验证码，只能用一次
        redisClient.set("imgCode", "");
        // throw new Error("验证码过期");
        reject("验证码过期");
      } else if (serverCode !== clientCode) {
        //不论验证成功或失败都需要重新获取验证码，只能用一次
        redisClient.set("imgCode", "");

        // throw new Error("验证码错误");
        reject("验证码错误");
      }
      resolve('成功')
      redisClient.set("imgCode", "");
    });
  });
}

function createTransporter() {
  // 创建发送者对象
  if (transporter) {
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: true, // true for 465, false for other ports
    auth: {
      user: smtp.user, // 发送邮件的邮箱
      pass: smtp.pass, // 授权码
    },
  });
  return transporter;
}
function createInfo(to) {
  //创建邮件信息
  let code = Math.random().toString(16).slice(3, 7).toUpperCase();
  let info = {
    from: "1781104182@qq.com", // sender address
    to: to, // list of receivers
    subject: "Hello ✔", // Subject line
    text: `你正在注册programming，你的验证码是${code}`, // plain text body
  };
  redisClient.set(
    "emailCode",
    JSON.stringify({
      code: code,
      expire: Date.now() + 60 * 1000 * 3,
    })
  );
  return info;
}

async function sendEmail(to) {
  //发送邮件
  const transporter = createTransporter();
  const info = createInfo(to);
  return new Promise((resolve, reject) => {
    transporter.sendMail(info, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

function verifyEmailCaptcha(clientCode) {
  return new Promise((resolve, reject) => {
     //从redis取出验证码信息
  redisClient.get("emailCode", (err, data) => {
    data = JSON.parse(data);
    let serverCode, serviceExprire;
    try {
      serverCode = data.code;
      serviceExprire = data.expire;
    } catch (e) {
      // throw new Error("请重新获取验证码");
        reject("请重新获取验证码");

    }
    if (Date.now() > serviceExprire) {
      // throw new Error("验证码过期");
        reject("验证码过期");

    } else if (serverCode !== clientCode) {
      // throw new Error("验证码错误");
        reject("验证码错误");

    }
      resolve('成功')
    redisClient.set("emailCode", "");
  });
  })
 
}
module.exports = { verifyImageCaptcha, sendEmail, verifyEmailCaptcha };
