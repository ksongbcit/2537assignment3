"use strict";
const express = require('express');
const session = require('express-session');
const app = express();
const fs = require("fs");
const mysql = require('mysql2');
const { JSDOM } = require('jsdom');

app.use('/js', express.static('private/js'));
app.use('/css', express.static('private/css'));
app.use('/img', express.static('private/imgs'));
app.use('/html', express.static('private/html'));

app.use(session({
        secret:'super secret password',
        name:'50Greener',
        resave: false,
        saveUninitialized: true 
    })
);

app.get('/', function (req, res) {
    let doc = fs.readFileSync('./private/html/index.html', "utf8");

    let dom = new JSDOM(doc);
    let $ = require("jquery")(dom.window);


    let dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let d = new Date().toLocaleDateString("en-US", dateOptions);

    initDB();

    res.set('Server', '50Greener Engine');
    res.set('X-Powered-By', '50Greener');
    res.send(dom.serialize());

});

async function initDB() {

    const mysql = require('mysql2/promise');

    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      multipleStatements: true
    });

    const createDBAndTables = `CREATE DATABASE IF NOT EXISTS accounts;
        use accounts;
        CREATE TABLE IF NOT EXISTS user (
        ID int NOT NULL AUTO_INCREMENT,
        email varchar(30),
        password varchar(30),
        PRIMARY KEY (ID));`;

    await connection.query(createDBAndTables);
    let results = await connection.query("SELECT COUNT(*) FROM user");
    let count = results[0][0]['COUNT(*)'];

    if(count < 1) {
        results = await connection.query("INSERT INTO user (email, password) values ('arron_ferguson@bcit.ca', 'admin')");
        console.log("Added one user record.");
    }
    connection.end();
}


app.get('/profile', function(req, res) {

    if(req.session.loggedIn) {

        let profileFile = fs.readFileSync('./private/html/profile.html', "utf8");
        let profileDOM = new JSDOM(profileFile);
        let $profile = require("jquery")(profileDOM.window);

        $profile("#user-name").html(req.session.email);

        let newsfeed = fs.readFileSync('./private/template/newsfeed.html', "utf8");
        let newsfeedDOM = new JSDOM(newsfeed);
        let $newsfeed = require("jquery")(newsfeedDOM.window);

        $profile("#placeholder1").replaceWith($newsfeed("#newsfeed"));

        let scoreboard = fs.readFileSync('./private/template/scoreboard.html', "utf8");
        let scoreboardDOM = new JSDOM(scoreboard);
        let $scoreboard = require("jquery")(scoreboardDOM.window);

        $profile("#placeholder2").replaceWith($scoreboard("#scoreboard"));

        res.set('Server', 'Wazubi Engine');
        res.set('X-Powered-By', 'Wazubi');
        res.send(profileDOM.serialize());

    } else {
        res.redirect('/');
    }


});


// No longer need body-parser!
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

app.post('/authenticate', function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    let results = authenticate(req.body.email, req.body.password,
        function(rows) {
            if(rows == null) {
                res.send({ status: "fail", msg: "User account not found." });
            } else {
                req.session.loggedIn = true;
                req.session.email = rows.email;
                req.session.save(function(err) {
                })
                res.send({ status: "success", msg: "Logged in." });
            }
    });

});


function authenticate(email, pwd, callback) {

    const connection = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'accounts'
    });

    connection.query(
      "SELECT * FROM user WHERE email = ? AND password = ?", [email, pwd],
      function (error, results) {
        if (error) {
            throw error;
        }

        if(results.length > 0) {
            return callback(results[0]);
        } else {
            return callback(null);
        }

    });

}

app.get('/logout', function(req,res){
    req.session.destroy(function(error){
        if(error) {
            console.log(error);
        }
    });
    res.redirect("/profile");
})

let port = 8000;
app.listen(port, function () {
    console.log('Listening on port ' + port + '!');
})