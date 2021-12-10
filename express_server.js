const PORT = 8080;
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cookieSession = require('cookie-session');
const { restart } = require('nodemon');
const bcrypt = require('bcryptjs');
const { getUserByEmail } = require('./helpers');
const methodOverride = require('method-override');

const app = express();
app.set('view engine', 'ejs');

// MIDDLEWARE
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan('dev'));
app.use(
  cookieSession({
    name: 'session',
    keys: ['I like dogs and plants', 'lighthouse'],
  })
);
app.use(methodOverride('_method')); // override with POST having ?_method=DELETE

//
// DATABASES
//
const urlDatabase = {
  'b2xVn2': {
    longURL: 'http://www.lighthouselabs.ca',
    userID: 'userRandomID',
    count: 0,
    visits: {},
    unique: {}
  },
  '9sm5xK': {
    longURL: 'http://www.google.com',
    userID: 'user2RandomID',
    count: 0,
    visits: {},
    unique: {}
  }
};

// USER DATABASE
const hashedPassword1 = bcrypt.hashSync('abc', 10); // hashed passwords with bcrypt
const hashedPassword2 = bcrypt.hashSync('123', 10);
const users = {
  'userRandomID' : {
    id: 'userRandomID',
    email: 'user@example.com',
    password: hashedPassword1
  },
  'user2RandomID': {
    id: 'user2RandomID',
    email: 'user2@example.com',
    password: hashedPassword2
  }
};

//
// ROUTES
//
app.get('/', (req, res) => {
  if (req.session.user_id) {
    return res.redirect('/urls');
  }
  return res.redirect('/login');
});

//
// REGISTER and LOGIN and LOGOUT
//
app.get('/register', (req, res) => {
  const user_id = req.session.user_id;
  if (user_id) {
    return res.redirect('/urls');
  }
  const templateVars = {
    user: users[user_id],
  };
  res.render('register', templateVars);
});

app.post('/register', (req, res) => {
  const id = generateRandomString();
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).send('Email and password cannot be blank. Please try again.');
  }

  const user = getUserByEmail(email, users); // check if user exists (truthy value from helper function)
  if (user) {
    return res.status(400).send('A user already exists with that email. Please login.');
  }
  
  const hashedPassword = bcrypt.hashSync(password, 10); // happy path, use bcrypt when storing passwords for new user
  users[id] = {
    id: id,
    email: email,
    password: hashedPassword
  };
  req.session.user_id = id; // set a session cookie to newly generated id
  res.redirect('/urls');
});

// LOGIN
app.get('/login', (req, res) => {
  const user_id = req.session.user_id;
  if (user_id) {
    return res.redirect('/urls');
  }
  const templateVars = {
    user: users[user_id],
  };
  res.render('login', templateVars);
});

app.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).send('Email and password cannot be blank. Please try again.'); // check if either forms are blank
  }

  const user = getUserByEmail(email, users); // check if user does NOT exist (falsy value from helper function)
  if (!user) {
    return res.status(403).send('Email cannot be found. Please register.'); // if user does not exist, tell them to register
  }

  const passwordMatch = bcrypt.compareSync(password, user.password); // check if user's password matches using bcrypt.compareSync
  if (!passwordMatch) {
    return res.status(403).send('Incorrect password. Please try again.'); // if email is located, but password does not match
  }

  req.session.user_id = user.id; // happy path: if user found and password match, set session cookie to user id
  res.redirect('/urls');
});

// LOGOUT
app.delete('/logout', (req, res) => { // method override
  delete req.session.user_id; // on logout, delete session cookie
  return res.redirect('/urls');
});

//
// BROWSE URLS
//
app.get('/urls', (req, res) => {
  const user_id = req.session.user_id;
  if (user_id) {
    const output = urlsForUser(user_id); // fetch user's own URLs from urlDatabase

    const templateVars = {
      urls: output, // users can only see their own shortened URLs
      user: users[user_id],
    };
    return res.render('urls_index', templateVars);
  }
  const templateVars = { // if not logged in, show error page
    user: users[user_id],
    error: 'User not logged in. Please login.'
  };
  return res.status(403).render('error', templateVars);
});

//
// ADD Short URLs
//
app.get('/urls/new', (req, res) => {
  const user_id = req.session.user_id;
  if (!user_id) { // if user not logged in, redirect to login page
    return res.redirect('/login');
  }
  const templateVars = {
    user: users[user_id],
  };
  return res.render('urls_new', templateVars);
});

app.post('/urls', (req, res) => { // New URLs will POST to /urls
  const user_id = req.session.user_id;
  if (!user_id) {
    return res.status(403).send('You do not have permission to access this page.');
  } else {
    const shortURL = generateRandomString();
    urlDatabase[shortURL] = {
      longURL: req.body.longURL,
      userID: user_id, // if logged in, save new shortURL to urlDatabase (w/ userID)
      count: 0,
      visits: {},
      unique: {}
    };
    return res.redirect(`/urls/${shortURL}`);
  }
});

