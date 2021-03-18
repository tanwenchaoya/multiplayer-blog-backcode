var express = require("express");
var router = express.Router();
var svgCaptcha = require("svg-captcha");
const mysql = require("./mysql");
const send = require("../sendmailer/mailsend");
const Jwt = require("./jsonwebtoken");
const { UpdateUser } = require("./updateUser");
const redisClient = require("../db/redis");
const {
  verifyImageCaptcha,
  sendEmail,
  verifyEmailCaptcha,
} = require("../utils/utils");

/* 登陆注册结合的一个接口 */
router.post("/login", async (req, res) => {
  const { username, password, email, captcha, registerType } = req.body;
  mysql.connect(() => console.log("connect ok!"));
  /* 如果不存在邮箱 那么就是登陆状态 */
  try {
    let verresult = await verifyImageCaptcha(captcha);
    if (registerType === "normal") {
      mysql.query(
        `SELECT * FROM user WHERE username = '${username}' AND password = '${password}';`,
        (err, data) => {
          if (!err) {
            if (data[0] != null) {
              /* 登陆成功 我们直接就生成一个token给的用户传递过去 */
              const token = Jwt.createToken({
                username: username,
                login: true,
              });
              return res.send({ status: 200, data: data, token: token });
            } else {
              return res.json({
                status: 500,
                message: "查询不到该用户,先去注册吧!",
              });
            }
          } else {
            return res.json({
              status: 500,
              message: "查询出错,请检查你的信息在进行操作！",
            });
          }
        }
      );
    } else {
      mysql.query(
        `SELECT * FROM user WHERE email = '${email}' AND password = '${password}';`,
        (err, data) => {
          if (!err) {
            if (data[0] != null) {
              /* 登陆成功 我们直接就生成一个token给的用户传递过去 */
              const token = Jwt.createToken({
                username: email,
                login: true,
              });
              console.log(data);
              return res.send({ status: 200, data: data, token: token });
            } else {
              return res.json({
                status: 500,
                data: "查询不到该用户,先去注册吧!",
              });
            }
          } else {
            return res.json({
              status: 500,
              message: "查询出错,请检查你的信息在进行操作！",
            });
          }
        }
      );
    }
  } catch (e) {
    return res.json({ status: 500, message: e });
  }
});
router.post("/register", async (req, res) => {
  const { username, password, email, captcha } = req.body;

  if (email) {
    try {
      await verifyEmailCaptcha(captcha);
      mysql.query(
        `INSERT INTO user(name,username,email,password) VALUES('${email}','${email}','${email}','${password}');`,
        (err) => {
          if (!err) {
            return res.send({ status: 200, message: "注册成功" });
          } else {
            return res.send({
              status: 500,
              message: "注册的账号已经被别人抢先注册啦!",
              // message:err
            });
          }
        }
      );
    } catch (e) {
      return res.json({ status: 500, message: e });
    }
  } else {
    try {
      await verifyImageCaptcha(captcha);
      mysql.query(
        `INSERT INTO user(name,username,password) VALUES('${username}','${username}','${password}');`,
        (err) => {
          console.log(err);
          if (!err) {
            return res.send({ status: 200, message: "注册成功" });
          } else {
            return res.send({
              status: 500,
              message: "注册的账号已经被别人抢先注册啦!",
              // message:err
            });
          }
        }
      );
    } catch (e) {
      return res.json({ status: 500, message: e });
    }
  }
});
router.get("/emailCode", async (req, res) => {
  const { email } = req.query;
  const result = await sendEmail(email);
  if (result) {
    return res.json({ status: 200, message: "发送成功" });
  } else {
    return res.json({ status: 500, error: "发送失败" });
  }
});
router.get("/ImageCode", (req, res) => {
  const c = svgCaptcha.create({
    noise: 3,
    background: "#ccc",
    ignoreChars: "0oOilI",
    width: 90,
    height: 40,
  });
  // return res.json(c.data);
  redisClient.set(
    "imgCode",
    JSON.stringify({
      code: c.text,
      expire: Date.now() + 60 * 1000,
    })
  );
  return res.send(c.data);
});
/* 邮箱验证 */
router.post("/emailInfo", (req, res) => {
  const { email } = req.body;
  let code = parseInt(Math.random() * 999999);
  send(email, code)
    .then((v) => {
      req.session.registerCode = code;
      // console.log(req.session.registerCode);
      return res.json({ err: 0 });
    })
    .catch((reason) => {
      // console.log(reason);
      return res.json({ err: -999, message: reason });
    });
});

/* 获取用户信息 */
router.post("/getuserInfo", (req, res) => {
  const { token } = req.body;
  Jwt.verifyToken(token)
    .then((data) => {
      mysql.query(
        `SELECT name,info,uploadimg FROM user WHERE username = '${data.token.username}';`,
        (err, data) => {
          if (!err) {
            return res.send({ err: 0, Info: data });
          } else {
            return res.send({ err: -999, message: "出错了!" });
          }
        }
      );
    })
    .catch((err) => {
      /* token 过期 */
      if (err.name === "TokenExpiredError") {
        return res.json({ err: -998, message: "登陆信息已过期请重新登陆!" });
      } else {
        return res.json({ err: -999, message: "非法的token!" });
      }
    });
});

