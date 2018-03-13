'use strict'

const fs = require('fs')

function fileExists (filePath) {
  try {
    return fs.statSync(filePath).isFile()
  } catch (err) {
    return false
  }
}

function readsyns (synfile) {
  let syns = Object.create(null)

  let buf = fs.readFileSync(synfile)

  let i = 0

  while (i < buf.length) {
    let beg = i

    i = buf.indexOf('\x00', beg)

    if (i < 0) {
      throw new Error('Index file is corrupted.')
    }

    let word = buf.toString('utf-8', beg, i)

    i++

    if (i + 4 > buf.length) {
      throw new Error('Index file is corrupted.')
    }

    let index = buf.readUInt32BE(i)

    i += 4

    if (syns[index] !== undefined) {
      syns[index].push(word)
    } else {
      syns[index] = [word]
    }
  }

  return syns
}

function getOffsetLengthTable (indfile, synfile) {
  const indexData = []

  if (fileExists(synfile)) {
    var syns = readsyns(synfile)
  } else {
    var syns = Object.create(null)
  }

  let buf = fs.readFileSync(indfile)

  let i = 0

  let index = 0

  while (i < buf.length) {
    let beg = i

    i = buf.indexOf('\x00', beg)

    if (i < 0) {
      throw new Error('Index file is corrupted.')
    }

    let word = buf.toString('utf-8', beg, i)

    i++

    if (i + 8 > buf.length) {
      throw new Error('Index file is corrupted.')
    }

    let offset = buf.readUInt32BE(i)
    i += 4

    let size = buf.readUInt32BE(i)
    i += 4

    indexData.push([word, offset, size])

    let arr = syns[index]

    if (arr !== undefined) {
      for (let v of arr) indexData.push([v, offset, size])
    }

    index++
  }

  return indexData
}

function intArrayToString (arr) {
  var ret = ''
  for (var i = 0; i < arr.length; i++) {
    ret += String.fromCharCode(arr[i])
  }
  return ret
}

function zero_terminated_string (buffer, offset) {
  var result = ''
  for (var n = 1; true; n++) {
    offset = offset - result.length
    var view = new Uint8Array(buffer.slice(offset, offset + n * 1024)),
      end = Array.prototype.indexOf.call(view, 0)
    if (end == -1) {
      end = view.length
      if (end == 0) throw new Error('Unexpected end of buffer')
    }
    result += intArrayToString(view.subarray(0, end))
    if (end < view.length) break
  }
  return result
}

function mergeArrayBuffers (buffer1, buffer2) {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength)
  tmp.set(new Uint8Array(buffer1), 0)
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength)
  return tmp.buffer
}

function read_gzip_header (buffer) {
  var FTEXT = 1,
    FHCRC = 2,
    FEXTRA = 4,
    FNAME = 8,
    FCOMMENT = 16

  var position = 0,
    view = new Uint8Array(buffer, position, 10),
    header_data = {
      ID1: 0,
      ID2: 0,
      CM: 0,
      FLG: 0,
      MTIME: 0,
      XFL: 0,
      OS: 0,
      FEXTRA: {
        XLEN: 0,
        SUBFIELDS: []
      },
      FNAME: '',
      FCOMMENT: '',
      FHCRC: ''
    }

  if (view[0] != 0x1f || view[1] != 0x8b) throw new Error('Not a gzip header.')
  header_data['ID1'] = view[0]
  header_data['ID2'] = view[1]
  header_data['CM'] = view[2]
  header_data['FLG'] = view[3]
  header_data['MTIME'] = view[4] << 0
  header_data['MTIME'] |= view[5] << 8
  header_data['MTIME'] |= view[6] << 16
  header_data['MTIME'] |= view[7] << 24
  header_data['XFL'] = view[8]
  header_data['OS'] = view[9]
  position += 10

  // FEXTRA
  if ((header_data['FLG'] & FEXTRA) != 0x00) {
    view = new Uint16Array(buffer, position, 2)
    header_data['FEXTRA']['XLEN'] = view[0]
    position += 2

    // FEXTRA SUBFIELDS
    view = new Uint8Array(buffer, position, header_data['FEXTRA']['XLEN'])
    while (true) {
      var len = view[2] + 256 * view[3],
        subfield = {
          SI1: String.fromCharCode(view[0]),
          SI2: String.fromCharCode(view[1]),
          LEN: len,
          DATA: view.subarray(4, 4 + len)
        }
      header_data['FEXTRA']['SUBFIELDS'].push(subfield)
      view = view.subarray(4 + len)
      if (view.length == 0) break
    }
    position += header_data['FEXTRA']['XLEN']
  }

  // FNAME
  if ((header_data['FLG'] & FNAME) != 0x00) {
    header_data['FNAME'] = zero_terminated_string(buffer, position)
    position += header_data['FNAME'].length
  }

  // FCOMMENT
  if ((header_data['FLG'] & FCOMMENT) != 0x00) {
    header_data['FCOMMENT'] = zero_terminated_string(buffer, position)
    length += header_data['FCOMMENT'].length
  }

  // FHCRC
  if ((header_data['FLG'] & FHCRC) != 0x00) {
    view = new Uint16Array(buffer, position, 2)
    header_data['FHCRC'] = view[0]
    position += 2
  }

  header_data['LENGTH'] = position + 1

  return header_data
}

