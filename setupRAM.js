var async = require('async');
var ALY = require('aliyun-sdk');
var ram = new ALY.RAM({
      accessKeyId: 'YjCncGEFtB7WnaoT',
      secretAccessKey: 'tfzqLosYIkoxf0fTr4lniTdhr7SaIz',
      endpoint: 'https://ram.aliyuncs.com',
      apiVersion: '2015-05-01'
    }
);

// 必需要准备账号 ID, 可以在 https://account.console.aliyun.com/#/secure 找到
var accountId = '31611321';
// 创建的用户的名称, 可以自己设置
var userName = 'user-oss-js-upload';
// 创建的角色的名称, 可以自己设置
var roleName = 'role-oss-js-upload';

setup();
//clear();

// 清除已经设置的 RAM 用户和角色
// 注意, 清除后就不能使用该用户和角色调用 assumeRole 方法, 生产环境慎用!
function clear() {
  async.waterfall([
    function (callback) {
      console.log('正在 detachPolicyFromRole');
      ram.detachPolicyFromRole({
        PolicyType: 'System',
        PolicyName: 'AliyunOSSFullAccess',
        RoleName: roleName
      }, function (err, res) {
        if (err) {
          console.error('失败', '原因:', err);
        }

        callback(null, res);
      });
    },
    function (data, callback) {
      console.log('正在 deleteRole');
      ram.deleteRole({
        RoleName: roleName
      }, function (err, res) {
        if (err) {
          console.error('失败', '原因:', err);
        }

        callback(null, res);
      });
    },
    function (data, callback) {
      console.log('正在 detachPolicyFromUser');
      ram.detachPolicyFromUser({
        PolicyType: 'System',
        PolicyName: 'AliyunSTSAssumeRoleAccess',
        UserName: userName
      }, function (err, res) {
        if (err) {
          console.error('失败', '原因:', err);
        }

        callback(null, res);
      });
    },
    function (data, callback) {
      console.log('正在 deleteUser');
      ram.deleteUser({
        UserName: userName
      }, function (err, res) {
        if (err) {
          console.error('失败', '原因:', err);
        }

        callback(null, res);
      });
    }
  ], function (err, res) {
    console.log('执行完毕');
  });
}


// 创建用户和角色
function setup() {
  async.waterfall([
    function (callback) {
      var data = {};
      console.log('正在 createUser');
      ram.createUser({
        UserName: userName
      }, function (err, res) {
        if (err) {
          console.error('失败', '原因:', err);
          return callback(true);
        }

        callback(null, data);
      });
    },
    function (data, callback) {
      console.log('正在 attachPolicyToUser');
      ram.attachPolicyToUser({
        PolicyType: 'System',
        PolicyName: 'AliyunSTSAssumeRoleAccess',
        UserName: userName
      }, function (err, res) {
        if (err) {
          console.error('失败', '原因:', err);
          return callback(true);
        }

        callback(null, data);
      });
    },
    function (data, callback) {
      console.log('正在 createAccessKey');
      ram.createAccessKey({
        UserName: userName
      }, function (err, res) {
        if (err) {
          console.error('失败', '原因:', err);
          return callback(true);
        }

        data.accessKeyId = res.AccessKey.AccessKeyId;
        data.accessKeySecret = res.AccessKey.AccessKeySecret;

        callback(null, data);
      });
    },
    function (data, callback) {
      console.log('正在 createRole');
      ram.createRole({
        RoleName: roleName,
        AssumeRolePolicyDocument: '{"Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"RAM":["acs:ram::' + accountId +':root"]}}],"Version":"1"}'
      }, function (err, res) {
        if (err) {
          console.error('失败', '原因:', err);
          return callback(true);
        }

        data.roleArn = res.Role.Arn;

        callback(null, data);
      });
    },
    function (data, callback) {
      console.log('正在 attachPolicyToRole');
      ram.attachPolicyToRole({
        PolicyType: 'System',
        PolicyName: 'AliyunOSSFullAccess',
        RoleName: roleName
      }, function (err, res) {
        if (err) {
          console.error('失败', '原因:', err);
          return callback(true);
        }

        callback(null, data);
      });
    }
  ], function (err, data) {
    if (err) {
      console.log('RAM 设置失败');
      console.log('请根据错误提示进行修改');
      console.log('修改后使用 clear() 方法清除已经设置的用户和角色');
      console.log('然后调用 setup() 重新设置 RAM');
      return;
    }

    console.log('RAM 设置成功');
    console.log('请记录下面打印的数据, 在后续调用 assumeRole 的时候会用到');
    console.log(data);
  });
}
