/**
 * Initializes support for dynamic pages.
 *
 * @param app
 * @param store
 * @param gadgetRegistry
 * @param callback
 */
module.exports.init = function(app, store, registry, callback)
{
    /**
     * Load all page configurations and mount them to "/" for the dynamic front end (which uses hash # urls)
     */
    /*
    store.loadPages(function(configs) {

        for (var key in configs)
        {
            var config = configs[key];

            (function(key, page, uri) {
                uri = "/";
                app.get(uri, function(req, res){
                    dynamicController.call(this, key, page, uri, req, res);
                });
            })(key, config.page, config.page.uri);
        }

        callback.call(this);
    });
    */
    // we can replace this with something much simpler
    app.get("/", function(req, res) {
        res.render("index");
    });


    /**
     * Set up page configuration retrieval controller.
     */
    app.get("/_pages/**", function(req, res) {

        var uri = req.url.substring(7); // trim off /_pages

        renderPage.call(this, store, registry, uri, req, res);
    });


    /**
     * Set up gadget runtime configuration retrieval controller.
     */
    app.get("/_gadgets/_runtime/:gadgetType/:gadgetId", function(req, res) {

        var gadgetType = req.params["gadgetType"];
        var gadgetId = req.params["gadgetId"];

        store.loadGadget(gadgetType, gadgetId, function(config) {
            res.send(config);
        });
    });

	callback();
};


/*
var dynamicController = function(key, page, uri, req, res)
{
    //res.render(page.template, page);
    res.render("index", page);
};
*/



/**
 * Renders back JSON for a page.
 *
 * @param store
 * @param registry
 * @param uri
 * @param req
 * @param res
 */
var renderPage = function(store, registry, uri, req, res)
{
    store.loadPage(uri, function(config) {

		// collect gadget subscriber keys
		var gadgetSubscriberKeys = [];
		for (var gadgetSubscriberKey in config.gadgets)
		{
			gadgetSubscriberKeys.push(gadgetSubscriberKey);
		}

        // each gadget now gets to setup its runtime configuration
        var count = 0;
		for (var z = 0; z < gadgetSubscriberKeys.length; z++)
		{
			var gadgetSubscriberKey = gadgetSubscriberKeys[z];
			
            var gadgetObj = config.gadgets[gadgetSubscriberKey];
            if (gadgetObj)
            {
                // make a copy of the base configuration
                var runtime = JSON.parse(JSON.stringify(gadgetObj));

				// retrieve the gadget registry entry
				var gadget = registry.getGadget(runtime.gadgetType);
                if (gadget)
                {
                    (function(store, config, gadget, gadgetSubscriberKey, runtime) {
                        gadget.runtime(store, config, gadget, runtime, function(runtime)
                        {
                            config.gadgets[gadgetSubscriberKey] = runtime;

                            count++;

                            if (count == gadgetSubscriberKeys.length)
                            {
                                res.send(config);
                            }
                        });
                    }(store, config, gadget, gadgetSubscriberKey, runtime));
                }
                else
                {
                    config.gadgets[gadgetSubscriberKey] = runtime;

                    count++;

                    if (count == gadgetSubscriberKeys.length)
                    {
                        res.send(config);
                    }
                }
            }
        }

    });
};