function get_chunks (gzip_header) {
  var ver,
    chlen = 0,
    chcnt = 0,
    chunks = []

  var subfields = gzip_header['FEXTRA']['SUBFIELDS'],
    found = false,
    sf
  for (var i = 0; i < subfields.length; i++) {
    sf = subfields[i]
    if (sf['SI1'] == 'R' || sf['SI2'] == 'A') {
      found = true
      break
    }
  }
  if (!found) {
    throw new Error('Not a dictzip header.')
  } else {
    var b = sf['DATA']
    ver = b[0] + 256 * b[1]
    chlen = b[2] + 256 * b[3]
    chcnt = b[4] + 256 * b[5]
    for (var i = 0, chpos = 0; i < chcnt && 2 * i + 6 < b.length; i++) {
      var tmp_chlen = b[2 * i + 6] + 256 * b[2 * i + 7]
      chunks.push([chpos, tmp_chlen])
      chpos += tmp_chlen
    }
    return { ver: ver, chlen: chlen, chcnt: chcnt, chunks: chunks }
  }
}

function getArtInfo (pos, len, ab, gzip_header, vccc) {
  const ArtInfo = []

  let { ver, chlen, chcnt, chunks } = vccc

  if (typeof pos === 'undefined') pos = 0
  if (typeof len === 'undefined') len = chlen * chunks.length

  var firstchunk = Math.min(Math.floor(pos / chlen), chunks.length - 1)
  var lastchunk = Math.min(Math.floor((pos + len) / chlen), chunks.length - 1)
  var offset = pos - firstchunk * chlen
  var finish = offset + len
  var out_buffer = new ArrayBuffer(0)

  ArtInfo[0] = [
    gzip_header['LENGTH'] + chunks[firstchunk][0],
    gzip_header['LENGTH'] + chunks[lastchunk][0] + chunks[lastchunk][1]
  ]
  ArtInfo[1] = []
  ArtInfo[2] = [offset, finish]

  let in_buffer = ab.slice(
    gzip_header['LENGTH'] + chunks[firstchunk][0],
    gzip_header['LENGTH'] + chunks[lastchunk][0] + chunks[lastchunk][1]
  )

  for (
    var i = firstchunk, j = 0;
    i <= lastchunk && j < in_buffer.byteLength;
    j += chunks[i][1], i++
  ) {
    ArtInfo[1].push([j, j + chunks[i][1]])
  }

  return ArtInfo
}

function getSliceChunksTable (dzfile, OffsetLengthTable) {
  const buf = fs.readFileSync(dzfile)

  const arraybuffer = buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength
  )

  const gzip_header = read_gzip_header(arraybuffer)

  const vccc = get_chunks(gzip_header)

  const SliceChunksTable = []

  for (let i = 0; i < OffsetLengthTable.length; i++) {
    let ArtInfo = getArtInfo(
      OffsetLengthTable[i][1],
      OffsetLengthTable[i][2],
      arraybuffer,
      gzip_header,
      vccc
    )

    let [arr1, arr2, arr3] = ArtInfo

    if (
      arr2.length === 1 &&
      arr2[0][0] === 0 &&
      arr1[1] - arr1[0] === arr2[0][1]
    ) {
      SliceChunksTable.push([
        OffsetLengthTable[i][0],
        JSON.stringify([arr1, arr3])
      ])
    } else {
      SliceChunksTable.push([OffsetLengthTable[i][0], JSON.stringify(ArtInfo)])
    }
  }

  return SliceChunksTable
}

function getArticleBodyfromDZ1 (dzfile, pos, len) {
  let tab = getSliceChunksTable(dzfile, [['', parseInt(pos), parseInt(len)]])
  return getArticleBodyfromDZ2(dzfile, JSON.parse(tab[0][1]))
}

