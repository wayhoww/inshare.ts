# 体育器材共享：提供给小程序开发者的API文档

据说“类型是最好的文档”，所以我创建了[src/lib/IODataStructure.ts](src/lib/IODataStructure.ts)
文件，来定义各种接受和返回的数据结构，并且给出了详细的解释，这个README文档中就不重复了。
如果你正在使用TypeScript开发微信小程序，那可以直接拷贝这个文件到项目目录，
它可以提供完整的返回数据的linting。

需要说明，所有API都通过header中的query数据来接受数据(对应`wx.request`中的`data`参数)，
通过body发送JSON格式的数据。

### [src/lib/IODataStructure.ts](src/lib/IODataStructure.ts)的内容
1. 里面有4个namespace: `Device`, `User`, `Response`, `Request`，其中
  1. `Response`：定义了返回的JSON数据的类型，也注释了每个API的用法
  2. `Request`：定义了需要提交的数据的数据结构
2. 里面对数据类型的定义用的是TypeScript语法，总体来说是个很自然的语法，
  也可以看一下[🔗这个网页](https://www.tslang.cn/docs/handbook/advanced-types.html)
  里面介绍的“交叉类型”和“联合类型”。

### 用户信息
用户的唯一标志是`uuid`
#### 如何注册和“登录”？
目前支持通过微信注册和通过用户名密码注册两种方式。

#### 如何提交鉴权信息
获取个人信息、借用等API都要求提交鉴权信息。鉴权信息有多种，比如微信`client_session_id`，或用户名密码。
只要提交至少一种鉴权信息就可以通过登录。如果鉴权失败，会返回所有可能的错误。

### 借用与归还
因为IoT设备不一定会响应的缘故，借用不一定会成功，所以借用与归还都是“try_to”。
`try_to_rent`和`try_to_revert`返回`accept`仅仅代表着IoT设备受理这个请求了，
而不知道是不是已经成功借用或者归还了。

可以通过`GET /user/renting_or_reverting`来查看是不是处在某个借用和归还过程中。
可以通过`GET /user/lastest_renting_or_reverting_status`来查看最近一次借用或
归还操作有没有得到IoT设备的响应。如果有，是成功还是失败响应。
