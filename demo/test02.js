'use strict';

/*

Command line:
node test02.js

*/

const fs = require('fs');

const sd = require('../stardictUtils.js');

const dzfile = 'encarta_it_it.dict.dz';
const indfile = 'encarta_it_it.idx';
const synfile = 'encarta_it_it.syn';

/*

synfile - optional!!!

*/

const tab1 = sd.getOffsetLengthTable(indfile, synfile);
const tab2 = sd.getSliceChunksTable(dzfile, tab1);

fs.writeFileSync('tab2.txt', "", {encoding: 'utf8', flag: "w"});

for (let v of tab2)
{
	fs.writeFileSync('tab2.txt', `${v[0].replace(/\t+/g, " ")}\t${v[1]}\n`, {encoding: 'utf8', flag: "a"});
}

