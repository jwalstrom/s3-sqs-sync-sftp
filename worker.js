"use strict";

var AWS = require("aws-sdk");
var Client = require("ssh2").Client;
var moment = require("moment");
var path = require("path");
var uuid = require("node-uuid");
var config = require("./lib/config");
var logger = require("./lib/logger");
var SqsConsumer = require("./lib/sqs-consumer");
var FileSync = require("./lib/file-sync");

var currentMessage;
var bytesTranferred;
var sqsConsumer;
var transferStart;

AWS.config.update({
	region: config.get("aws.region"),
	accessKeyId: config.get("aws.accessKeyId"),
	secretAccessKey: config.get("aws.secretAccessKey")
});

function handleRetryExceeded(message, callback) {
	sqsConsumer.deleteMessage(message, function(err) {
		if(err) {
			callback(err);
		}
		else {
			callback(new Error("Message retry count exceeded"));
		}
	});
}

function logError(message, errorMessage, callback) {
	var messageId = message.MessageId;
	var messageBody = JSON.parse(message.Body);
	var s3Event = messageBody.Records[0].s3;
	var key = decodeURIComponent(s3Event.object.key.replace(/\+/g, " "));
	logger.error("MessageId:", message.MessageId, "Error:", errorMessage);
}

function logTransferSuccess(message, bytesTransferred, elapsedSeconds, callback) {
	var messageId = message.MessageId;
	var messageBody = JSON.parse(message.Body);
	var s3Event = messageBody.Records[0].s3;
	var key = decodeURIComponent(s3Event.object.key.replace(/\+/g, " "));
	var mbTransferred = (bytesTranferred / 1024 / 1024).toFixed(1);
	logger.info("Transfer success\n", "MessageID:", messageId, "Key:", key, "Transferred:", mbTransferred, "mb", "Elapsed seconds:", elapsedSeconds);
}

function processMessage(message, done) {
	var fileRetryCount = config.get("fileRetryCount");
	var readCount = message.Attributes.ApproximateReceiveCount;
	if(readCount > fileRetryCount) {
		handleRetryExceeded(message, done);
	}
	else {
		console.info("processing message");
		var messageBody = JSON.parse(message.Body);
		var s3Event = messageBody.Records[0].s3;
		var bucket = decodeURIComponent(s3Event.bucket.name.replace(/\+/g, " "));
		var key = decodeURIComponent(s3Event.object.key.replace(/\+/g, " "));
         
        if(keyIsValid(message) == false) {
            logger.info("Invalid key", key);
            done();
        }
        else {
            var tmpBufferPath = path.join(__dirname, "tmp", "download.bin");
            var sftpPath = buildDestPath(key);
            logger.debug("Destination SFTP path:", sftpPath);
            var fileSync = FileSync.create();
            fileSync.transferS3toSFTP(bucket, key, sftpPath, tmpBufferPath, function(err, bytesTransferred) {
                if(err) {
                    done(err);
                }
                else {
                    bytesTranferred = bytesTransferred;
                    done();
                }
            });
        }
        
	}
}

function buildDestPath(key) {
    // perform path transformations required for the sftp destination path
	return key;
}

function keyIsValid(message) {
    var messageBody = JSON.parse(message.Body);
    var s3Event = messageBody.Records[0].s3;
	var key = decodeURIComponent(s3Event.object.key.replace(/\+/g, " "));
    var size = s3Event.object.size;
    if(size == 0) {
        logger.debug("File size: ", size);
        return false;
    }
     // perform any other validations required
    return true;
}

sqsConsumer = SqsConsumer.create({
	queueUrl: config.get("aws.sqsQueueUrl"),
	handleMessage: processMessage,
	messageAttributeNames: ["All"],
	visibilityTimeout: config.get("messageVisibilityTimeout"),
	sqs: new AWS.SQS()
});

sqsConsumer.on("error", function (err) {
	var errorMessage = "SQSConsumer error: " + err.message;
	logError(currentMessage, errorMessage, function(err) {
		logger.debug("Error logged successfully");
	});
});

sqsConsumer.on("message_received", function (message) {
	logger.debug("message_received");
	currentMessage = message;
	transferStart = moment();
	bytesTranferred = 0;
});

sqsConsumer.on("message_processed", function (message) {
    if(keyIsValid(message) == true) {
        var elapsedSeconds = moment().diff(transferStart, "seconds");
        logTransferSuccess(message, bytesTranferred, elapsedSeconds, function(err){
            if(err) {
                logger.error("logTransferSuccess error", err);
            }
            else {
                logger.debug("Transfer logged successfully");
            }
        });
    }
});

sqsConsumer.start();
logger.info("processing queue events");