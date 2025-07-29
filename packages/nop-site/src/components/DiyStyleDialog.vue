<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="DIY样式编辑器"
    width="90%"
    :before-close="handleClose"
    destroy-on-close
  >
    <div class="diy-style-container">
      <!-- 左侧编辑区域 -->
      <div class="edit-section">
        <h3>样式编辑</h3>
        <el-form :model="styleForm" label-width="100px">
          <el-form-item label="菜单名称">
            <el-input v-model="styleForm.name" placeholder="请输入菜单名称" />
          </el-form-item>
          <el-form-item label="菜单类型">
            <el-select v-model="styleForm.type" placeholder="请选择菜单类型">
              <el-option label="用户任务" value="bpmn:UserTask" />
              <el-option label="服务任务" value="bpmn:ServiceTask" />
              <el-option label="发送任务" value="bpmn:SendTask" />
              <el-option label="接收任务" value="bpmn:ReceiveTask" />
              <el-option label="手工任务" value="bpmn:ManualTask" />
              <el-option label="业务规则任务" value="bpmn:BusinessRuleTask" />
              <el-option label="脚本任务" value="bpmn:ScriptTask" />
              <el-option label="调用活动" value="bpmn:CallActivity" />
              <el-option label="子流程" value="bpmn:SubProcess" />
            </el-select>
          </el-form-item>
          <el-form-item label="图标颜色">
            <el-color-picker v-model="styleForm.iconColor" />
          </el-form-item>
          <el-form-item label="背景颜色">
            <el-color-picker v-model="styleForm.bgColor" />
          </el-form-item>
          <el-form-item label="图标类名">
            <el-input v-model="styleForm.iconClass" placeholder="请输入图标类名" />
          </el-form-item>
          <el-form-item label="自定义图标">
            <el-input v-model="styleForm.icon" placeholder="请输入SVG图标路径或内容" />
          </el-form-item>
          <el-form-item label="API活动ID">
            <el-input v-model="styleForm.apiActivityId" placeholder="请输入API活动ID（用于接口调用）" />
          </el-form-item>
          <el-form-item label="HTML内容">
            <el-input 
              v-model="styleForm.htmlContent" 
              type="textarea" 
              :rows="8"
              placeholder="请输入HTML内容（仅对BPMN节点样式生效）" 
            />
          </el-form-item>
        </el-form>
      </div>

      <!-- 右侧预览区域 -->
      <div class="preview-section">
        <h3>预览效果</h3>
        <div class="preview-container">
          <!-- BPMN节点预览 -->
          <div class="bpmn-preview">
            <h4>BPMN节点样式（长宽比1.25）</h4>
            <div 
              class="bpmn-node-preview"
              :style="{
                backgroundColor: '#fff',
                border: '2px solid #ccc',
                borderRadius: '8px',
                margin: '10px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                width: '100px',
                height: '80px', // 长宽比1.25: 100/80 = 1.25
                minHeight: '60px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                fontFamily: 'Arial, sans-serif',
                fontSize: '12px',
                fontWeight: 'normal',
                color: '#333'
              }"
            >
              <!-- 如果有HTML内容，使用HTML渲染 -->
              <div 
                v-if="styleForm.htmlContent"
                class="bpmn-html-content"
                v-html="styleForm.htmlContent"
                :style="{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }"
              ></div>
              <!-- 否则使用默认样式 -->
              <div v-else class="bpmn-default-content">
                <div 
                  class="node-icon"
                  :style="{
                    color: '#333',
                    fontSize: '16px',
                    marginRight: '6px',
                    display: 'flex',
                    alignItems: 'center'
                  }"
                >
                  <i v-if="styleForm.iconClass" :class="styleForm.iconClass"></i>
                  <span v-else>📋</span>
                </div>
                <span class="node-text" style="font-size: 12px; font-weight: normal;">{{ styleForm.name || '任务名称' }}</span>
              </div>
            </div>
          </div>

          <!-- 菜单项预览 -->
          <div class="menu-preview">
            <h4>菜单项样式</h4>
            <div class="menu-item-preview">
              <div 
                class="menu-item"
                :style="{
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  margin: '4px 0',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  width: '300px',
                  height: '40px'
                }"
              >
                <div 
                  class="menu-icon"
                  :style="{
                    backgroundColor: styleForm.bgColor || '#f0f0f0',
                    color: styleForm.iconColor || '#333',
                    marginRight: '8px',
                    fontSize: '16px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }"
                >
                  <i v-if="styleForm.iconClass" :class="styleForm.iconClass"></i>
                  <span v-else>📋</span>
                </div>
                <span>{{ styleForm.name || '菜单项' }}</span>
              </div>
            </div>
          </div>

          <!-- 当前Activity信息 -->
          <div class="current-activity-info" v-if="currentActivityInfo">
            <h4>当前Activity信息</h4>
            <div class="activity-info-preview">
              <el-descriptions :column="1" border>
                <el-descriptions-item label="节点名称">{{ currentActivityInfo.name || '未设置' }}</el-descriptions-item>
                <el-descriptions-item label="节点类型">{{ currentActivityInfo.type || '未设置' }}</el-descriptions-item>
                <el-descriptions-item label="节点ID">{{ currentActivityInfo.id || '未设置' }}</el-descriptions-item>
                <el-descriptions-item label="API活动ID">{{ currentActivityInfo.apiActivityId || '未设置' }}</el-descriptions-item>
                <el-descriptions-item label="HTML内容长度">{{ styleForm.htmlContent ? styleForm.htmlContent.length : 0 }} 字符</el-descriptions-item>
              </el-descriptions>
            </div>
          </div>

          <!-- API数据预览 -->
          <div class="api-preview" v-if="apiData && showApiData">
            <h4>API数据预览</h4>
            <div class="api-data-preview">
              <el-tag v-for="(item, index) in apiData" :key="index" class="api-tag">
                {{ item.name }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button @click="handleLoadFromApi" :loading="loadingApi">从API加载</el-button>
        <el-button @click="toggleApiData">{{ showApiData ? '隐藏' : '显示' }}API数据</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, onMounted, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  element: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'save'])

