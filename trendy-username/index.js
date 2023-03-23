const boys = require("./data/boys.json");
const girls = require("./data/girls.json");
const girl_prefixes = require("./data/girls-prefix.json");
const boy_prefixes = require("./data/boys-prefix.json");

const boyNames = [];
const girlNames = [];
const girlPrefixes = [];
const boyPrefixes = [];

function loadJsonData() {
  Object.keys(boys).forEach((name) => {
    boyNames.push(name);
  });
  Object.keys(girls).forEach((name) => {
    //console.log(name, ":", boys[name].source);
    girlNames.push(name);
  });
  Object.keys(girl_prefixes).forEach((name) => {
    girlPrefixes.push(name);
  });
  Object.keys(boy_prefixes).forEach((name) => {
    boyPrefixes.push(name);
  });
}

function getRandomNumber(gender) {
  let length;
  if (gender === "female") {
    length = girlNames.length;
  } else {
    length = boyNames.length;
  }
  return Math.floor(Math.random() * length);
}

function generateUsername(count, gender, prefix = false) {
  let username, random;
  const username_list = [];
  for (let i = 0; i < count; i++) {
    let rand = getRandomNumber(gender);
    if (gender === "male") {
      username = boyNames[rand];
    } else if (gender === "female") {
      username = girlNames[rand];
    }
    if (prefix) {
      if (gender === "female") {
        random = Math.floor(Math.random() * girlPrefixes.length);
        random_prefix = girlPrefixes[random];
      } else if (gender === "male") {
        random = Math.floor(Math.random() * boyPrefixes.length);
        random_prefix = boyPrefixes[random];
      }
      username = random_prefix.concat(username);
    }
    username_list.push(username);
  }
  return username_list;
}

loadJsonData();
module.exports = generateUsername;
