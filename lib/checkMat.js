'use strict'

const fs = require('fs')
const path = require('path')
const expect = require('chai').expect
const exec = require('./exec')
const ddrescueloginfo = require('./ddrescueloginfo')

function checkMat (device, doc) {
  fs.stat(doc.path, (err, stats) => {
    if (err) {
      console.log('File not found:', doc.path)
      return Error(err)
    }
    let size = stats['size'] / 512

    if (size === Number(device.properties.SIZE)) {
      console.log('. image size ok')
    } else {
      console.log('x image size:', size)
    }

    let mydir = path.dirname(doc.path)
    fs.access(mydir + '/hashlog.md5', fs.F_OK, err => {
      if (!err) {
        console.log('. hashlog.md5 exists ')
        exec(`cat "${mydir}"/hashlog.md5 | wc -l`)
        .then(stdout => {
          expect(Number(stdout)).equal(Math.ceil(size / 2097152) + 1)
        })
        .then(() => {
          console.log('. number of lines on hashlog.md5 ok')
        })
        .catch(err => {
          console.log('x number of lines on hashlog.md5: ', err)
        })
      } else {
        console.log('x hashlog.md5 does not exist ', err)
      }
    })

    fs.access(mydir + '/SARD/IPED.log', fs.F_OK, err => {
      if (!err) {
        console.log('. SARD/IPED.log exists ')
        exec(`tail -n 1 "${mydir}/SARD/IPED.log"`)
        .then(stdout => {
          expect(stdout).equal('IPED finalizado.\n')
        })
        .then(() => {
          console.log('. IPED ok')
        })
        .catch(err => {
          console.log('x IPED: ', err)
        })
      } else {
        console.log('x SARD/IPED.log does not exist ', err)
      }
    })

    ddrescueloginfo('${mydir}/ddrescue.log')
    .then((success) => {
      expect(success / 512).equal(size)
    })
    .then(() => {
      console.log('. ddrescue ok')
    })
    .catch(err => {
      console.log('x ddrescue not complete: ', err)
    })
  })

  if (device.properties.ID_PART_TABLE_UUID) {
    exec(`blkid ${doc.path} | grep 'PTUUID="${device.properties.ID_PART_TABLE_UUID}"' | wc -l`)
    .then((stdout) => {
      expect(stdout).equal('1\n')
    })
    .then(() => {
      console.log('. partition table UUID on image ok')
    })
    .catch(err => {
      console.log('x partition table UUID on image: ', err)
    })
  }

  if (device.properties.ID_FS_UUID) {
    exec(`blkid ${doc.path} | grep 'UUID="${device.properties.ID_FS_UUID}"' | wc -l`)
    .then((stdout) => {
      expect(stdout).equal('1\n')
    })
    .then(() => {
      console.log('. filesystem UUID on image ok')
    })
    .catch(err => {
      console.log('x filesystem UUID on image: ', err)
    })
  }
}
module.exports = checkMat
