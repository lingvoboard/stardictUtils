'use strict'

/*

Command line:
node test01.js

*/

const fs = require('fs')

const sd = require('../stardictUtils.js')

const indfile = 'encarta_it_it.idx'

const synfile = 'encarta_it_it.syn'

const tab1 = sd.getOffsetLengthTable(indfile, synfile)

/*

synfile - optional!!!

*/

fs.writeFileSync('tab1.txt', '', { encoding: 'utf8', flag: 'w' })

for (let v of tab1) {
  fs.writeFileSync(
    'tab1.txt',
    `${v[0].replace(/\t+/, ' ')}\t${v[1]}\t${v[2]}\n`,
    { encoding: 'utf8', flag: 'a' }
  )
}
