define(['notify'], function () {
    /*
        由于localStorage 不支持过期时间设置，所以需要自己来设置
    */
  var Storage = function () {
        // 代理
    this.storageProxy = window.localStorage
        // 设置缓存
    this.defaultLiftTime = 30 * 24 * 60 * 60 * 1000
        // 设置keyCache
    this.keyCache = 'PSC_KEY_TIMEOUT_MAP'
    this.initialize()
  }

  Storage.prototype.initialize = function () {
    if (!this.storageProxy) { throw 'not override storageProxy property' }
  }

    /*
        新增localstorage
        数据格式需要转化成string,所以先要判断数据的类型，所以需要转化成JSON.stringify、JSON.parse
        每一条存储的信息需要
    */
  Storage.prototype.set = function (key, value, expire) {
    var _that = this
    key = typeof key !== 'string' ? String(key) : key
    value = this.serializer(value, expire)
    if (!_that.isSupport()) {
      console.log("your brower doesn't support localStorage")
      return false
    }
    try {
      _that.unEffectiveItem() // 删除失效的localStorage
      this.storageProxy.setItem(key, value)
      $.notify({
        title: '保存成功',
        type: 'success'
      })
    } catch (e) {
      if (_that.isQuotaExceeded(e)) {
        console.log('Not enough storage is available to complete this operation.')
      }
    }
  }

  Storage.prototype.get = function (key) {
    key = typeof key !== 'string' ? String(key) : key
    var cacheItem = null
    try {
      cacheItem = this.unSerializer(this.storageProxy.getItem(key))
    } catch (e) {
      return null
    }
    var _now = new Date().getTime()
    if (_now < new Date(cacheItem.t).getTime()) return cacheItem.v
    else this.delete(key)
    return null
  }

  Storage.prototype.getAll = function () {
    var localStorages = [],
      _that = this
    if (!this.storageProxy && !this.storageProxy.length) return ''
    $.each(this.storageProxy, function (i, item) {
      var n = {}
      var cacheItem = _that.unSerializer(item)
      n.id = i
      n.st = cacheItem.st
      n.v = cacheItem.v
      localStorages.push(n)
    })
    return localStorages
  }

  Storage.prototype.delete = function (key) {
    key = typeof key !== 'string' ? String(key) : key
    this.storageProxy.removeItem(key)
  }

  Storage.prototype.unEffectiveItem = function () {
    var _now = new Date().getTime(),
      _that = this
    if (!_that.storageProxy && !_that.storageProxy.length) return
    $.each(_that.storageProxy, function (i, item) {
      var cacheItem = _that.unSerializer(item)
      if (_now > new Date(cacheItem.t).getTime()) _that.delete(i)
    })
  }

    // 检测兼容性
  Storage.prototype.isSupport = function () {
    var _supported = false,
      _that = this
    if (this.storageProxy && this.storageProxy.setItem) {
      _supported = true
      var _key = '__' + Math.round(Math.random() * 1e7)
      try {
        _that.storageProxy.setItem(_key, _that.keyCache)
        _that.storageProxy.removeItem(_key)
      } catch (e) {
        _supported = false
      }
    }

    return _supported
  }

    // 检测是否已存满
  Storage.prototype.isQuotaExceeded = function (e) {
    var _isQuotaExceeded = false
    if (e) {
      if (e.code) {
                // storage full
        switch (e.code) {
          case 22:
            _isQuotaExceeded = true
            break
          case 1014:
                        /*
                                            for Firefox
                                            {
                                              code: 1014,
                                              name: 'NS_ERROR_DOM_QUOTA_REACHED',
                                              message: 'Persistent storage maximum size reached',
                                              // …
                                            }
                                        */
            if (e.name == 'NS_ERROR_DOM_QUOTA_REACHED') { _isQuotaExceeded = true }
            break
        }
      } else if (e.number == -2147024882) {
                /*
                lt IE8, there is no code in return message
                {
                    number: -2147024882,
                    message: 'Not enough storage is available to complete this operation.',
                    // …
                }

            */
        _isQuotaExceeded = true
      }
    }

    return _isQuotaExceeded
  }

    // 序列化数据
  Storage.prototype.serializer = function (value, expire) {
    var _now = new Date().getTime()
    expire = expire || this.defaultLiftTime
    var _expires = typeof expire === 'number' ? new Date(_now + expire) : (typeof expire === 'string' ? new Date(expire) : new Date())
    var _val = {}
    _val.v = value
    _val.t = _expires
    _val.st = new Date().getTime()
    return this.handleJSON(_val)
  }

  Storage.prototype.unSerializer = function (obj) {
    return JSON.parse(obj)
  }

  Storage.prototype.handleJSON = function (obj) {
    var _type = this.getType(obj),
      _result = ''
    switch (_type) {
      case 'boolean':
      case 'function':
      case 'undefined':
      case 'null':
        throw 'obj type(boolean | function | undefined | null) is illegal'
        break
      default:
        _result = JSON.stringify(obj)
        break
    }
    return _result
  }

    // 判断数据类型
  Storage.prototype.getType = function (obj) {
    var map = {
      '[object Boolean]': 'boolean',
      '[object Number]': 'number',
      '[object String]': 'string',
      '[object Function]': 'function',
      '[object Array]': 'array',
      '[object Data]': 'date',
      '[object RegExp]': 'regExp',
      '[object Undefined]': 'undefined',
      '[object Null]': 'null',
      '[object Object]': 'object'
    }

    if (obj instanceof Element) {
      return 'element'
    }

    return map[Object.prototype.toString.call(obj)]
  }

  return new Storage()
})
