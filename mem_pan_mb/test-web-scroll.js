const fs = require('fs');
const content = fs.readFileSync('/Users/annghiavo/Documents/mem_pan_app/mem_pan_mb/app/module/create.tsx', 'utf-8');
console.log(content.includes('FlatList'));
