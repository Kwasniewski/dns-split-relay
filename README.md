# DNS Split Relay

Allows you to relay requests to split brain DNS that are asynchronous.

Useful if you have an internal DNS server that only has a subset of DNS entries that are availible on the external DNS server.

I don't recommend having a setup like this, but we all have to deal with things that aren't ideal!

## Install

`npm install -g dns-split-relay`

## Logging

Logging is handled by the simple lightweight [debug](https://www.npmjs.com/package/debug) package. By default all queries are logged. To change the logging output update the `logging` variable to any of the following: dns-proxy:error, dns-proxy:query, dns-proxy:debug. You can specify all or none, separate using a comma, a wildcard can be used as well.

## Thanks

Based off the cool project by Erik Kristensen at https://github.com/ekristen/dns-proxy
