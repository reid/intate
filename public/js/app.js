YUI().use("node", "json", "io", "yui2-autocomplete", "yui2-datatable", function (Y) {    
    console.log("HELLO WORLD");

    YAHOO = Y.YUI2;

    Y.io("/api/friends", {
        on : {
            success : function (id, response) {
                var friends = Y.JSON.parse(response.responseText);

                // Use a LocalDataSource
                var oDS = new YAHOO.util.LocalDataSource(friends);
                // Optional to define fields for single-dimensional array
                oDS.responseSchema = {fields : ["name", "id"]};
             
                // Instantiate the AutoComplete
                var oAC = new YAHOO.widget.AutoComplete("name", "name-dropdown", oDS);
                oAC.prehighlightClassName = "yui-ac-prehighlight";
                oAC.useShadow = true;
                oAC.resultTypeList = false;

                var friendid = Y.one("#friend-id");

                oAC.itemSelectEvent.subscribe(function (type, args) {
                    friendid.set("value", args[2].id);
                });
                Y.one("#friends").on("submit", function (e) {
                    e.halt();
                    query(friendid.get("value"));
                }); 
            },
            failure : function (resp) {
                console.log("FAIL", resp);
            }
        }
    });

    var query = function (user) {
        Y.one("#friend-results").setContent("<img src='http://d.yimg.com/a/i/ww/met/anim_loading_sm_082208.gif'> Loading...");

        Y.io("/api/etsy/" + user, {
            on : {
                success : function (id, o) {
                    var results = Y.JSON.parse(o.responseText);
                    queryFails(results);
                },
                failure : function () {
                    Y.one("#friend-results").setContent("Sorry, try again!");
                }
            }
        });
    };

    var queryFails = function  (source) {
        var formatUrl = function(elCell, oRecord, oColumn, sData) {
            elCell.innerHTML = "<a href='" + oRecord.getData("url") + "' target='_blank'>" + sData + "</a>";
        };
 
        var formatImg = function (elCell, oRecord, oColumn, sData) {
            elCell.innerHTML = "<img src='" + sData + "'/>";
        };
 
        var myColumnDefs = [
            {key:"image_url_155x125", label:"Image", formatter:formatImg},
            {key:"title", label:"Name", sortable:true, formatter:formatUrl},
            {key:"user_name", label:"User"}
        ];
 
        var myDataSource = new YAHOO.util.DataSource(source);
        myDataSource.responseType = YAHOO.util.DataSource.TYPE_JSARRAY;
        myDataSource.responseSchema = {
            resultsList:"",
            fields: ["title", "image_url_155x125", "user_name", "url"]
        };
 
        var myDataTable = new YAHOO.widget.DataTable("friend-results", myColumnDefs,
                myDataSource, {initialRequest:""});
 
        var mySuccessHandler = function() {
            this.set("sortedBy", null);
            this.onDataReturnAppendRows.apply(this,arguments);
        };
        var myFailureHandler = function() {
            this.showTableMessage(YAHOO.widget.DataTable.MSG_ERROR, YAHOO.widget.DataTable.CLASS_ERROR);
            this.onDataReturnAppendRows.apply(this,arguments);
        };
        var callbackObj = {
            success : mySuccessHandler,
            failure : myFailureHandler,
            scope : myDataTable
        };
               
        return {
            oDS: myDataSource,
            oDT: myDataTable
        };
    };

});
