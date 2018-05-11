'use strict'

const fs = require('fs')
const path = require('path')
const mustache = require('mustache')
//const UserRoles = require('../models/userrole')
const AWS = require('aws-sdk')
var csv = require('csv');
var parse = require('csv-parse');
var mailcomposer = require('mailcomposer');
var sleep = require('sleep');



/*
*  Local solution
*/

let emails = []
const awsConfig = {
  "accessKeyId": process.env.AWS_ACCESS_ID,
  "secretAccessKey": process.env.AWS_ACCESS_KEY,
  "region": "eu-west-1"
}
console.log("HEJJJ")
AWS.config.update(awsConfig)
const sender = 'auto-mail@lundakarnevalen.se'
//const sender = 'gustaf.linton@lundakarnevalen.se'

const inputPath = './pairscores/274.csv'
var parser = parse({ delimiter: ',' }, function (err, data) {
  console.log(err)
  // when all countries are available,then process them
  // note: array element at index 0 contains the row of headers that we should skip
  let first = true
  data.forEach(function (line) {
    if (first) {
      first = false
      return
    }
    // create country object out of parsed fields
    emails.push({'emails': line[1].split(", "), 'pdf': line[2]})
  })
  console.log(emails.length)
  mailIterator(emails)
})
fs.createReadStream(inputPath).pipe(parser);

function mailIterator(emailList) {
  if (emailList.length === 0) return console.log("DONE!")
  
  emails = emailList[0]
  sendEmail(emails.emails, 'Imaginal Cykelfest 2018!', 'mail_template', emails.pdf, {}, ()=> {
    mailIterator(emailList.slice(1))
  })
}

// Reading list of emails in txtfile

// Reading json from sequel
//let emails = require('./data/1_ej_sektion.json').data.map(d => d.email.trim())

// Hardcoded emails for testing
//let emails = ['christopher.nille.nilsson@gmail.com', 'gustaf.linton@lundakarnevalen.se']


const sendEmail = (emails, subject, template_name, attach, data, cb) => {
  let sendRawEmailPromise
  const template = fs.readFileSync(
    path.resolve(__dirname, './' + template_name + '.mustache')
  )
  const msg = mustache.render(template.toString(), { resetPasswordHash: data })
  let first=false
  emails.forEach(email => {
    let mail = mailcomposer({
      from: sender,
      replyTo: 'bella.ahlfors@lundakarnevalen.se',
      to: email,
      bcc: 'auto-mail@lundakarnevalen.se',
      subject: 'Imaginal Cykelfest 2018!',
      html: msg,
      attachments: [
        {
          path: './pdfs/' + attach,
        },
      ],
    });
    const ses = new AWS.SES({ apiVersion: '2010-12-01' })
    mail.build(function (err, message) {
      if (err) {
        console.log(err)
      }
      console.log(23, email)
      //ses.sendRawEmail({ RawMessage: { Data: message } }).promise()
      sleep.msleep(100)
      if(first){
        cb()
      } else {
        first = true
      }
    });
  })
}
