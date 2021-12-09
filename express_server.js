const PORT = 8080; // default port 8080
const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const { restart } = require("nodemon");
const bcrypt = require('bcryptjs');

const app = express();
app.use(cookieParser());
app.set("view engine", "ejs");

// DATA
const urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userID: "userRandomID"
  },
  "9sm5xK": {
    longURL: "http://www.google.com",
    userID: "user2RandomID"
  }
};

const hashedPassword1 = bcrypt.hashSync("abc", 10);
const hashedPassword2 = bcrypt.hashSync("123", 10);

const users = {
  "userRandomID" : {
    id: "userRandomID",
    email: "user@example.com",
    password: hashedPassword1
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: hashedPassword2
  }
};

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
  console.log('res', res);
  res.json(urlDatabase);
});

//
// REGISTER and LOGIN and LOGOUT
//
app.get("/register", (req, res) => {
  const user_id = req.cookies.user_id;
  const templateVars = {
    user: users[user_id],
  };
  res.render("register", templateVars);
});

app.post("/register", (req, res) => {
  const id = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).send("Email and password cannot be blank");
  }
  const user = findUserByEmail(email); // if user already exists (truthy value from helper function)
  if (user) {
    return res.status(400).send('A user already exists with that email. Please login.');
  }
  const hashedPassword = bcrypt.hashSync(password, 10); // use bcrypt when storing passwords
  users[id] = {
    id: id,
    email: email,
    password: hashedPassword
  };
  // console.log('users[id] is', users[id]);
  res.cookie('user_id', id); // set a user_id cookie containing newly generated ID
  res.redirect("/urls");
});

app.get("/login", (req, res) => {
  const user_id = req.cookies.user_id;
  const templateVars = {
    user: users[user_id],
  };
  res.render("login", templateVars);
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).send("Email and password cannot be blank"); // if blank forms
  }
  const user = findUserByEmail(email); // if user already exists (truthy value from helper function)
  if (!user) {
    return res.status(403).send('Email cannot be found. Please register.'); // if user does not exist
  }
  const passwordMatch = bcrypt.compareSync(password, user.password); // check if user's password is correct using bcrypt.compareSync
  if (!passwordMatch) {
    return res.status(403).send('Incorrect password. Please try again.'); // if email is located, but password does not match
  }
  // console.log('users', users)
  // happy path: set a user_id cookie with matching user's random ID
  res.cookie('user_id', user.id);
  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  res.clearCookie('user_id');
  res.redirect("/urls");
});

//
// URL PAGES
//
// use Express render method to respond to requests by sending back a template, along with obj containing data the template needs
app.get("/urls", (req, res) => {
  const user_id = req.cookies.user_id;

  if (user_id) {
    const output = urlsForUser(user_id);
    const templateVars = {
      urls: output, // users can only see their own shortened URLs
      user: users[user_id],
    };
    return res.render("urls_index", templateVars);
  }

  const templateVars = { // if user_id not found
    user: users[user_id],
    error: 'User not logged in. Please login.'
  };
  return res.status(403).render("error", templateVars);
});

// DELETE Short URL
app.get("/urls/:shortURL/delete", (req, res) => {
  const user_id = req.cookies.user_id;
  const shortURL = req.params.shortURL;

  if (!urlDatabase[shortURL]) { // if no shortURL exist
    return res.status(404).send("No such Short URL.");
  }

  if (user_id) { // if user logged in
    const output = urlsForUser(user_id);
    if (output[shortURL]) { // if user created that URL, redirect to URLs to delete as a POST request
      return res.redirect("/urls");
    }
    const templateVars = {
      user: users[user_id],
      error: 'You do not have permission to access this page.' // user does not have permission
    };
    return res.status(403).render("error", templateVars);
  }
  
  const templateVars = {
    user: users[user_id],
    error: 'User not logged in. Please login.'
  };
  return res.status(403).render("error", templateVars); // user not logged in
});

