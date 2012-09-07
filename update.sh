#!/bin/bash
#Replace current folder contents with tip

#Move current files - warning about moving old into old suppressed
#TODO: avoid conflicts with potential pre-existing 'old/'
mkdir old
mv * old/ 2> /dev/null

#exit on fail
set -e
trap "echo \"Update script failed, restoring files\"; mv old/* . 2> /dev/null; rm -rf old 2> /dev/null; exit" INT TERM EXIT

read -e  -p Username: usr
read -s  -p Password: pwd
curl -u $usr:$pwd https://bitbucket.org/taes1g09/ragldmap/get/tip.tar.gz -o tip.tar.gz

tar -zxf tip.tar.gz
rm tip.tar.gz

#Unpack files
mv taes1g09*/* .
rm -rf taes1g09*
rm -rf old

trap - INT TERM exit