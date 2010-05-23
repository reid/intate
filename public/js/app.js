YUI().use("node", "json", "io", "yui2-autocomplete", function (Y) {    
    console.log("HELLO WORLD");

    YAHOO = Y.YUI2;

    Y.io("/api/friends", {
        on : {
            success : function (id, response) {
                var friends = Y.JSON.parse(response.responseText);

                // Use a LocalDataSource
                var oDS = new YAHOO.util.LocalDataSource(friends);
                // Optional to define fields for single-dimensional array
                oDS.responseSchema = {fields : ["name"]};
             
                // Instantiate the AutoComplete
                var oAC = new YAHOO.widget.AutoComplete("name", "name-dropdown", oDS);
                oAC.prehighlightClassName = "yui-ac-prehighlight";
                oAC.useShadow = true;
            },
            failure : function (resp) {
                console.log("FAIL", resp);
            }
        }
    });

});