const styleForm = reactive({
  name: '',
  type: 'bpmn:UserTask',
  iconColor: '#333',
  bgColor: '#fff',
  iconClass: 'bpmn-icon-user-task',
  icon: '',
  apiActivityId: '',
  htmlContent: '' // 新增HTML内容字段
})

const apiData = ref(null)
const loadingApi = ref(false)
const showApiData = ref(false)
const currentActivityInfo = ref(null)

// 获取API基础URL
const getApiBase = () => {
  return (typeof window !== 'undefined' && window.BPMN_API_BASE) || 
         (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BPMN_API_BASE) || ''
}

// 加载Activity的HTML内容
const loadActivityHtmlContent = async (apiActivityId) => {
  try {
    const base = getApiBase()
    const url = base + '/api/bpmn/activitiesStyle?id=' + encodeURIComponent(apiActivityId)
    console.log('[DiyStyleDialog] 加载Activity HTML内容:', url)
    
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      if (data.itemStyle && data.itemStyle.htmlContent) {
        // 更新_bpmnContentHtmlMap
        if (!window._bpmnContentHtmlMap) {
          window._bpmnContentHtmlMap = {};
        }
        window._bpmnContentHtmlMap[apiActivityId] = data.itemStyle.htmlContent;
        
        // 同时更新表单
        styleForm.htmlContent = data.itemStyle.htmlContent;
        
        console.log('[DiyStyleDialog] 加载到HTML内容并更新缓存:', data.itemStyle.htmlContent)
        ElMessage.success('已加载Activity的HTML内容')
      }
    }
  } catch (error) {
    console.error('[DiyStyleDialog] 加载Activity HTML内容失败:', error)
  }
}

