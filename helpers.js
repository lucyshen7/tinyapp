const getUserByEmail = function(email, database) {
  for (const userId in database) {
    const user = database[userId];
    if (user.email === email) {
      return user;
    }
  }
  return null;
};

function generateRandomString() { // Generates 6-digit alphanumeric string
  let result = '';
  const char = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 6; i++) {
    result += char.charAt(Math.floor(Math.random() * char.length));
  }
  return result;
}

function urlsForUser(id, database) { // Generates new object of URLs specific to userID
  const output = {};
  for (const url in database) {
    if (database[url].userID === id) {
      output[url] = database[url];
    }
  }
  return output;
}

function countVisitors(shortURL, database) {
  database[shortURL].count++; // match the shortURL in database and increment visitors
  return database[shortURL].count; // return updated count
}

function timestamp() {
  const time = new Date();
  const str = time.toDateString();
  return `${str.slice(0,4)}, ${str.slice(4,10)}, ${str.slice(11)}`;
}

function isUniqueVisit(shortURL, IP, user_id, database) { // IP is req._remoteAddress / client IP-address
  if (!database[shortURL].unique[IP]) { // if IP-address not stored
    database[shortURL].unique[IP] = user_id; // set value of IP key to user_id
    return true;
  }
  return false;
}

module.exports = { getUserByEmail, generateRandomString, urlsForUser, countVisitors, timestamp, isUniqueVisit };