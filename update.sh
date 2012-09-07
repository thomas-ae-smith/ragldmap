#!/bin/bash
#Replace current folder contents with tip

#Move current files - warning about moving old into old suppressed
mkdir old
mv * old/ 2> /dev/null

read -e  -p Username: usr
read -s  -p Password: pwd
curl -u $usr:$pwd https://bitbucket.org/taes1g09/ragldmap/get/tip.tar.gz -o tip.tar.gz

tar -zxf tip.tar.gz
rm tip.tar.gz

#Unpack files
mv taes1g09*/* .
rm -rf taes1g09*
rm -rf old