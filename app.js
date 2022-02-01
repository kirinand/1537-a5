const express = require("express");
const session = require("express-session");
const app = express();
const fs = require("fs");
const { JSDOM } = require('jsdom');

// static path mappings
app.use("/js", express.static("public/js"));
app.use("/css", express.static("public/css"));
app.use("/img", express.static("public/img"));
app.use("/font", express.static("public/font"));

app.use(session(
  {
      secret:"I do not have a heart of fire",
      name:"mySessionID",
      resave: false,
      saveUninitialized: true })
);



app.get("/", function (req, res) {

    if(req.session.loggedIn) {
        res.redirect("/profile");
    } else {

        let doc = fs.readFileSync("./app/html/index.html", "utf8");

        res.set("Server", "My Engine");
        res.set("X-Powered-By", "Water");
        res.send(doc);

    }

});


app.get("/profile", function(req, res) {

    if(req.session.loggedIn) {

        let profile = fs.readFileSync("./app/html/profile.html", "utf8");
        let profileDOM = new JSDOM(profile);

        const mysql = require("mysql2");
        const connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "theatre"
        });
        connection.connect();
        connection.query(
        "SELECT * FROM film",
        function(error, results, fields) {
            console.log("Results from DB", results, "and the # of records returned", results.length);

            if (error) {
                console.log(error);
            }
            
            let t1 = profileDOM.window.document.createElement("table");
            let tableContent = "<tr><th>" + "Title" + "</th><th>" + "Director" + "</th><th>" + "Year" + "</th><th>"
            + "Length" + "</th><th>" + "Show Day" + "</th></tr>";
            for(let i = 0; i < results.length; i++) {
                tableContent += "<tr><td>" + results[i].title + "</td><td>" + results[i].director 
                + "</td><td>" + results[i].year + "</td><td>" + results[i].length
                + "</td><td>" + results[i].showday + "</td></tr>";
            }
            t1.innerHTML = tableContent;

            profileDOM.window.document.getElementById("showlistContent").appendChild(t1);

            profileDOM.window.document.getElementsByTagName("title")[0].innerHTML
            = req.session.name + "'s Profile";
            profileDOM.window.document.getElementById("pageTitle").innerHTML
            = "Welcome Back, " + req.session.name + "!";
            profileDOM.window.document.getElementById("name").innerHTML
            = "Username: " + req.session.name;
            profileDOM.window.document.getElementById("email").innerHTML
            = "Email: " + req.session.email;
            profileDOM.window.document.getElementById("password").innerHTML
            = "Password: " + req.session.password;
            profileDOM.window.document.getElementById("favourite").innerHTML
            = "Favourite movie: " + req.session.favourite;
            profileDOM.window.document.getElementById("watched").innerHTML
            = "Movies watched: " + req.session.watched;
            profileDOM.window.document.getElementById("viptype").innerHTML
            = "Membership: " + req.session.viptype;

            res.set("Server", "My Engine");
            res.set("X-Powered-By", "Water");
            res.send(profileDOM.serialize());
        }
    );
    connection.end;

    } else {
        res.redirect("/");
    }

});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.post("/login", function(req, res) {
    res.setHeader("Content-Type", "application/json");

    let results = authenticate(req.body.email, req.body.password,
        function(userRecord) {
            if(userRecord == null) {
                res.send({ status: "fail", msg: "Wrong email or password." });
            } else {
                req.session.loggedIn = true;
                req.session.email = userRecord.email;
                req.session.name = userRecord.name;
                req.session.password = userRecord.password;
                req.session.favourite = userRecord.favourite;
                req.session.watched = userRecord.watched;
                req.session.viptype = userRecord.viptype;
                req.session.save(function(err) {
                });
                res.send({ status: "success", msg: "Logged in." });
            }
    });

});

app.get("/logout", function(req,res){

    if (req.session) {
        req.session.destroy(function(error) {
            if (error) {
                res.status(400).send("Unable to log out")
            } else {
                res.redirect("/");
            }
        });
    }
});

function authenticate(email, pwd, callback) {

    const mysql = require("mysql2");
    const connection = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "theatre"
    });
    connection.connect();
    connection.query(
      "SELECT * FROM user WHERE email = ? AND password = ?", [email, pwd],
      function(error, results, fields) {
          console.log("Results from DB", results, "and the # of records returned", results.length);

          if (error) {
              console.log(error);
          }
          if(results.length > 0) {
              return callback(results[0]);
          } else {
              return callback(null);
          }

      }
    );

}

async function init() {

    const mysql = require("mysql2/promise");
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      multipleStatements: true
    });
    const createDBAndTables = `CREATE DATABASE IF NOT EXISTS theatre;
        use theatre;
        CREATE TABLE IF NOT EXISTS user (
        ID int NOT NULL AUTO_INCREMENT,
        name varchar(30),
        email varchar(30),
        password varchar(30),
        favourite varchar(30),
        watched INTEGER,
        viptype varchar(30),
        PRIMARY KEY (ID));
        
        CREATE TABLE IF NOT EXISTS film (
        ID int NOT NULL AUTO_INCREMENT,
        title varchar(30),
        director varchar(30),
        year YEAR,
        length varchar(10),
        showday varchar(10),
        PRIMARY KEY (ID));`;
    await connection.query(createDBAndTables);

    const [rowsUser, fieldsUser] = await connection.query("SELECT * FROM user");
    if(rowsUser.length == 0) {
        let userRecords = "insert into user (name, email, password, favourite, watched, viptype) values ?";
        let recordValues = [
          ["Kirin", "kirin@my.bcit.ca", "A01234567", "Inglourious Basterds", 34, "Aquamarine"],
          ["Bruce", "bruce@bcit.ca", "comp1510", "Fight Club", 25, "Obsidian"],
          ["Lord Bird", "bird@lord.ca", "mymajesty", "Lady Bird", 51, "Diamond"]
        ];
        await connection.query(userRecords, [recordValues]);
    }

    const [rowsFilm, fieldsFilm] = await connection.query("SELECT * FROM film");
    if(rowsFilm.length == 0) {
        let filmRecords = "insert into film (title, director, year, length, showday) values ?";
        let recordValues = [
          ["Inglourious Basterds", "Quentin Tarantino", 2009, "2h 33m", "Saturday"],
          ["Frances Ha", "Noah Baumbach", 2013, "1h 26m", "Saturday"],
          ["Call Me By Your Name", "Luca Guadagnino", 2017, "2h 10m", "Saturday"],
          ["Ghostbusters", "Ivan Reitman", 1984, "1h 45m", "Saturday"],
          ["American Beauty", "Sam Mendes", 1999, "2h 2m", "Saturday"],
          ["Fight Club", "David Fincher", 1999, "2h 19m", "Sunday"],
          ["The Favourite", "Yorgos Lanthimos", 2018, "2h", "Sunday"],
          ["Scenes from a Marriage", "Ingmar Bergman", 1973, "2h 47m", "Sunday"],
          ["Insomnia", "Christopher Nolan", 2002, "1h 58m", "Sunday"],
          ["Midnight in Paris", "Woody Allen", 2011, "1h 34m", "Sunday"],
        ];
        await connection.query(filmRecords, [recordValues]);
    }
    console.log("Listening on port " + port + "!");
}

// RUN SERVER
let port = 8080;
app.listen(port, init);
