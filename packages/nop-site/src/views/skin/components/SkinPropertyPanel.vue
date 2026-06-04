<template>
  <div class="skin-property-panel">
    <!-- Header -->
    <div class="panel-header">
      <template v-if="panelMode === 'element'">
        <div class="element-header">
          <span class="element-id">{{ selectedElementId }}</span>
          <a-tag size="small" type="info" >{{ elementTypeLabel }}</a-tag>
          <a-button size="small" text @click="$emit('select-element', null)">
            返回全局
          </a-button>
        </div>
      </template>
      <template v-else>
        <span class="panel-title">皮肤设置</span>
      </template>
    </div>

    <!-- ======== Element Mode ======== -->
    <div v-if="panelMode === 'element'" class="panel-body">
      <a-form label-width="80px" size="small" label-position="left">

        <!-- 主题色 -->
        <a-form-item label="主题色">
          <div class="color-row">
            <ColorPicker
              :value="elementAccentColor"
              @update:value="setElementAccent($event)"
              :predefine="PREDEFINE_COLORS"
              size="small"
            />
            <a-button size="small" @click="clearElementAccent" v-if="elementAccentColor">清除</a-button>
          </div>
        </a-form-item>

        <!-- 状态覆盖 -->
        <div class="section-title">状态覆盖</div>
        <div class="state-override-list">
          <div v-for="st in STATE_DEFS" :key="st.key" class="state-override-item">
            <div class="state-override-header" @click="toggleOverrideState(st.key)">
              <span class="state-dot" :style="{ background: paletteColor(st.key) }"></span>
              <span class="state-label">{{ st.label }}</span>
              <a-tag v-if="hasStateOverride(st.key)" size="small" type="warning" >已覆盖</a-tag>
              <a-tag v-else size="small" type="info" >继承全局</a-tag>
              <span class="expand-icon">{{ expandedOverrideStates.includes(st.key) ? '▼' : '▶' }}</span>
            </div>
            <div v-if="expandedOverrideStates.includes(st.key)" class="state-override-body">
              <a-form label-width="70px" size="small">
                <a-form-item label="边框粗">
                  <a-input-number
                    :value="getOverrideStateProp(st.key, 'strokeWidth', 2)"
                    @update:value="setOverrideStateProp(st.key, 'strokeWidth', $event)"
                    :min="0" :max="10" size="small" style="width:80px"
                  />
                </a-form-item>
                <a-form-item label="透明度">
                  <a-slider
                    :value="getOverrideStateProp(st.key, 'opacity', 1)"
                    @update:value="setOverrideStateProp(st.key, 'opacity', $event)"
                    :min="0" :max="1" :step="0.05" style="width:120px"
                  />
                  <span class="value-hint">{{ getOverrideStateProp(st.key, 'opacity', 1) }}</span>
                </a-form-item>
                <a-form-item label="圆角">
                  <a-input-number
                    :value="getOverrideStateProp(st.key, 'borderRadius', 4)"
                    @update:value="setOverrideStateProp(st.key, 'borderRadius', $event)"
                    :min="0" :max="30" size="small" style="width:80px"
                  />
                </a-form-item>
                <a-form-item label="虚线">
                  <a-select
                    :value="getOverrideStateProp(st.key, 'strokeDashstyle', 'solid')"
                    @update:value="setOverrideStateProp(st.key, 'strokeDashstyle', $event)"
                    style="width:90px"
                  >
                    <a-select-option label="实线" value="solid" />
                    <a-select-option label="虚线" value="dashed" />
                    <a-select-option label="点线" value="dotted" />
                  </a-select>
                </a-form-item>
                <a-divider orientation="left">特效</a-divider>
                <a-form-item label="脉冲">
                  <a-switch
                    :value="getOverrideStateProp(st.key, 'pulsing', false)"
                    @update:value="setOverrideStateProp(st.key, 'pulsing', $event)"
                  />
                </a-form-item>
                <a-form-item label="边框特效">
                  <div class="border-effect-row">
                    <a-select
                      :value="getOverrideBorderEffectType(st.key)"
                      @update:value="setOverrideBorderEffectType(st.key, $event)"
                      style="width:90px"
                    >
                      <a-select-option v-for="o in BORDER_EFFECT_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                    </a-select>
                    <template v-if="getOverrideBorderEffectType(st.key)">
                      <ColorPicker
                        :value="getOverrideBorderEffectProp(st.key, 'color', '#1890ff')"
                        @update:value="setOverrideBorderEffectProp(st.key, 'color', $event)"
                        size="small"
                      />
                      <a-input-number
                        :value="getOverrideBorderEffectProp(st.key, 'speed', 800)"
                        @update:value="setOverrideBorderEffectProp(st.key, 'speed', $event)"
                        :min="200" :max="3000" :step="100" size="small" style="width:70px"
                      />
                      <span class="value-hint">ms</span>
                    </template>
                  </div>
                </a-form-item>
              </a-form>
              <a-button size="small" @click="clearOverrideState(st.key)" class="clear-override-btn">
                清除此状态覆盖
              </a-button>
            </div>
          </div>
        </div>

        <!-- 挂件列表 -->
        <div class="section-title">
          挂件
          <a-button size="small" type="primary" link @click="addWidget">+ 添加</a-button>
        </div>
        <div v-if="elementWidgets.length === 0" class="empty-hint">暂无挂件，点击上方添加</div>
        <div v-for="(w, idx) in elementWidgets" :key="idx" class="widget-item">
          <div class="widget-header" @click="toggleWidgetExpand(idx)">
            <span class="widget-type-badge">{{ getWidgetIcon(w.type) }} {{ widgetTypeLabel(w.type) }}</span>
            <span class="widget-pos">{{ w.anchor }}</span>
            <span class="expand-icon">{{ expandedWidgets.includes(idx) ? '▼' : '▶' }}</span>
            <a-button size="small" text type="danger" @click.stop="removeWidget(idx)">✕</a-button>
          </div>
          <div v-if="expandedWidgets.includes(idx)" class="widget-body">
            <a-form label-width="70px" size="small">
              <a-form-item label="类型">
                <a-select v-model:checked="w.type" style="width:110px">
                  <a-select-option v-for="o in WIDGET_TYPE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                </a-select>
              </a-form-item>
              <a-form-item label="锚点">
                <a-select v-model:checked="w.anchor" style="width:110px">
                  <a-select-option v-for="o in ANCHOR_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                </a-select>
              </a-form-item>
              <a-form-item label="挂载层">
                <a-radio-group v-model:checked="w.layer">
                  <a-radio value="overlay">节点上层</a-radio>
                  <a-radio value="inner">节点内部</a-radio>
                </a-radio-group>
              </a-form-item>
              <a-form-item label="透明度">
                <a-slider v-model:checked="w.opacity" :min="0" :max="1" :step="0.05" style="width:160px" />
                <span class="value-hint">{{ w.opacity }}</span>
              </a-form-item>

              <a-divider orientation="left">可见性</a-divider>
              <a-form-item label="修饰键">
                <a-select v-model:checked="w.visibility.modifier" style="width:110px" clearable placeholder="始终显示">
                  <a-select-option label="Ctrl按下时" value="ctrl" />
                  <a-select-option label="Shift按下时" value="shift" />
                  <a-select-option label="Alt按下时" value="alt" />
                </a-select>
              </a-form-item>

              <a-divider orientation="left">类型配置</a-divider>
              <!-- badge -->
              <template v-if="w.type === 'badge'">
                <a-form-item label="文本">
                  <a-input v-model:checked="w.config.text" placeholder="如: {{count}}" size="small" />
                </a-form-item>
                <a-form-item label="颜色">
                  <ColorPicker v-model="w.config.color" size="small" />
                </a-form-item>
              </template>
              <!-- label -->
              <template v-else-if="w.type === 'label'">
                <a-form-item label="文本">
                  <a-input v-model:checked="w.config.text" placeholder="标签文字" size="small" />
                </a-form-item>
                <a-form-item label="链接">
                  <a-input v-model:checked="w.config.link" placeholder="点击跳转URL" size="small" />
                </a-form-item>
              </template>
              <!-- rich-text -->
              <template v-else-if="w.type === 'rich-text'">
                <a-form-item label="内容">
                  <a-input v-model:checked="w.config.html" type="textarea" :rows="3" placeholder="HTML内容" size="small" />
                </a-form-item>
              </template>
              <!-- image -->
              <template v-else-if="w.type === 'image'">
                <a-form-item label="图片URL">
                  <a-input v-model:checked="w.config.src" placeholder="https://..." size="small" />
                </a-form-item>
                <a-form-item label="尺寸">
                  <a-input-number v-model:checked="w.config.width" :min="16" :max="200" size="small" style="width:80px" />
                  <span style="margin:0 4px">×</span>
                  <a-input-number v-model:checked="w.config.height" :min="16" :max="200" size="small" style="width:80px" />
                </a-form-item>
              </template>
              <!-- status-dot -->
              <template v-else-if="w.type === 'status-dot'">
                <a-form-item label="直径">
                  <a-input-number v-model:checked="w.config.size" :min="6" :max="24" size="small" style="width:80px" />
                </a-form-item>
              </template>
              <!-- timer -->
              <template v-else-if="w.type === 'timer'">
                <a-form-item label="格式">
                  <a-select v-model:checked="w.config.format" style="width:110px">
                    <a-select-option label="mm:ss" value="mm:ss" />
                    <a-select-option label="hh:mm:ss" value="hh:mm:ss" />
                    <a-select-option label="已用时间" value="elapsed" />
                  </a-select>
                </a-form-item>
              </template>
            </a-form>
          </div>
        </div>

        <!-- 删除覆盖 -->
        <div v-if="hasElementOverride" class="element-actions">
          <a-button size="small" type="danger" plain @click="removeElementOverride">
            删除此节点覆盖
          </a-button>
        </div>
      </a-form>
    </div>

    <!-- ======== Global Mode ======== -->
    <div v-else class="panel-body">
      <a-tabs v-model:activeKey="globalTab" tab-position="top" class="global-tabs">
        <!-- 基本信息 -->
        <a-tab-pane tab="基本信息" name="basic">
          <a-form label-width="100px" label-position="right" size="small">
            <a-form-item label="皮肤编码">
              <a-input v-model:checked="form.templateCode" placeholder="唯一编码" />
            </a-form-item>
            <a-form-item label="皮肤名称">
              <a-input v-model:checked="form.templateName" placeholder="如: 审批流蓝色主题" />
            </a-form-item>
            <a-form-item label="分类">
              <a-select v-model:checked="form.category" clearable style="width:120px">
                <a-select-option label="基础" value="basic" />
                <a-select-option label="审批" value="approval" />
                <a-select-option label="警告" value="warning" />
                <a-select-option label="自定义" value="custom" />
              </a-select>
            </a-form-item>
            <a-form-item label="适用节点">
              <a-select v-model:checked="form.bpmnBaseType" style="width:140px">
                <a-select-option label="全部任务" value="bpmn:Task" />
                <a-select-option label="用户任务" value="bpmn:UserTask" />
                <a-select-option label="服务任务" value="bpmn:ServiceTask" />
                <a-select-option label="开始事件" value="bpmn:StartEvent" />
                <a-select-option label="结束事件" value="bpmn:EndEvent" />
              </a-select>
            </a-form-item>
            <a-form-item label="状态">
              <a-select v-model:checked="form.status" style="width:100px">
                <a-select-option label="草稿" value="draft" />
                <a-select-option label="已启用" value="enabled" />
                <a-select-option label="已禁用" value="disabled" />
              </a-select>
            </a-form-item>
          </a-form>
        </a-tab-pane>

        <!-- 调色板 -->
        <a-tab-pane tab="调色板" name="palette">
          <div class="section-title">状态色板</div>
          <div v-for="item in PALETTE_ITEMS" :key="item.key" class="color-row">
            <span class="color-label">{{ item.label }}</span>
            <ColorPicker
              :value="skinJson.variables.palette[item.key]"
              @update:value="setPaletteColor(item.key, $event)"
              :predefine="PREDEFINE_COLORS"
              size="small"
            />
            <span class="color-hex">{{ skinJson.variables.palette[item.key] }}</span>
          </div>
          <a-divider />
          <div class="section-title">语义色（运行时一致性）</div>
          <div class="color-row">
            <span class="color-label">Error 失败</span>
            <ColorPicker
              :value="semanticColor('error')"
              @update:value="setSemanticColor('error', $event)"
              :predefine="PREDEFINE_COLORS" size="small"
            />
            <span class="color-hex">{{ semanticColor('error') }}</span>
          </div>
          <div class="color-row">
            <span class="color-label">Success 成功</span>
            <ColorPicker
              :value="semanticColor('success')"
              @update:value="setSemanticColor('success', $event)"
              :predefine="PREDEFINE_COLORS" size="small"
            />
            <span class="color-hex">{{ semanticColor('success') }}</span>
          </div>
          <div class="color-row">
            <span class="color-label">Running 运行</span>
            <ColorPicker
              :value="semanticColor('running')"
              @update:value="setSemanticColor('running', $event)"
              :predefine="PREDEFINE_COLORS" size="small"
            />
            <span class="color-hex">{{ semanticColor('running') }}</span>
          </div>
          <div class="color-row">
            <span class="color-label">Warning 警告</span>
            <ColorPicker
              :value="semanticColor('warning')"
              @update:value="setSemanticColor('warning', $event)"
              :predefine="PREDEFINE_COLORS" size="small"
            />
            <span class="color-hex">{{ semanticColor('warning') }}</span>
          </div>
        </a-tab-pane>

        <!-- 状态样式 -->
        <a-tab-pane tab="状态样式" name="states">
          <a-collapse v-model:activeKey="expandedGlobalState" accordion>
            <a-collapse-item v-for="st in STATE_DEFS" :key="st.key" :name="st.key">
              <template #title>
                <span :style="{ color: paletteColor(st.key), fontWeight: 600 }">{{ st.label }}</span>
              </template>
              <a-form label-width="80px" size="small">
                <a-form-item label="边框粗">
                  <a-input-number
                    :value="getGlobalStateProp(st.key, 'strokeWidth', 2)"
                    @update:value="setGlobalStateProp(st.key, 'strokeWidth', $event)"
                    :min="0" :max="10" size="small" style="width:100px"
                  />
                </a-form-item>
                <a-form-item label="透明度">
                  <a-slider
                    :value="getGlobalStateProp(st.key, 'opacity', 1)"
                    @update:value="setGlobalStateProp(st.key, 'opacity', $event)"
                    :min="0" :max="1" :step="0.05" style="width:160px"
                  />
                  <span class="value-hint">{{ getGlobalStateProp(st.key, 'opacity', 1) }}</span>
                </a-form-item>
                <a-form-item label="圆角">
                  <a-input-number
                    :value="getGlobalStateProp(st.key, 'borderRadius', 4)"
                    @update:value="setGlobalStateProp(st.key, 'borderRadius', $event)"
                    :min="0" :max="30" size="small" style="width:100px"
                  />
                </a-form-item>
                <a-form-item label="边框">
                  <a-select
                    :value="getGlobalStateProp(st.key, 'strokeDashstyle', 'solid')"
                    @update:value="setGlobalStateProp(st.key, 'strokeDashstyle', $event)"
                    style="width:100px"
                  >
                    <a-select-option label="实线" value="solid" />
                    <a-select-option label="虚线" value="dashed" />
                    <a-select-option label="点线" value="dotted" />
                  </a-select>
                </a-form-item>
                <a-form-item label="文字色">
                  <ColorPicker
                    :value="getGlobalStateProp(st.key, 'textColor', '#ffffff')"
                    @update:value="setGlobalStateProp(st.key, 'textColor', $event)"
                    :predefine="PREDEFINE_COLORS" size="small"
                  />
                </a-form-item>
                <a-divider orientation="left">特效</a-divider>
                <a-form-item label="脉冲">
                  <a-switch
                    :value="getGlobalStateProp(st.key, 'pulsing', false)"
                    @update:value="setGlobalStateProp(st.key, 'pulsing', $event)"
                  />
                </a-form-item>
                <a-form-item label="跑马灯">
                  <a-switch
                    :value="getGlobalStateProp(st.key, 'marquee', false)"
                    @update:value="setGlobalStateProp(st.key, 'marquee', $event)"
                  />
                </a-form-item>
                <a-form-item label="边框特效">
                  <div class="border-effect-row">
                    <a-select
                      :value="getGlobalBorderEffectType(st.key)"
                      @update:value="setGlobalBorderEffectType(st.key, $event)"
                      style="width:100px"
                    >
                      <a-select-option v-for="o in BORDER_EFFECT_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                    </a-select>
                    <template v-if="getGlobalBorderEffectType(st.key)">
                      <ColorPicker
                        :value="getGlobalBorderEffectProp(st.key, 'color', paletteColor(st.key))"
                        @update:value="setGlobalBorderEffectProp(st.key, 'color', $event)"
                        size="small"
                      />
                      <a-input-number
                        :value="getGlobalBorderEffectProp(st.key, 'speed', 800)"
                        @update:value="setGlobalBorderEffectProp(st.key, 'speed', $event)"
                        :min="200" :max="3000" :step="100" size="small" style="width:70px"
                      />
                      <span class="value-hint">ms</span>
                    </template>
                  </div>
                </a-form-item>
                <a-form-item label="阴影">
                  <a-switch
                    :value="isShadowEnabled(st.key)"
                    @update:value="toggleShadow(st.key, $event)"
                  />
                </a-form-item>
                <template v-if="isShadowEnabled(st.key)">
                  <a-form-item label="颜色">
                    <ColorPicker
                      :value="getShadowProp(st.key, 'color', '#000000')"
                      @update:value="setShadowProp(st.key, 'color', $event)"
                      :predefine="PREDEFINE_COLORS" size="small"
                    />
                  </a-form-item>
                  <a-form-item label="模糊">
                    <a-input-number
                      :value="getShadowProp(st.key, 'blur', 4)"
                      @update:value="setShadowProp(st.key, 'blur', $event)"
                      :min="0" :max="20" size="small" style="width:80px"
                    />
                  </a-form-item>
                  <a-form-item label="偏移">
                    <a-input-number
                      :value="getShadowProp(st.key, 'offsetX', 2)"
                      @update:value="setShadowProp(st.key, 'offsetX', $event)"
                      :min="-10" :max="10" size="small" style="width:70px"
                    />
                    <span style="margin:0 4px">×</span>
                    <a-input-number
                      :value="getShadowProp(st.key, 'offsetY', 2)"
                      @update:value="setShadowProp(st.key, 'offsetY', $event)"
                      :min="-10" :max="10" size="small" style="width:70px"
                    />
                  </a-form-item>
                </template>
              </a-form>
            </a-collapse-item>
          </a-collapse>
        </a-tab-pane>

        <!-- 进度条 -->
        <a-tab-pane tab="进度条" name="progress">
          <a-form label-width="80px" size="small">
            <a-form-item label="显示">
              <a-switch v-model:checked="skinJson.progress.show" />
            </a-form-item>
            <a-form-item label="位置">
              <a-select v-model:checked="skinJson.progress.position" style="width:90px">
                <a-select-option label="底部" value="bottom" />
                <a-select-option label="顶部" value="top" />
              </a-select>
            </a-form-item>
            <a-form-item label="高度">
              <a-input-number v-model:checked="skinJson.progress.height" :min="1" :max="20" size="small" style="width:80px" />
            </a-form-item>
            <a-form-item label="条颜色">
              <ColorPicker v-model="skinJson.progress.colors.bar" :predefine="PREDEFINE_COLORS" size="small" />
            </a-form-item>
            <a-form-item label="轨颜色">
              <ColorPicker v-model="skinJson.progress.colors.trail" :predefine="PREDEFINE_COLORS" size="small" />
            </a-form-item>
            <a-form-item label="X偏移">
              <a-input-number v-model:checked="skinJson.progress.offsetX" :min="-50" :max="50" size="small" style="width:80px" />
            </a-form-item>
            <a-form-item label="Y偏移">
              <a-input-number v-model:checked="skinJson.progress.offsetY" :min="-50" :max="50" size="small" style="width:80px" />
            </a-form-item>
          </a-form>
        </a-tab-pane>

        <!-- 画布挂件 -->
        <a-tab-pane tab="画布挂件" name="decorations">
          <div v-if="decorations.length === 0" class="empty-hint">暂无画布挂件</div>
          <div v-for="(dec, idx) in decorations" :key="dec.id" class="decoration-item-panel">
            <div class="decoration-header">
              <span class="decoration-type-tag">{{ dec.type }}</span>
              <span class="decoration-coords">({{ dec.x }}, {{ dec.y }})</span>
              <div style="flex:1" />
              <a-button size="small" text @click="toggleDecLock(idx)">
                {{ dec.locked ? '🔒' : '🔓' }}
              </a-button>
              <a-button size="small" text type="danger" @click="removeDecoration(idx)">✕</a-button>
            </div>
            <div class="decoration-body">
              <a-form label-width="60px" size="small">
                <a-form-item label="类型">
                  <a-select v-model:checked="dec.type" style="width:120px">
                    <a-select-option v-for="o in CANVAS_DECORATION_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                  </a-select>
                </a-form-item>
                <a-form-item label="位置 X">
                  <a-input-number v-model:checked="dec.x" :min="0" :max="2000" size="small" style="width:100px" />
                </a-form-item>
                <a-form-item label="位置 Y">
                  <a-input-number v-model:checked="dec.y" :min="0" :max="2000" size="small" style="width:100px" />
                </a-form-item>
                <a-form-item label="宽">
                  <a-input-number v-model:checked="dec.width" :min="20" :max="800" size="small" style="width:100px" :disabled="dec.type==='image' && !dec.config.src" />
                </a-form-item>
                <a-form-item label="高">
                  <a-input-number v-model:checked="dec.height" :min="20" :max="600" size="small" style="width:100px" />
                </a-form-item>
                <a-form-item label="层级">
                  <a-input-number v-model:checked="dec.zIndex" :min="1" :max="100" size="small" style="width:80px" />
                </a-form-item>
                <a-form-item label="透明度">
                  <a-slider v-model:checked="dec.opacity" :min="0" :max="1" :step="0.05" style="width:160px" />
                </a-form-item>
                <a-form-item label="锁定">
                  <a-switch v-model:checked="dec.locked" />
                </a-form-item>
                <!-- 类型特定配置 -->
                <template v-if="dec.type === 'image'">
                  <a-form-item label="URL">
                    <a-input v-model:checked="dec.config.src" placeholder="图片URL" size="small" />
                  </a-form-item>
                </template>
                <template v-else-if="dec.type === 'iframe'">
                  <a-form-item label="URL">
                    <a-input v-model:checked="dec.config.url" placeholder="https://..." size="small" />
                  </a-form-item>
                </template>
                <template v-else-if="dec.type === 'web-component'">
                  <a-form-item label="标签名">
                    <a-input v-model:checked="dec.config.tag" placeholder="如 my-weather" size="small" />
                  </a-form-item>
                </template>
                <template v-else-if="dec.type === 'html'">
                  <a-form-item label="HTML">
                    <a-input v-model:checked="dec.config.content" type="textarea" :rows="2" size="small" />
                  </a-form-item>
                </template>
              </a-form>
            </div>
          </div>
          <a-button size="small" class="add-btn" @click="addDecoration">+ 添加画布挂件</a-button>
        </a-tab-pane>

        <!-- 高级 JSON -->
        <a-tab-pane tab="高级" name="advanced">
          <a-alert type="warning" :closable="false" show-icon title="编辑原始 JSON" description="此处修改直接覆盖全部皮肤定义" />
          <div class="advanced-actions">
            <a-button size="small" @click="syncFormToJson">同步到 JSON</a-button>
            <a-button size="small" @click="syncJsonToForm">应用到表单</a-button>
          </div>
          <a-input v-model:checked="jsonString" type="textarea" :rows="12" class="json-editor"
            placeholder="Delta V2 格式皮肤定义 JSON..." />
        </a-tab-pane>
      </a-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject, reactive } from 'vue'
