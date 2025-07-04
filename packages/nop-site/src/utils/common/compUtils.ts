import { useGlobSetting } from '/@/hooks/setting';
import { merge, random } from 'lodash-es';
import { isArray } from '/@/utils/is';
import { FormSchema } from '/@/Form';

const globSetting = useGlobSetting();
const baseApiUrl = globSetting.domainUrl;
/**
 *  获取文件服务访问路径
 * @param fileUrl 文件路径
 * @param prefix(默认http)  文件路径前缀 http/https
 */
export const getFileAccessHttpUrl = (fileUrl, prefix = 'http') => {
  let result = fileUrl;
  try {
    if (fileUrl && fileUrl.length > 0 && !fileUrl.startsWith(prefix)) {
      //判断是否是数组格式
      let isArray = fileUrl.indexOf('[') != -1;
      if (!isArray) {
        let prefix = `${baseApiUrl}/sys/common/static/`;
        // 判断是否已包含前缀
        if (!fileUrl.startsWith(prefix)) {
          result = `${prefix}${fileUrl}`;
        }
      }
    }
  } catch (err) {}
  return result;
};

/**
 * 触发 window.resize
 */
export function triggerWindowResizeEvent() {
  let event: any = document.createEvent('HTMLEvents');
  event.initEvent('resize', true, true);
  event.eventType = 'message';
  window.dispatchEvent(event);
}

/**
 * 获取随机数
 *  @param length 数字位数
 */
export const getRandom = (length: number = 1) => {
  return '-' + parseInt(String(Math.random() * 10000 + 1), length);
};

/**
 * 随机生成字符串
 * @param length 字符串的长度
 * @param chats 可选字符串区间（只会生成传入的字符串中的字符）
 * @return string 生成的字符串
 */
export function randomString(length: number, chats?: string) {
  if (!length) length = 1;
  if (!chats) {
    // noinspection SpellCheckingInspection
    chats = '0123456789qwertyuioplkjhgfdsazxcvbnm';
  }
  let str = '';
  for (let i = 0; i < length; i++) {
    let num = random(0, chats.length - 1);
    str += chats[num];
  }
  return str;
}

/**
 * 将普通列表数据转化为tree结构
 * @param array tree数据
 * @param opt  配置参数
 * @param startPid 父节点
 */
export const listToTree = (array, opt, startPid) => {
  const obj = {
    primaryKey: opt.primaryKey || 'key',
    parentKey: opt.parentKey || 'parentId',
    titleKey: opt.titleKey || 'title',
    startPid: opt.startPid || '',
    currentDept: opt.currentDept || 0,
    maxDept: opt.maxDept || 100,
    childKey: opt.childKey || 'children',
  };
  if (startPid) {
    obj.startPid = startPid;
  }
  return toTree(array, obj.startPid, obj.currentDept, obj);
};
/**
 *  递归构建tree
 * @param list
 * @param startPid
 * @param currentDept
 * @param opt
 * @returns {Array}
 */
export const toTree = (array, startPid, currentDept, opt) => {
  if (opt.maxDept < currentDept) {
    return [];
  }
  let child = [];
  if (array && array.length > 0) {
    child = array
      .map((item) => {
        // 筛查符合条件的数据（主键 = startPid）
        if (typeof item[opt.parentKey] !== 'undefined' && item[opt.parentKey] === startPid) {
          // 满足条件则递归
          const nextChild = toTree(array, item[opt.primaryKey], currentDept + 1, opt);
          // 节点信息保存
          if (nextChild.length > 0) {
            item['isLeaf'] = false;
            item[opt.childKey] = nextChild;
          } else {
            item['isLeaf'] = true;
          }
          item['title'] = item[opt.titleKey];
          item['label'] = item[opt.titleKey];
          item['key'] = item[opt.primaryKey];
          item['value'] = item[opt.primaryKey];
          return item;
        }
      })
      .filter((item) => {
        return item !== undefined;
      });
  }
  return child;
};

/**
 * 表格底部合计工具方法
 * @param tableData 表格数据
 * @param fieldKeys 要计算合计的列字段
 */
export function mapTableTotalSummary(tableData: Recordable[], fieldKeys: string[]) {
  let totals: any = { _row: '合计', _index: '合计' };
  fieldKeys.forEach((key) => {
    totals[key] = tableData.reduce((prev, next) => {
      prev += next[key];
      return prev;
    }, 0);
  });
  return totals;
}

/**
 * 简单实现防抖方法
 *
 * 防抖(debounce)函数在第一次触发给定的函数时，不立即执行函数，而是给出一个期限值(delay)，比如100ms。
 * 如果100ms内再次执行函数，就重新开始计时，直到计时结束后再真正执行函数。
 * 这样做的好处是如果短时间内大量触发同一事件，只会执行一次函数。
 *
 * @param fn 要防抖的函数
 * @param delay 防抖的毫秒数
 * @returns {Function}
 */