/* 提交用户信息 */
router.post("/primaryInfo", (req, res) => {
  const { name, Info, token, Imgsrc } = req.body;
  Jwt.verifyToken(token)
    .then((data) => {
      mysql.query(
        `UPDATE user SET name='${name}',uploadimg='${Imgsrc}',info='${Info}' WHERE username='${data.token.username}';`,
        (err) => {
          if (!err) {
            /* 这里还需要进行留言中的信息更新 */
            const sqlUpdate = `UPDATE leave_message SET name='${name}',Imgsrc='${Imgsrc}' WHERE username='${data.token.username}';`;
            /* 当然首先进行查找留言中有没有和个人的留言信息 如果有的话我们就进行修改没有的话就返回 */
            const sqlSelect = `SELECT name FROM leave_message WHERE username = '${data.token.username}';`;
            const promise1 = UpdateUser(sqlSelect, sqlUpdate);
            /* 文章评论信息更新 */
            const accessUpdate = `UPDATE access_message SET name='${name}',Imgsrc='${Imgsrc}' WHERE username='${data.token.username}';`;
            const accessSelect = `SELECT name FROM access_message WHERE username = '${data.token.username}';`;
            const promise2 = UpdateUser(accessSelect, accessUpdate);

            /* 留言回复中的信息更新 */
            const replyUpdate = `UPDATE leaveM_reply SET name='${name}',user_imgsrc='${Imgsrc}' WHERE username='${data.token.username}';`;
            const replySelect = `SELECT name FROM leaveM_reply WHERE username = '${data.token.username}';`;
            const promise3 = UpdateUser(replySelect, replyUpdate);

            /* 详情文章页回复中的信息更新 */
            const replydetail = `UPDATE detail_reply SET name='${name}',user_imgsrc='${Imgsrc}' WHERE username='${data.token.username}';`;
            const replydetailSelect = `SELECT name FROM detail_reply WHERE username = '${data.token.username}';`;
            const promise4 = UpdateUser(replydetailSelect, replydetail);

            Promise.all([promise1, promise2, promise3, promise4])
              .then((V) =>
                res.json({
                  err: 0,
                  message: "小主您的信息修改成功啦ヾ(≧▽≦*)o!",
                })
              )
              .catch((E) =>
                res.json({
                  err: -998,
                  message:
                    "更新其他信息失败，网络可能出了点小问题，稍后再试试吧!",
                })
              );
          } else {
            return res.json({
              err: -999,
              message: "信息修改失败啦!检查一下网络再试试叭！",
            });
          }
        }
      );
    })
    .catch((err) => {
      /* token 过期 */
      if (err.name === "TokenExpiredError") {
        return res.json({ err: -998, message: "登陆信息已过期请重新登陆!" });
      } else {
        return res.json({ err: -999, message: "非法的token!" });
      }
    });
});

/* 获取用户信息 */
router.get("/getUserInfo", (req, res) => {
  mysql.query(`SELECT * FROM user`, (err, result) => {
    if (!err) {
      return res.json({ err: 0, message: result });
    } else {
      return res.json({ err: -999, message: "出错了!" });
    }
  });
});

/* 删除用户信息 */
router.post("/deleteUserInfo", (req, res) => {
  const { username } = req.body;
  mysql.query(`DELETE FROM user WHERE username = '${username}'`, (err) => {
    if (!err) {
      return res.json({ err: 0, message: "用户信息删除成功!" });
    } else {
      return res.json({
        err: -999,
        message: "删除失败，检查网路后再重新尝试吧!",
      });
    }
  });
});
// 验证管理员是否为登录状态
router.get("/adminIslogined", (req, res) => {
  if (req.session.adminlogin) {
    return res.json({ err: 0, message: "欢迎回来最帅的站长!" });
  } else {
    return res.json({ err: -999, message: "您还没有登陆,请先去登陆！" });
  }
});

// 后台登陆验证
router.post("/adminUserCheck", (req, res) => {
  const { password, username } = req.body;
  const checksql = "SELECT * FROM admin WHERE username = ? AND password = ?";
  const parmas = [username, password];
  mysql.query(checksql, parmas, (err, value) => {
    if (!err) {
      if (value.length > 0) {
        // 存在
        req.session.adminlogin = true;
        return res.json({ err: 0, message: "欢迎进入博客后台管理系统!" });
      } else {
        return res.json({
          err: -999,
          message: "对不起您不是管理员用户, 不能进入该区域!",
        });
      }
    } else {
      return res.json({ err: -998, message: "查询错误。" });
    }
  });
});

// 后台退出
router.get("/adminExit", (req, res) => {
  req.session.destroy();
  return res.json({ err: 0, message: "退出后台管理成功！" });
});
module.exports = router;