// 从当前Activity获取样式信息
const getCurrentActivityStyle = (element) => {
  if (!element) return null
  
  const businessObject = element.businessObject
  if (!businessObject) return null
  
  // 获取基本信息
  const activityInfo = {
    id: element.id,
    name: businessObject.name || '',
    type: businessObject.$type || 'bpmn:UserTask',
    apiActivityId: ''
  }
  
  // 尝试从扩展属性获取样式信息
  if (businessObject.extensionElements && businessObject.extensionElements.values) {
    // 获取样式信息
    const styleDoc = businessObject.extensionElements.values.find(
      e => e.$type === 'bpmn:Documentation' && e.text && e.text.startsWith('style:')
    )
    if (styleDoc) {
      try {
        const styleData = JSON.parse(styleDoc.text.replace('style:', ''))
        // 合并样式数据到表单
        Object.assign(styleForm, {
          name: styleData.name || activityInfo.name,
          type: styleData.type || activityInfo.type,
          iconColor: styleData.iconColor || '#333',
          bgColor: styleData.bgColor || '#fff',
          iconClass: styleData.iconClass || 'bpmn-icon-user-task',
          icon: styleData.icon || '',
          apiActivityId: styleData.apiActivityId || '',
          htmlContent: styleData.htmlContent || ''
        })
        activityInfo.styles = styleData
        console.log('[DiyStyleDialog] 从扩展属性加载样式:', styleData)
      } catch (e) {
        console.warn('解析样式数据失败:', e)
      }
    }
    
    // 获取API活动ID
    const apiDoc = businessObject.extensionElements.values.find(
      e => e.$type === 'bpmn:Documentation' && e.text && e.text.startsWith('apiActivityId:')
    )
    if (apiDoc) {
      const apiActivityId = apiDoc.text.replace('apiActivityId:', '')
      styleForm.apiActivityId = apiActivityId
      activityInfo.apiActivityId = apiActivityId
      console.log('[DiyStyleDialog] 从扩展属性加载API活动ID:', apiActivityId)
      
      // 尝试从全局缓存获取HTML内容
      if (window._bpmnContentHtmlMap && window._bpmnContentHtmlMap[apiActivityId]) {
        styleForm.htmlContent = window._bpmnContentHtmlMap[apiActivityId]
        console.log('[DiyStyleDialog] 从全局缓存加载HTML内容:', styleForm.htmlContent)
      }
    }
  }
  
  // 如果没有保存的样式，根据Activity来源获取样式
  if (!activityInfo.styles) {
    // 如果有apiActivityId，说明是API获取的Activity，从API缓存获取样式
    if (activityInfo.apiActivityId) {
      console.log('[DiyStyleDialog] 检测到API Activity，尝试从API缓存获取样式:', activityInfo.apiActivityId)
      
      // 尝试从API缓存获取样式数据
      getApiStyleFromCache(activityInfo.apiActivityId).then(apiStyle => {
        if (apiStyle) {
          // 使用API样式数据
          Object.assign(styleForm, {
            name: apiStyle.name || activityInfo.name,
            type: apiStyle.type || activityInfo.type,
            iconColor: apiStyle.iconColor || '#333',
            bgColor: apiStyle.bgColor || '#fff',
            iconClass: apiStyle.iconClass || 'bpmn-icon-user-task',
            icon: apiStyle.icon || '',
            apiActivityId: activityInfo.apiActivityId,
            htmlContent: apiStyle.htmlContent || ''
          })
          activityInfo.styles = apiStyle
          console.log('[DiyStyleDialog] 从API缓存加载样式:', apiStyle)
        } else {
          // API缓存中没有数据，使用默认样式
          applyDefaultStyle(activityInfo)
        }
      }).catch(error => {
        console.error('[DiyStyleDialog] 从API缓存获取样式失败:', error)
        // 出错时使用默认样式
        applyDefaultStyle(activityInfo)
      })
    } else {
      // 默认Activity，使用默认样式
      applyDefaultStyle(activityInfo)
    }
  }
  
  return activityInfo
}

