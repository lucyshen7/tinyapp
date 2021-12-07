const PORT = 8080; // default port 8080
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.set("view engine", "ejs");

// DATA
const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

// MIDDLEWARE
app.use(bodyParser.urlencoded({extended: true}));

// ROUTES
// Homepage route "/", callback function will be executed when this route is requested
app.get("/", (req, res) => {
  res.send("Hello!");
});

// Added a route for "/hello"
app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

// use Express render method to respond to requests by sending back a template, along with obj containing data the template needs
app.get("/urls", (req, res) => {
  const templateVars = { urls: urlDatabase };
  res.render("urls_index", templateVars)
});

// DELETE URL
app.post("/urls/:shortURL/delete", (req, res) => {
  delete urlDatabase[req.params.shortURL];
  res.redirect("/urls");
});

// ADD New URL
app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});

app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;
  // console.log("urlDatabase", urlDatabase);
  res.redirect(`/urls/${shortURL}`);
});

app.get("/urls/:shortURL", (req, res) => {
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL] };
  res.render("urls_show", templateVars);
});

// UPDATE URL 
// route to handle POST request to update a resource
app.post("/urls/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  // console.log("req.body", req.body)
  const newURL = req.body.newURL;
  urlDatabase[shortURL] = newURL;
  // console.log("urlDatabase", urlDatabase);
  res.redirect("/urls");
})

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
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