const PORT = 8080; // default port 8080
const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const { restart } = require("nodemon");

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

const users = {
  "userRandomID" : {
    id: "userRandomID",
    email: "user@example.com",
    password: "abc" // change to 'abc' or '123'
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "123"
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
  res.json(urlDatabase);
});

// REGISTER
app.get("/register", (req, res) => {
  const user_id = req.cookies["user_id"];
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
  const user = findUserByEmail(email);
  // if user already exists (truthy value from helper function)
  if (user) {
    return res.status(400).send('A user already exists with that email. Please login.');
  }
  users[id] = {
    id: id,
    email: email,
    password: password
  };
  // set a user_id cookie containing newly generated ID
  res.cookie('user_id', id);
  res.redirect("/urls");
});

// use Express render method to respond to requests by sending back a template, along with obj containing data the template needs
// users can only see their own shortened URLs
app.get("/urls", (req, res) => {
  const user_id = req.cookies["user_id"];
  
  // users can only see their own shortened URLs
  if (user_id) {
    const output = urlsForUser(user_id);
    const templateVars = {
      urls: output,
      user: users[user_id],
    };
    res.render("urls_index", templateVars);
  }
  // if user_id not found
  const templateVars = {
    user: users[user_id],
  };
  res.status(403);
  res.render("error_login", templateVars);
});

// a new login page
app.get("/login", (req, res) => {
  const user_id = req.cookies["user_id"];
  const templateVars = {
    user: users[user_id],
  };
  res.render("login", templateVars);
});

// POST /login endpoint
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).send("Email and password cannot be blank"); // if blank forms
  }

  const user = findUserByEmail(email);
  // if user already exists (truthy value from helper function)
  if (!user) {
    return res.status(403).send('Email cannot be found. Please register.'); // if user does not exist
  }
  
  if (user.password !== password) {
    return res.status(403).send('Incorrect password. Please try again.'); // if email is located, but password does not match
  }

  // happy path: set a user_id cookie with matching user's random ID
  res.cookie('user_id', user.id);
  res.redirect("/urls");
});

// delete cookie
app.post("/logout", (req, res) => {
  res.clearCookie('user_id');
  res.redirect("/urls");
});

// DELETE URL
app.post("/urls/:shortURL/delete", (req, res) => {
  const user_id = req.cookies["user_id"];
  // if user logged in
  if (user_id) {
    const output = urlsForUser(user_id);
    if (output[req.params.shortURL]) { // if user created that URL
      delete urlDatabase[req.params.shortURL];
      res.redirect("/urls");
    } else {
      const templateVars = {
        user: users[user_id],
      };
      res.status(403).send("You do not have permission to delete this URL."); // user does not own URL
      res.render("error_404", templateVars);
    }
  } else { // user not logged in
    const templateVars = {
      user: users[user_id],
    };
    res.status(403).send("User not logged in.\n");
    res.render("error_login", templateVars);
  }
});

// ADD New URL
app.get("/urls/new", (req, res) => {
  const user_id = req.cookies["user_id"];
  // if user not logged in, redirect to login page
  if (!user_id) {
    res.redirect("/login");
  }
  const templateVars = {
    user: users[user_id],
  };
  res.render("urls_new", templateVars);
});

// create shortURL
app.post("/urls", (req, res) => {
  const user_id = req.cookies["user_id"];
  if (!user_id) {
    res.status(403).send("You do not have permission to access this page.");
  } else {
    const shortURL = generateRandomString();
    urlDatabase[shortURL] = {
      longURL: req.body.longURL,
      userID: user_id
    };
    res.redirect(`/urls/${shortURL}`);
  }
});

// READ Data
app.get("/urls/:shortURL", (req, res) => {
  const user_id = req.cookies["user_id"];
  // users can only see their own shortened URLs
  if (user_id) {
    const output = urlsForUser(user_id);
    if (output[req.params.shortURL]) {
      const templateVars = {
        shortURL: req.params.shortURL,
        longURL: output[req.params.shortURL].longURL,
        user: users[user_id],
      };
      res.render("urls_show", templateVars);
    } else {
      const templateVars = {
        user: users[user_id],
      };
      res.status(403).send("You do not have access.\n");
      res.render("error_404", templateVars);
    }
  }
  const templateVars = {
    user: users[user_id],
  };
  res.status(403).send("User not logged in.\n");
  res.render("error_login", templateVars);
});


// UPDATE URL
// route to handle POST request to update a resource
app.post("/urls/:shortURL", (req, res) => {
  const user_id = req.cookies["user_id"];
  if (user_id) {
    const output = urlsForUser(user_id);
    if (output[req.params.shortURL]) {
      const shortURL = req.params.shortURL;
      const newURL = req.body.newURL;
      urlDatabase[shortURL].longURL = newURL;
      res.redirect("/urls");
    } else {
      const templateVars = {
        user: users[user_id],
      };
      res.status(403).send("You do not have access.\n");
      res.render("error_404", templateVars);
    }
  }
  const templateVars = {
    user: users[user_id],
  };
  res.status(403).send("User not logged in.\n");
  res.render("error_login", templateVars);
});

// redirect to longURL, anyone can access
app.get("/u/:shortURL", (req, res) => {
  if (urlDatabase[req.params.shortURL]) { // check if shortURL exists
    const longURL = urlDatabase[req.params.shortURL].longURL;
    res.redirect(longURL);
  }
  return res.status(404).send("404 Page Not Found. TinyURL does not exist.");
});

// PORT AND CALLBACK
app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});

// HELPER FUNCTIONS

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

// find urls for user
function urlsForUser(id) {
  const output = {}; // create new object
  for (const item in urlDatabase) {
    if (urlDatabase[item].userID === id) {
      output[item] = urlDatabase[item]; // add item to new object
    }
  }
  return output;
}