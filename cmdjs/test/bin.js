#!/usr/bin/env node

var cmdJs = require("../index.js");
cmdJs.bin({
    configDir : cmdJs.path2.join(__dirname, "config"),
    pluginDir : cmdJs.path2.join(__dirname, "plugin")
});