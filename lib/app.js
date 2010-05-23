var assert = require("assert");
var querystring = require("querystring");

assert.ok(process.env.FB_KEY, "FB_KEY env not set?");
assert.ok(process.env.FB_SECRET, "FB_SECRET env not set?");

configure(function() {
    set("root", __dirname);
    use(Logger);
    use(Cookie);
    use(Session, { lifetime: (15).minutes, reapInterval: (1).minute });
    use(Static, { path: require("path").join(__dirname, "..", "public") });
    enable("show exceptions");
});

get("/", function() {
  this.render("index.html.haml", {
    locals: {
      remoteIp: this.connection.remoteAddress
    }
  })
})

get("/friends", function () {
    if (!this.session.token) this.redirect("/facebook/authorize");
    var express = this;
    facebookRequest("/me/friends", {
        "access_token" : this.session.token
    }).addListener("response", function (data) { 
        express.render("facebook.html.haml", {
            locals : {
                data : data
            }
        });
    });
});

get("/likes/:id", function (id) {
    if (!this.session.token) this.redirect("/facebook/authorize");
    var express = this;
    facebookRequest("/"+ id + "/likes", {
        "access_token" : this.session.token
    }).addListener("response", function (data) {
        express.render("facebook.html.haml", {
            locals : {
                data : data
            }
        });
    });
});

var REDIRECT_URI = "http://intate.heroku.com/facebook/redirect";

get("/facebook/authorize", function () {
    var query = querystring.stringify({
        "client_id" : process.env.FB_KEY,
        "redirect_uri" : REDIRECT_URI,
        "scope" : "friends_birthday,friends_groups,friends_likes,user_location"
    });
    this.redirect("https://graph.facebook.com/oauth/authorize?" + query);
});

get("/facebook/reset", function () {
    delete this.session.token;
    this.reditect("/facebook/authorize");
});

get("/facebook/redirect", function () {
    var express = this;
    var params = {
        "client_id" : process.env.FB_KEY,
        "client_secret" : process.env.FB_SECRET,
        "redirect_uri" : REDIRECT_URI,
        "code" : this.param("code")
    };
    var req = facebookRequest("/oauth/access_token", params);
    req.addListener("response", function (data) {
        var token = querystring.parse(data);
        express.session.token = token.access_token;
        express.redirect("/friends");
    });
});

var EventEmitter = require("events").EventEmitter;
var http = require("http");

function facebookRequest (endpoint, params) {
    var fb = http.createClient(443, "graph.facebook.com", true);
    params = params || {};
    var query = querystring.stringify(params);
    var req = fb.request("GET", endpoint + "?" + query, {
        "host" : "graph.facebook.com"
    });
    var event = new EventEmitter();
    req.addListener("response", function (response) {
        response.setEncoding("utf8");
        var data = "";
        response.addListener("data", function (chunk) {
            data += chunk;
        });
        response.addListener("end", function () {
            event.emit("response", data);
        });
    });
    req.end();
    return event;
};

run(parseInt(process.env.PORT || 8000), null);
