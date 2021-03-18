#### 说一下主要的几个目录

`routes`为接口路由文件。

`sendmailer`为注册账号时候发送验证码的脚本。

`utils`是封装的工具方法。

`bin` 里面是启动的入口文件。

#### 1. 安装依赖

```js
npm install // 安装后台依赖
```

#### 2.启动服务

```js
node ./bin/www
```

也可以安装`nodemon`来启动项目，后台的热更新，本地开发推荐使用此方法。

##### 2.1 nodemon 的安装

```js
npm install -g nodemon
```

##### 2.2 使用 nodemon 启动项目

```js
nodemon ./bin/www
```

想看接口地址的话具体看`app.js `和 路由文件吧

over~
