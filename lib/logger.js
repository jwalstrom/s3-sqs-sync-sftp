"use strict"

var winston = require("winston");
var config = require("./config");

winston.emitErrs = true;

var logger = new winston.Logger({exitOnError: false});

var transports = [];

var logLevel = config.get("logLevel");

// add console logger
var consoleLogger = new winston.transports.Console({
    level: logLevel,
    handleExceptions: true,
    json: false,
    colorize: true
});
transports.push(consoleLogger);

var logger = new winston.Logger({
    transports: transports,
    exitOnError: false
});
	
module.exports = logger;

module.exports.stream = {
    write: function(message, encoding){
        logger.info(message);
    }
};