// 从API缓存获取样式数据
const getApiStyleFromCache = async (apiActivityId) => {
  try {
    // 首先尝试从预加载的缓存中获取数据
    if (window._bpmnMenuCache) {
      console.log('[DiyStyleDialog] 从预加载缓存获取样式数据');
      
      // 1. 先尝试从API样式数据中查找（通过code获取）
      if (window._bpmnMenuCache.apiStyles) {
        const apiItemStyle = window._bpmnMenuCache.apiStyles.find(item => item.code === apiActivityId);
        if (apiItemStyle && apiItemStyle.itemStyle) {
          console.log('[DiyStyleDialog] 从API缓存找到样式数据:', apiItemStyle);
          
          // 从_bpmnContentHtmlMap中获取htmlContent
          let htmlContent = '';
          if (window._bpmnContentHtmlMap && window._bpmnContentHtmlMap[apiActivityId]) {
            htmlContent = window._bpmnContentHtmlMap[apiActivityId];
            console.log('[DiyStyleDialog] 从_bpmnContentHtmlMap获取htmlContent:', htmlContent);
          } else {
            console.log('[DiyStyleDialog] _bpmnContentHtmlMap中没有找到htmlContent，尝试实时获取');
            // 如果_bpmnContentHtmlMap中没有，尝试实时获取
            const base = getApiBase();
            const url = base + '/api/bpmn/activitiesStyle?id=' + encodeURIComponent(apiActivityId);
            try {
              const res = await fetch(url);
              if (res.ok) {
                const data = await res.json();
                if (data && data.itemStyle && data.itemStyle.htmlContent) {
                  // 更新_bpmnContentHtmlMap
                  if (!window._bpmnContentHtmlMap) {
                    window._bpmnContentHtmlMap = {};
                  }
                  window._bpmnContentHtmlMap[apiActivityId] = data.itemStyle.htmlContent;
                  htmlContent = data.itemStyle.htmlContent;
                  console.log('[DiyStyleDialog] 实时获取并更新_bpmnContentHtmlMap:', htmlContent);
                }
              }
            } catch (error) {
              console.error('[DiyStyleDialog] 实时获取htmlContent失败:', error);
            }
          }
          
          return {
            name: apiItemStyle.itemStyle.name,
            type: apiItemStyle.itemStyle.type,
            iconColor: apiItemStyle.itemStyle.iconColor,
            bgColor: apiItemStyle.itemStyle.bgColor,
            iconClass: apiItemStyle.itemStyle.iconClass,
            icon: apiItemStyle.itemStyle.icon,
            htmlContent: htmlContent,
            apiActivityId: apiActivityId,
            source: 'api'
          }
        }
      }
      
      // 2. 如果API数据中没有找到，尝试从静态样式中查找（通过type获取）
      // 这里需要根据apiActivityId推断出对应的type
      // 通常API任务的type可以从API数据中获取，或者使用默认的UserTask类型
      const defaultType = 'bpmn:UserTask'; // 默认类型
      
      if (window._bpmnMenuCache.staticStyles && window._bpmnMenuCache.staticStyles[defaultType]) {
        const staticStyle = window._bpmnMenuCache.staticStyles[defaultType];
        console.log('[DiyStyleDialog] 从静态缓存找到样式数据:', staticStyle);
        return {
          name: staticStyle.name,
          type: staticStyle.type,
          iconColor: staticStyle.iconColor,
          bgColor: staticStyle.bgColor,
          iconClass: staticStyle.iconClass,
          icon: staticStyle.icon || '',
          htmlContent: '', // 静态数据通常没有HTML内容
          apiActivityId: apiActivityId,
          source: 'static'
        }
      }
    }
    
    // 如果缓存中没有数据，尝试实时获取（作为后备方案）
    console.log('[DiyStyleDialog] 缓存中没有数据，尝试实时获取:', apiActivityId);
    
    const base = getApiBase()
    const url = base + '/api/bpmn/activitiesStyle?id=' + encodeURIComponent(apiActivityId)
    console.log('[DiyStyleDialog] 实时获取样式数据:', url)
    
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      console.log('[DiyStyleDialog] 实时获取的样式数据:', data)
      
      // 根据apiActivityId查找对应的样式
      if (data && data.itemStyle) {
        // 同时更新缓存
        if (!window._bpmnMenuCache) {
          window._bpmnMenuCache = { 
            apiActivities: [], 
            staticActivities: [],
            apiStyles: [], 
            staticStyles: {} 
          };
        }
        
        // 检查是否已经缓存过该样式数据
        const existingStyle = window._bpmnMenuCache.apiStyles.find(item => item.code === apiActivityId);
        if (!existingStyle) {
          const styleData = {
            code: apiActivityId,
            name: data.itemStyle.name,
            type: data.itemStyle.type,
            itemStyle: {
              name: data.itemStyle.name,
              type: data.itemStyle.type,
              iconColor: data.itemStyle.iconColor || '',
              bgColor: data.itemStyle.bgColor || '',
              iconClass: data.itemStyle.iconClass || '',
              icon: data.itemStyle.icon || '',
              htmlContent: '' // 不在这里缓存htmlContent
            },
            source: 'api',
            key: apiActivityId
          };
          window._bpmnMenuCache.apiStyles.push(styleData);
          console.log('[DiyStyleDialog] 实时获取并缓存样式数据:', styleData);
        }
        
        // 更新_bpmnContentHtmlMap
        if (data.itemStyle.htmlContent) {
          if (!window._bpmnContentHtmlMap) {
            window._bpmnContentHtmlMap = {};
          }
          window._bpmnContentHtmlMap[apiActivityId] = data.itemStyle.htmlContent;
          console.log('[DiyStyleDialog] 更新_bpmnContentHtmlMap:', apiActivityId, data.itemStyle.htmlContent);
        }
        
        return {
          name: data.itemStyle.name,
          type: data.itemStyle.type,
          iconColor: data.itemStyle.iconColor,
          bgColor: data.itemStyle.bgColor,
          iconClass: data.itemStyle.iconClass,
          icon: data.itemStyle.icon,
          htmlContent: data.itemStyle.htmlContent,
          apiActivityId: apiActivityId,
          source: 'api'
        }
      }
    }
    return null
  } catch (error) {
    console.error('[DiyStyleDialog] 从API缓存获取样式失败:', error)
    return null
  }
}