import ColorPicker from '/@/components/ColorPicker/index.vue'
import type {
  SkinJson, SkinForm, StateKey, WidgetConfig, CanvasDecoration,
  BorderEffect, StateStyle, ShadowConfig, CanvasDecorationType,
} from '../types'
import {
  STATE_DEFS, PALETTE_ITEMS, PREDEFINE_COLORS,
  WIDGET_TYPE_OPTIONS, ANCHOR_OPTIONS, LAYER_OPTIONS,
  BORDER_EFFECT_OPTIONS, CANVAS_DECORATION_OPTIONS,
  DEFAULT_SKIN_JSON,
} from '../types'

// ===== Props & Emits =====
const props = defineProps<{
  skinJson: SkinJson
  selectedElementId: string | null
}>()

interface EmitEvents {
  (e: 'select-element', id: string | null): void
  (e: 'update:skin-json', val: SkinJson): void
}
const emit = defineEmits<EmitEvents>()

// ===== App State (provided from parent) =====
interface AppState {
  form: SkinForm
  previewState: StateKey
}
const appState = inject<AppState>('skinDesignerState')
const form = computed(() => appState?.form || {
  templateCode: '', templateName: '', category: '', bpmnBaseType: 'bpmn:UserTask',
  status: 'draft', thumbnail: '', skinJson: DEFAULT_SKIN_JSON,
})

