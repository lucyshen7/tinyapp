const { assert } = require('chai');

const { getUserByEmail } = require('../helpers.js');

const testUsers = {
  "userRandomID": {
    id: "userRandomID", 
    email: "user@example.com", 
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID", 
    email: "user2@example.com", 
    password: "dishwasher-funk"
  }
};

describe('getUserByEmail', function() {
  it('should return a user with valid email', function() {
    const user = getUserByEmail("user@example.com", testUsers);
    const expectedUserID = "userRandomID";

    assert.deepEqual(testUsers[expectedUserID], user); // confirm getUserByEmail returns a user obj when provided with existing email
  
  });
});

describe('getUserByEmail', function() {
  it('should return undefined with non-existent email', function() {
    const user = getUserByEmail("user3@example.com", testUsers);
    const expectedUserID = undefined;

    assert.equal(testUsers[expectedUserID], user);
  
  });
});