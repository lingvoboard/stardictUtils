stardictUtils.js
==========

Node.js module for accessing StarDict dictionary files with support for `dictzip` format 

stardictUtils.js is based  on [dictzip.js](https://github.com/dictzip/dictzip.js), Thanks to [tuxor1337](https://github.com/tuxor1337)  and [vsemozhetbyt](https://gist.github.com/vsemozhetbyt)

## Usage

### Example №1

```
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


```
### Output

```
abboffarsi	56631	41
abbonacciare	56672	209
abbonamento	56881	414

```

### Example №2

```
'use strict'

/*

Command line:
node test02.js

*/

const fs = require('fs')

const sd = require('../stardictUtils.js')

const dzfile = 'encarta_it_it.dict.dz'
const indfile = 'encarta_it_it.idx'
const synfile = 'encarta_it_it.syn'

/*

synfile - optional!!!

*/

const tab1 = sd.getOffsetLengthTable(indfile, synfile)
const tab2 = sd.getSliceChunksTable(dzfile, tab1)

fs.writeFileSync('tab2.txt', '', { encoding: 'utf8', flag: 'w' })

for (let v of tab2) {
  fs.writeFileSync('tab2.txt', `${v[0].replace(/\t+/g, ' ')}\t${v[1]}\n`, {
    encoding: 'utf8',
    flag: 'a'
  })
}

```

### Output

```
abboffarsi	[[403,15682],[56631,56672]]
abbonacciare	[[403,15682],[56672,56881]]
abbonamento	[[403,15682],[56881,57295]]
abbondante	[[403,31353],[[0,15279],[15279,30950]],[58138,58485]]

```

### Example №3

```
'use strict'

/*

Command line:
node test03.js

*/

const sd = require('../stardictUtils.js')

const dzfile = 'encarta_it_it.dict.dz'
const dictfile = 'encarta_it_it.dict'

// _______________________________

console.time('art1')

let art1 = sd.getArticleBodyfromDZ1(dzfile, 7237082,	268)

console.log(`\nquarzo\n${art1}\n`)

console.timeEnd('art1')

// _______________________________

console.time('art2')

let art2 = sd.getArticleBodyfromDZ2(dzfile, [[2139399,2157010],[6022,6290]])

console.log(`\nquarzo\n${art2}\n`)

console.timeEnd('art2')

// _______________________________

console.time('art3')

let ignoreCase = true

/*

ignoreCase - optional!!!, default - false

*/

let art3 = sd.getArticleBodyfromDZ3(dzfile, 'quarzo', ignoreCase)

console.log(`\nquarzo\n${art3}\n`)

console.timeEnd('art3')

// _______________________________

console.time('art4')

let encoding = 'utf8'

/*

encoding - optional!!!, default - utf8

*/

let art4 = sd.getArticleBodyfromDict(dictfile, 7237082,	268, encoding)

console.log(`\nquarzo\n${art4}\n`)

console.timeEnd('art4')


```

### Output

```
quarzo
<div class=m1><i>s. m. </i>Biossido di silicio in cristalli a prismi esagonali, spec. trasparenti, spesso geminati, caratterizzati dal fenomeno della piezoelettricità: <i>lampada</i>, <i>orologio al –q</i>. ETIMOLOGIA: dal ted. <i>Quarz</i>, di etim. incerta.</div>

art1: 16.384ms

quarzo
<div class=m1><i>s. m. </i>Biossido di silicio in cristalli a prismi esagonali, spec. trasparenti, spesso geminati, caratterizzati dal fenomeno della piezoelettricità: <i>lampada</i>, <i>orologio al –q</i>. ETIMOLOGIA: dal ted. <i>Quarz</i>, di etim. incerta.</div>

art2: 1.106ms

quarzo
<div class=m1><i>s. m. </i>Biossido di silicio in cristalli a prismi esagonali, spec. trasparenti, spesso geminati, caratterizzati dal fenomeno della piezoelettricità: <i>lampada</i>, <i>orologio al –q</i>. ETIMOLOGIA: dal ted. <i>Quarz</i>, di etim. incerta.</div>

art3: 99.192ms

quarzo
<div class=m1><i>s. m. </i>Biossido di silicio in cristalli a prismi esagonali, spec. trasparenti, spesso geminati, caratterizzati dal fenomeno della piezoelettricità: <i>lampada</i>, <i>orologio al –q</i>. ETIMOLOGIA: dal ted. <i>Quarz</i>, di etim. incerta.</div>

art4: 0.277ms

```

	