const $preview = inject('$preview', { refresh: () => {} })

// ===== 面板状态 =====
const globalTab = ref('basic')
const expandedGlobalState = ref('activated')
const expandedOverrideStates = ref<string[]>([])
const expandedWidgets = ref<number[]>([])
const jsonString = ref('')

// ===== 面板模式 =====
const elementTypeLabel = computed(() => {
  const id = props.selectedElementId
  if (!id) return ''
  const elTypes: Record<string, string> = {
    StartEvent_1: '开始事件', UserTask_1: '用户任务', UserTask_2: '用户任务',
    Gateway_1: '排他网关', ServiceTask_1: '服务任务', EndEvent_1: '结束事件',
  }
  return elTypes[id] || '节点'
})

const panelMode = computed(() => {
  return props.selectedElementId ? 'element' : 'global'
})

// ===== 元素覆盖读写 =====

const elementOverride = computed(() => {
  const id = props.selectedElementId
  if (!id) return null
  if (!props.skinJson.elementOverrides) return null
  return props.skinJson.elementOverrides[id] || null
})

const hasElementOverride = computed(() => elementOverride.value !== null)

function ensureElementOverride(): void {
  const id = props.selectedElementId
  if (!id) return
  if (!props.skinJson.elementOverrides) {
    (props.skinJson as any).elementOverrides = {}
  }
  if (!props.skinJson.elementOverrides![id]) {
    props.skinJson.elementOverrides![id] = {
      elementId: id,
      states: {},
      widgets: [],
    }
  }
}

