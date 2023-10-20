# Gmail Attachment Downloader

The Gmail Attachment Downloader is a Node.js script for automatically downloading Gmail attachments that meet specific criteria from an IMAP Gmail account, such as Gmail.

## Features

- Automatically downloads Gmail attachments based on criteria.
- Checks for duplicate attachments.
- Stores downloaded attachment details.
- Utilizes hashing for content comparison.
- Supports customizable download paths.
- Configurable for a specific sender's Gmail address.
- Schedules automatic Gmail processing.

## Installation

1. Clone this repository to your local machine:
   git clone https://github.com/Chandan-007/automatically-gmail-attachments-downloader

Navigate to the project directory:

cd Gmail-attachment-downloader
Install the required dependencies:
npm install
Configuration
Before using the script, you need to configure the following settings in the config.js file:

IMAP Gmail server settings (host, port, user, password)
Download path for attachments
Specific sender's Gmail address
Attachment criteria (e.g., filename, extension)
Scheduling options
Usage
Run the script by executing: npm start
This will initiate the Gmail processing and attachment download based on the configured settings.

File Structure
The project has the following file structure:

config.js: Configuration file for Gmail server settings and attachment criteria.
gmail-attachment-downloader.js: The main script for downloading Gmail attachments.
downloaded_attachments_set.json: A JSON file for storing downloaded attachment filenames.
downloaded_content_hashes.json: A JSON file for storing content hashes to avoid duplicate downloads.
attachments/: A directory where downloaded attachments are stored.
node_modules/: The directory containing Node.js modules and dependencies.
package.json and package-lock.json: Node.js package configuration files.
License
This project is licensed under the MIT License - see the LICENSE.md file for details.

Author
Chandan Chowdhury

Acknowledgments
Node.js
node-imap
mailparser
typescript

Please note that you should replace `https://github.com/Chandan-007/automatically-gmail-attachments-downloader`, `Chandan Chowdhury`, and any other placeholders with your actual repository URL and name.

In this README template, you can provide an overview of your project, installation instructions, configuration details, usage instructions, file structure, licensing information, author details, and acknowledgments. You can further expand the sections or add more information as needed for your specific project.
