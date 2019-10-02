npm setup:
npm config set proxy http://194.65.37.123:80
npm config set https-proxy http://194.65.37.123:80
npm config set strict-ssl false

links uteis:
https://marketplace.visualstudio.com/manage/publishers/RenatoCorreiadeMatos?tracking_data=eyJTb3VyY2UiOiJFbWFpbCIsIlR5cGUiOiJOb3RpZmljYXRpb24iLCJTSUQiOiJtcy5HYWxsZXJ5Tm90aWZpY2F0aW9ucy52ZXJzaW9uLXZhbGlkYXRpb24tc3Vic2NyaXB0aW9uIiwiU1R5cGUiOiJDT04iLCJSZWNpcCI6MSwiX3hjaSI6eyJOSUQiOjYwMDY0NywiTVJlY2lwIjoibTA9MSAiLCJBY3QiOiJmOWIxY2JjYi1hNjhkLTRlNTEtYWY2Ny1hOWNmMmFmYWE2OWQifSwiRWxlbWVudCI6Imhlcm8vY3RhIn0%3d
https://smsanywhere.visualstudio.com/
https://github.com/microsoft/vss-web-extension-sdk/blob/master/lib/VSS.SDK.js
https://docs.microsoft.com/en-us/azure/devops/extend/develop/call-rest-api?view=azure-devops
https://docs.microsoft.com/en-us/azure/devops/extend/develop/ui-controls/grido?view=azure-devops
https://docs.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/oauth?view=azure-devops#scopes
https://docs.microsoft.com/en-us/azure/devops/extend/develop/manifest?view=azure-devops

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

para debug adicione a linha abaixo em vss-extension.json
"baseUri": "https://localhost"