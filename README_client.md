# 体育器材共享：提供给小程序的API文档

（假设服务被部署到了 https://example.com/ ）
由于微信小程序的安全要求, 请先将 https://example.com/ 添加到开发-服务器域名-request合法域名


## 登录LOGIN

逻辑上，用户的唯一身份标志是`userid`，是一个系统分配的字符串。但目前userid和微信号一一绑定，不能解除绑定。

如果用户尚未注册，微信小程序需要通过 `wx.login` 函数获取`code`, 将`code`和其他个人信息（见下文）发送到服务器, 服务器会返回一个`client_session_id`和一个`userid`.

如果用户已经注册，微信小程序需要通过 `wx.login` 函数获取`code`, 将`code`发送到服务器, 服务器会返回一个`client_session_id`和一个`userid`.

在调用除了登录和注册API外的其他API时, 均需要同时给服务器提交`client_session_id`和`userid`. 

这个`client_session_id `不是永久的. 这个`client_session_id` 不是永久的, 在一定时间后会过期 (不是我没事找事, 是微信`session_key`会过期导致的).

**如果提交的`client_session_id`无效(比如已经过期了), 返回的JSON中`"status"`字段为`"error: invalid session_id"`, 此时我们需要重新获取`client_session_id`.**



#### 注册

##### URL

GET https://example.com/user/signup

##### 提交数据

```json
{
	"code": "somecodefromwxdotlogin",
    "password": "somepassword",
    "region": "浙江, 杭州",
    "phone": "+86 18888888888",
    "email": "somename@example.com"
}
```

##### 返回数据

```json
{
    "status": "accepted"/"error: balabala",
    "userid": "12222222",
    "client_session_id": "someverylongstring"
}
```

##### 错误

| status字段内容           | 错误原因                             |
| ------------------------ | ------------------------------------ |
| error: already signed up | 同一个微信号注册过了                 |
| error: invalid code      | code不合法                           |
| error: weixin: *         | 微信服务器返回错误信息（之后不再提） |

##### 示例代码

```json
wx.login({
    success: (res) => {
        this.setData({ userid: res.code })
        wx.request({
            url: 'https://example.com/user/signup',
            data: { 
                code: res.code,
                password: "12456",
                region: "浙江, 杭州",
                phone: "12222222222",
                email: "123@abc.co"
            },
            success: (data) => {
                this.setData({ signupJSON: JSON.stringify(data.data) })
                console.log(data.data)
            }
        })
    },
    fail: (res) => {
        this.setData({ userid: "failed" })
    }
})
```

注: 只是举个例子说明服务器API怎么调用. 只是一个例子. 下同.



#### 获取`CLIENT_SESSION_ID`（登录）

##### URL

GET https://example.com/user/login

##### 提交数据

```json
{
    "code": "somecodefromwxdotlogin"
}
```

##### 返回数据

```json
{
    "status": "accepted"/"error: balabala",
    "userid": "12222222",
    "client_session_id": "someverylongstring"
}
```

注: 如果`"status"`不是`"accepted"`, 那么其他字段多半不会有意义, 甚至根本不会有. 下同.

注: 如果此处的`"error: balabala"`中的"balabala"可以是各种具体的错误原因. 下同.

##### 错误

| status字段内容         | 错误原因   |
| ---------------------- | ---------- |
| error: user not exists | 用户不存在 |
| error: invalid code    | code不合法 |

##### 示例代码

```js
wx.login({
  success (res) {
    if (res.code) {
      wx.request({
        url: 'https://example.com/user/login/',
        data: {
          code: res.code
        },
        success (res) {
    	  console.log(res.data) //res.data就是返回的数据
  		}
      })
    } else {
      console.log('登录失败！' + res.errMsg)
    }
  }
})
```



#### 判断`CLIENT_SESSION_ID`是否有效

使用客户端API `wx.checkSession`，详见

https://developers.weixin.qq.com/miniprogram/dev/api/open-api/login/wx.checkSession.html





## 用户USER

##### 以下API都需要提交数据

```json
{
	"userid": "10000000",
	"client_session_id": "someclientsessionid"
}
```

##### 以下API都有可能返回错误

| status字段的内容          | 错误原因              |
| ------------------------- | --------------------- |
| error: invalid request    | 没有提交足够信息      |
| error: invalid userid     | 用户userid不存在      |
| error: invalid session_id | client_session_id不对 |



#### 获取用户个人信息

##### URL

GET https://example.com/user/profile/

##### 返回数据

```json
{
	"status": "accepted" / "error: balabala",
	"userid": "00000000",
    "region": "浙江,杭州", 
	"phone": "13111111111",
    "email": "mail@example.com"
}
```

| 字段   | 含义   | 数据格式                      |
| ------ | ------ | ----------------------------- |
| userid | 账号   | 字符串. 是八位数字.           |
| region | 地区   | 字符串                        |
| phone  | 手机号 | 字符串. 如"+86 010 832-32123" |
| email  | 邮箱   | 字符串.                       |

地区具体要精确到什么程度？暂时就作为一个由客户端进行验证，服务器端不再进行验证的字符串吧。



#### 用户当前状态

##### URL

GET https://example.com/user/status/

##### 返回数据示例

```json
{
	"status": "accepted"/"error: balabala",
	"items": [{
			"time_begin": "yyyy-MM-dd hh:mm:ss",
			"name": "篮球A",
			"device": "北交1"
		},
		{
			"time_begin": "yyyy-MM-dd hh:mm:ss",
			"name": "篮球A",
			"device": "北交1"
		}
	]
}	
	
```

| 字段       | 含义               | 数据格式               |
| ---------- | ------------------ | ---------------------- |
| items      | 正借着的项目       | 数组                   |
| time_begin | 借出器材时间       | 字符串. 具体格式见示例 |
| name       | 器材名称           | 字符串                 |
| device     | 借用器材的来源柜子 | 字符串                 |

这里, 假定了业务逻辑为, **一个人不能同时借两个器材, 借用的时候需要设定一个预计归还时间, 或者由我们指派一个应当归还的时间**.



#### 用户租借历史

租借历史应当是一个列表. 由于这个列表可能会很长, 因此采用分页的API来获取租借历史.

##### URL

GET https://domain/user/history/page_length/some_length/page_id/some_id

将`some_length`替换为期望的每页记录条数, `some_id` 替换为要查询的页的编号(从0开始), 获取一页的历史记录. 如果指定的那一页超出了范围(只有10页数据, 却要求访问了第20页), 则返回数据中的`items`字段为空数组. 

##### 返回数据示例

```json
{
	"status": "accepted"/"error: balabala",
	"items": [{
			"time_begin": "yyyy-MM-dd hh:mm:ss",
			"time_end": "yyyy-MM-dd hh:mm:ss",
			"name": "篮球A",
			"device": "北交1"
		},
		{
			"time_begin": "yyyy-MM-dd hh:mm:ss",
			"time_end": "yyyy-MM-dd hh:mm:ss",
			"name": "篮球A",
			"device": "北交1"
		}
	]
}
```

| 字段       | 含义               | 数据格式               |
| ---------- | ------------------ | ---------------------- |
| items      | 历史记录条目数组   | 数组                   |
| time_begin | 借用的器材的名称   | 字符串. 具体格式见示例 |
| time_end   | 归还时间           | 字符串. 具体格式见示例 |
| name       | 器材名称           | 字符串                 |
| device     | 借用器材的来源柜子 | 字符串                 |



