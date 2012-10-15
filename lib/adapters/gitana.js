// include gitana driver and also load our custom properties file
var gitana = require('gitana');
var Properties = require('properties');

var context = {};

/**
 * Loads page and gadget binding information.
 *
 * @param app
 * @return {Object}
 */
exports.init = function(app, callback)
{
    var self = this;

	// load our application stack propreties
	new Properties().load("stack.properties", function(error) {
	
		if (error)
		{
			console.log("Unable to initiate adapter, problem loading stack.properties");
			console.log(error);
			return;
		}
		
		var stackKey = this.get("stackKey");
		if (!stackKey)
		{
			console.log("Unable to initiate adapter, missing stackKey");
			return;
		}
		console.log("Initializing adapter with stackKey = " + stackKey);
		
		var stackRepoKey = this.get("stackRepoKey");
		if (!stackRepoKey)
		{
			console.log("Unable to initiate adapter, missing stackRepoKey");
			return;
		}
		console.log("Initializing adapter with stackRepoKey = " + stackRepoKey);
		
		var stackAppKey = this.get("stackAppKey");
		if (!stackAppKey)
		{
			console.log("Unable to initiate adapter, missing stackAppKey");
			return;
		}
		console.log("Initializing adapter with stackAppKey = " + stackAppKey);
		
		var branchId = this.get("branchId");
		if (!branchId)
		{
			branchId = "master";
		}
		
	    // make sure that the gitana driver picks up our local properties file
	    gitana.load(function() {

	        // connect to the Cloud CMS server
	        gitana.connect().then(function() {

				// store reference to platform
				context["platform"] = this;

	            this.readStack(stackKey).then(function() {

					// application
					this.readDataStore(stackAppKey).then(function() {
						var datastoreId = this.get("datastoreId");
						this.subchain(context.platform).readApplication(datastoreId).then(function() {
							context["application"] = this;							
						});
					});
					
					// repository					
					this.readDataStore(stackRepoKey).then(function() {
		                var datastoreId = this.get("datastoreId");
						this.subchain(context.platform).readRepository(datastoreId).then(function () {
							context["repository"] = this;
							this.readBranch(branchId).then(function() {
								context["branch"] = this;
								
								var store = wrapAsStore(this);
								callback.call(self, store);
							});
						});
					});
				});
	        });
	    });		
	});
};

var cleanObject = function(object)
{
    delete object["_features"];
    delete object["_qname"];
    delete object["_type"];
    delete object["_is_association"];
    delete object["stats"];
};

var wrapAsStore = function(branch)
{
    var createPageConfig = function(page, callback)
    {
        var self = this;

        var config = {};

		// application
		config.application = context.application.object;
		cleanObject(config.application);

        config.page = page;
        cleanObject(config.page);

        // load the template
        Chain(branch).queryNodes({
            "_type": "web:template",
            "key": page.templateKey
        }).keepOne().then(function() {

            cleanObject(this.object)
            config.template = this.object;
            config.templateKey = this.object.key;

            // walk all bindings and determines which ones to keep based on gadget resolution
            var gadgetIds = [];
            var potentials = {};
            Chain(branch).queryNodes({
                "_type": "web:gadgetBinding"
            }).each(function() {

                cleanObject(this.object);

                potentials[this.object.targetGadgetId] = this.object;

            }).then(function() {

                config.bindings = {};

                var toKeep = [];

                do
                {
                    toKeep = [];

                    // walk anything in "potentials" and see if we should keep it
                    for (var gadgetId in potentials)
                    {
                        var obj = potentials[gadgetId];

                        var keep = false;

                        /**
                         * Check:
                         *    Global Scope
                         *    Template Scope
                         *    Page Scope
                         *    Contained Gadget Scope
                         */

                        if ("global" == obj.sourceScope)
                        {
                            keep = true;
                        }
                        else if ("template" == obj.sourceScope)
                        {
                            if (config.template.key == obj.sourceContainerKey)
                            {
                                keep = true;
                            }
                        }
                        else if ("page" == obj.sourceScope)
                        {
                            if (config.page.key == obj.sourceContainerKey)
                            {
                                keep = true;
                            }
                        }
                        else
                        {
                            // it must be a contained gadget scope
                            // assume the "sourceScope" is a gadget type and "sourceContainerKey" is a gadget id

                            var b = config.bindings[obj.sourceContainerKey];
                            if (b)
                            {
                                keep = true;
                            }
                        }

                        if (keep)
                        {
                            toKeep.push(gadgetId);
                        }
                    }

                    // keep and remove
                    for (var i = 0; i < toKeep.length; i++)
                    {
                        var gadgetId = toKeep[i];

                        config.bindings[gadgetId] = potentials[gadgetId];
                        gadgetIds.push(gadgetId);

                        delete potentials[gadgetId];
                    }
                }
                while (toKeep.length > 0);

                // eventually we'll hit steady state...

            }).then(function() {

                config.gadgets = {};
                Chain(branch).queryNodes({
                    "_type": "web:gadgetInstance",
                    "gadgetId": { "$in" : gadgetIds }
                }).each(function() {
                    config.gadgets[this.object.gadgetId] = {};
                    cleanObject(this.object);
                    config.gadgets[this.object.gadgetId] = this.object;
                }).then(function() {
                    callback.call(self, config);
                });
            });
        });
    };

    return {

        /**
         * Loads a page configuration for a given uri.
         *
         * @param uriOrKey
         * @param callback
         */
        loadPage: function(uriOrKey, callback)
        {
            var self = this;

            var query = { "$or": [{
                "_type": "web:page",
                "uri": uriOrKey
            }, {
                "_type": "web:page",
                "key": uriOrKey
            }]};

            Chain(branch).queryNodes(query).keepOne().then(function() {
                createPageConfig(this.object, function(config) {
                    callback.call(self, config);
                });
            });
        },


        /**
         * Loads all page configurations
         *
         * @param callback
         */
        loadPages: function(callback)
        {
            var self = this;

            var pageCount = -1;
            var configs = {};

            Chain(branch).queryNodes({
                "_type": "web:page"
            }).count(function(count) {
                pageCount = count;

                if (pageCount == 0)
                {
                    callback.call(self, configs);
                }

            }).each(function() {

                createPageConfig(this.object, function(config) {
                    configs[config.page.key] = config;
                    pageCount--;

                    if (pageCount == 0)
                    {
                        callback.call(self, configs);
                    }
                });

            });
        },

        loadGadget: function(gadgetType, gadgetId, callback)
        {
            var self = this;

            Chain(branch).queryNodes({
                "_type": "web:gadgetInstance",
                "gadgetType": gadgetType,
                "gadgetId": gadgetId
            }).keepOne().then(function() {
                callback.call(self, this.object);
            });
        },

		loadApplication: function(callback)
		{
            var self = this;
			
			callback.call(self, context.application.object);
		}
    };
};
