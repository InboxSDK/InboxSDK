var fs = require('fs');
var cssContent = fs.readFileSync(__dirname + '/style.css', 'utf8');

var style = document.createElement('style');
style.textContent = cssContent;

document.head.appendChild(style);
