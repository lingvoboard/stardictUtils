'use strict';

/*

Command line:
node test03.js

*/


const sd = require('../stardictUtils.js');

const dzfile = 'encarta_it_it.dict.dz';
const dictfile = 'encarta_it_it.dict';

//_______________________________

console.time('art1');

let art1 = sd.getArticleBodyfromDZ1(dzfile, 7239646, 268);

console.log(`\nquarzo\n${art1}\n`);

console.timeEnd('art1');

//_______________________________

console.time('art2');

let art2 = sd.getArticleBodyfromDZ2(dzfile, [[2140055,2157514],[[0,17459]],[8586,8854]]);

console.log(`\nquarzo\n${art2}\n`);

console.timeEnd('art2');

//_______________________________

console.time('art3');

let ignoreCase = true;

/*

ignoreCase - optional!!!, default - false

*/

let art3 = sd.getArticleBodyfromDZ3(dzfile, 'quarzo', ignoreCase);

console.log(`\nquarzo\n${art3}\n`);

console.timeEnd('art3');

//_______________________________

console.time('art4');

let encoding = 'utf8';

/*

encoding - optional!!!, default - utf8

*/

let art4 = sd.getArticleBodyfromDict(dictfile, 7239646, 268, encoding);

console.log(`\nquarzo\n${art4}\n`);

console.timeEnd('art4');

