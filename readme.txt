proxy settings:
npm config set proxy http://194.65.37.123:80
npm config set https-proxy http://194.65.37.123:80
npm config set strict-ssl false

client:
npm install -g tfx-cli

project init:
 npm init -y

install sdk:
npm install vss-web-extension-sdk --save

create vss-extension.json:
echo "" >> vss-extension.json

build extension:
tfx extension create
