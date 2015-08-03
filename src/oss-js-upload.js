'use strict';
(function () {

  var detectIEVersion = function () {
    var v = 4,
        div = document.createElement('div'),
        all = div.getElementsByTagName('i');
    while (
        div.innerHTML = '<!--[if gt IE ' + v + ']><i></i><![endif]-->',
            all[0]
        ) {
      v++;
    }
    return v > 4 ? v : false;
  };

  var _extend = function (dst, src) {
    for (var i in src) {
      if (Object.prototype.hasOwnProperty.call(src, i) && src[i]) {
        dst[i] = src[i];
      }
    }
  };

  function OssUpload(config) {
    if (!config) {
      // console.log('需要 config');
      return;
    }
    this._config = {
      chunkSize: 1048576    // 1MB
    };

    if (this._config.chunkSize && this._config.chunkSize < 102400) {
      // console.log('chunkSize 不能小于 100KB');
      return;
    }

    _extend(this._config, config);

    if (!this._config.aliyunCredential && !this._config.stsToken) {
      // console.log('需要 stsToken');
      return;
    }

    if (!this._config.endpoint) {
      // console.log('需要 endpoint');
      return;
    }

    var ALY = window.ALY;
    if (this._config.stsToken) {
      this.oss = new ALY.OSS({
        accessKeyId: this._config.stsToken.Credentials.AccessKeyId,
        secretAccessKey: this._config.stsToken.Credentials.AccessKeySecret,
        securityToken: this._config.stsToken.Credentials.SecurityToken,
        endpoint: this._config.endpoint,
        apiVersion: '2013-10-15'
      });
    }
    else {
      this.oss = new ALY.OSS({
        accessKeyId: this._config.aliyunCredential.accessKeyId,
        secretAccessKey: this._config.aliyunCredential.secretAccessKey,
        endpoint: this._config.endpoint,
        apiVersion: '2013-10-15'
      });
    }

    var arr = this._config.endpoint.split('://');
    if (arr.length < 2) {
      // console.log('endpoint 格式错误');
      return;
    }
    this._config.endpoint = {
      protocol: arr[0],
      host: arr[1]
    }

  }

  OssUpload.prototype.upload = function (options) {
    if (!options) {
      if (typeof options.onerror == 'function') {
        options.onerror('需要 options');
      }
      return;
    }

    if (!options.file) {
      if (typeof options.onerror == 'function') {
        options.onerror('需要 file');
      }
      return;
    }
    var file = options.file;

    if (!options.key) {
      if (typeof options.onerror == 'function') {
        options.onerror('需要 key');
      }
      return;
    }
    // 去掉 key 开头的 /
    options.key.replace(new RegExp("^\/"), '');

    var self = this;

    var readFile = function (callback) {
      var result = {
        chunksHash: {},
        chunks: []
      };
      var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
      var chunkSize = self._config.chunkSize;
      var chunksNum = Math.ceil(file.size / chunkSize);
      var currentChunk = 0;

      var frOnload = function (e) {
        result.chunks[currentChunk] = e.target.result;
        currentChunk++;
        if (currentChunk < chunksNum) {
          loadNext();
        }
        else {
          result.file_size = file.size;
          callback(null, result);
        }
      };
      var frOnerror = function () {
        console.error("读取文件失败");
        if (typeof options.onerror == 'function') {
          options.onerror("读取文件失败");
        }
      };

      function loadNext() {
        var fileReader = new FileReader();
        fileReader.onload = frOnload;
        fileReader.onerror = frOnerror;

        var start = currentChunk * chunkSize,
            end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
        var blobPacket = blobSlice.call(file, start, end);
        fileReader.readAsArrayBuffer(blobPacket);
      }

      loadNext();
    };

    var uploadSingle = function (result, callback) {
      var params = {
        Bucket: self._config.bucket,
        Key: options.key,
        Body: result.chunks[0],
        ContentType: file.type || ''
      };
      _extend(params, options.headers);

      self.oss.putObject(params, callback);
    };

    var uploadMultipart = function (result, callback) {
      var maxUploadTries = options.maxRetry || 3;
      var uploadId;
      var loadedNum = 0;
      var latestUploadNum = -1;
      var concurrency = 0;

      var multipartMap = {
        Parts: []
      };

      var init = function () {
        var params = {
          Bucket: self._config.bucket,
          Key: options.key,
          ContentType: file.type || ''
        };
        _extend(params, options.headers);

        self.oss.createMultipartUpload(params,
            function (mpErr, res) {
              if (mpErr) {
                // console.log('Error!', mpErr);
                callback(mpErr);
                return;
              }

              // console.log("Got upload ID", res.UploadId);
              uploadId = res.UploadId;

              uploadPart(0);
            });
      };

      var uploadPart = function (partNum) {
        if(partNum >= result.chunks.length) {
          return;
        }

        concurrency++;
        if(latestUploadNum < partNum) {
          latestUploadNum = partNum;
        }
        if(concurrency < self._config.concurrency && (partNum < (result.chunks.length - 1))) {
          uploadPart(partNum + 1);
        }
        var partParams = {
          Body: result.chunks[partNum],
          Bucket: self._config.bucket,
          Key: options.key,
          PartNumber: String(partNum + 1),
          UploadId: uploadId
        };

        var tryNum = 1;

        var doUpload = function () {
          self.oss.uploadPart(partParams, function (multiErr, mData) {
            if (multiErr) {
              // console.log('multiErr, upload part error:', multiErr);
              if (tryNum > maxUploadTries) {
                console.log('上传分片失败: #', partParams.PartNumber);
                callback(multiErr);
              }
              else {
                console.log('重新上传分片: #', partParams.PartNumber);
                tryNum++;
                doUpload();
              }
              return;
            }
            // console.log(mData);
            concurrency--;

            multipartMap.Parts[partNum] = {
              ETag: mData.ETag,
              PartNumber: partNum + 1
            };
             console.log("Completed part", partNum + 1);
             //console.log('mData', mData);

            loadedNum++;
            if (loadedNum == result.chunks.length) {
              complete();
            }
            else {
              uploadPart(latestUploadNum + 1);
            }
          });
        };

        doUpload();

      };

      var complete = function () {
        // console.log("Completing upload...");

        var doneParams = {
          Bucket: self._config.bucket,
          Key: options.key,
          CompleteMultipartUpload: multipartMap,
          UploadId: uploadId
        };

        self.oss.completeMultipartUpload(doneParams, callback);
      };

      init();
    };

    readFile(function (err, result) {
      var callback = function (err, res) {
        if (err) {
          if (typeof options.onerror == 'function') {
            options.onerror(err);
          }
          return;
        }

        if (typeof options.oncomplete == 'function') {
          options.oncomplete(res);
        }
      };

      if (result.chunks.length == 1) {
        uploadSingle(result, callback)
      }
      else {
        uploadMultipart(result, callback);
      }
    });

  };

  window.OssUpload = OssUpload;

})();