const elementAccentColor = computed(() => elementOverride.value?.accentColor || '')

function setElementAccent(color: string | null): void {
  if (!color || !props.selectedElementId) return
  ensureElementOverride()
  const id = props.selectedElementId
  props.skinJson.elementOverrides![id].accentColor = color
  $preview.refresh()
}

function clearElementAccent(): void {
  const id = props.selectedElementId
  if (!id || !props.skinJson.elementOverrides?.[id]) return
  delete props.skinJson.elementOverrides[id].accentColor
  $preview.refresh()
}

// 状态覆盖
function hasStateOverride(key: StateKey): boolean {
  return elementOverride.value?.states?.[key] !== undefined
    && Object.keys(elementOverride.value.states[key] || {}).length > 0
}

function toggleOverrideState(key: StateKey): void {
  const idx = expandedOverrideStates.value.indexOf(key)
  if (idx >= 0) {
    expandedOverrideStates.value.splice(idx, 1)
  } else {
    expandedOverrideStates.value = [key]
  }
}

function getOverrideStateProp(key: StateKey, prop: string, def: any): any {
  const v = elementOverride.value?.states?.[key]?.[prop as keyof StateStyle]
  return v !== undefined ? v : def
}

function setOverrideStateProp(key: StateKey, prop: string, val: any): void {
  if (!props.selectedElementId) return
  ensureElementOverride()
  const id = props.selectedElementId
  if (!props.skinJson.elementOverrides![id].states) {
    props.skinJson.elementOverrides![id].states = {}
  }
  if (!props.skinJson.elementOverrides![id].states![key]) {
    (props.skinJson.elementOverrides![id].states as any)![key] = {}
  }
  (props.skinJson.elementOverrides![id].states as any)![key][prop] = val
  $preview.refresh()
}

