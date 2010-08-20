var assert = require("assert");
var querystring = require("querystring");
var http = require("http");
var EventEmitter = require("events").EventEmitter;

var oapi = require("./jsoauth/api");

var EXTRACTOR_TABLE = "http://gist.github.com/raw/410824/825b4090c1dd0e3743a0ea9885a25c9e89e4dec0/extract-etsy.xml";
var REDIRECT_URI = "http://intate.com/facebook/redirect";

assert.ok(process.env.FB_KEY, "FB_KEY env not set?");
assert.ok(process.env.FB_SECRET, "FB_SECRET env not set?");
assert.ok(process.env.ETSY_KEY, "ETSY_KEY env not set?");

configure(function() {
    set("root", __dirname);
    use(Logger);
    use(Cookie);
    use(Session, { lifetime: (45).minutes, reapInterval: (1).minute });
    use(Static, { path: require("path").join(__dirname, "..", "public") });
    enable("show exceptions");
});

function forbidToken (express) {
    if (express.session.token) express.redirect("/home");
    return express;
}

function requireToken (express) {
    if (!express.session.token) express.redirect("/");
    return express;
}

function hasToken (express) {
    if (!express.session.token) {
        express.respond(403, "Authorization required");
        return false;
    }
    return true;
}

get("/", function() {
    forbidToken(this).render("index.html.haml");
})

get("/home", function () {
    requireToken(this).render("facebook.html.haml");
});

get("/yap", function () {
    this.render("yap.html.haml");
});

get("/yap/friend/:guid", function (guid) {
    this.render("yap.friend.html.haml", {
        locals : {
            guid : guid
        }
    });
});

get("/api/friends", function () {
    if (!hasToken(this)) return;
    var express = this;
    facebookRequest("/me/friends", {
        "access_token" : this.session.token
    }).addListener("response", function (data) {
        data = JSON.parse(data);
        if (data.error) return express.respond(500, "Facebook failed: " + data.error.message);
        express.respond(200, JSON.stringify(data.data));
    });
});

function superYQL (express, likes) {
    // escaping this sucks so much, so just KISS for the hack:
    var context = likes.join(" ").replace(/[^a-zA-Z0-9 ]+/g, "");
    yql(
        "use \"" + EXTRACTOR_TABLE + "\" as extractor;"
        + " select * from extractor where context = \"" + context + "\""
        + " and api_key = \"" + process.env.ETSY_KEY + "\""
    ).addListener("response", function (listings) {
        listings = JSON.parse(listings).query.results.etsy.results;
        if (!listings) return express.respond(500, "YQL failed to respond properly");
        express.respond(200, JSON.stringify(listings));
    });
}

get("/api/etsy/:id", function (id) {
    if (!hasToken(this)) return;
    var express = this;
    facebookRequest("/" + id + "/likes", {
        "access_token" : this.session.token
    }).addListener("response", function (data) {
        data = JSON.parse(data).data;
        if (!data) return express.respond(500, "Facebook failed to respond properly");
        var likes = [];
        data.forEach(function (like) {
            likes.push(like.name);
        });
        if (!likes.length) return express.respond(204);
        superYQL(express, likes);
    });
});

get("/api/yahoo/etsy/:id", function (guid) {
    var express = this;
    oapi.makeRequest(
        "http://query.yahooapis.com/v1/yql",
        [
            "q=select%20%2A%20from%20social.profile%20where%20query%20%3D%20%22" + guid + "%22",
            "format=json"
        ],
        function (err, data, res) {
            if (err) return;
            data = JSON.parse(data);
            if (!data) return express.respond(500, "YQL failed to respond properly");
            var profile = data.query.results.profile.interests;
            var likes = [];
            data.forEach(function (like) {
                likes.push(like.declaredInterests);
            });
            if (!likes.length) return express.respond(204);
            superYQL(express, likes);
       }
    );
});

get("/facebook/authorize", function () {
    forbidToken(this);
    var query = querystring.stringify({
        "client_id" : process.env.FB_KEY,
        "redirect_uri" : REDIRECT_URI,
        "scope" : [
            "friends_birthday",
            "friends_likes",
            "user_location"
        ].join(",")
    });
    this.redirect("https://graph.facebook.com/oauth/authorize?" + query);
});

get("/facebook/reset", function () {
    delete this.session.token;
    requireToken(this);
});

get("/facebook/token", function () {
    this.respond(200, this.session.token || "No token set!");
});

get("/facebook/token/:token", function (token) {
    this.session.token = decodeURIComponent(token);
    forbidToken(this);
});

get("/facebook/redirect", function () {
    forbidToken(this);
    var express = this;
    facebookRequest("/oauth/access_token", {
        "client_id" : process.env.FB_KEY,
        "client_secret" : process.env.FB_SECRET,
        "redirect_uri" : REDIRECT_URI,
        "code" : this.param("code")
    }).addListener("response", function (data) {
        var token = querystring.parse(data);
        express.session.token = token.access_token;
        // var expires = data.expires.minutes;
        // if (expires < Session.lifetime) Session.lifetime = expires;
        forbidToken(express);
    });
});

get("/public/rendered/css/*.css", function (file) {
    this.render(file + ".css.sass", { layout : false });
});

get("/favicon.ico", function () {
    this.pass("/public/images/favicon.ico");
});

function responseEventForRequest (req) {
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
}

function httpRequest (host, path, secure, method) {
    method = method || "GET";
    return responseEventForRequest(
        http.createClient(
            secure ? 443 : 80,
            host,
            secure
        ).request(method, path, {
            "host" : host
        })
    );
}

function yql (query) {
    return httpRequest(
        "query.yahooapis.com",
        "/v1/public/yql?" + querystring.stringify({
            "q" : query,
            "format" : "json",
            "env" : "store://datatables.org/alltableswithkeys"
        }).replace("'", "%22")
    );
};

function facebookRequest (endpoint, params) {
    params = params || {};
    var query = querystring.stringify(params);
    return httpRequest(
        "graph.facebook.com",
        [endpoint, query].join("?"),
        true
    );
};

run(parseInt(process.env.PORT || 8000), null);