// DELETE URL
app.post("/urls/:shortURL/delete", (req, res) => {
  const user_id = req.cookies.user_id;
  const shortURL = req.params.shortURL;
  if (!urlDatabase[shortURL]) { // if no shortURL exist
    return res.status(404).send("No such Short URL.");
  }

  if (user_id) { // if user logged in
    const output = urlsForUser(user_id);
    if (output[shortURL]) { // if user created that URL
      delete urlDatabase[shortURL];
      return res.redirect("/urls");
    } else {
      return res.status(403).send("You do not have permission to delete this URL.");
    }
  }
  
  const templateVars = { // user not logged in
    user: users[user_id],
    error: 'User not logged in. Please login.'
  };

  return res.status(403).send('User not logged in.\n').render("error", templateVars);
});

// ADD New URL
app.get("/urls/new", (req, res) => {
  const user_id = req.cookies.user_id;
  // if user not logged in, redirect to login page
  if (!user_id) {
    return res.redirect("/login");
  }
  const templateVars = {
    user: users[user_id],
  };
  return res.render("urls_new", templateVars);
});

// create shortURL
app.post("/urls", (req, res) => {
  const user_id = req.cookies.user_id;
  if (!user_id) {
    return res.status(403).send("You do not have permission to access this page.");
  } else {
    const shortURL = generateRandomString();
    urlDatabase[shortURL] = {
      longURL: req.body.longURL,
      userID: user_id
    };
    return res.redirect(`/urls/${shortURL}`);
  }
});

// READ Data
app.get("/urls/:shortURL", (req, res) => {
  const user_id = req.cookies.user_id;
  const shortURL = req.params.shortURL;
  if (!urlDatabase[shortURL]) {
    return res.status(404).send("No such Short URL.");
  }

  if (user_id) {
    const output = urlsForUser(user_id);
    if (output[shortURL]) { // users can only see their own shortened URLs
      const templateVars = {
        shortURL: shortURL,
        longURL: output[shortURL].longURL,
        user: users[user_id],
      };
      return res.render("urls_show", templateVars);
    }
    const templateVars = {
      user: users[user_id],
      error: 'You do not have permission to access this URL.'
    };
    return res.status(403).render("error", templateVars);
  }
  const templateVars = {
    user: users[user_id],
    error: 'User not logged in. Please login.'
  };
  return res.status(403).render("error", templateVars);
});


// UPDATE URL
// route to handle POST request to update a resource
app.post("/urls/:shortURL", (req, res) => {
  const user_id = req.cookies.user_id;
  const shortURL = req.params.shortURL;

  if (!urlDatabase[shortURL]) {
    return res.status(404).send("No such Short URL.");
  }

  if (user_id) {
    const output = urlsForUser(user_id);
    if (output[shortURL]) {
      const shortURL = shortURL;
      const newURL = req.body.newURL;
      urlDatabase[shortURL].longURL = newURL;
      return res.redirect("/urls");
    } else {
      const templateVars = {
        user: users[user_id],
        error: 'Page Not Found. The URL you requested does not exist or you do not have permission to access.'
      };
      return res.status(404).render("error", templateVars);
    }
  }
  const templateVars = {
    user: users[user_id],
    error: 'User not logged in. Please login.'
  };
  return res.status(403).render("error", templateVars);
});

// redirect to longURL, anyone can access
app.get("/u/:shortURL", (req, res) => {
  if (!urlDatabase[req.params.shortURL]) { // check if shortURL exists
    return res.status(404).send("Page Not Found. No such TinyURL.");
  }
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

// PORT AND CALLBACK
app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});

// HELPER FUNCTIONS
function generateRandomString() {
  let result = '';
  const char = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 6; i++) {
    result += char.charAt(Math.floor(Math.random() * char.length));
  }
  return result;
}

function findUserByEmail(email) {
  for (const userId in users) {
    const user = users[userId];
    if (user.email === email) {
      return user;
    }
  }
  return null;
}

function urlsForUser(id) {
  const output = {}; // create new object
  for (const item in urlDatabase) {
    if (urlDatabase[item].userID === id) {
      output[item] = urlDatabase[item]; // add item to new object
    }
  }
  return output;
}