const PORT = 8080; // default port 8080
const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const app = express();
app.use(cookieParser());
app.set("view engine", "ejs");

// DATA
const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {
  "userRandomID" : {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur" // change to 'abc' or '123'
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
}

// MIDDLEWARE
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan("dev"));

// ROUTES
// Homepage route "/", callback function will be executed when this route is requested
app.get("/", (req, res) => {
  res.send("Hello!");
});

// Added a route for "/hello"
app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// Create registration page
app.get("/register", (req, res) => {
  const user_id = req.cookies["user_id"];

  const templateVars = {
    username: req.cookies["username"],
    user: users[user_id],
  }
  res.render("register", templateVars)
})

// Create registration handler
app.post("/register", (req, res) => {
  console.log("Registration successful!");
  // const id = Object.keys(users).length + 1;
  const id = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;

  console.log('users', users)

  if (!email || !password) {
    return res.status(400).send("Email and password cannot be blank")
  }; 

  const user = findUserByEmail(email);
  // if user already exists (truthy value from helper function)
  if (user) {
    return res.status(400).send('A user already exists with that email')
  }

  users[`user${id}RandomID`] = {
    id: `user${id}RandomID`,
    email: email,
    password: password
  };
  // set a user_id cookie containing newly generated ID
  res.cookie('user_id', `user${id}RandomID`);
  console.log('users', users)
  res.redirect("/urls");
})

// use Express render method to respond to requests by sending back a template, along with obj containing data the template needs
app.get("/urls", (req, res) => {
  const user_id = req.cookies["user_id"];

  const templateVars = { 
    urls: urlDatabase, 
    username: req.cookies["username"],
    user: users[user_id],
};
  res.render("urls_index", templateVars)
});

// create cookie
app.post("/login", (req, res) => {
  res.cookie('username', req.body.username);
  res.redirect("/urls");
});

// delete cookie
app.post("/logout", (req, res) => {
  res.clearCookie('user_id');
  res.redirect("/urls"); 
});

// DELETE URL
app.post("/urls/:shortURL/delete", (req, res) => {
  delete urlDatabase[req.params.shortURL];
  res.redirect("/urls");
});

// ADD New URL
app.get("/urls/new", (req, res) => {
  const user_id = req.cookies["user_id"];

  const templateVars = {
    username: req.cookies["username"],
    user: users[user_id],
  };

  console.log("req.cookies", req.cookies)

  res.render("urls_new", templateVars);
});

app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect(`/urls/${shortURL}`);
});

// READ Data
app.get("/urls/:shortURL", (req, res) => {
  const user_id = req.cookies["user_id"];

  if (urlDatabase[req.params.shortURL]) {
    const templateVars = { 
      shortURL: req.params.shortURL, 
      longURL: urlDatabase[req.params.shortURL],
      username: req.cookies["username"],
      user: users[user_id],
    };
    res.render("urls_show", templateVars);
  } else {
    res.status(404).write("No such Short URL.");
    res.end();
  };
});

// UPDATE URL 
// route to handle POST request to update a resource
app.post("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  const newURL = req.body.newURL;
  urlDatabase[shortURL] = newURL;
  res.redirect("/urls");
})

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

// PORT AND CALLBACK
app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});

// generate a random shortURL
function generateRandomString() {
  let result = '';
  const char = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 6; i++) {
    result += char.charAt(Math.floor(Math.random() * char.length));
  }
  return result;
}

// helper function to check if user exists
function findUserByEmail(email) {
  for (const userId in users) {
    const user = users[userId];
    if (user.email === email) {
      return user;
    }
  }
  return null;
}