"use strict";

module.exports = {
	env: {
		doc: "The application environment.",
		format: ["development", "test", "production"],
		default: "development",
		env: "NODE_ENV",
		arg: "node-env"
	},
    logLevel: {
		doc: "The application logging level.",
		default: "debug",
		env: "LOG_LEVEL",
		arg: "log-level"
	},
	aws: {
		accessKeyId: {
			accessKeyId: "Amazon access key.",
			default: "",
			env: "AWS_ACCESS_KEY",
			arg: "aws-access-key"
		},
		secretAccessKey: {
			doc: "Amazon secret key.",
			default: "",
			env: "AWS_SECRET_KEY",
			arg: "aws-secret-key"
		},
		region: {
			doc: "Amazon region.",
			default: "us-west-2",
			env: "AWS_REGION",
			arg: "aws-region"
		},
		sqsQueueUrl: {
			doc: "SQS queue url",
			default: "",
			env: "AWS_QUEUE_URL",
			arg: "aws-queue-url"
		}
	},
	sftp: {
		host: {
			doc: "SFTP host address",
			default: "",
			env: "SFTP_HOST",
			arg: "sftp-host"
		},
		port: {
			doc: "SFTP port",
			format: "port",
			default: 22,
			env: "SFTP_PORT",
			arg: "sftp-port"
		},
		username: {
			doc: "SFTP username",
			default: "",
			env: "SFTP_USERNAME",
			arg: "sftp-username"
		},
		password: {
			doc: "SFTP password",
			default: "",
			env: "SFTP_PASSWORD",
			arg: "sftp-password"
		}
	},
	fileRetryCount: {
		doc: "The the number of times to try a file download.  If exceeds the count the message is erased and an error is logged",
		format: "int",
		default: 5,
		env: "FILE_RETRY_COUNT",
		arg: "file-retry-count"
	},
	messageVisibilityTimeout: {
		doc: "The duration (in seconds) that the received messages are hidden from subsequent retrieve requests after being retrieved",
		format: "int",
		default: 1200,
		env: "MESSAGE_VISIBILITY_TIMEOUT",
		arg: "message-visibility-timeout"
	}
};