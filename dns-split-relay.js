// Based off https://github.com/ekristen/dns-proxy
const dgram  = require('dgram')
const packet = require('native-dns-packet')

const records = {
  '1': 'A',
  '2': 'NS',
  '5': 'CNAME',
  '6': 'SOA',
  '12': 'PTR',
  '15': 'MX',
  '16': 'TXT',
  '28': 'AAAA'
}

listAnswer = function (response) {
  let results = []
  const res = packet.parse(response)
  res.answer.map(function (r) {
    results.push(r.address || r.data)
  })
  return results.join(', ') || 'miss'
}

var config = {
  port: process.env.BIND_PORT || 53,
  host: process.env.BIND_ADDRESS || '127.0.0.1',
  logging: [
    "dns-split-relay:query",
    "dns-split-relay:info",
    "dns-split-relay:error"
  ],
  nameservers: [
    process.env.DNS_NS_PRIMARY || '8.8.8.8',
    process.env.DNS_NS_SECONDARY || '8.8.4.4'
  ],
  fallback_timeout: process.env.FALLBACK_TIMEOUT || 1000
}

if(process.env.LOGGING) {
  process.env.DEBUG = process.env.LOGGING
} else {
  process.env.DEBUG = config.logging.join(',')  
}

const logInfo = require('debug')('dns-split-relay:info')
const logDebug = require('debug')('dns-split-relay:debug')
const logQuery = require('debug')('dns-split-relay:query')
const logError = require('debug')('dns-split-relay:error')

logDebug('options: %j', config)

const server = dgram.createSocket('udp4')

server.on('listening', function () {
  logInfo('Listening on %s:%s', config.host, config.port)
})

server.on('error', function (err) {
  logError(err)
})

server.on('message', function (message, rinfo) {
  let returner = false
  let nameserver = config.nameservers[0]

  const query = packet.parse(message)
  const domain = query.question[0].name
  const type = query.question[0].type

  logDebug('query: %j', query)

  let nameParts = nameserver.split(':')
  nameserver = nameParts[0]
  let port = nameParts[1] || 53
  let fallback
  (function queryns (message, nameserver, failed=0) {
    const sock = dgram.createSocket('udp4')
    sock.send(message, 0, message.length, port, nameserver, function () {
      fallback = setTimeout(function () {
        logError("Timeout on %s", config.nameservers[failed])
        if (failed == 0){
          queryns(message, config.nameservers[1], 1)
        } else {
          logError("Timeout on %s", config.nameservers[failed])
          logError("Failed on all NS")
          sock.close()
        }
      }, config.fallback_timeout)
    })
    sock.on('error', function (err) {
      logError('Socket Error: %s', err)
      process.exit(5)
    })
    sock.on('message', function (response) {
      clearTimeout(fallback)
      if (listAnswer(response) == "miss" && failed == 0) {
        logQuery(
          'ns: %s, q: %s, type: %s, answer: %s, source: %s:%s, size: %d',
          nameserver,
          domain,
          records[type] || '???',
          listAnswer(response),
          rinfo.address,
          rinfo.port,
          rinfo.size
        )
        queryns(message, config.nameservers[1], 1)
      } else {
        logQuery(
          'ns: %s, q: %s, type: %s, answer: %s, source: %s:%s, size: %d',
          nameserver,
          domain,
          records[type] || '???',
          listAnswer(response),
          rinfo.address,
          rinfo.port,
          rinfo.size
        )
        server.send(response, 0, response.length, rinfo.port, rinfo.address)
        sock.close()
      }
    })
  }(message, nameserver))
})

server.bind(config.port, config.host)
