var assert = require("assert");
var querystring = require("querystring");

assert.ok(process.env.FB_KEY, "FB_KEY env not set?");
assert.ok(process.env.FB_SECRET, "FB_SECRET env not set?");

configure(function() {
    set("root", __dirname);
    use(Logger);
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

var REDIRECT_URI = "http://intate.heroku.com/facebook/redirect";

get("/facebook/authorize", function () {
    var query = querystring.stringify({
        "client_id" : process.env.FB_KEY,
        "redirect_uri" : REDIRECT_URI
    });
    this.redirect("https://graph.facebook.com/oauth/authorize?" + query);
});

get("/facebook/redirect", function () {
    var http = require("http");
    var query = querstring.stringify({
        "client_id" : process.env.FB_KEY,
        "client_secret" : process.env.FB_SECRET,
        "redirect_uri" : REDIRECT_URI,
        "code" : this.param("code")
    });
    var fb = http.createClient(443, "graph.facebook.com", true);
    var req = fb.request("GET", "/oauth/access_token?" + query);
    req.addListener("response", function (response) {
        response.setEncoding("utf8");
        var data = "";
        response.addListener("data", function (chunk) {
            data += chunk;
        });
        response.addListener("end", function () {
            this.render("facebook.html.haml", {
                locals : {
                    data : data
                }
            });
        });
    });
    req.end();
});

run(parseInt(process.env.PORT || 8000), null);