export function simpleDebounce(fn, delay = 100) {
  let timer: any | null = null;
  return function () {
    let args = arguments;
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      // @ts-ignore
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * 日期格式化
 * @param date 日期
 * @param block 格式化字符串
 */
export function dateFormat(date, block) {
  if (!date) {
    return '';
  }
  let format = block || 'yyyy-MM-dd';
  date = new Date(date);
  const map = {
    M: date.getMonth() + 1, // 月份
    d: date.getDate(), // 日
    h: date.getHours(), // 小时
    m: date.getMinutes(), // 分
    s: date.getSeconds(), // 秒
    q: Math.floor((date.getMonth() + 3) / 3), // 季度
    S: date.getMilliseconds(), // 毫秒
  };
  format = format.replace(/([yMdhmsqS])+/g, (all, t) => {
    let v = map[t];
    if (v !== undefined) {
      if (all.length > 1) {
        v = `0${v}`;
        v = v.substr(v.length - 2);
      }
      return v;
    } else if (t === 'y') {
      return date
        .getFullYear()
        .toString()
        .substr(4 - all.length);
    }
    return all;
  });
  return format;
}

/**
 * 获取事件冒泡路径，兼容 IE11，Edge，Chrome，Firefox，Safari
 * 目前使用的地方：JVxeTable Span模式
 */
export function getEventPath(event) {
  let target = event.target;
  let path = (event.composedPath && event.composedPath()) || event.path;

  if (path != null) {
    return path.indexOf(window) < 0 ? path.concat(window) : path;
  }

  if (target === window) {
    return [window];
  }

  let getParents = (node, memo) => {
    const parentNode = node.parentNode;

    if (!parentNode) {
      return memo;
    } else {
      return getParents(parentNode, memo.concat(parentNode));
    }
  };
  return [target].concat(getParents(target, []), window);
}

/**
 * 如果值不存在就 push 进数组，反之不处理
 * @param array 要操作的数据
 * @param value 要添加的值
 * @param key 可空，如果比较的是对象，可能存在地址不一样但值实际上是一样的情况，可以传此字段判断对象中唯一的字段，例如 id。不传则直接比较实际值
 * @returns {boolean} 成功 push 返回 true，不处理返回 false
 */
export function pushIfNotExist(array, value, key?) {
  for (let item of array) {
    if (key && item[key] === value[key]) {
      return false;
    } else if (item === value) {
      return false;
    }
  }
  array.push(value);
  return true;
}
/**
 * 过滤对象中为空的属性
 * @param obj
 * @returns {*}
 */
export function filterObj(obj) {
  if (!(typeof obj == 'object')) {
    return;
  }

  for (let key in obj) {
    if (obj.hasOwnProperty(key) && (obj[key] == null || obj[key] == undefined || obj[key] === '')) {
      delete obj[key];
    }
  }
  return obj;
}

/**
 * 下划线转驼峰
 * @param string
 */
export function underLine2CamelCase(string: string) {
  return string.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 查找树结构
 * @param treeList
 * @param fn 查找方法
 * @param childrenKey
 */
export function findTree(treeList: any[], fn: Fn, childrenKey = 'children') {
  for (let i = 0; i < treeList.length; i++) {
    let item = treeList[i];
    if (fn(item, i, treeList)) {
      return item;
    }
    let children = item[childrenKey];
    if (isArray(children)) {
      let findResult = findTree(children, fn, childrenKey);
      if (findResult) {
        return findResult;
      }
    }
  }
  return null;
}

/** 获取 mapFormSchema 方法 */
export function bindMapFormSchema<T>(spanMap, spanTypeDef: T) {
  return function (s: FormSchema, spanType: T = spanTypeDef) {
    return merge(
      {
        disabledLabelWidth: true,
      } as FormSchema,
      spanMap[spanType],
      s
    );
  };
}

/**
 * 字符串是否为null或null字符串
 * @param str
 * @return {boolean}
 */
export function stringIsNull(str) {
  // 两个 == 可以同时判断 null 和 undefined
  return str == null || str === 'null' || str === 'undefined';
}

/**
 * 【组件多了可能存在性能问题】获取弹窗div，将下拉框、日期等组件挂载到modal上，解决弹窗遮盖问题
 * @param node
 */
export function getAutoScrollContainer(node: HTMLElement) {
  let element: Nullable<HTMLElement> = node
  while (element != null) {
    if (element.classList.contains('scrollbar__view')) {
      // 判断是否有滚动条
      if (element.clientHeight < element.scrollHeight) {
        // 有滚动条时，挂载到父级，解决滚动问题
        return node.parentElement
      } else {
        // 无滚动条时，挂载到body上，解决下拉框遮盖问题
        return document.body
      }
    } else {
      element = element.parentElement
    }
  }
  // 不在弹窗内，走默认逻辑
  return node.parentElement
}

/**
 * 判断子菜单是否全部隐藏
 * @param menuTreeItem
 */
export  function checkChildrenHidden(menuTreeItem){
  //是否是聚合路由
  let alwaysShow=menuTreeItem.alwaysShow;
  if(alwaysShow){
    return false;
  }
  if(!menuTreeItem.children){
    return false
  }
  return menuTreeItem.children?.find((item) => item.hideMenu == false) != null;
}