function getArticleBodyfromDZ2 (dzfile, ArtInfo) {
  const zlib = require('zlib')

  if (ArtInfo.length === 2) {
    let last = ArtInfo[1]
    ArtInfo[1] = [[0, ArtInfo[0][1] - ArtInfo[0][0]]]
    ArtInfo.push(last)
  }

  const fd = fs.openSync(dzfile, 'r')
  let buf = Buffer.alloc(ArtInfo[0][1] - ArtInfo[0][0])
  fs.readSync(fd, buf, 0, ArtInfo[0][1] - ArtInfo[0][0], ArtInfo[0][0])
  fs.closeSync(fd)

  /*

  const buf = fs.readFileSync(dzfile);
  const arraybuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const bigchunk = arraybuffer.slice(ArtInfo[0][0], ArtInfo[0][1]);

  */
	
  const bigchunk = buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength
  )

  let out_buffer = new ArrayBuffer(0)

  for (let i = 0; i < ArtInfo[1].length; i++) {
    let chunk = bigchunk.slice(ArtInfo[1][i][0], ArtInfo[1][i][1])
    let inflated = zlib.inflateRawSync(chunk, {
      finishFlush: zlib.constants.Z_SYNC_FLUSH
    })
    out_buffer = mergeArrayBuffers(out_buffer, inflated)
  }

  return Buffer.from(out_buffer.slice(ArtInfo[2][0], ArtInfo[2][1])).toString(
    'utf8'
  )
}

function getArticleBodyfromDZ3 (dzfile, q, ignoreCase) {
  function icase (word) {
    if (ignoreCase === true) word = word.toLowerCase()
    return word.trim()
  }

  let indfile
  let synfile

  const path = dzfile.replace(/(\.dict\.dz)$/i, '')

  for (let ext of [
    '.idx',
    '.IDX',
    '.Idx',
    '.iDx',
    '.idX',
    '.IDx',
    '.iDX',
    '.IdX'
  ]) {
    if (fileExists(path + ext)) {
      indfile = path + ext
      break
    }
  }

  for (let ext of [
    '.syn',
    '.SYN',
    '.Syn',
    '.sYn',
    '.syN',
    '.SYn',
    '.sYN',
    '.SyN'
  ]) {
    if (fileExists(path + ext)) {
      synfile = path + ext
      break
    }
  }

  if (!indfile) throw new Error('Index file not exists.')

  let buf = fs.readFileSync(indfile)

  let i = 0

  let index = 0

  let offsetLength = []

  if (synfile) {
    var syns = readsyns(synfile)
  } else {
    var syns = Object.create(null)
  }

  while (i < buf.length) {
    if (offsetLength.length !== 0) break

    let beg = i

    i = buf.indexOf('\x00', beg)

    if (i < 0) {
      throw new Error('Index file is corrupted.')
    }

    let word = buf.toString('utf-8', beg, i)

    i++

    if (i + 8 > buf.length) {
      throw new Error('Index file is corrupted.')
    }

    let offset = buf.readUInt32BE(i)
    i += 4

    let size = buf.readUInt32BE(i)
    i += 4

    if (icase(q) === icase(word)) {
      offsetLength.push([offset, size])
      break
    }

    let arr = syns[index]

    if (arr !== undefined && offsetLength.length === 0) {
      for (let v of arr) {
        if (q.trim() === v.trim()) {
          offsetLength.push([offset, size])
          break
        }
      }
    }

    index++
  }

  if (offsetLength.length === 1) {
    return getArticleBodyfromDZ1(dzfile, offsetLength[0][0], offsetLength[0][1])
  } else {
    return false
  }
}

function getArticleBodyfromDict (dictfile, offset, length, encoding = 'utf8') {
  const fd = fs.openSync(dictfile, 'r')
  let buf = Buffer.alloc(length)
  fs.readSync(fd, buf, 0, length, offset)
  fs.closeSync(fd)
  return buf.toString(encoding)
}

module.exports = {
  getOffsetLengthTable: getOffsetLengthTable,
  getSliceChunksTable: getSliceChunksTable,
  getArticleBodyfromDZ1: getArticleBodyfromDZ1,
  getArticleBodyfromDZ2: getArticleBodyfromDZ2,
  getArticleBodyfromDZ3: getArticleBodyfromDZ3,
  getArticleBodyfromDict: getArticleBodyfromDict
}
