#!/usr/bin/env node
const [,, ...args] = process.argv

const urlPage = args[0];
var path = args[1];

const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const validUrl = require('valid-url');
const imagesize = require('image-size');

var images = [];
var fullDataImg = [];

if (!fs.existsSync(path)){
    fs.mkdirSync(path);
}

axios.get(urlPage).then(function (response) {
    $ = cheerio.load(response.data);
    var relativeLinks = $("img");
    relativeLinks.each( async function() {
        var downloadUrl = $(this).attr('src');
        downloadUrl = downloadUrl.replace('https://', 'http://');
        
        if (checkValidUrl(downloadUrl)) {
            images.push(downloadUrl);
        }
    });

    var actions = images.map(newDownF)
    var results = Promise.all(actions);
    
    results.then(data => {
        images.forEach( (img) => {
            const fileName = img.split('/').reverse();
            var size = imagesize(path+'/'+fileName[0]);
            fullDataImg.push({url: img, height: size.height, width: size.width, type: size.type})
        });
        
        var indexHtml = buildHtmlPage(fullDataImg);
        var fileName = path+'/index.html';
        var stream = fs.createWriteStream(fileName);

        stream.once('open', (fd) => {
            stream.end(indexHtml);
        });
    });
})
.catch(function (error) {
    // handle error
    console.log(error);
})

function buildHtmlPage(imagesArr) {
    var html = '<!DOCTYPE html><html><body>';
    html += '<table style="width:100%; border: 1px solid black; border-collapse: collapse;">';
    html += '<tr>';
    html += '<th style="border: 1px solid black; border-collapse: collapse;">image</th>'
    html += '<th style="border: 1px solid black; border-collapse: collapse;">data</th>';
    html += '</tr>';
    imagesArr.forEach(async (imgData) => {
        const fileName = imgData.url.split('/').reverse();
        var p = 120*100/imgData.width;
        var newH = p*imgData.height/100;
        
        // Show image as src
        // html += '<tr>';
        // html += '<td style="border: 1px solid black; border-collapse: collapse;"><img style="max-width:120px; height:'+newH+'px" src='+fileName[0]+'></td>';
        // html += '<td style="border: 1px solid black; border-collapse: collapse;"><span>URL: '+imgData.url+"<br>HEIGHT: "+imgData.height+"<br>WIDTH: "+imgData.width+"<br>TYPE: "+imgData.type+"</span></td>";
        // html += '</tr>';
        var base64str = base64_encode(path+'/'+fileName[0]);

        html += '<tr>';
        html += '<td style="border: 1px solid black; border-collapse: collapse;">';
        html += '<img style="max-width:120px; height:'+newH+'px"';
        html += ' src="data:image/'+imgData.type+';base64, '+base64str+'"></td>';
        html += '<td style="border: 1px solid black; border-collapse: collapse;"><span>URL: '+imgData.url+"<br>HEIGHT: "+imgData.height+"<br>WIDTH: "+imgData.width+"<br>TYPE: "+imgData.type+"</span></td>";
        html += '</tr>';
    })
    
    html += '</table>'
    html += '</body></html>';

    return html;
}

var newDownF = async function newDown(url) {
    const fileName = url.split('/').reverse();
    const writer = fs.createWriteStream(path+'/'+fileName[0]);

    var response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
      });
    
    return new Promise((resolve, reject) => {
        response.data.pipe(writer);
        
        let error = null;
        writer.on('error', err => {
          error = err;
          writer.close();
          reject(err);
        });
        writer.on('close', () => {
          if (!error) {
            resolve(true);
          }
        });
      });
}

function checkValidUrl(url) {
    if (validUrl.isUri(url)){
        return true;
    } 
    else {
        return false;
    }
}

function base64_encode(file) {
    var bitmap = fs.readFileSync(file);
    return new Buffer.from(bitmap).toString('base64');
}