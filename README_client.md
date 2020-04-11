# 体育器材共享：提供给小程序开发者的API文档


## Update April 11th, 2020
1. 因为要把页面放到GitHub公开库里面，谨慎起见，把里面的域名全换成了example.com；
2. 考虑到应该没有人会喜欢系统随机分配的数字ID，这次直接用很长的UUID字符串代替8位数字ID字符串（当然也不会有人喜欢，但反正也不需要显示给用户）。严格来说这是一个**不兼容**上一个版本的API的设计，但是我想用JavaScript编程应该也不需要考虑到字符串长度，所以小程序那边应该不需要为此修改任何代码；
3. 删除了微信注册的时候需要提交的密码。反正用不到，没有必要像用户收集；
4. 注册时候提交的所有用户个人信息都是可选项，不提交用户个人信息不会导致注册失败；但是一些个人信息（比如电话号码）的缺失，可能会导致借用的时候没有权限；
5. 所以，实际上，现在，注册和登录是语义完全相同的两个API。。
5. 时间的格式从 `yyyy-MM-dd hh:mm:ss` 转化成了 `yyyy-MM-ddThh:mm:ss.???Z`。因为后者可以直接和JavaScript的`Date`对象相互转换（`new Date(str)`转Date，直接放到对象里面`stringify`自己就转成字符串了），这也是会导致**不兼容**的一个修改。

6. 加入了借用相关的API



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


## 借用与归还
因为IoT设备可能面临各种技术问题，比如机械结构的故障导致箱门不能增长开启，或者是器材标签老化不能被正常识别，所以每次借用与归还的请求都不一定可以得到正确的响应。为了让客户端程序可以判断一次借去操作有没有成功，需要在调用`try_to_rent`和`try_to_revert`接口后，通过`latest_renting_or_reverting_status`接口来判断最近的一次借用操作有没有成功。

另外，在返回的设备信息列表中，每个设备都还有一个“验证码列表”，目前是1-2个字符串形式存储的，长3个字符，由数字构成的验证码，这1-2个验证码中存储的是对应的IoT设备的数字显示器上（刚刚显示和）正在显示的验证码。这个验证码并不是为了安全功能而添加的，而是为了优化用户体验而添加的。用户有可能会误按借去按钮，或者是选错设备名称。要求用户在借取之前输入一次设备上正在显示的验证码，或者要求用户在若干个选项中选出设备上正在显示的验证码，作为确定用户确实在设备前进行验证的手段。

这部分的大部分API也需要提交以下数据：

```json
{
	"userid": "10000000",
	"client_session_id": "someclientsessionid"
}
```

#### 设备列表

GET http://example/device/list

调用这个API不需要提交任何数据

##### 返回数据示例

