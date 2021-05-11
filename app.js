const express = require('express');
const session = require('express-session')
const app = express();
const fs = require("fs");
const mysql = require('mysql2');
const { JSDOM } = require('jsdom');

app.use('/js', express.static('private/js'));
app.use('/css', express.static('private/css'));
app.use('/img', express.static('private/imgs'));
app.use('/html', express.static('private/html'));

app.use(session({
        secret:'extra text that no one will guess',
        name:'wazaSessionID',
        resave: false,
        saveUninitialized: true 
    })
);

app.get('/', function (req, res) {
    let doc = fs.readFileSync('./html/index.html', "utf8");

    let dom = new JSDOM(doc);
    let $ = require("jquery")(dom.window);


    let dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let d = new Date().toLocaleDateString("en-US", dateOptions);

    initDB();

    res.set('Server', 'Wazubi Engine');
    res.set('X-Powered-By', 'Wazubi');
    res.send(dom.serialize());

});


// async together with await
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

    // check for a session first!
    if(req.session.loggedIn) {

        // DIY templating with DOM, this is only the husk of the page
        let templateFile = fs.readFileSync('./private/templates/profile_template.html', "utf8");
        let templateDOM = new JSDOM(templateFile);
        let $template = require("jquery")(templateDOM.window);

        // put the name in
        $template("#user-name").html(req.session.email);

        // insert the left column from a different file (or could be a DB or ad network, etc.)
        let left = fs.readFileSync('./private/templates/left_content.html', "utf8");
        let leftDOM = new JSDOM(left);
        let $left = require("jquery")(leftDOM.window);
        // Replace!
        $template("#placeholder1").replaceWith($left("#newsfeed"));

        // insert the left column from a different file (or could be a DB or ad network, etc.)
        let middle = fs.readFileSync('./private/templates/middle_content.html', "utf8");
        let middleDOM = new JSDOM(middle);
        let $middle = require("jquery")(middleDOM.window);
        // Replace!
        $template("#placeholder2").replaceWith($middle("#scoreboard"));

        res.set('Server', 'Wazubi Engine');
        res.set('X-Powered-By', 'Wazubi');
        res.send(templateDOM.serialize());

    } else {
        // not logged in - no session!
        res.redirect('/');
    }


});


// No longer need body-parser!
app.use(express.json());
app.use(express.urlencoded({ extended: true }))


// Notice that this is a 'POST'
app.post('/authenticate', function(req, res) {
    res.setHeader('Content-Type', 'application/json');


//    console.log("Email", req.body.email);
//    console.log("Password", req.body.password);


    let results = authenticate(req.body.email, req.body.password,
        function(rows) {
            //console.log(rows.password);
            if(rows == null) {
                // not found
                res.send({ status: "fail", msg: "User account not found." });
            } else {
                // authenticate the user, create a session
                req.session.loggedIn = true;
                req.session.email = rows.email;
                req.session.save(function(err) {
                    // session saved
                })
                // this will only work with non-AJAX calls
                //res.redirect("/profile");
                // have to send a message to the browser and let front-end complete
                // the action
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
            // email and password found
            return callback(results[0]);
        } else {
            // user not found
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