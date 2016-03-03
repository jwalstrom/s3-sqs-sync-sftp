# S3 -> SQS -> SYNC to SFTP Server

This project syncs S3 files to an SFTP server. You must have S3 bucket setup sending notifications for ObjectCreated events to an SQS queue.  This project setups a worker that reads from the queue and syncs the file and directories to an SFTP Server.  

This is a one way sync and does not handle deletes from s3 or any changes that may occur on the SFTP server.

## CONFIGURATON

There is a sample config file located in /config/sample.json, you will need to create one for each of you enviroments development.json and production.json 

This project uses  [convict](https://github.com/mozilla/node-convict) for configuration.

