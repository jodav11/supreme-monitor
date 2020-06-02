var Twitter = require("twitter");
const rp = require("request-promise");
const cheerio = require("cheerio");
const _ = require("underscore");
const fs = require("fs");
const request = require("request");
const discord = require("discord-bot-webhook");

var originalSoldOutItems = [];
var newSoldOutItems = [];
const proxyList = [];
const userAgentList = [];
var restockCycles = 0;
var refreshDelay = 10000;

discord.hookId = "";
discord.hookToken = "";

discord.sendMessage("Restock Monitor Running");

console.log("Now monitoring for restocks.");

function initialize() {
  const proxyInput = fs.readFileSync("proxies.txt").toString().split("\n");
  for (let p = 0; p < proxyInput.length; p++) {
    proxyInput[p] = proxyInput[p].replace("\r", "").replace("\n", "");
    if (proxyInput[p] != "") proxyList.push(proxyInput[p]);
  }
  const userAgentInput = fs
    .readFileSync("useragents.txt")
    .toString()
    .split("\n");
  for (let u = 0; u < userAgentInput.length; u++) {
    userAgentInput[u] = userAgentInput[u].replace("\r", "").replace("\n", "");
    if (userAgentInput[u] != "") userAgentList.push(userAgentInput[u]);
  }
  console.log("Found " + proxyList.length + " Proxies.");
  console.log("Found " + userAgentList.length + " User Agents.");
  scrape(originalSoldOutItems);
}

function scrape(arr) {
  request(
    {
      url: "https://www.supremenewyork.com/shop/all",
      headers: generateRandomUserAgent(),
      timeout: 60000,
      proxy: formatProxy(
        proxyList[Math.floor(Math.random() * proxyList.length)]
      ),
    },
    function (error, response, html) {
      if (response && response.statusCode != 200) {
        console.log("Cannot get the url");
        return null;
      }

      if (!html) {
        console.log("Unable to recieve response");
        return null;
      }
      var $ = cheerio.load(html);

      $(".inner-article").each(function (i, elm) {
        if (elm.children[0].children[1] != undefined) {
          arr.push(elm.children[0].attribs["href"]);
        }
      });
      if (restockCycles != 0) {
        if (newSoldOutItems.length < originalSoldOutItems.length) {
          console.log("SITE RESTOCKED!");
          var restockedItems = findArrayDifferences(
            originalSoldOutItems,
            newSoldOutItems
          );
          console.log(restockedItems);
          postToDiscord(restockedItems);
          originalSoldOutItems = newSoldOutItems;
        }

        if (newSoldOutItems.length > originalSoldOutItems.length) {
          originalSoldOutItems = newSoldOutItems;
        }
      }
      restockCycles++;
      console.log("Restock Cycle #" + restockCycles + "Completed" + "\n");
      setTimeout(function () {
        newSoldOutItems = [];
        scrape(newSoldOutItems);
      }, refreshDelay);
    }
  );
}

function findArrayDifferences(arr1, arr2) {
  return _.difference(arr1, arr2);
}

function formatProxy(proxy) {
  if (proxy && ["localhost", ""].indexOf(proxy) < 0) {
    proxy = proxy.replace(" ", "_");
    const proxySplit = proxy.split(":");
    if (proxySplit.length > 3)
      return (
        "http://" +
        proxySplit[2] +
        ":" +
        proxySplit[3] +
        "@" +
        proxySplit[0] +
        ":" +
        proxySplit[1]
      );
    else return "http://" + proxySplit[0] + ":" + proxySplit[1];
  } else return undefined;
}

function generateRandomUserAgent() {
  var userAgent =
    userAgentList[Math.floor(Math.random() * userAgentList.length)];
  return { "User-Agent": userAgent };
}

function postToDiscord(restockedItems) {
  for (let i = 0; i < restockedItems.length; i++) {
    discord.sendMessage("http://www.supremenewyork.com" + restockedItems[i]);
  }
}

function postToTwitter(restockedItems) {
  for (let i = 0; i < restockedItems.length; i++) {
    client.post(
      "statuses/update",
      { status: "http://www.supremenewyork.com" + restockedItems[i] },
      function (error, tweet, response) {}
    );
  }
}

initialize();