function clearOverrideState(key: StateKey): void {
  const id = props.selectedElementId
  if (!id || !props.skinJson.elementOverrides?.[id]) return
  if (props.skinJson.elementOverrides[id].states) {
    delete (props.skinJson.elementOverrides[id].states as any)[key]
  }
  const idx = expandedOverrideStates.value.indexOf(key)
  if (idx >= 0) expandedOverrideStates.value.splice(idx, 1)
  $preview.refresh()
}

function getOverrideBorderEffectType(key: StateKey): string {
  const be = elementOverride.value?.states?.[key]?.borderEffect
  return be?.type || ''
}

function setOverrideBorderEffectType(key: StateKey, type: string): void {
  if (!type) {
    setOverrideStateProp(key, 'borderEffect', undefined)
    return
  }
  const existing = elementOverride.value?.states?.[key]?.borderEffect || {}
  setOverrideStateProp(key, 'borderEffect', {
    type,
    color: (existing as any).color || '#1890ff',
    speed: (existing as any).speed || 800,
  })
}

function getOverrideBorderEffectProp(key: StateKey, prop: string, def: any): any {
  return (elementOverride.value?.states?.[key]?.borderEffect as any)?.[prop] ?? def
}

function setOverrideBorderEffectProp(key: StateKey, prop: string, val: any): void {
  const be = elementOverride.value?.states?.[key]?.borderEffect || { type: 'marquee' }
  ;(be as any)[prop] = val
  setOverrideStateProp(key, 'borderEffect', be)
}

