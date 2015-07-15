'use strict';
(function () {

  if (typeof console === "undefined" || typeof console.log === "undefined") {
    window.console = {};
    window.console.log = function () {
    };
  }

  if (!window.atob) {
    var tableStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var table = tableStr.split("");

    window.atob = function (base64) {
      if (/(=[^=]+|={3,})$/.test(base64)) throw new Error("String contains an invalid character");
      base64 = base64.replace(/=/g, "");
      var n = base64.length & 3;
      if (n === 1) throw new Error("String contains an invalid character");
      for (var i = 0, j = 0, len = base64.length / 4, bin = []; i < len; ++i) {
        var a = tableStr.indexOf(base64[j++] || "A"), b = tableStr.indexOf(base64[j++] || "A");
        var c = tableStr.indexOf(base64[j++] || "A"), d = tableStr.indexOf(base64[j++] || "A");
        if ((a | b | c | d) < 0) throw new Error("String contains an invalid character");
        bin[bin.length] = ((a << 2) | (b >> 4)) & 255;
        bin[bin.length] = ((b << 4) | (c >> 2)) & 255;
        bin[bin.length] = ((c << 6) | d) & 255;
      }
      ;
      return String.fromCharCode.apply(null, bin).substr(0, bin.length + n - 4);
    };

    window.btoa = function (bin) {
      for (var i = 0, j = 0, len = bin.length / 3, base64 = []; i < len; ++i) {
        var a = bin.charCodeAt(j++), b = bin.charCodeAt(j++), c = bin.charCodeAt(j++);
        if ((a | b | c) > 255) throw new Error("String contains an invalid character");
        base64[base64.length] = table[a >> 2] + table[((a << 4) & 63) | (b >> 4)] +
            (isNaN(b) ? "=" : table[((b << 2) & 63) | (c >> 6)]) +
            (isNaN(b + c) ? "=" : table[c & 63]);
      }
      return base64.join("");
    };
  }

  var uriEscape = function (string) {
    /*jshint undef:false */
    var output = encodeURIComponent(string);
    output = output.replace(/[^A-Za-z0-9_.~\-%]+/g, escape);

    // percent-encodes some extra non-standard characters in a URI
    output = output.replace(/[*]/g, function (ch) {
      return '%' + ch.charCodeAt(0).toString(16).toUpperCase();
    });

    return output;
  };

  var arrayEach = function (array, iterFunction) {
    for (var idx in array) {
      if (array.hasOwnProperty(idx)) {
        var ret = iterFunction.call(this, array[idx], parseInt(idx, 10));
        // todo: handle this
        if (ret === {}) break;
      }
    }
  };

  var queryParamsToString = function (params) {
    var items = [];
    var escape = uriEscape;

    for (var name in params) {
      if (Object.prototype.hasOwnProperty.call(params, name)) {
        var value = params[name];
        var ename = escape(name);
        var result = ename;
        if (Object.prototype.toString.call(value) === '[object Array]') {
          var vals = [];
          arrayEach(value, function (item) {
            vals.push(escape(item));
          });
          result = ename + '=' + vals.sort().join('&' + ename + '=');
        }
        else if (value !== undefined && value !== null) {
          result = ename + '=' + escape(value);
        }
        items.push(result);
      }
    }

    return items.join('&');
  };

  var hexToBase64 = function (str) {
    return btoa(String.fromCharCode.apply(null,
            str.replace(/\r|\n/g, "").replace(/([\da-fA-F]{2}) ?/g, "0x$1 ").replace(/ +$/, "").split(" "))
    );
  };

  var base64ToHex = function (str) {
    for (var i = 0, bin = atob(str.replace(/[ \r\n]+$/, "")), hex = []; i < bin.length; ++i) {
      var tmp = bin.charCodeAt(i).toString(16);
      if (tmp.length === 1) tmp = "0" + tmp;
      hex[hex.length] = tmp;
    }
    return hex.join(" ");
  };

  var utf8_encode = function (argString) {
    // http://kevin.vanzonneveld.net
    // +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   improved by: sowberry
    // +    tweaked by: Jack
    // +   bugfixed by: Onno Marsman
    // +   improved by: Yves Sucaet
    // +   bugfixed by: Onno Marsman
    // +   bugfixed by: Ulrich
    // +   bugfixed by: Rafal Kukawski
    // +   improved by: kirilloid
    // +   bugfixed by: kirilloid
    // *     example 1: this.utf8_encode('Kevin van Zonneveld');
    // *     returns 1: 'Kevin van Zonneveld'

    if (argString === null || typeof argString === 'undefined') {
      return '';
    }

    var string = (argString + ''); // .replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    var utftext = '',
        start, end, stringl = 0;

    start = end = 0;
    stringl = string.length;
    for (var n = 0; n < stringl; n++) {
      var c1 = string.charCodeAt(n);
      var enc = null;

      if (c1 < 128) {
        end++;
      } else if (c1 > 127 && c1 < 2048) {
        enc = String.fromCharCode(
            (c1 >> 6) | 192, (c1 & 63) | 128
        );
      } else if (c1 & 0xF800 ^ 0xD800 > 0) {
        enc = String.fromCharCode(
            (c1 >> 12) | 224, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128
        );
      } else { // surrogate pairs
        if (c1 & 0xFC00 ^ 0xD800 > 0) {
          throw new RangeError('Unmatched trail surrogate at ' + n);
        }
        var c2 = string.charCodeAt(++n);
        if (c2 & 0xFC00 ^ 0xDC00 > 0) {
          throw new RangeError('Unmatched lead surrogate at ' + (n - 1));
        }
        c1 = ((c1 & 0x3FF) << 10) + (c2 & 0x3FF) + 0x10000;
        enc = String.fromCharCode(
            (c1 >> 18) | 240, ((c1 >> 12) & 63) | 128, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128
        );
      }
      if (enc !== null) {
        if (end > start) {
          utftext += string.slice(start, end);
        }
        utftext += enc;
        start = end = n + 1;
      }
    }

    if (end > start) {
      utftext += string.slice(start, stringl);
    }

    return utftext;
  };

  var base64_encode = function (data) {
    // http://kevin.vanzonneveld.net
    // +   original by: Tyler Akins (http://rumkin.com)
    // +   improved by: Bayron Guevara
    // +   improved by: Thunder.m
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // +   bugfixed by: Pellentesque Malesuada
    // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    // -    depends on: this.utf8_encode
    // *     example 1: this.base64_encode('Kevin van Zonneveld');
    // *     returns 1: 'S2V2aW4gdmFuIFpvbm5ldmVsZA=='
    // mozilla has this native
    // - but breaks in 2.0.0.12!
    //if (typeof this.window['atob'] == 'function') {
    //    return atob(data);
    //}
    var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
        ac = 0,
        enc = '',
        tmp_arr = [];

    if (!data) {
      return data;
    }

    data = utf8_encode(data + '');

    do { // pack three octets into four hexets
      o1 = data.charCodeAt(i++);
      o2 = data.charCodeAt(i++);
      o3 = data.charCodeAt(i++);

      bits = o1 << 16 | o2 << 8 | o3;

      h1 = bits >> 18 & 0x3f;
      h2 = bits >> 12 & 0x3f;
      h3 = bits >> 6 & 0x3f;
      h4 = bits & 0x3f;

      // use hexets to index into b64, and append result to encoded string
      tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);

    enc = tmp_arr.join('');

    switch (data.length % 3) {
      case 1:
        enc = enc.slice(0, -2) + '==';
        break;
      case 2:
        enc = enc.slice(0, -1) + '=';
        break;
    }

    return enc;
  };

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
      if (Object.prototype.hasOwnProperty.call(src, i)) {
        dst[i] = src[i];
      }
    }
  };

  function OssUpload(config) {
    if (!config) {
      console.log('需要 config');
      return;
    }
    this._config = {
      api: 'http://chylvina.oss-cn-hangzhou.aliyuncs.com',
      chunkSize: 1048576
    };

    _extend(this._config, config);

    if(!this._config.aliyunCredential && !this._config.stsToken) {
      console.log('需要 stsToken');
      return;
    }

    if (!this._config.endpoint) {
      console.log('需要 endpoint');
      return;
    }
    var arr = this._config.endpoint.split('://');
    if (arr.length < 2) {
      console.log('endpoint 格式错误');
      return;
    }
    this._config.endpoint = {
      protocol: arr[0],
      host: arr[1]
    }

  }

  OssUpload.prototype.upload = function (options) {
    if (!options) {
      console.log('需要 options');
      return;
    }

    if (!options.file) {
      console.log('需要 file');
      return;
    }
    var file = options.file;

    if (!options.key) {
      console.log('需要 key');
      return;
    }
    // 去掉 key 开头的 /
    options.key.replace(new RegExp("^\/"), '');

    var self = this;

    async.waterfall([

      function (callback) {
        var result = {};
        var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;

        var frOnload = function (e) {
          result.md5 = hexToBase64(SparkMD5.ArrayBuffer.hash(e.target.result));
          result.blob = e.target.result;
          callback(null, result);
        };
        var frOnerror = function () {
          console.warn("oops, something went wrong.");
        };

        function loadNext() {
          var fileReader = new FileReader();
          fileReader.onload = frOnload;
          fileReader.onerror = frOnerror;
          fileReader.readAsArrayBuffer(blobSlice.call(file));
        }

        loadNext();
      },
      function (chunkInfo, callback) {
        var dateString = parseInt(Math.floor((new Date()).getTime() / 1000) + 600, 10).toString();
        var contentType = file.type || '';
        var parts = [];
        parts.push('PUT');
        parts.push(chunkInfo.md5);    // Content-MD5
        parts.push(contentType);      // Content-Type
        parts.push(dateString);       // Date
        if(self._config.stsToken) {
          parts.push('x-oss-security-token:' + self._config.stsToken.Credentials.SecurityToken);
        }
        if(options.xOssHeaders && options.xOssHeaders['x-oss-server-side-encryption']) {
          parts.push('x-oss-server-side-encryption:' + options.xOssHeaders['x-oss-server-side-encryption']);
        }
        parts.push('/' + self._config.bucket + '/' + options.key);   // Key
        var stringToSign = parts.join('\n');
        var shaObj = new jsSHA("SHA-1", "TEXT");
        if(self._config.stsToken) {
          shaObj.setHMACKey(self._config.stsToken.Credentials.AccessKeySecret, "TEXT");
        }
        else {
          shaObj.setHMACKey(self._config.aliyunCredential.secretAccessKey, "TEXT");
        }
        shaObj.update(stringToSign);
        var signature = shaObj.getHMAC("B64");

        var queryParams = {
          Expires: dateString,
          Signature: signature
        };
        if(self._config.stsToken) {
          queryParams.OSSAccessKeyId = self._config.stsToken.Credentials.AccessKeyId;
        }
        else {
          queryParams.OSSAccessKeyId = self._config.aliyunCredential.accessKeyId;
        }
        var querystring = queryParamsToString(queryParams);

        var xhr = new XMLHttpRequest();
        xhr.open('PUT', self._config.endpoint.protocol + '://' + self._config.bucket + '.' + self._config.endpoint.host + '/' + options.key + '?' + querystring, true);
        xhr.setRequestHeader("Content-MD5", chunkInfo.md5);
        xhr.setRequestHeader("Content-Type", contentType);
        if(options.httpHeaders) {
          for(var i in options.httpHeaders) {
            if(Object.prototype.hasOwnProperty.call(options.httpHeaders, i)) {
              xhr.setRequestHeader(i, options.httpHeaders[i]);
            }
          }
        }
        if(options.xOssHeaders && options.xOssHeaders['x-oss-server-side-encryption']) {
          xhr.setRequestHeader("x-oss-server-side-encryption", options.xOssHeaders['x-oss-server-side-encryption']);
        }
        if(self._config.stsToken) {
          xhr.setRequestHeader("x-oss-security-token", self._config.stsToken.Credentials.SecurityToken);
        }
        xhr.onreadystatechange = function (evt) {
          if (xhr.readyState == 4) {
            if (xhr.status == 200) {
              callback(null, evt);
            }
            else {
              callback(evt);
            }
          }
        };
        if (typeof options.onprogress == 'function') {
          xhr.upload.onprogress = function (evt) {
            options.onprogress(evt);
          };
        }
        xhr.onerror = function (evt) {
          callback(evt);
        };
        xhr.send(chunkInfo.blob);
      }
    ], function (err, res) {
      if (err) {
        if (typeof options.onerror == 'function') {
          options.onerror(err);
        }
        return;
      }

      if (typeof options.oncomplete == 'function') {
        options.oncomplete(res);
      }
    });
  };

  window.OssUpload = OssUpload;

})();