// 默认样式数据常量
const DEFAULT_STYLES = {
  'bpmn:UserTask': {
    name: '用户任务',
    type: 'bpmn:UserTask',
    iconColor: '#1890ff',
    bgColor: '#f0f8ff',
    iconClass: 'bpmn-icon-user-task'
  },
  'bpmn:ServiceTask': {
    name: '服务任务',
    type: 'bpmn:ServiceTask',
    iconColor: '#52c41a',
    bgColor: '#f6ffed',
    iconClass: 'bpmn-icon-service'
  },
  'bpmn:SendTask': {
    name: '发送任务',
    type: 'bpmn:SendTask',
    iconColor: '#fa8c16',
    bgColor: '#fff7e6',
    iconClass: 'bpmn-icon-send'
  },
  'bpmn:ReceiveTask': {
    name: '接收任务',
    type: 'bpmn:ReceiveTask',
    iconColor: '#722ed1',
    bgColor: '#f9f0ff',
    iconClass: 'bpmn-icon-receive'
  },
  'bpmn:ManualTask': {
    name: '手工任务',
    type: 'bpmn:ManualTask',
    iconColor: '#eb2f96',
    bgColor: '#fff0f6',
    iconClass: 'bpmn-icon-manual'
  },
  'bpmn:BusinessRuleTask': {
    name: '业务规则任务',
    type: 'bpmn:BusinessRuleTask',
    iconColor: '#13c2c2',
    bgColor: '#e6fffb',
    iconClass: 'bpmn-icon-business-rule'
  },
  'bpmn:ScriptTask': {
    name: '脚本任务',
    type: 'bpmn:ScriptTask',
    iconColor: '#fa541c',
    bgColor: '#fff2e8',
    iconClass: 'bpmn-icon-script'
  },
  'bpmn:CallActivity': {
    name: '调用活动',
    type: 'bpmn:CallActivity',
    iconColor: '#2f54eb',
    bgColor: '#f0f5ff',
    iconClass: 'bpmn-icon-call-activity'
  },
  'bpmn:SubProcess': {
    name: '子流程',
    type: 'bpmn:SubProcess',
    iconColor: '#faad14',
    bgColor: '#fffbe6',
    iconClass: 'bpmn-icon-subprocess'
  }
};

// 应用默认样式
const applyDefaultStyle = (activityInfo) => {
  // 优先从缓存中获取静态样式
  if (window._bpmnMenuCache && window._bpmnMenuCache.staticStyles) {
    const staticStyle = window._bpmnMenuCache.staticStyles[activityInfo.type];
    if (staticStyle) {
      console.log('[DiyStyleDialog] 从缓存获取静态样式:', staticStyle);
      Object.assign(styleForm, {
        name: activityInfo.name || staticStyle.name,
        type: staticStyle.type,
        iconColor: staticStyle.iconColor,
        bgColor: staticStyle.bgColor,
        iconClass: staticStyle.iconClass,
        icon: staticStyle.icon || '',
        htmlContent: '' // 静态数据通常没有HTML内容
      });
      activityInfo.styles = staticStyle;
      return;
    }
  }
  
  // 如果缓存中没有数据，使用硬编码的默认样式
  console.log('[DiyStyleDialog] 使用硬编码默认样式');
  
  const defaultStyle = DEFAULT_STYLES[activityInfo.type] || DEFAULT_STYLES['bpmn:UserTask'];
  Object.assign(styleForm, defaultStyle);
  activityInfo.styles = defaultStyle;
  console.log('[DiyStyleDialog] 使用硬编码默认样式:', defaultStyle);
}