// 挂件
const elementWidgets = computed(() => {
  if (!props.selectedElementId) return []
  const oe = props.skinJson.elementOverrides?.[props.selectedElementId]
  return oe?.widgets || []
})

function addWidget(): void {
  if (!props.selectedElementId) return
  ensureElementOverride()
  const id = props.selectedElementId
  if (!props.skinJson.elementOverrides![id].widgets) {
    props.skinJson.elementOverrides![id].widgets = []
  }
  const newWidget: WidgetConfig = {
    type: 'badge',
    config: { text: '{{value}}', color: '#ff4d4f' },
    anchor: 'top-right',
    widgetAnchor: 'top-right',
    layer: 'overlay',
    placement: 'outside',
    opacity: 0.9,
    visibility: { modifier: 'none' },
  }
  props.skinJson.elementOverrides![id].widgets!.push(newWidget)
  expandedWidgets.value = [props.skinJson.elementOverrides![id].widgets!.length - 1]
  $preview.refresh()
}

function removeWidget(idx: number): void {
  const id = props.selectedElementId
  if (!id || !props.skinJson.elementOverrides?.[id]?.widgets) return
  props.skinJson.elementOverrides[id].widgets!.splice(idx, 1)
  const ei = expandedWidgets.value.indexOf(idx)
  if (ei >= 0) expandedWidgets.value.splice(ei, 1)
  $preview.refresh()
}

