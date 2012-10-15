(function(exports) {
	
	// private
	var registry = {};

	exports.registerGadget = function(gadgetTypeKey, gadgetConfig)
	{
    	var result = {
        	read: function(store, config, req, res)
        	{
        	},

        	runtime: function(store, config, gadget, runtime, callback)
        	{
            	callback(runtime);
        	}
    	};

    	// override
    	for (var key in gadgetConfig)
    	{
        	result[key] = gadgetConfig[key];
    	}

		registry[gadgetTypeKey] = result;
	};

	exports.getGadget = function(gadgetTypeKey)
	{
		return registry[gadgetTypeKey];
	};

})(exports);
