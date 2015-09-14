var express = require('express');
var app = express();
var serveStatic = require('serve-static');
var path = require('path');
var ALY = require('aliyun-sdk');
var sts = new ALY.STS({
      accessKeyId: '在设置 RAM 时得到的 accessKeyId',
      secretAccessKey: '在设置 RAM 时得到的 accessKeySecret',
      endpoint: 'https://sts.aliyuncs.com',
      apiVersion: '2015-04-01'
    }
);
// 必需要准备账号 ID, 可以在 https://account.console.aliyun.com/#/secure 找到
var accountId = '31611321';
var roleARN = '在设置 RAM 时得到的 roleARN';
// 授权访问的资源表达式
// 如果允许用户操作整个 Bucket, 则为 bucket_name/*
// 如果允许用户操作某个文件夹, 则为 bucket_name/path/to/folder/*
// 如果仅允许用户上传到某个具体文件, 则为 bucket_name/path/to/folder/file
var resource = '';

if (!resource) {
  console.error('必须设置 resource');
  return;
}

app.use(serveStatic(__dirname, {'index': ['test.html']}));

app.get('/token', function (req, res) {
  sts.assumeRole({
    RoleArn: roleARN,
    RoleSessionName: 'chylvina',
    Policy: '{"Version":"1","Statement":[{"Effect":"Allow","Action":["oss:PutObject","oss:CreateMultipartUpload","oss:UploadPart","oss:CompleteMultipartUpload"],"Resource":["acs:oss:*:' + accountId +':' + resource + '"]}]}',
    DurationSeconds: 1000
  }, function (err, data) {
    if (err) {
      return res.send(500, err);
    }

    res.json(data);
  });
});

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});