function toggleWidgetExpand(idx: number): void {
  const i = expandedWidgets.value.indexOf(idx)
  if (i >= 0) expandedWidgets.value.splice(i, 1)
  else expandedWidgets.value.push(idx)
}

function removeElementOverride(): void {
  const id = props.selectedElementId
  if (!id || !props.skinJson.elementOverrides) return
  delete props.skinJson.elementOverrides[id]
  $preview.refresh()
}

// ===== 全局设置读写 =====

function paletteColor(key: StateKey): string {
  return props.skinJson.variables.palette[key] || '#1890ff'
}

function setPaletteColor(key: StateKey, color: string): void {
  props.skinJson.variables.palette[key] = color
  $preview.refresh()
}

function semanticColor(key: string): string {
  return (props.skinJson.variables.semantic as any)?.[key] || PREDEFINE_COLORS[0]
}

function setSemanticColor(key: string, color: string): void {
  if (!props.skinJson.variables.semantic) {
    (props.skinJson.variables as any).semantic = {}
  }
  (props.skinJson.variables.semantic as any)[key] = color
  $preview.refresh()
}

function getGlobalStateProp(key: StateKey, prop: string, def: any): any {
  const v = props.skinJson.states?.[key]?.[prop as keyof StateStyle]
  return v !== undefined ? v : def
}

function setGlobalStateProp(key: StateKey, prop: string, val: any): void {
  if (!props.skinJson.states) (props.skinJson as any).states = {}
  if (!props.skinJson.states[key]) (props.skinJson.states as any)[key] = {}
  ;(props.skinJson.states[key] as any)[prop] = val
  $preview.refresh()
}

function getGlobalBorderEffectType(key: StateKey): string {
  return props.skinJson.states?.[key]?.borderEffect?.type || ''
}

function setGlobalBorderEffectType(key: StateKey, type: string): void {
  if (!type) {
    setGlobalStateProp(key, 'borderEffect', undefined)
    return
  }
  setGlobalStateProp(key, 'borderEffect', {
    type,
    color: props.skinJson.variables.palette[key] || '#1890ff',
    speed: 800,
  } as BorderEffect)
}

function getGlobalBorderEffectProp(key: StateKey, prop: string, def: any): any {
  return (props.skinJson.states?.[key]?.borderEffect as any)?.[prop] ?? def
}

function setGlobalBorderEffectProp(key: StateKey, prop: string, val: any): void {
  const be = props.skinJson.states?.[key]?.borderEffect || { type: 'marquee' }
  ;(be as any)[prop] = val
  setGlobalStateProp(key, 'borderEffect', be)
}

function isShadowEnabled(key: StateKey): boolean {
  const v = props.skinJson.states?.[key]?.shadow
  return v !== false && v !== undefined
}

function toggleShadow(key: StateKey, on: boolean): void {
  if (on) {
    setGlobalStateProp(key, 'shadow', { color: '#000000', blur: 4, offsetX: 2, offsetY: 2 } as ShadowConfig)
  } else {
    setGlobalStateProp(key, 'shadow', false)
  }
}

function getShadowProp(key: StateKey, prop: string, def: any): any {
  const shadow = props.skinJson.states?.[key]?.shadow
  if (!shadow || typeof shadow !== 'object' || shadow === false) return def
  return (shadow as any)[prop] ?? def
}

function setShadowProp(key: StateKey, prop: string, val: any): void {
  const shadow = props.skinJson.states?.[key]?.shadow
  if (!shadow || typeof shadow !== 'object') {
    setGlobalStateProp(key, 'shadow', { color: '#000000', blur: 4, offsetX: 2, offsetY: 2 })
    return
  }
  ;(shadow as any)[prop] = val
}

// ===== 画布挂件 =====

const decorations = computed({
  get: () => props.skinJson.canvasDecorations || [],
  set: (val) => { (props.skinJson as any).canvasDecorations = val },
})

