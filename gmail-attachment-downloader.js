const Imap = require('node-imap');
const simpleParser = require('mailparser').simpleParser;
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');  // Add this line for hash function
const schedule = require('node-schedule');

const imapConfig = {
    user: 'youremail@domain.com', //change this to your gmail id- to which you will be receiving the emails
    password: '*************', //change this to your gmail app password
    host: 'imap.gmail.com',
    port: 993,
    tls: true
};

const downloadPath = path.join(__dirname, 'attachments'); // folder where the downloaded attachments will be getting saved
const downloadedAttachmentsSetFile = path.join(__dirname, 'downloaded_attachments_set.json'); // storing the attachment name here, for duplication checking
const downloadedContentHashesFile = path.join(__dirname, 'downloaded_content_hashes.json');  // Add this line for content hashes

const specificSenderEmail = 'sender-recipient@domain.com';  //change this to recipient's email id from where you are expecting to download the attachment

const imap = new Imap(imapConfig);

let downloadedAttachmentsSet = new Set();
let attachmentCounter = {};
let downloadedContentHashes = new Set();  // Add this line for content hashes

try {
    const data = fs.readFileSync(downloadedAttachmentsSetFile, 'utf-8');
    downloadedAttachmentsSet = new Set(JSON.parse(data));
    console.log('Downloaded attachments set loaded:', downloadedAttachmentsSet);
} catch (err) {
    console.error('Error loading downloaded_attachments_set.json:', err.message);
}

try {
    const data = fs.readFileSync(downloadedContentHashesFile, 'utf-8');
    downloadedContentHashes = new Set(JSON.parse(data));
    console.log('Downloaded content hashes set loaded:', downloadedContentHashes);
} catch (err) {
    console.error('Error loading downloaded_content_hashes.json:', err.message);
}

function saveDownloadedAttachments() {
    fs.writeFileSync(downloadedAttachmentsSetFile, JSON.stringify(Array.from(downloadedAttachmentsSet)));
    console.log('Downloaded attachments set saved:', downloadedAttachmentsSet);
}

function saveDownloadedAttachment(filename) {
    downloadedAttachmentsSet.add(filename);
    saveDownloadedAttachments();
}

function isAttachmentDownloaded(filename) {
    return downloadedAttachmentsSet.has(filename);
}

function downloadLatestAttachment(parsedEmail) {
    if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
        parsedEmail.attachments.forEach(attachment => {
            const filename = attachment.filename;

            if ((filename.includes('Consol_MIS_') || filename.includes('Consol_EOD_')) && // checking for Consol_MIS_ or Consol_EOD_ patern existing within the email attachment
                filename.toLowerCase().endsWith('.csv')) { // checking the file type and ext.

                const baseFilename = `SOME ATTACHMENT FILE NAME PARTERN Console_${filename.split('_')[1]}_${parsedEmail.date.toISOString().split('T')[0]}`;

                if (!(baseFilename in attachmentCounter)) {
                    attachmentCounter[baseFilename] = 0;
                }

                let counter = attachmentCounter[baseFilename];
                let newFilename = `${baseFilename}.csv`;

                while (isAttachmentDownloaded(newFilename)) {
                    counter++;
                    newFilename = `${baseFilename} (${counter}).csv`;
                }

                const contentHash = hashAttachmentContent(attachment.content);

                if (!isContentHashDownloaded(contentHash)) {
                    const filePath = path.join(downloadPath, newFilename);
                    fs.writeFileSync(filePath, attachment.content, 'binary');
                    console.log('Attachment saved:', filePath);
                    saveDownloadedAttachment(newFilename);
                    saveContentHash(contentHash);
                    attachmentCounter[baseFilename]++;
                } else {
                    console.log('Attachment not downloaded based on content:', newFilename);
                }
            } else {
                console.log('Skipping attachment:', filename);
            }
        });
    } else {
        console.log('No attachments found in the email.');
    }
}

function hashAttachmentContent(content) {
    const hash = crypto.createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
}

function isContentHashDownloaded(contentHash) {
    return downloadedContentHashes.has(contentHash);
}

function saveContentHash(contentHash) {
    downloadedContentHashes.add(contentHash);
    fs.writeFileSync(downloadedContentHashesFile, JSON.stringify(Array.from(downloadedContentHashes)));
    console.log('Downloaded content hashes set saved:', downloadedContentHashes);
}

function runEmailProcessing() {
    imap.once('ready', () => {
        console.log('Connected to the IMAP server');

        imap.openBox('INBOX', false, (err, box) => {
            if (err) {
                console.error('Error opening mailbox:', err);
                imap.end();
                return;
            }

            imap.search(['ALL'], (err, results) => {
                if (err) {
                    console.error('Error searching for emails:', err);
                    imap.end();
                    return;
                }

                const latestMessages = results.slice(-200); // Latest 200 emails will be checked with the above mentioned condition. i.e. change this to your desire numbers 

                if (latestMessages.length === 0) {
                    console.log('No new emails.');
                    imap.end();
                    return;
                }

                const fetch = imap.fetch(latestMessages, { bodies: '' });
                fetch.on('message', (msg, seqno) => {
                    let emailData = '';

                    msg.on('data', data => {
                        emailData += data.toString();
                    });

                    const chunks = [];

                    msg.on('body', (stream, info) => {
                        stream.on('data', chunk => {
                            chunks.push(chunk);
                        });

                        stream.once('end', async () => {
                            const emailData = Buffer.concat(chunks).toString();
                            console.log('Raw Email Data:', emailData);

                            try {
                                const parsed = await simpleParser(emailData, {
                                    skipHtmlToText: true,
                                    skipImageLinks: true,
                                    skipTextToHtml: true
                                });

                                console.log('Email-', parsed);

                                if (parsed.attachments) {
                                    console.log('Attachments:', parsed.attachments);
                                }

                                const fromAddress = extractEmailAddress(parsed.from);
                                console.log('From:', fromAddress);

                                if (fromAddress === specificSenderEmail.toLowerCase()) {
                                    console.log('Email envelope:', parsed);
                                    console.log('Parsed email:', parsed);
                                    downloadLatestAttachment(parsed);
                                } else {
                                    console.log('Email is not from the specific sender.');
                                }

                                function extractEmailAddress(from) {
                                    if (!from) {
                                        return '';
                                    }

                                    if (from.address) {
                                        return from.address.toLowerCase();
                                    }

                                    if (from.text) {
                                        const match = from.text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                                        return match ? match[0].toLowerCase() :
                                        '';
                                    }

                                    return '';
                                }
                            } catch (err) {
                                console.error('Error parsing message:', err);
                            }
                        });
                    });
                });

                fetch.on('end', () => {
                    imap.end();
                });
            });
        });
    });

    imap.once('error', err => {
        console.error('IMAP error:', err);
    });

    imap.once('end', () => {
        console.log('IMAP connection ended');
    });

    imap.connect();
}

schedule.scheduleJob('*/15 * * * *', () => { //every 15 minutes this loop will be running automatically
    console.log('Running the script...');
    runEmailProcessing();
    saveDownloadedAttachments();
    // Print the last runtime timestamp
    const lastRuntimeTimestamp = new Date().toISOString();
    console.log('Last runtime timestamp:', lastRuntimeTimestamp);
});