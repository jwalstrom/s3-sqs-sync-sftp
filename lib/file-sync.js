"use strict";

var async = require("async");
var AWS = require("aws-sdk");
var path = require("path");
var SSH2Client = require("ssh2").Client;
var config = require("./config");
var logger = require("./logger");

AWS.config.update({
	region: config.get("aws.region"),
	accessKeyId: config.get("aws.accessKeyId"),
	secretAccessKey: config.get("aws.secretAccessKey")
});

function FileSync() {
}

FileSync.create = function () {
  return new FileSync();
};

FileSync.prototype.transferS3toSFTP = function(s3Bucket, s3Key, sftpPath, tmpBufferPath, callback) {
	
	var ssh2Client = new SSH2Client();
	
	ssh2Client.on("connect", function () {
		logger.debug( "SSH2 Connected" );
	});

	ssh2Client.on("ready", function () {
		logger.debug( "SSH2 Ready" );
		ssh2Client.sftp(function (err, sftp) {
			if (err) {
				callback(new Error("Error, problem starting SFTP: " + err.message));
			}
			logger.debug( "SFTP started" );
			
			var directory = path.dirname(sftpPath);
						
			async.waterfall([
				function(callback) {
					sftp.exists(directory, function(exists){
						callback(null, exists);
					});
				},
				function(dirExists, callback) {
					if(dirExists == false) {
						sftp.mkdir(directory, {}, function(err) {
							logger.debug("Creating missing dir: " + directory);
							callback(err);
						})
					}
					else {
						callback();
					}
				},
				function(callback) {
					var dataLength = 0;
					
                    var writeStream = require('fs').createWriteStream(tmpBufferPath);
                    writeStream.on('finish', function() {
                        logger.debug("finished writing file");
                        var putOptions = {
							concurrency: 25,
							chunkSize: 32768,
							step: function(transferred, chunk, total) {
								var percentage = (Math.floor(transferred/total*10000)/100);
								logger.debug("Uploaded:" + percentage + "% Bytes " + transferred);
							}
						};
						sftp.fastPut(tmpBufferPath, sftpPath, putOptions, function(err) {
							sftp.end();
							callback(err, dataLength);
						});
                    });
                    writeStream.on("error", function(err) {
						logger.error( "Error, writing file: %s", err );
						callback(err);
					});		
				
                    var s3 = new AWS.S3();
                    s3.getObject({
						Bucket: s3Bucket,
						Key: s3Key
					}).
                    on('httpData', function(chunk) { 
                        writeStream.write(chunk); 
                        dataLength += chunk.length;
                            var processing = (dataLength / 1024 / 1024).toFixed(1);
                            logger.debug("Downloaded: " + processing + "mb");
                        }).
                    on('httpDone', function() { 
                        writeStream.end(); 
                            logger.debug("Download completed.")
                        }).
                    send();
            			
				},
			], function (err, bytesTransferred) {
				ssh2Client.end();
				callback(err, bytesTransferred);
			});	
						
		});
				
	});
	
	ssh2Client.on("error", function (err) {
		callback(new Error("SSH2 Connection error: " + err.message));
	});
	 
	ssh2Client.on("end", function () {
		logger.debug("SSH2 Connection ended");
	});

	ssh2Client.connect(
		{
			host: config.get("sftp.host"),
			port: config.get("sftp.port"),
			username: config.get("sftp.username"),
			password: config.get("sftp.password")
		}
	);
}

module.exports = FileSync;