function addDecoration(): void {
  if (!props.skinJson.canvasDecorations) {
    (props.skinJson as any).canvasDecorations = []
  }
  const newDec: CanvasDecoration = {
    id: `dec_${Date.now()}`,
    type: 'image',
    config: {},
    x: 100,
    y: 100,
    width: 120,
    height: 80,
    zIndex: 1,
    locked: false,
    opacity: 1,
  }
  props.skinJson.canvasDecorations!.push(newDec)
  $preview.refresh()
}

function removeDecoration(idx: number): void {
  props.skinJson.canvasDecorations?.splice(idx, 1)
  $preview.refresh()
}

function toggleDecLock(idx: number): void {
  const d = props.skinJson.canvasDecorations?.[idx]
  if (d) d.locked = !d.locked
}

// ===== 高级 JSON =====

function syncFormToJson(): void {
  jsonString.value = JSON.stringify(props.skinJson, null, 2)
}

function syncJsonToForm(): void {
  try {
    const parsed = JSON.parse(jsonString.value)
    Object.assign(props.skinJson, parsed)
    $preview.refresh()
  } catch {
    // silent
  }
}

// ===== 辅助 =====

function getWidgetIcon(type: string): string {
  const icons: Record<string, string> = {
    badge: 'Ⓑ', label: 'Ⓕ', 'rich-text': 'Ⓡ',
    image: '🖼', 'status-dot': '●', progress: '▤', timer: '⏱',
  }
  return icons[type] || '◈'
}

function widgetTypeLabel(type: string): string {
  const found = WIDGET_TYPE_OPTIONS.find(o => o.value === type)
  return found?.label || type
}

// ===== 初始化 JSON 同步 =====
watch(() => props.skinJson, () => {
  jsonString.value = JSON.stringify(props.skinJson, null, 2)
}, { deep: true, immediate: true })

// ===== 初始化现有挂件的默认字段 =====
watch(() => props.selectedElementId, () => {
  const id = props.selectedElementId
  if (!id) return
  const oe = props.skinJson.elementOverrides?.[id]
  if (!oe?.widgets) return
  for (const w of oe.widgets) {
    if (!w.visibility) w.visibility = { modifier: 'none' }
    if (!w.layer) w.layer = 'overlay'
    if (w.opacity === undefined) w.opacity = 0.9
    if (!w.config) w.config = {}
    if (!w.anchor) w.anchor = 'top-right'
  }
}, { immediate: true })
</script>

<style scoped>
.skin-property-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  padding: 10px 14px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
  flex-shrink: 0;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
}

.element-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.element-id {
  font-size: 13px;
  font-weight: 600;
  color: #1890ff;
  font-family: monospace;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
}

/* ===== Global tabs ===== */
.global-tabs :deep(.el-tabs__nav) {
  flex-wrap: nowrap;
}
.global-tabs :deep(.el-tabs__item) {
  font-size: 12px;
  padding: 0 10px;
}

/* ===== Sections ===== */
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  padding: 8px 0 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
}

/* ===== Color rows ===== */
.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.color-label {
  font-size: 12px;
  color: #555;
  min-width: 100px;
}

.color-hex {
  font-size: 11px;
  color: #999;
  font-family: monospace;
}

/* ===== State overrides ===== */
.state-override-list {
  margin-bottom: 12px;
}

.state-override-item {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  margin-bottom: 6px;
  overflow: hidden;
}

.state-override-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
  background: #fafafa;
  transition: background 0.15s;
}

.state-override-header:hover {
  background: #f0f5ff;
}

.state-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.state-label {
  font-size: 12px;
  font-weight: 500;
  flex: 1;
}

.state-override-body {
  padding: 10px;
  border-top: 1px solid #f0f0f0;
}

.expand-icon {
  font-size: 10px;
  color: #999;
}

.clear-override-btn {
  margin-top: 6px;
}

/* ===== Widgets ===== */
.widget-item {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  margin-bottom: 6px;
  overflow: hidden;
}

.widget-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  cursor: pointer;
  background: #fafafa;
}

.widget-header:hover {
  background: #f0f5ff;
}

.widget-type-badge {
  font-size: 11px;
  background: #e6f7ff;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 500;
}

.widget-pos {
  font-size: 11px;
  color: #999;
  flex: 1;
}

.widget-body {
  padding: 10px;
  border-top: 1px solid #f0f0f0;
}

/* ===== Decorations ===== */
.decoration-item-panel {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  margin-bottom: 8px;
  overflow: hidden;
}

.decoration-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #fafafa;
}

.decoration-type-tag {
  font-size: 10px;
  background: #f6ffed;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 500;
  color: #52c41a;
}

.decoration-coords {
  font-size: 11px;
  color: #999;
  font-family: monospace;
}

.decoration-body {
  padding: 8px 10px;
  border-top: 1px solid #f0f0f0;
}

.add-btn {
  margin-top: 8px;
  width: 100%;
}

/* ===== Misc ===== */
.empty-hint {
  font-size: 12px;
  color: #bbb;
  text-align: center;
  padding: 20px 0;
}

.value-hint {
  margin-left: 8px;
  font-size: 11px;
  color: #999;
  font-family: monospace;
}

.border-effect-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

/* ===== Advanced ===== */
.advanced-actions {
  display: flex;
  gap: 8px;
  margin: 8px 0;
}

.json-editor {
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
}

/* ===== Element actions ===== */
.element-actions {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
</style>
