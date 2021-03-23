const express = require("express");
const mysql = require("./mysql");
const router = express.Router();
const jwt = require("./jsonwebtoken");

/* 请求我们留言页码数据 */
router.get("/pageSize", (req, res) => {
  let { page } = req.query;
  /* message要返回的数据 */
  const message = {};
  /* 每页多少数据 */
  let Pagesize = 10;
  page = (page - 1) * Pagesize;
  const sqlSelect = "SELECT COUNT(*) FROM leave_message;";
  /* 一共28条数据 一页10条数据 倒叙查询 */
  const sqlPageSelect = `SELECT * FROM  leave_message ORDER BY id DESC LIMIT ${page},${Pagesize};`;
  mysql.query(sqlSelect, (err, data) => {
    if (!err) {
      /* 获取留言条数 */
      message.count = data[0]["COUNT(*)"];
      if (message.count > 0) {
        mysql.query(sqlPageSelect, async (err, data) => {
          if (!err) {
            await data.forEach((item, i) => {
              mysql.query(
                `SELECT * FROM leaveM_reply WHERE reply_username = '${item.username}' AND reply_date = '${item.date}';`,
                (err, value) => {
                  if (!err) {
                    item.replyAccess = value;
                    if (i === data.length - 1) {
                      message.data = data;
                      return res.send({ err: 0, message: message });
                    }
                  }
                }
              );
            });
          } else {
            return res.json({ err: -998, message: err.message });
          }
        });
      } else {
        message.data = [];
        return res.send({ err: -99, message: message });
      }
    } else {
      return res.json({ err: -999, message: "网络有点问题呢，稍后再试试哦！" });
    }
  });
});

/* 请求文章的页码数*/
router.get("/getnotePage", (req, res) => {
  let { page } = req.query;
  /* message要返回的数据 */
  const message = {};
  /* 每页多少数据 */
  const Pagesize = 4;
  page = (page - 1) * Pagesize;
  const sqlSelect = "SELECT COUNT(*) FROM article;";
  /* 一共28条数据 一页10条数据 倒叙查询 */
  const sqlPageSelect = `SELECT * FROM  article ORDER BY id DESC LIMIT ${page},${Pagesize};`;
  // mysql.connect(() => console.log("connect ok!"));
  mysql.query(sqlSelect, (err, data) => {
    if (!err) {
      /* 获取文章条数 */
      message.count = data[0]["COUNT(*)"];
      
      mysql.query(sqlPageSelect, (err, data) => {
        if (!err) { 
          message.data = data;
          message.data.forEach(async (item,index)=> {
            const { username } = item
            const sqlUserSelect = `SELECT * FROM user WHERE name = '${username}'`;
            const result = await splQuery(sqlUserSelect)
            
            message.data[index].uploadimg = result[0].uploadimg;
            if (index === message.data.length - 1) {
               return res.send({ err: 0, message: message });
            }
          })  
        } else {
          return res.json({ err: -998, message: err.message });
        }
      });
    } else {
      return res.json({ err: -999, message: "网络有点问题呢，稍后再试试哦！" });
    }
  });
});

/* 请求文章的页码数*/
router.post("/getUserArticle", (req, res) => {
  let { page, token } = req.body;
  const message = {};
  /* 每页多少数据 */
  const Pagesize = 4;
  page = (page - 1) * Pagesize;
  /* 一共28条数据 一页10条数据 倒叙查询 */
  jwt.verifyToken(token).then((data) => {
    console.log(data.token.username)
    const username = data.token.username
  const sqlPageSelect = `SELECT * FROM article a inner join user on a.username = '${username}' AND a.username = user.username ORDER BY a.id DESC LIMIT ${page},${Pagesize};`;

    const sqlSelect = `SELECT COUNT(*) FROM article WHERE username = '${username}';`;
    mysql.query(sqlSelect, (err, data) => {
      if (!err) {
        /* 获取文章条数 */
        message.count = data[0]["COUNT(*)"];
        mysql.query(sqlPageSelect, (err, data) => {
          if (!err) {
            message.data = data;
            return res.send({ status: 200, message: message });
          } else {
            return res.json({ err: -998, message: err.message });
          }
        });
      } else {
        return res.json({ err: -999, message: "网络有点问题呢，稍后再试试哦！" });
      }
    });
  })
})

/*删除文章*/
router.get("/deleteArticle", async (req, res) => {
  let { article_id } = req.query;
  const sql = `DELETE FROM article WHERE article_id = '${article_id}';`
  try {
    await splQuery(sql)
    return res.send({ status: 200, message: '删除文章成功！' });
  } catch (e) {
    return res.send({status:500,message:'删除失败啦！'})
  } 
})
function splQuery(sql) {
  return new Promise((resolve, reject) => {
     mysql.query(sql, (err, data) => {
       if (!err) {
        resolve(data)
       } else {
         reject('查询错误')
      }
    })
  })
 
}
module.exports = router;
