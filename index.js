var adapter = require("./lib/adapters/default");
var registry = require("./lib/gadgets").registry;
var controllers = require("./lib/controllers");

exports.init = function(app, callback)
{	
	// initialize
    adapter.init(app, function(store) {
        controllers.init(app, store, registry, function() {
            callback();
        });
    });
};
