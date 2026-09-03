const fs = require('fs');
const glob = require('glob'); // wait, we don't need glob, we can just list files
const files = ['src/renderer/src/i18n/locales/en.json', 'src/renderer/src/i18n/locales/ko.json', 'src/renderer/src/i18n/locales/zh.json'];

function replaceValues(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key].replace(/Orca/g, 'Veer').replace(/Stably/g, 'Rahul Jangir Works');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      replaceValues(obj[key]);
    }
  }
}

for (const file of files) {
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  replaceValues(content);
  fs.writeFileSync(file, JSON.stringify(content, null, 2) + '\n');
}
console.log('Done!');
