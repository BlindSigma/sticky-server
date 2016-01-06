sticky-server
=============

A small Node library designed to route incoming connections to individual worker processes. Heavily inspired by [sticky-session](https://github.com/indutny/sticky-session) and [node-cluster-socket.io](https://github.com/elad/node-cluster-socket.io), this package aims to provide server-independent socket clustering.

So long as the server you're trying to implement can read from a socket, this library should work.

As of Jan. 5, 2015, I am currently working on making this code production-stable and adding the appropriate documentation and tests. Check back soon for more details.

## Not ready for use yet ###
Having just started this project tonight, none of this code has been run before as a demo implementation has not been created yet.
