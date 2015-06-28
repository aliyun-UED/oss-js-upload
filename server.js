var express = require('express');
var app = express();
var serveStatic = require('serve-static');
var path = require('path');
var ALY = require('aliyun-sdk');
var sts = new ALY.STS({
      accessKeyId: '在阿里云申请的 accessKeyId',
      secretAccessKey: '在阿里云申请的 secretAccessKey',
      endpoint: 'https://sts.aliyuncs.com',
      apiVersion: '2015-04-01'
    }
);

app.use(serveStatic(__dirname, {'index': ['demo.html']}));

app.get('/token', function (req, res) {
  sts.getFederationToken({
    StsVersion: '1',
    Action: 'GetFederationToken',
    Name: 'chylvina',
    Policy: '{"Version":"1","Statement":[{"Effect":"Allow", "Action":"*", "Resource":"*"}]}',
    DurationSeconds: 3000
  }, function (err, data) {
    if(err) {
      return res.send(500, 'something error');
    }

    res.json(data);
  });
});

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});