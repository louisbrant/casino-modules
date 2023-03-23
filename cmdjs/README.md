# cmdjs
A cmd tool.

## Vision
To make the best framework to make a tool for cmd.

## Quick Start
现在，我们就来尝试快速构建一个命令行工具。

### 本框架约定的术语
我们现来对该框架中提到的名称进行说明下，以下面一段命令为例：

```bash
mo create myGame --frameworks mo -o ./tmp
```

* 命令名称：`mo`
* 命令插件名称：`create`
* 命令插件参数：`myGame`
* 命令选项和选项值：`--frameworks mo`
* 命令选项短名和选项值： `-o ./tmp`

### 项目结构

接下来，我们开始进行命令行工具项目的创建。项目目录结构如下：

```
my-cmd-tool
  +config
    -msg.json
    -option.json
    -plugin.json
  +plugin
  -bin.js
  -package.json
```

1. `config`目录用于存放该命令行工具的各种配置。
  * `msg.json`用于配置提示信息。目的是将提示信息配置化，已达到今后进行国际化操作。
  * `option.json`用于配置全局的选项信息。例如`--out`选项。
  * `plugin.json`用于配置具体的插件信息。

2. `plugin`目录用于存放具体的插件实现逻辑代码。该js文件名称即为插件名称（不区分大小写）。

3. `bin.js`即为命令的启动入口js。

### bin.js

```js
#!/usr/bin/env node

var cmdJs = require("cmdjs");
cmdJs.bin({
    configDir : cmdJs.path2.join(__dirname, "config"),
    pluginDir : cmdJs.path2.join(__dirname, "plugin")
});
```

这里的代码极其简单，只要你保证项目目录结构按规范来，直接复制就可以了。

### package.json

```json
{
    "name": "my-cmd-tool",
    "version": "0.1.0",
    "bin" : {
        "mo" : "./bin.js"
    },
    "dependencies" : {
        "cmdjs" : "*"
    },
    "author" : {
        "name" : "SmallAiTT",
        "email" : "536762164@qq.com"
    }
}

```

这是一段简单的`nodejs`模块配置。其中主要注意的只有两点：

1. `bin`选项用于配置命令行入口js以及`命令名称`(`mo`)。

2. `dependencies`中配置上所需要依赖的框架`cmdjs`。

然后在`my-cmd-tool`目录下执行下`npm install`。

执行`npm link ./`，是`mo`命令可用。

打开命令行，输入`mo`，这时候将会看到对应的命令提示信息了。

这么一来，命令行工具的第一步就算成功了，剩下的就是构建具体需要的命令插件了。

### 构建插件

1. `plugin/create.js`:

```js
var cmdJs = require("cmdjs");

module.exports = cmdJs.CmdPlugin.extends({
    run : function(value, option, onEnd){
        console.log("testPlugin--value--->", value);
        console.log("testPlugin--option--->");
        console.log(option);
        console.log("config for cmd--->");
        console.log(this.cmd.config);
        //下面参数设置只是为了演示msg.json的功能
        if(option["frameworks"] == "msg") throw this.cmd.getMsg("mo.err.testMsg", "可以传参哦");
        onEnd();
    }

});
```

这就是命令插件的代码了，通过获取到的各种参数，我们就可以进行具体需要的开发需求了。
最终，通过执行`onEnd`函数结束命令。`onEnd`函数依旧保持`nodeJs`通用的异步回调格式，
即第一个参数为`error`。

2. `msg.json`

```json
{
  "mo.err.testMsg" : "测试提示信息【%s】"
}
```

这个配置文件，主要通过`this.cmd.getMsg`api进行消息的获取。支持传参。

3. `option.json`

```json
{
  "out" : {"short" : "o", "default" : "./", "desc" : "输出目录，默认为\\033[1;34;1m./\\033[0m"}
}
```

全局的选项配置。描述中的那种`\\033[1;24;1m]`这种是控制台输出颜色的设置。

4. `plugin.json`

```json
{
  "create" : {
    "short" : "c",
    "desc" : "创建项目",
    "value" : {"type" : "string"},
    "option" : {
      "out" : {"ref" : "out"},
      "frameworks" : {
        "type" : "array", "default" : ["boot"],
        "desc" : "框架的依赖模块"
      }
    }
  }
}
```

  * `short`表示短名，也就是说，`mo create ...`命令可以用`mo c ...`代替。

  * `value`定义`命令插件参数`。

  * `out`选项使用`ref`引用到全局(即`option.json`)中的选项配置。


### 完成
至此，一个简单的命令就构建完成了。你可以在命令行中输入`mo create myGame`试试。

其中，配置中，最繁琐的莫过于插件选项了，这些已经在`cmdjs/test`中有很好的展示例子了，
请到这目录下查看相关配置和代码。

如何？是不是觉得以前感觉高大上的命令行工具离自己并不遥远，反而显得简单轻松了许多！

## 反馈

如果各位在使用过程中遇到各种问题或者有各种意见和建议，欢迎来搞！邮箱：`536762164@qq.com`。
