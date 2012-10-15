var registry = require("./registry");

// gadgets
require("./lib/dashboard").init(registry);
require("./lib/list").init(registry);
require("./lib/navbar").init(registry);
require("./lib/navbar").init(registry);

// dashlets
require("./lib/dashlets/welcome").init(registry);

// export back the registry
exports.registry = registry;