// 从API加载样式数据
const loadFromApi = async () => {
  try {
    loadingApi.value = true
    const base = getApiBase()
    const url = base + '/api/bpmn/activitiesStyle'
    console.log('[DiyStyleDialog] 加载API数据:', url)
    
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`API请求失败: ${res.status}`)
    }
    
    const data = await res.json()
    console.log('[DiyStyleDialog] API数据:', data)
    apiData.value = data
    
    // 如果当前元素有apiActivityId，尝试加载对应的样式
    if (styleForm.apiActivityId) {
      const itemStyle = data.find(item => item.code === styleForm.apiActivityId)
      if (itemStyle && itemStyle.itemStyle) {
        Object.assign(styleForm, itemStyle.itemStyle)
        ElMessage.success('已从API加载样式数据')
      }
    }
  } catch (error) {
    console.error('[DiyStyleDialog] 加载API数据失败:', error)
    ElMessage.error('加载API数据失败')
  } finally {
    loadingApi.value = false
  }
}

// 保存样式到API
const saveToApi = async (styleData) => {
  try {
    const base = getApiBase()
    const url = base + '/api/bpmn/activitiesStyle'
    
    const payload = {
      code: styleForm.apiActivityId || `diy_${Date.now()}`,
      name: styleForm.name,
      type: styleForm.type,
      itemStyle: {
        name: styleForm.name,
        type: styleForm.type,
        iconColor: styleForm.iconColor,
        bgColor: styleForm.bgColor,
        iconClass: styleForm.iconClass,
        icon: styleForm.icon,
        htmlContent: styleForm.htmlContent // 包含HTML内容
      }
    }
    
    console.log('[DiyStyleDialog] 保存到API:', url, payload)
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    if (!res.ok) {
      throw new Error(`保存失败: ${res.status}`)
    }
    
    const result = await res.json()
    console.log('[DiyStyleDialog] 保存结果:', result)
    return result
  } catch (error) {
    console.error('[DiyStyleDialog] 保存到API失败:', error)
    throw error
  }
}

// 监听visible变化，初始化表单
watch(() => props.visible, (newVal) => {
  if (newVal && props.element) {
    console.log('[DiyStyleDialog] 初始化表单，当前元素:', props.element)
    
    // 重置表单数据，确保每次打开都是干净的状态
    Object.assign(styleForm, {
      name: '',
      type: 'bpmn:UserTask',
      iconColor: '#333',
      bgColor: '#fff',
      iconClass: 'bpmn-icon-user-task',
      icon: '',
      apiActivityId: '',
      htmlContent: ''
    })
    
    // 从当前Activity获取样式信息
    currentActivityInfo.value = getCurrentActivityStyle(props.element)
    
    // 强制更新表单显示
    nextTick(() => {
      console.log('[DiyStyleDialog] 表单数据已更新:', {
        name: styleForm.name,
        type: styleForm.type,
        iconColor: styleForm.iconColor,
        bgColor: styleForm.bgColor,
        iconClass: styleForm.iconClass,
        apiActivityId: styleForm.apiActivityId,
        htmlContent: styleForm.htmlContent,
        htmlContentLength: styleForm.htmlContent ? styleForm.htmlContent.length : 0
      })
    })
    
    // 不自动加载API数据，只显示当前Activity的信息
    showApiData.value = false
  }
}, { immediate: true })

const handleClose = () => {
  emit('update:visible', false)
}

const handleLoadFromApi = () => {
  loadFromApi()
}

const toggleApiData = () => {
  showApiData.value = !showApiData.value
  if (showApiData.value && !apiData.value) {
    loadFromApi()
  }
}

