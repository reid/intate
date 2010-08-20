function intately (obj) {
    var res = document.getElementById("friend-results");
    res.innerHTML = "Your friend hasn't posted any updates lately. Try another?";

    var h = [];
    // caja doesn't understand <th> :(
    h.push("<table><tr class=\"th\"><td>Image</td><td>Description</td><td>Seller</td></tr>");

    obj = obj.data;
    for (var i = 0, l = obj.length; i < l; i++) {
        var itm = obj[i];
        h.push("<tr><td><img src=\"" + itm.image_url_75x75 + "\"></td>");
        h.push("<td><a href=\"" + itm.url + "\">" + itm.title + "</a></td>");
        h.push("<td>" + itm.user_name + "</td></tr>");
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
