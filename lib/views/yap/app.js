function intately (obj) {
    var res = document.getElementById("friend-results");
    res.innerHTML = "done";

    console.log(obj);

    var h = [];
    h.push("<table><th><td>Image</td><td>Description</td><td>Seller</td></th>");

    obj = obj.data;
    for (var i = 0, l = obj.length; i < l; i++) {
        var itm = obj[i];
        h.push("<tr><td><img src=\"" + itm.image_url_75x75 + "\"></td><td>" + itm.title + "</td><td>" + itm.user_name + "</td></tr>");
    }

    h.push("</table>");

    res.innerHTML = h.join("");
}

gadgets.util.registerOnLoadHandler(function () {
    var guid = document.getElementById("guid").title;
    var p = {};
    p[gadgets.io.RequestParameters.CONTENT_TYPE] = "JSON";
    gadgets.io.makeRequest("http://intate.com/api/yahoo/etsy/" + guid, intately, p);
});