const handleSave = async () => {
  try {
    // 构建样式数据
    const styleData = {
      name: styleForm.name,
      type: styleForm.type,
      iconColor: styleForm.iconColor,
      bgColor: styleForm.bgColor,
      iconClass: styleForm.iconClass,
      icon: styleForm.icon,
      apiActivityId: styleForm.apiActivityId,
      htmlContent: styleForm.htmlContent // 包含HTML内容
    }

    // 保存到当前元素
    if (props.element) {
      const modeling = window._debugModeler?.get('modeling')
      const moddle = window._debugModeler?.get('moddle')
      
      if (modeling && moddle) {
        // 更新元素属性
        modeling.updateProperties(props.element, {
          name: styleForm.name
        })

        // 保存样式到扩展属性
        let extensionElements = props.element.businessObject.extensionElements
        if (!extensionElements) {
          extensionElements = moddle.create('bpmn:ExtensionElements', { values: [] })
          props.element.businessObject.extensionElements = extensionElements
        }

        // 删除旧的样式属性
        extensionElements.values = extensionElements.values.filter(
          e => !(e.$type === 'bpmn:Documentation' && e.text && e.text.startsWith('style:'))
        )

        // 添加新的样式属性
        const styleDoc = moddle.create('bpmn:Documentation', {
          text: 'style:' + JSON.stringify(styleData)
        })
        extensionElements.get('values').push(styleDoc)

        // 如果有apiActivityId，也保存到扩展属性
        if (styleForm.apiActivityId) {
          // 删除旧的apiActivityId属性
          extensionElements.values = extensionElements.values.filter(
            e => !(e.$type === 'bpmn:Documentation' && e.text && e.text.startsWith('apiActivityId:'))
          )
          
          // 添加新的apiActivityId属性
          const apiDoc = moddle.create('bpmn:Documentation', {
            text: 'apiActivityId:' + styleForm.apiActivityId
          })
          extensionElements.get('values').push(apiDoc)
          
          // 更新全局缓存
          if (!window._bpmnContentHtmlMap) {
            window._bpmnContentHtmlMap = {}
          }
          if (styleForm.htmlContent) {
            window._bpmnContentHtmlMap[styleForm.apiActivityId] = styleForm.htmlContent
            console.log('[DiyStyleDialog] 更新全局缓存:', styleForm.apiActivityId, styleForm.htmlContent)
          }
        }

        // 强制更新
        modeling.updateProperties(props.element, { extensionElements })
        
        console.log('[DiyStyleDialog] 样式已保存到本地元素:', styleData)
      }
    }

    // 尝试保存到API
    if (styleForm.apiActivityId) {
      try {
        await saveToApi(styleData)
        ElMessage.success('样式已保存到本地和API')
      } catch (error) {
        ElMessage.warning('样式已保存到本地，但API保存失败')
      }
    } else {
      ElMessage.success('样式已保存到本地')
    }

    emit('save', styleData)
    handleClose()
  } catch (error) {
    console.error('保存样式失败:', error)
    ElMessage.error('保存失败')
  }
}

onMounted(() => {
  // 组件挂载时不自动加载API数据
  console.log('[DiyStyleDialog] 组件挂载完成')
})
</script>

<style scoped>
.diy-style-container {
  display: flex;
  gap: 20px;
  min-height: 400px;
}

.edit-section {
  flex: 1;
  padding: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.preview-section {
  flex: 1;
  padding: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.preview-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.bpmn-preview, .menu-preview, .api-preview, .current-activity-info {
  flex: 1;
}

.bpmn-node-preview {
  transition: all 0.3s ease;
}

.bpmn-html-content {
  overflow: hidden;
}

.bpmn-default-content {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.menu-item-preview {
  max-height: 200px;
  overflow-y: auto;
}

.menu-item {
  transition: all 0.3s ease;
}

.menu-item:hover {
  background-color: #f5f7fa !important;
}

.node-icon, .menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.node-text {
  font-size: 14px;
  font-weight: 500;
}

.api-data-preview {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 10px;
  background-color: #fafafa;
}

.activity-info-preview {
  max-height: 200px;
  overflow-y: auto;
}

.api-tag {
  margin: 2px;
}

h3, h4 {
  margin: 0 0 15px 0;
  color: #303133;
}

h4 {
  font-size: 14px;
  color: #606266;
}
</style> 
