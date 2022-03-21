//用第三方模組Express.js
//用 NPM(Node Package Manager)做模組管理

//初始化mongodb資料庫連線
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://customer:customer@mycluster.cabbt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(async err => {
  if(err){
      console.log(err)
      return;
  }else{
      console.log("DB ready");
  }
});

const express = require("express");
const app = express();

//post方法
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended:true}));

//用session驗證該使用者是否已經登入過
const session = require('express-session')
app.use(session({
    secret: 'keyboard cat',//不要讓別人知道
    resave: false,
    saveUninitialized: true
  }))

//使用樣板引擎 EJS把資料帶入網頁
app.set("view engine", "ejs");
app.set("views", "./views");

//首頁
app.get("/", (req,res)=>{
    res.render("index.ejs");
});

//註冊功能，使用post方法讓query string不要顯示在網址上
app.post("/signup", async (req,res)=>{
    const db=client.db("website");
    const collection=db.collection("member");

    let uname = req.body.name;
    let uemail = req.body.email;
    let upassword = req.body.password;
    
    let result = await collection.findOne({email:uemail});
    if (result != null){
        res.send("此信箱已註冊");
        return;
    }else{
        await collection.insertOne({
            name:uname,
            email:uemail,
            password:upassword
        });
        res.redirect("/");
    }
});

//驗證登入功能，使用post方法讓query string不要顯示在網址上
app.post("/signin", async (req,res)=>{
    let uemail = req.body.email;
    let upassword = req.body.password;

    const db=client.db("website");
    const collection=db.collection("member");

    let result = await collection.findOne({
        $and:[
            {email:uemail},
            {password:upassword}
        ]       
    });

    if(result != null){
        req.session["member"] = {
            name:result.name, email:result.email
        };

        res.redirect("/admin");
    }
    else{
        req.session["member"] = null;
        res.redirect("/");
    }
});

//登出
app.get("/signout", (req,res)=>{
    req.session["member"]=null;
    res.redirect("/");
});

//會員頁面，使用post方法讓query string不要顯示在網址上
app.get("/admin", async (req,res)=>{
    //使用session讓server記得曾經登入
    if (req.session["member"]){
        const db=client.db("website");
        const collection=db.collection("message");

        //取得所有留言，根據時間排序
        let results = await collection.find({},{
            sort:{
                time:-1
            }
        });

        let data=[];
        await results.forEach((message)=>{
            data.push(message);
        });

        //套用到樣版引擎中，顯示出來
        res.render("admin.ejs",{name:req.session["member"].name, email:req.session["member"].email,data:data});
    }
    else{
        res.send("沒有登入");
    }
});

//留言，使用post方法讓query string不要顯示在網址上
app.post("/admin/addMessage", async (req,res)=>{
    //驗證使用者確實有登入
    if(!req.session["member"]){
        return;
    }
    
    let umessage = req.body.message;
    const db=client.db("website");

    //決定要操作的集合
    const collection=db.collection("message");
    await collection.insertOne({
        name:req.session["member"].name,
        email:req.session["member"].email,
        message:umessage,
        time:Date.now()
    });
    res.redirect("/admin"); 
});

//啟動伺服器
app.listen(3000, function(){
    console.log("server started at http://127.0.0.1:3000/")
});