//
// READ and EDIT each URL
//
app.get('/urls/:shortURL', (req, res) => {
  const user_id = req.session.user_id;
  const shortURL = req.params.shortURL;
  if (!urlDatabase[shortURL]) { // check if Short URL exists
    const templateVars = {
      user: users[user_id],
      error: '404 Page Not Found. No such TinyURL.'
    };
    return res.status(404).render('error', templateVars);
  }

  if (user_id) {
    const output = urlsForUser(user_id);
    if (output[shortURL]) { // users can only see their own shortened URLs
      const templateVars = {
        shortURL: shortURL,
        longURL: output[shortURL].longURL,
        count: output[shortURL].count,
        visits: output[shortURL].visits,
        unique: output[shortURL].unique,
        user: users[user_id],
      };
      return res.render('urls_show', templateVars);
    }
    const templateVars = {
      user: users[user_id],
      error: 'You do not have permission to access this URL.'
    };
    return res.status(403).render('error', templateVars);
  }

  const templateVars = {
    user: users[user_id],
    error: 'User not logged in. Please login.'
  };
  return res.status(403).render('error', templateVars);
});

// EDIT Long URL
app.put('/urls/:shortURL', (req, res) => { // method override // route to handle POST request to update a resource
  const user_id = req.session.user_id;
  const shortURL = req.params.shortURL;
  if (!urlDatabase[shortURL]) {
    return res.status(404).send('No such Short URL.');
  }

  if (user_id) {
    const output = urlsForUser(user_id);
    if (output[shortURL]) {
      const newURL = req.body.newURL;
      urlDatabase[shortURL].longURL = newURL;
      return res.redirect('/urls');
    } else {
      const templateVars = {
        user: users[user_id],
        error: 'You do not have permission to access this URL.'
      };
      return res.status(403).render('error', templateVars);
    }
  }

  const templateVars = {
    user: users[user_id],
    error: 'User not logged in. Please login.'
  };
  return res.status(403).render('error', templateVars);
});

//
// DELETE Short URLs
//
app.delete('/urls/:shortURL/delete', (req, res) => { // method override
  const user_id = req.session.user_id;
  const shortURL = req.params.shortURL;
  if (!urlDatabase[shortURL]) { // if no shortURL exist
    return res.status(404).send('No such Short URL.');
  }

  if (user_id) { // if user logged in
    const output = urlsForUser(user_id);
    if (output[shortURL]) { // if user created that URL
      delete urlDatabase[shortURL];
      return res.redirect('/urls');
    } else {
      return res.status(403).send('You do not have permission to delete this URL.');
    }
  }

  const templateVars = { // user not logged in
    user: users[user_id],
    error: 'User not logged in. Please login.'
  };
  return res.status(403).send('User not logged in.\n').render('error', templateVars);
});

//
// READ Short URL --> Redirect to Long URL
//
app.get('/u/:shortURL', (req, res) => {
  const shortURL = req.params.shortURL;
  const user_id = req.session.user_id;

  if (!urlDatabase[shortURL]) { // check if shortURL exists
    return res.status(404).send('404 Page Not Found. No such .');
  }

  const count = countVisitors(shortURL);
  urlDatabase[shortURL].visits[count] = timestamp(); // store visitor timestamp
  
  const IP = req._remoteAddress;
  const isUnique = isUniqueVisit(shortURL, IP, user_id); // check if unique visit, if not unique, don't save cookie
  
  if (isUnique && !user_id) { // if not logged in and is unique
    const id = generateRandomString();
    req.session.user_id = id; // set new session cookie
  } 
  
  const longURL = urlDatabase[shortURL].longURL;
  res.redirect(longURL); // redirect to longURL, anyone w/ link can access
});

//
// PORT AND CALLBACK
//
app.listen(PORT, () => {
  console.log(`🐸 TinyApp listening on port ${PORT}!`);
});

//
// HELPER FUNCTIONS
//
function generateRandomString() { // Generates 6-digit alphanumeric string
  let result = '';
  const char = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 6; i++) {
    result += char.charAt(Math.floor(Math.random() * char.length));
  }
  return result;
}

function urlsForUser(id) { // Generates new object of URLs specific to userID
  const output = {};
  for (const url in urlDatabase) {
    if (urlDatabase[url].userID === id) {
      output[url] = urlDatabase[url];
    }
  }
  return output;
}

function countVisitors(shortURL) {
  urlDatabase[shortURL].count++; // match the shortURL in database and increment visitors
  return urlDatabase[shortURL].count; // return updated count
}

function timestamp() {
  const time = new Date();
  const str = time.toDateString();
  return `${str.slice(0,4)}, ${str.slice(4,10)}, ${str.slice(11)}`;
}

function isUniqueVisit(shortURL, IP, user_id) { // IP is req._remoteAddress / client IP-address
  if (!urlDatabase[shortURL].unique[IP]) { // if IP-address not stored
    urlDatabase[shortURL].unique[IP] = user_id; // set value of IP key to user_id
    return true;
  }
  return false;
}