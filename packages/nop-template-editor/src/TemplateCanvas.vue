<template>
  <div ref="editorRootRef" class="template-editor">
    <div class="canvas-toolbar">
      <div class="toolbar-main">
        <div class="toolbar-group">
        <button
          class="tool-btn"
          :disabled="undoStack.length === 0"
          title="撤销 Ctrl/Cmd+Z"
          @click="undo"
        >
          <span v-html="BTN_ICONS.undo"></span>
        </button>
        <button
          class="tool-btn"
          :disabled="redoStack.length === 0"
          title="重做 Ctrl/Cmd+Shift+Z"
          @click="redo"
        >
          <span v-html="BTN_ICONS.redo"></span>
        </button>
        <button
          class="tool-btn"
          :disabled="selectedElements.length === 0"
          title="复制 Ctrl/Cmd+D"
          @click="duplicateSelected"
        >
          <span v-html="BTN_ICONS.duplicate"></span>
        </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
          <button class="tool-btn icon-only" @click="toggleOrientation" :title="isLandscape ? '切换为纵向' : '切换为横向'">
            <span v-html="isLandscape ? BTN_ICONS.orientationLandscape : BTN_ICONS.orientation"></span>
          </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
        <button
          class="tool-btn icon-only"
          :disabled="scale <= MIN_SCALE"
          title="缩小"
          @click="zoomOut"
        >
          <span v-html="BTN_ICONS.zoomOut"></span>
        </button>
        <span class="zoom-label">{{ zoomPercent }}</span>
        <button
          class="tool-btn icon-only"
          :disabled="scale >= MAX_SCALE"
          title="放大"
          @click="zoomIn"
        >
          <span v-html="BTN_ICONS.zoomIn"></span>
        </button>
        <button
          class="tool-btn icon-only"
          :disabled="scale === 1"
          title="100%"
          @click="setScale(1)"
        >
          <span v-html="BTN_ICONS.zoomReset"></span>
        </button>
        <button
          class="tool-btn icon-only"
          title="适应视口"
          @click="fitToViewport"
        >
          <span v-html="BTN_ICONS.fit"></span>
        </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
        <button
          class="tool-btn icon-only"
          :title="guidesVisible ? '隐藏参考线' : '显示参考线'"
          @click="toggleGuidesVisible"
        >
          <span v-html="guidesVisible ? BTN_ICONS.guidesOn : BTN_ICONS.guidesOff"></span>
        </button>
        <button
          class="tool-btn icon-only"
          :disabled="guides.length === 0"
          title="清除参考线"
          @click="clearGuides"
        >
          <span v-html="BTN_ICONS.clearGuides"></span>
        </button>
        </div>

        <div class="toolbar-group toolbar-region-switch">
          <label class="toolbar-check">
            <input
              type="checkbox"
              :checked="showRegions"
              @change="showRegions = checked($event)"
            />
            <span>显示区域</span>
          </label>
        </div>

        <div class="toolbar-group edge-warning-group">
        <button
          class="tool-btn icon-only"
          :title="edgeWarningEnabled ? '关闭边缘提醒' : '开启边缘提醒'"
          @click="edgeWarningEnabled = !edgeWarningEnabled"
        >
          <span v-html="edgeWarningEnabled ? BTN_ICONS.edgeWarnOn : BTN_ICONS.edgeWarnOff"></span>
        </button>
        <input
          v-if="edgeWarningEnabled"
          class="toolbar-input-small"
          type="number"
          min="1"
          max="100"
          :value="edgeWarningDistance"
          @input="edgeWarningDistance = intNum($event, 20)"
          title="边缘提醒距离"
        />
        <select v-if="edgeWarningEnabled" class="toolbar-select-small" v-model="edgeWarningUnit" title="单位">
          <option value="px">px</option>
          <option value="mm">mm</option>
          <option value="%">%</option>
        </select>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
        <button
          class="tool-btn icon-only"
          :disabled="selectedElements.length < 2"
          title="左对齐"
          @click="alignSelected('left')"
        >
          <span v-html="BTN_ICONS.alignLeft"></span>
        </button>
        <button
          class="tool-btn icon-only"
          :disabled="selectedElements.length < 2"
          title="水平居中"
          @click="alignSelected('center')"
        >
          <span v-html="BTN_ICONS.alignCenter"></span>
        </button>
        <button
          class="tool-btn icon-only"
          :disabled="selectedElements.length < 2"
          title="右对齐"
          @click="alignSelected('right')"
        >
          <span v-html="BTN_ICONS.alignRight"></span>
        </button>
        <button
          class="tool-btn icon-only"
          :disabled="selectedElements.length < 2"
          title="顶对齐"
          @click="alignSelected('top')"
        >
          <span v-html="BTN_ICONS.alignTop"></span>
        </button>
        <button
          class="tool-btn icon-only"
          :disabled="selectedElements.length < 2"
          title="垂直居中"
          @click="alignSelected('middle')"
        >
          <span v-html="BTN_ICONS.alignMiddle"></span>
        </button>
        <button
          class="tool-btn icon-only"
          :disabled="selectedElements.length < 2"
          title="底对齐"
          @click="alignSelected('bottom')"
        >
          <span v-html="BTN_ICONS.alignBottom"></span>
        </button>
        </div>

        <div class="toolbar-group">
        <button
          class="tool-btn icon-only"
          :disabled="selectedElements.length < 3"
          title="水平分布"
          @click="distributeSelected('horizontal')"
        >
          <span v-html="BTN_ICONS.distributeHorizontal"></span>
        </button>
        <button
          class="tool-btn icon-only"
          :disabled="selectedElements.length < 3"
          title="垂直分布"
          @click="distributeSelected('vertical')"
        >
          <span v-html="BTN_ICONS.distributeVertical"></span>
        </button>
        <button
          class="tool-btn icon-only"
          :disabled="selectedElements.length < 2"
          title="成组"
          @click="groupSelected"
        >
          <span v-html="BTN_ICONS.group"></span>
        </button>
        <button
          class="tool-btn icon-only"
          :disabled="!hasGroupedSelection"
          title="解组"
          @click="ungroupSelected"
        >
          <span v-html="BTN_ICONS.ungroup"></span>
        </button>
        </div>

        <div class="toolbar-separator"></div>

        <div class="toolbar-group">
        <button
          class="tool-btn primary icon-only"
          title="保存 Ctrl/Cmd+S"
          @click="onSave"
        >
          <span v-html="BTN_ICONS.save"></span>
        </button>
        <button class="tool-btn icon-only" title="预览" @click="onPreview">
          <span v-html="BTN_ICONS.preview"></span>
        </button>
        <button
          class="tool-btn icon-only"
          :disabled="elements.length === 0"
          title="导出 JSON"
          @click="exportJson"
        >
          <span v-html="BTN_ICONS.export"></span>
        </button>
        </div>
      </div>

      <div class="toolbar-meta">
        <div class="toolbar-page-switcher">
          <div class="toolbar-page-dropdown" :class="{ open: pageDropdownOpen }">
            <button
              class="toolbar-page-name-btn"
              title="切换页面"
              @click="togglePageDropdown"
            >
              <span class="page-dropdown-label">{{ currentPageLabel }}</span>
              <span class="page-dropdown-arrow">&#9662;</span>
            </button>
            <div v-if="pageDropdownOpen" class="page-dropdown-menu" @click.stop>
              <input
                ref="pageSearchInputRef"
                v-model="pageSearchQuery"
                class="page-dropdown-search"
                placeholder="搜索页面..."
                @keydown.esc="closePageDropdown"
              />
              <div class="page-dropdown-list">
                <button
                  v-for="item in filteredPages"
                  :key="item.page.id"
                  class="page-dropdown-item"
                  :class="{ active: item.idx === currentPageIdx }"
                  @click="selectPage(item.idx)"
                >
                  <span class="page-dropdown-idx">{{ item.idx + 1 }}</span>
                  <template v-if="renamingPageIdx === item.idx">
                    <input
                      ref="pageNameInputRef"
                      v-model="pageNameDraft"
                      class="page-dropdown-rename-input"
                      @blur="commitRenamePage"
                      @keydown.enter.prevent="commitRenamePage"
                      @keydown.esc.prevent="cancelRenamePage"
                      @click.stop
                    />
                  </template>
                  <template v-else>
                    <span class="page-dropdown-label">{{ item.page.name || `第${item.idx + 1}页` }}</span>
                    <button
                      class="page-dropdown-rename-btn"
                      title="重命名"
                      @click.stop="beginRenamePage(item.idx)"
                    >&#9998;</button>
                  </template>
                </button>
              </div>
              <div v-if="filteredPages.length === 0" class="page-dropdown-empty">
                无匹配页面
              </div>
            </div>
          </div>
          <!-- 点击外部关闭 -->
          <div v-if="pageDropdownOpen" class="page-dropdown-backdrop" @click="closePageDropdown"></div>
        </div>
        <div class="toolbar-page-actions">
          <button class="tool-btn icon-only" title="新增页" @click="addPage">
            <span>+</span>
          </button>
          <button
            class="tool-btn icon-only"
            :disabled="pages.length <= 1"
            title="删除当前页"
            @click="removePage(currentPageIdx)"
          >
            <span>−</span>
          </button>
          <span class="toolbar-page-count">{{ pageCountLabel }}</span>
        </div>
      </div>
    </div>

    <div class="canvas-body" :class="{ 'inspector-collapsed': inspectorCollapsed }">
      <aside class="left-sidebar">
        <div class="sidebar-header">
          <div class="sidebar-title">元素栏</div>
          <div class="sidebar-subtitle">拖拽或点击添加</div>
        </div>

        <button
          v-for="item in elementTypes"
          :key="item.type"
          class="sidebar-item"
          :title="item.label"
          draggable="true"
          @dragstart="onSidebarDragStart(item.type, $event)"
          @click="addElement(item.type)"
        >
          <span class="sidebar-icon" v-html="item.icon"></span>
          <span class="sidebar-label">{{ item.label }}</span>
        </button>
      </aside>

      <div class="canvas-workspace" :class="{ 'has-inspector': !inspectorCollapsed }">
        <div
          ref="viewportRef"
          class="canvas-viewport"
          @dragover.prevent
          @drop="onDropToCanvas"
        >
          <div class="canvas-board" :style="boardStyle">
            <button class="ruler-corner ruler-unit-btn" @click="cycleRulerUnit">
              <span>{{ rulerUnitLabel }}</span>
            </button>

            <div class="ruler ruler-top" @mousedown="startGuideCreationFromRuler('y', $event)">
              <div
                v-for="mark in horizontalRulerMarks"
                :key="mark.key"
                class="ruler-mark"
                :class="{ major: mark.major }"
                :style="{ left: mark.position + 'px' }"
              >
                <span v-if="mark.label">{{ mark.label }}</span>
              </div>
              <div
                v-if="guidesVisible"
                v-for="guide in verticalGuides"
                :key="guide.id"
                class="ruler-guide-marker"
                :style="{ left: guide.position * scale + 'px' }"
              ></div>
            </div>

            <div class="ruler ruler-left" @mousedown="startGuideCreationFromRuler('x', $event)">
              <div
                v-for="mark in verticalRulerMarks"
                :key="mark.key"
                class="ruler-mark vertical"
                :class="{ major: mark.major }"
                :style="{ top: mark.position + 'px' }"
              >
                <span v-if="mark.label">{{ mark.label }}</span>
              </div>
              <div
                v-if="guidesVisible"
                v-for="guide in horizontalGuides"
                :key="guide.id"
                class="ruler-guide-marker vertical"
                :style="{ top: guide.position * scale + 'px' }"
              ></div>
            </div>

            <div class="canvas-scale-shell" :style="canvasShellStyle">
              <div
                ref="canvasRef"
                class="canvas-container"
                :style="canvasStyle"
                @mousedown="onCanvasPointerDown"
              >
                <div class="canvas-paper"></div>
                <div class="bleed-guides" v-if="showBleedGuides">
                  <div class="trim-line" :style="trimLineStyle"></div>
                  <div class="bleed-line" :style="bleedLineStyle"></div>
                </div>
                <div class="qr-markers" v-if="showQrMarkers">
                  <div class="qr-corner" :style="qrMarkerStyle('tl')"></div>
                  <div class="qr-corner" :style="qrMarkerStyle('tr')"></div>
                  <div class="qr-corner" :style="qrMarkerStyle('bl')"></div>
                  <div class="qr-corner" :style="qrMarkerStyle('br')"></div>
                </div>
                <div
                  v-if="selectionBox"
                  class="selection-box"
                  :style="selectionBoxStyle"
                ></div>
                <!-- 边缘红光提醒：支持多个边缘同时显示 -->
                <div
                  v-if="edgeDangerSide && edgeDangerSide.includes('top')"
                  class="canvas-edge-glow top active"
                ></div>
                <div
                  v-if="edgeDangerSide && edgeDangerSide.includes('bottom')"
                  class="canvas-edge-glow bottom active"
                ></div>
                <div
                  v-if="edgeDangerSide && edgeDangerSide.includes('left')"
                  class="canvas-edge-glow left active"
                ></div>
                <div
                  v-if="edgeDangerSide && edgeDangerSide.includes('right')"
                  class="canvas-edge-glow right active"
                ></div>
                <div
                  v-if="guidesVisible"
                  v-for="guide in guides"
                  :key="guide.id"
                  class="canvas-guide"
                  :class="{
                    vertical: guide.axis === 'x',
                    horizontal: guide.axis === 'y',
                    active: activeGuideId === guide.id
                  }"
                  :style="guideStyle(guide)"
                  @mousedown.stop="startGuideDrag(guide, $event)"
                ></div>
                <div
                  v-if="draftGuide && guidesVisible"
                  class="canvas-guide draft"
                  :class="{
                    vertical: draftGuide.axis === 'x',
                    horizontal: draftGuide.axis === 'y'
                  }"
                  :style="guideStyle(draftGuide)"
                ></div>
                <div
                  v-if="guideSnapIndicator && guidesVisible"
                  class="canvas-guide snap-indicator"
                  :class="guideSnapIndicator.axis === 'x' ? 'vertical' : 'horizontal'"
                  :style="guideStyle(guideSnapIndicator)"
                ></div>

                <div
                  v-for="el in canvasRenderableElements"
                  :key="el.id"
                  class="template-element"
                  :class="{
                    selected: selectedIds.includes(el.id),
                    primary: selectedId === el.id,
                    locked: !!el.locked,
                    hidden: el.visible === false,
                    'is-text-editing': editingTextElementId === el.id,
                    'edge-danger': edgeDangerSide !== null
                  }"
                  :data-element-id="el.id"
                  :style="elementStyle(el)"
                  @mousedown.stop="selectElementFromPointer(el.id, $event)"
                >
                  <span
                    v-if="selectedIds.includes(el.id)"
                    class="selection-badge"
                    :class="{ primary: selectedId === el.id }"
                  ></span>

                  <div class="element-content">
                    <template v-if="el.type === 'text'">
                      <!-- 文字环绕容器 -->
                      <div class="text-content-area text-wrap-container" :style="getTextWrapStyle(el)">
                        <!-- 为每个挖空创建浮动占位元素，实现文字环绕 -->
                        <!-- CSS shape-outside 要求：浮动元素必须在文本内容之前 -->
                        <template v-for="(co, idx) in el.cutouts || []" :key="'float-' + idx">
                          <div
                            class="cutout-float-shape"
                            :style="cutoutFloatStyle(el, co)"
                          ></div>
                          <!-- 如果需要清除浮动（挖空不在同一行），添加清除元素 -->
                          <div 
                            v-if="shouldClearFloat(el.cutouts || [], idx)"
                            class="clear-float"
                          ></div>
                        </template>
                        <InlineTextEditor
                          v-model="el.content"
                          :element-style="{
                            fontSize: el.fontSize,
                            fontFamily: el.fontFamily,
                            color: el.color,
                            textAlign: el.textAlign,
                            lineHeight: el.lineHeight,
                            letterSpacing: el.letterSpacing
                          }"
                          @edit-start="onTextEditorStart(el)"
                          @edit-finish="onTextEditorFinish(el)"
                          @edit-cancel="onTextEditorCancel(el)"
                        />
                      </div>
                      <div
                        v-if="selectedIds.includes(el.id) && el.type === 'text' && !el.locked && editingTextElementId !== el.id"
                        class="cutout-overlay"
                        @mousedown="onCutoutOverlayMouseDown"
                      >
                        <!-- 挖空形状列表 -->
                        <template v-for="co in el.cutouts || []" :key="co.id">
                          <div
                            class="cutout-shape"
                            :class="{
                              'cutout-selected': selectedCutoutId === co.id
                            }"
                            :style="cutoutStyle(co)"
                            @mousedown="onCutoutMouseDown(co.id, $event)"
                          >
                            <svg class="cutout-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                              <path :d="cutoutSvgPath(co)" class="cutout-shape-fill" />
                              <path :d="cutoutSvgPath(co)" class="cutout-shape-stroke" />
                            </svg>
                            <!-- 删除按钮（选中时显示，和文本元素一致） -->
                            <button
                              v-if="selectedCutoutId === co.id"
                              class="element-delete-btn"
                              title="删除"
                              @click.stop="deleteCutout(el, co.id)"
                            >×</button>
                            <!-- 缩放手柄（放在内部，和文本元素一致） -->
                            <template v-if="selectedCutoutId === co.id">
                              <div class="resize-handle handle-nw" @mousedown.stop="startCutoutResize(el, co, 'nw', $event)"></div>
                              <div class="resize-handle handle-n" @mousedown.stop="startCutoutResize(el, co, 'n', $event)"></div>
                              <div class="resize-handle handle-ne" @mousedown.stop="startCutoutResize(el, co, 'ne', $event)"></div>
                              <div class="resize-handle handle-w" @mousedown.stop="startCutoutResize(el, co, 'w', $event)"></div>
                              <div class="resize-handle handle-e" @mousedown.stop="startCutoutResize(el, co, 'e', $event)"></div>
                              <div class="resize-handle handle-sw" @mousedown.stop="startCutoutResize(el, co, 'sw', $event)"></div>
                              <div class="resize-handle handle-s" @mousedown.stop="startCutoutResize(el, co, 's', $event)"></div>
                              <div class="resize-handle handle-se" @mousedown.stop="startCutoutResize(el, co, 'se', $event)"></div>
                            </template>
                          </div>
                        </template>
                        <!-- 添加挖空按钮 -->
                        <div class="cutout-add-bar">
                          <div class="cutout-add-icon" title="添加矩形挖空" @click.stop="addCutout(el, 'rect')">
                            <svg viewBox="0 0 24 24" width="20" height="20">
                              <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 2"/>
                              <line x1="12" y1="8" x2="12" y2="16" stroke="#ef4444" stroke-width="1.5"/>
                              <line x1="8" y1="12" x2="16" y2="12" stroke="#ef4444" stroke-width="1.5"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </template>

                    <template v-else-if="el.type === 'watermark'">
                      <div class="watermark-element">
                        <div class="watermark-grid" :style="watermarkGridStyle(el)">
                          <div
                            v-for="tile in watermarkTiles(el)"
                            :key="`${el.id}_wm_${tile}`"
                            class="watermark-tile"
                            :style="watermarkTileStyle(el)"
                            v-html="el.content || '水印'"
                          ></div>
                        </div>
                      </div>
                    </template>

                    <template v-else-if="el.type === 'prefill'">
                      <div class="prefill-element" :style="textContentStyle(el)">
                        <span class="prefill-label">{{ el.label || '字段' }}：</span>
                        <span class="prefill-expr">{{ el.expr || '${field}' }}</span>
                      </div>
                    </template>

                    <template v-else-if="el.type === 'signature' || el.type === 'stamp'">
                      <div
                        class="handwrite-element"
                        :class="el.type"
                        :style="handwriteStyle(el)"
                      >
                        <span class="handwrite-label">
                          {{ el.placeholder || el.label || typeLabel(el.type) }}
                        </span>
                      </div>
                    </template>

                    <template v-else-if="el.type === 'table'">
                      <div class="table-element" :class="{ 'table-element--dynamic': isDynamicTable(el) }">
                        <div v-if="isDynamicTable(el)" class="table-dynamic-badge">动态高度</div>
                        <table>
                          <thead v-if="tableShowHeader(el)">
                            <tr>
                              <th
                                v-for="col in el.columns || []"
                                :key="col.field"
                                :style="tableHeaderCellStyle(el, col)"
                              >
                                {{ col.header }}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="rowIndex in tablePreviewRows(el)" :key="`row_${rowIndex}`">
                              <td
                                v-for="col in el.columns || []"
                                :key="`${col.field}_${rowIndex}`"
                                class="virtual-cell"
                                :style="tableBodyCellStyle(el, col)"
                              >
                                {{ tablePreviewText(col, rowIndex) }}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </template>

                    <template v-else-if="el.type === 'image'">
                      <div class="image-element">
                        <img
                          :src="el.src || EMPTY_IMAGE"
                          :alt="el.label"
                          :style="imageStyle(el)"
                        />
                      </div>
                    </template>

                    <template v-else-if="el.type === 'divider'">
                      <div class="divider-element"></div>
                    </template>

                    <template v-else-if="el.type === 'shape'">
                      <div class="shape-element" :style="shapeStyle(el)">
                        <div
                          v-if="el.shapeType === 'line'"
                          class="shape-line"
                          :class="shapeLineClass(el)"
                          :style="shapeLineStyle(el)"
                        ></div>
                      </div>
                    </template>

                    <template v-else-if="el.type === 'region'">
                      <div class="region-element" :style="regionStyle(el)">
                        <span class="region-label" :style="regionLabelStyle(el)">
                          {{ el.regionCode || el.label || '区域' }}
                        </span>
                      </div>
                    </template>
                  </div>

                  <button
                    v-if="selectedId === el.id && !el.locked"
                    class="delete-btn"
                    title="删除"
                    @click.stop="deleteElement(el.id)"
                  >
                    ×
                  </button>

                  <span v-if="el.locked" class="locked-badge" title="已锁定">锁</span>

                  <div
                    v-if="selectedId === el.id && !el.locked"
                    class="resize-handles"
                  >
                    <div class="handle handle-nw"></div>
                    <div class="handle handle-n"></div>
                    <div class="handle handle-ne"></div>
                    <div class="handle handle-w"></div>
                    <div class="handle handle-e"></div>
                    <div class="handle handle-sw"></div>
                    <div class="handle handle-s"></div>
                    <div class="handle handle-se"></div>
                  </div>
                </div>

                <div v-if="elements.length === 0" class="empty-hint">
                  <div class="empty-icon" v-html="BTN_ICONS.empty"></div>
                  <div class="empty-title">从左侧添加元素到画布</div>
                  <div class="empty-subtitle">双击文本可编辑，拖拽元素可调整位置和大小</div>
                </div>
              </div>

              <div
                v-if="draftGuide && guidesVisible"
                class="guide-drag-tooltip"
                :class="draftGuide.axis === 'x' ? 'lt' : 'tb'"
                :style="guideDragTooltipStyle"
              >{{ guideDragTooltipText }}</div>
            </div>
          </div>
        </div>

        <button
          class="inspector-toggle"
          :class="{ collapsed: inspectorCollapsed }"
          :title="inspectorCollapsed ? '展开属性面板' : '收起属性面板'"
          @click="toggleInspector"
        >
          {{ inspectorCollapsed ? '‹' : '›' }}
        </button>
      </div>

      <aside class="inspector-panel" :class="{ collapsed: inspectorCollapsed }">
        <template v-if="!inspectorCollapsed && inspectorGroup">
          <div class="panel-header">
            <div>
              <div class="panel-title">分组属性</div>
              <div class="panel-subtitle">{{ inspectorGroup.name }} · {{ selectedElements.length }} 项</div>
            </div>
            <button class="panel-close" title="取消选中" @click="deselectElement">×</button>
          </div>

          <div class="panel-body panel-body--split" :style="splitPanelStyle">
            <div class="panel-main">
              <div class="prop-section">
                <div class="prop-field">
                  <label>分组名称</label>
                  <input
                    class="prop-input"
                    :value="inspectorGroup.name"
                    @input="updateGroupName(inspectorGroup.id, val($event))"
                  />
                </div>

                <div class="prop-value readonly">
                  {{ selectedElements.length }} 个元素 · 点击画布中的任一组员可整体拖动
                </div>
              </div>

              <div class="prop-section">
                <div class="prop-actions">
                  <button class="tool-btn" @click="selectGroup(inspectorGroup.id)">选中分组</button>
                  <button class="tool-btn" @click="bringSelectedToFront">整组置顶</button>
                  <button class="tool-btn" @click="sendSelectedToBack">整组置底</button>
                </div>

                <div class="prop-actions">
                  <button class="tool-btn" @click="ungroupById(inspectorGroup.id)">取消分组</button>
                  <button class="tool-btn danger" @click="deleteGroup(inspectorGroup.id)">删除分组</button>
                </div>
              </div>
            </div>

            <div class="panel-tree">
              <div class="panel-tree-header panel-tree-header--clickable" @click="panelTreeCollapsed = !panelTreeCollapsed">
                <div>
                  <div class="panel-title">当前页分组</div>
                  <div class="panel-subtitle">{{ currentPageLabel }} · {{ elements.length }} 项</div>
                </div>
                <span class="panel-tree-chevron">{{ panelTreeCollapsed ? '▸' : '▾' }}</span>
              </div>
              <div class="panel-tree-body" v-show="!panelTreeCollapsed">
                <div v-if="layerItems.length === 0" class="panel-empty">
                  <div class="panel-empty-title">这一页还是空的</div>
                  <div class="panel-empty-subtitle">从左侧元素栏拖进来，或者直接点击添加</div>
                </div>

                <template v-for="group in groupPanels" :key="group.id">
                  <div
                    class="group-card"
                    :class="{ active: inspectorGroupId === group.id }"
                  >
                    <button class="group-card-header" @click="selectGroup(group.id)">
                      <span class="group-card-main">
                        <span class="group-card-name">{{ group.name }}</span>
                        <span class="group-card-meta">{{ group.items.length }} 项 · {{ group.id }}</span>
                      </span>
                      <span class="group-card-actions">
                        <span class="outline-flag">组</span>
                      </span>
                    </button>

                    <div class="group-card-tools">
                      <button class="mini-btn" @click="selectGroup(group.id)">选中</button>
                      <button class="mini-btn" @click="ungroupById(group.id)">解组</button>
                      <button class="mini-btn danger" @click="deleteGroup(group.id)">删组</button>
                    </div>

                    <button
                      v-for="item in group.items"
                      :key="item.id"
                      class="outline-item outline-item--child"
                      :class="{ active: selectedIds.includes(item.id), primary: item.id === selectedId }"
                      @click="selectOutlineElement(item.id, $event as MouseEvent)"
                    >
                      <span class="outline-icon" v-html="iconOf(item.type)"></span>
                      <span class="outline-main">
                        <span class="outline-name">{{ item.label || item.id }}</span>
                        <span class="outline-meta">{{ item.id }} · z{{ item.zIndex || 1 }}</span>
                      </span>
                      <span class="outline-flags">
                        <span v-if="item.visible === false" class="outline-flag">隐</span>
                        <span v-if="item.locked" class="outline-flag">锁</span>
                      </span>
                    </button>
                  </div>
                </template>

                <div v-if="ungroupedLayerItems.length > 0" class="group-card group-card--loose">
                  <div class="group-card-header group-card-header--static">
                    <span class="group-card-main">
                      <span class="group-card-name">未分组</span>
                      <span class="group-card-meta">{{ ungroupedLayerItems.length }} 项</span>
                    </span>
                  </div>

                  <button
                    v-for="item in ungroupedLayerItems"
                    :key="item.id"
                    class="outline-item outline-item--child"
                    :class="{ active: selectedIds.includes(item.id), primary: item.id === selectedId }"
                    @click="selectOutlineElement(item.id, $event as MouseEvent)"
                  >
                    <span class="outline-icon" v-html="iconOf(item.type)"></span>
                    <span class="outline-main">
                      <span class="outline-name">{{ item.label || item.id }}</span>
                      <span class="outline-meta">{{ item.id }} · z{{ item.zIndex || 1 }}</span>
                    </span>
                    <span class="outline-flags">
                      <span v-if="item.visible === false" class="outline-flag">隐</span>
                      <span v-if="item.locked" class="outline-flag">锁</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="!inspectorCollapsed && sel">
          <div class="panel-header">
            <div>
              <div class="panel-title">元素属性</div>
              <div class="panel-subtitle">
                {{ sel.id }} · {{ typeLabel(sel.type) }}<template v-if="sel.groupId"> · {{ groupName(sel.groupId) }}</template>
              </div>
            </div>
            <button class="panel-close" title="取消选中" @click="deselectElement">×</button>
          </div>

          <div class="panel-body panel-body--split" :style="splitPanelStyle">
            <div class="panel-main">
              <div class="prop-section">
              <div class="prop-row">
                <div class="prop-field half">
                  <label>标识</label>
                  <input
                    class="prop-input"
                    :value="sel.id"
                    @input="updateSelectedId(val($event))"
                  />
                </div>
                <div class="prop-field half">
                  <label>类型</label>
                  <div class="prop-value readonly">{{ typeLabel(sel.type) }}</div>
                </div>
              </div>

              <div class="prop-field">
                <label>标签</label>
                <input
                  class="prop-input"
                  :value="sel.label"
                  @input="updateSel('label', val($event))"
                />
              </div>

              <div class="prop-actions">
                <button class="tool-btn" @click="duplicateSelected">复制</button>
                <button class="tool-btn" @click="bringSelectedToFront">置顶</button>
                <button class="tool-btn" @click="sendSelectedToBack">置底</button>
              </div>
              <div class="prop-actions">
                <button class="tool-btn" @click="moveSelectedUp">上移一层</button>
                <button class="tool-btn" @click="moveSelectedDown">下移一层</button>
              </div>
            </div>

            <div class="prop-section">
              <div class="prop-section-title">
                位置与尺寸
                <button class="prop-unit-btn" title="切换单位（px / cm / %）" @click="cyclePropUnit">({{ propUnit }})</button>
              </div>

              <div class="prop-row">
                <div class="prop-field half">
                  <label>X ({{ propUnit }})</label>
                  <input
                    class="prop-input"
                    type="number"
                    :step="propUnit === 'cm' ? 0.01 : 0.1"
                    :min="0"
                    :max="propUnit === 'percent' ? 100 - sel.w : 9999"
                    :value="percentToUnit(sel.x, 'x')"
                    @input="updateSel('x', unitToPercent(num($event), 'x'))"
                  />
                </div>
                <div class="prop-field half">
                  <label>Y ({{ propUnit }})</label>
                  <input
                    class="prop-input"
                    type="number"
                    :step="propUnit === 'cm' ? 0.01 : 0.1"
                    :min="0"
                    :max="propUnit === 'percent' ? 100 - sel.h : 9999"
                    :value="percentToUnit(sel.y, 'y')"
                    @input="updateSel('y', unitToPercent(num($event), 'y'))"
                  />
                </div>
              </div>

              <div class="prop-row">
                <div class="prop-field half">
                  <label>宽 ({{ propUnit }})</label>
                  <input
                    class="prop-input"
                    type="number"
                    :step="propUnit === 'cm' ? 0.01 : 0.1"
                    :min="propUnit === 'percent' ? 1 : 0.1"
                    :max="propUnit === 'percent' ? 100 : 9999"
                    :value="percentToUnit(sel.w, 'x')"
                    @input="updateSel('w', unitToPercent(num($event), 'x'))"
                  />
                </div>
                <div class="prop-field half">
                  <label>高 ({{ propUnit }})</label>
                  <input
                    class="prop-input"
                    type="number"
                    :step="propUnit === 'cm' ? 0.01 : 0.1"
                    :min="propUnit === 'percent' ? 0.5 : 0.1"
                    :max="propUnit === 'percent' ? 100 : 9999"
                    :value="percentToUnit(sel.h, 'y')"
                    @input="updateSel('h', unitToPercent(num($event), 'y'))"
                  />
                </div>
              </div>

              <div class="prop-row">
                <div class="prop-field half">
                  <label>层级</label>
                  <input
                    class="prop-input"
                    type="number"
                    min="0"
                    max="999"
                    :value="sel.zIndex || 1"
                    @input="updateSel('zIndex', intNum($event, 1))"
                  />
                </div>
                <div class="prop-field half">
                  <label>可见</label>
                  <label class="prop-checkbox">
                    <input
                      type="checkbox"
                      :checked="sel.visible !== false"
                      @change="updateSel('visible', checked($event))"
                    />
                    显示在画布
                  </label>
                </div>
              </div>
            </div>

            <div class="prop-section">
              <div class="prop-section-title">专属属性</div>

              <template v-if="sel.type === 'text'">
                <div class="prop-field">
                  <label>内容</label>
                  <textarea
                    class="prop-input prop-textarea"
                    rows="4"
                    :value="sel.content || ''"
                    @input="updateSel('content', val($event))"
                  ></textarea>
                </div>

                <div class="prop-row">
                  <div class="prop-field half">
                    <label>字号 (pt)</label>
                    <input
                      class="prop-input"
                      type="number"
                      min="8"
                      max="72"
                      :value="sel.fontSize || 14"
                      @input="updateSel('fontSize', intNum($event, 14))"
                    />
                  </div>
                  <div class="prop-field half">
                    <label>粗细</label>
                    <select
                      class="prop-input"
                      :value="sel.fontWeight || 'normal'"
                      @change="updateSel('fontWeight', val($event))"
                    >
                      <option value="normal">正常</option>
                      <option value="bold">加粗</option>
                    </select>
                  </div>
                </div>

                <div class="prop-row">
                  <div class="prop-field half">
                    <label>对齐</label>
                    <select
                      class="prop-input"
                      :value="sel.textAlign || 'left'"
                      @change="updateSel('textAlign', val($event))"
                    >
                      <option value="left">左对齐</option>
                      <option value="center">居中</option>
                      <option value="right">右对齐</option>
                    </select>
                  </div>
                  <div class="prop-field half">
                    <label>颜色</label>
                    <input
                      class="prop-input"
                      type="color"
                      :value="sel.color || '#1f2937'"
                      @input="updateSel('color', val($event))"
                    />
                  </div>
                </div>

                <div class="prop-section-title" style="margin-top: 12px">挖空区域</div>
                <div class="prop-actions" style="padding: 0">
                  <button class="tool-btn" style="flex: 1" @click="addCutout(sel, 'rect')">+ 添加挖空</button>
                </div>
                <div v-if="sel.cutouts && sel.cutouts.length > 0" style="margin-top: 8px">
                  <div
                    v-for="co in sel.cutouts"
                    :key="co.id"
                    class="cutout-list-item"
                    :class="{ active: selectedCutoutId === co.id }"
                    @click="selectedCutoutId = co.id"
                  >
                    <span>挖空 {{ Math.round(co.w) }}% × {{ Math.round(co.h) }}%</span>
                    <button class="mini-btn danger" @click.stop="deleteCutout(sel, co.id)">×</button>
                  </div>
                  <div style="font-size: 10px; color: var(--text-sub); margin-top: 4px">
                    提示：拖拽挖空移动位置，拖拽四角调整大小
                  </div>
                </div>
                <div v-else style="font-size: 11px; color: var(--text-sub); margin-top: 4px">
                  添加挖空区域让文字环绕，用于图文混排
                </div>
              </template>

              <template v-else-if="sel.type === 'watermark'">
                <div class="prop-field">
                  <label>水印内容</label>
                  <QuillEditor
                    :model-value="sel.content || ''"
                    placeholder="输入水印富文本内容…"
                    @update:modelValue="updateSel('content', $event)"
                  />
                </div>

                <div class="prop-row">
                  <div class="prop-field half">
                    <label>字号 (px)</label>
                    <input
                      class="prop-input"
                      type="number"
                      min="8"
                      max="96"
                      :value="sel.fontSize || 24"
                      @input="updateSel('fontSize', clamp(intNum($event, 24), 8, 96))"
                    />
                  </div>
                  <div class="prop-field half">
                    <label>粗细</label>
                    <select
                      class="prop-input"
                      :value="sel.fontWeight || 'bold'"
                      @change="updateSel('fontWeight', val($event))"
                    >
                      <option value="normal">正常</option>
                      <option value="bold">加粗</option>
                    </select>
                  </div>
                </div>

                <div class="prop-row">
                  <div class="prop-field half">
                    <label>对齐</label>
                    <select
                      class="prop-input"
                      :value="sel.textAlign || 'center'"
                      @change="updateSel('textAlign', val($event))"
                    >
                      <option value="left">左对齐</option>
                      <option value="center">居中</option>
                      <option value="right">右对齐</option>
                    </select>
                  </div>
                  <div class="prop-field half">
                    <label>颜色</label>
                    <input
                      class="prop-input"
                      type="color"
                      :value="sel.color || '#94a3b8'"
                      @input="updateSel('color', val($event))"
                    />
                  </div>
                </div>

                <div class="prop-row">
                  <div class="prop-field half">
                    <label>透明度 (%)</label>
                    <input
                      class="prop-input"
                      type="number"
                      min="0"
                      max="100"
                      :value="Math.round((sel.opacity ?? 0.18) * 100)"
                      @input="updateSel('opacity', clamp(num($event), 0, 100) / 100)"
                    />
                  </div>
                  <div class="prop-field half">
                    <label>旋转角度</label>
                    <input
                      class="prop-input"
                      type="number"
                      min="-360"
                      max="360"
                      :value="sel.rotation ?? -25"
                      @input="updateSel('rotation', clamp(intNum($event, -25), -360, 360))"
                    />
                  </div>
                </div>

                <div class="prop-row">
                  <div class="prop-field half">
                    <label>水平间距 (px)</label>
                    <input
                      class="prop-input"
                      type="number"
                      min="0"
                      max="400"
                      :value="sel.tileGapX ?? 48"
                      @input="updateSel('tileGapX', clamp(intNum($event, 48), 0, 400))"
                    />
                  </div>
                  <div class="prop-field half">
                    <label>垂直间距 (px)</label>
                    <input
                      class="prop-input"
                      type="number"
                      min="0"
                      max="400"
                      :value="sel.tileGapY ?? 36"
                      @input="updateSel('tileGapY', clamp(intNum($event, 36), 0, 400))"
                    />
                  </div>
                </div>
              </template>

              <template v-else-if="sel.type === 'prefill'">
                <div class="prop-field">
                  <label>表达式</label>
                  <input
                    class="prop-input"
                    :value="sel.expr || ''"
                    placeholder="${fieldName}"
                    @input="updateSel('expr', val($event))"
                  />
                </div>

                <div class="prop-field">
                  <label>空占位符</label>
                  <input
                    class="prop-input"
                    :value="sel.emptyPlaceholder || ''"
                    placeholder="_____________"
                    @input="updateSel('emptyPlaceholder', val($event))"
                  />
                </div>
              </template>

              <template v-else-if="sel.type === 'signature' || sel.type === 'stamp'">
                <div class="prop-field">
                  <label>占位文字</label>
                  <input
                    class="prop-input"
                    :value="sel.placeholder || ''"
                    @input="updateSel('placeholder', val($event))"
                  />
                </div>

                <div class="prop-row">
                  <div class="prop-field half">
                    <label>边框颜色</label>
                    <input
                      class="prop-input"
                      type="color"
                      :value="sel.borderColor || '#dd524c'"
                      @input="updateSel('borderColor', val($event))"
                    />
                  </div>
                  <div class="prop-field half">
                    <label>必填</label>
                    <label class="prop-checkbox">
                      <input
                        type="checkbox"
                        :checked="!!sel.required"
                        @change="updateSel('required', checked($event))"
                      />
                      需要签署
                    </label>
                  </div>
                </div>
              </template>

              <template v-else-if="sel.type === 'table'">
                <div class="prop-field">
                  <label>数据源</label>
                  <input
                    class="prop-input"
                    :value="sel.ds || ''"
                    @input="updateSel('ds', val($event))"
                  />
                </div>

                <div class="prop-row">
                  <div class="prop-field half">
                    <label>显示表头</label>
                    <label class="prop-checkbox">
                      <input
                        type="checkbox"
                        :checked="tableShowHeader(sel)"
                        @change="updateSel('showHeader', checked($event))"
                      />
                      展示标题行
                    </label>
                  </div>
                  <div class="prop-field half">
                    <label>预览行数</label>
                    <input
                      class="prop-input"
                      type="number"
                      min="1"
                      max="12"
                      :value="tablePreviewRows(sel)"
                      @input="updateSel('previewRows', clamp(intNum($event, 3), 1, 12))"
                    />
                  </div>
                </div>

                <div class="prop-value readonly table-dynamic-note">
                  表格为动态高度，实际数据增减时会向下撑开，位于下方的元素会按顺序被挤到表格下方。
                </div>

                <div class="prop-row">
                  <div class="prop-field half">
                    <label>动态高度</label>
                    <label class="prop-checkbox">
                      <input
                        type="checkbox"
                        :checked="isDynamicTable(sel)"
                        @change="updateSel('dynamicHeight', checked($event))"
                      />
                      根据数据自动增长
                    </label>
                  </div>
                  <div class="prop-field half">
                    <label>联动挤压</label>
                    <label class="prop-checkbox">
                      <input
                        type="checkbox"
                        :checked="tablePushFollowingElements(sel)"
                        @change="updateSel('pushFollowingElements', checked($event))"
                      />
                      自动挤压下方元素
                    </label>
                  </div>
                </div>

                <div class="prop-field">
                  <label>列定义</label>
                  <div class="table-columns-editor">
                    <div
                      v-for="(col, colIndex) in sel.columns || []"
                      :key="col.field + '_' + colIndex"
                      class="column-row"
                    >
                      <input
                        class="prop-input col-field"
                        :value="col.field"
                        placeholder="字段"
                        @input="updateColumn(colIndex, 'field', val($event))"
                      />
                      <input
                        class="prop-input col-header"
                        :value="col.header"
                        placeholder="标题"
                        @input="updateColumn(colIndex, 'header', val($event))"
                      />
                      <input
                        class="prop-input col-width"
                        type="number"
                        min="30"
                        max="400"
                        :value="col.w || 100"
                        placeholder="宽"
                        @input="updateColumnNumber(colIndex, 'w', clamp(intNum($event, 100), 30, 400))"
                      />
                      <select
                        class="prop-input col-align"
                        :value="col.align || 'left'"
                        @change="updateColumn(colIndex, 'align', val($event))"
                      >
                        <option value="left">左</option>
                        <option value="center">中</option>
                        <option value="right">右</option>
                      </select>
                      <button class="col-del" @click="removeColumn(colIndex)">×</button>
                    </div>
                    <button class="tool-btn col-add" @click="addColumn">+ 添加列</button>
                  </div>
                </div>

                <div class="prop-section-subtitle">表头文字</div>
                <div class="prop-row">
                  <div class="prop-field half">
                    <label>字体</label>
                    <input
                      class="prop-input"
                      :value="tableTextStyle(sel, 'header').fontFamily || ''"
                      placeholder="如 Microsoft YaHei"
                      @input="updateTableTextStyle('header', 'fontFamily', val($event))"
                    />
                  </div>
                  <div class="prop-field half">
                    <label>字号</label>
                    <input
                      class="prop-input"
                      type="number"
                      min="8"
                      max="48"
                      :value="tableTextStyle(sel, 'header').fontSize || 12"
                      @input="updateTableTextStyle('header', 'fontSize', clamp(intNum($event, 12), 8, 48))"
                    />
                  </div>
                </div>
                <div class="prop-row">
                  <div class="prop-field half">
                    <label>行高</label>
                    <input
                      class="prop-input"
                      type="number"
                      min="1"
                      max="3"
                      step="0.1"
                      :value="tableTextStyle(sel, 'header').lineHeight || 1.5"
                      @input="updateTableTextStyle('header', 'lineHeight', clamp(num($event), 1, 3))"
                    />
                  </div>
                  <div class="prop-field half">
                    <label>字距</label>
                    <input
                      class="prop-input"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      :value="tableTextStyle(sel, 'header').letterSpacing || 0"
                      @input="updateTableTextStyle('header', 'letterSpacing', clamp(num($event), 0, 10))"
                    />
                  </div>
                </div>
                <div class="prop-row">
                  <div class="prop-field half">
                    <label>对齐</label>
                    <select
                      class="prop-input"
                      :value="tableTextStyle(sel, 'header').textAlign || 'center'"
                      @change="updateTableTextStyle('header', 'textAlign', val($event))"
                    >
                      <option value="left">左对齐</option>
                      <option value="center">居中</option>
                      <option value="right">右对齐</option>
                    </select>
                  </div>
                  <div class="prop-field half">
                    <label>溢出</label>
                    <select
                      class="prop-input"
                      :value="tableTextStyle(sel, 'header').overflow || 'ellipsis'"
                      @change="updateTableTextStyle('header', 'overflow', val($event))"
                    >
                      <option value="wrap">换行</option>
                      <option value="ellipsis">省略号</option>
                      <option value="clip">裁切</option>
                    </select>
                  </div>
                </div>
                <div class="prop-row">
                  <div class="prop-field half">
                    <label>文字颜色</label>
                    <input
                      class="prop-input"
                      type="color"
                      :value="tableTextStyle(sel, 'header').color || '#172033'"
                      @input="updateTableTextStyle('header', 'color', val($event))"
                    />
                  </div>
                  <div class="prop-field half">
                    <label>背景颜色</label>
                    <input
                      class="prop-input"
                      type="color"
                      :value="tableTextStyle(sel, 'header').backgroundColor || '#f8fafc'"
                      @input="updateTableTextStyle('header', 'backgroundColor', val($event))"
                    />
                  </div>
                </div>

                <div class="prop-section-subtitle">表格文字</div>
                <div class="prop-row">
                  <div class="prop-field half">
                    <label>字体</label>
                    <input
                      class="prop-input"
                      :value="tableTextStyle(sel, 'body').fontFamily || ''"
                      placeholder="如 Microsoft YaHei"
                      @input="updateTableTextStyle('body', 'fontFamily', val($event))"
                    />
                  </div>
                  <div class="prop-field half">
                    <label>字号</label>
                    <input
                      class="prop-input"
                      type="number"
                      min="8"
                      max="48"
                      :value="tableTextStyle(sel, 'body').fontSize || 12"
                      @input="updateTableTextStyle('body', 'fontSize', clamp(intNum($event, 12), 8, 48))"
                    />
                  </div>
                </div>
                <div class="prop-row">
                  <div class="prop-field half">
                    <label>行高</label>
                    <input
                      class="prop-input"
                      type="number"
                      min="1"
                      max="3"
                      step="0.1"
                      :value="tableTextStyle(sel, 'body').lineHeight || 1.5"
                      @input="updateTableTextStyle('body', 'lineHeight', clamp(num($event), 1, 3))"
                    />
                  </div>
                  <div class="prop-field half">
                    <label>字距</label>
                    <input
                      class="prop-input"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      :value="tableTextStyle(sel, 'body').letterSpacing || 0"
                      @input="updateTableTextStyle('body', 'letterSpacing', clamp(num($event), 0, 10))"
                    />
                  </div>
                </div>
                <div class="prop-row">
                  <div class="prop-field half">
                    <label>对齐</label>
                    <select
                      class="prop-input"
                      :value="tableTextStyle(sel, 'body').textAlign || 'left'"
                      @change="updateTableTextStyle('body', 'textAlign', val($event))"
                    >
                      <option value="left">左对齐</option>
                      <option value="center">居中</option>
                      <option value="right">右对齐</option>
                    </select>
                  </div>
                  <div class="prop-field half">
                    <label>溢出</label>
                    <select
                      class="prop-input"
                      :value="tableTextStyle(sel, 'body').overflow || 'wrap'"
                      @change="updateTableTextStyle('body', 'overflow', val($event))"
                    >
                      <option value="wrap">换行</option>
                      <option value="ellipsis">省略号</option>
                      <option value="clip">裁切</option>
                    </select>
                  </div>
                </div>
                <div class="prop-row">
                  <div class="prop-field half">
                    <label>文字颜色</label>
                    <input
                      class="prop-input"
                      type="color"
                      :value="tableTextStyle(sel, 'body').color || '#172033'"
                      @input="updateTableTextStyle('body', 'color', val($event))"
                    />
                  </div>
                  <div class="prop-field half">
                    <label>背景颜色</label>
                    <input
                      class="prop-input"
                      type="color"
                      :value="tableTextStyle(sel, 'body').backgroundColor || '#ffffff'"
                      @input="updateTableTextStyle('body', 'backgroundColor', val($event))"
                    />
                  </div>
                </div>

                <div class="prop-section-subtitle">边框设置</div>
                <div class="prop-row">
                  <div class="prop-field half">
                    <label>粗细</label>
                    <input
                      class="prop-input"
                      type="number"
                      min="0"
                      max="8"
                      :value="tableBorderConfig(sel).width || 1"
                      @input="updateTableBorder('width', clamp(intNum($event, 1), 0, 8))"
                    />
                  </div>
                  <div class="prop-field half">
                    <label>线型</label>
                    <select
                      class="prop-input"
                      :value="tableBorderConfig(sel).style || 'solid'"
                      @change="updateTableBorder('style', val($event))"
                    >
                      <option value="solid">实线</option>
                      <option value="dashed">虚线</option>
                      <option value="dotted">点线</option>
                      <option value="double">双线</option>
                    </select>
                  </div>
                </div>
                <div class="prop-field">
                  <label>边框颜色</label>
                  <input
                    class="prop-input"
                    type="color"
                    :value="tableBorderConfig(sel).color || '#cad4e0'"
                    @input="updateTableBorder('color', val($event))"
                  />
                </div>
                <div class="prop-grid">
                  <label class="prop-checkbox">
                    <input
                      type="checkbox"
                      :checked="tableBorderConfig(sel).outer !== false"
                      @change="updateTableBorder('outer', checked($event))"
                    />
                    外边框
                  </label>
                  <label class="prop-checkbox">
                    <input
                      type="checkbox"
                      :checked="tableBorderConfig(sel).innerHorizontal !== false"
                      @change="updateTableBorder('innerHorizontal', checked($event))"
                    />
                    横向内边线
                  </label>
                  <label class="prop-checkbox">
                    <input
                      type="checkbox"
                      :checked="tableBorderConfig(sel).innerVertical !== false"
                      @change="updateTableBorder('innerVertical', checked($event))"
                    />
                    纵向内边线
                  </label>
                  <label class="prop-checkbox">
                    <input
                      type="checkbox"
                      :checked="tableBorderConfig(sel).headerSeparator !== false"
                      @change="updateTableBorder('headerSeparator', checked($event))"
                    />
                    表头分隔线
                  </label>
                </div>
              </template>

              <template v-else-if="sel.type === 'region'">
                <div class="prop-field">
                  <label>区域编码</label>
                  <input
                    class="prop-input"
                    :value="sel.regionCode || ''"
                    placeholder="REGION_01"
                    @input="updateSel('regionCode', val($event))"
                  />
                </div>

                <div class="prop-field">
                  <label>区域颜色</label>
                  <input
                    class="prop-input"
                    type="color"
                    :value="sel.regionColor || '#3b82f6'"
                    @input="updateSel('regionColor', val($event))"
                  />
                </div>

                <div class="prop-field">
                  <label>区域用途</label>
                  <div class="purpose-checkbox-group">
                    <template v-for="opt in REGION_PURPOSE_OPTIONS" :key="opt.value">
                      <div v-if="opt.group && opt.group !== (REGION_PURPOSE_OPTIONS[REGION_PURPOSE_OPTIONS.indexOf(opt) - 1]?.group || '')" class="purpose-group-label">
                        {{ opt.group }}
                      </div>
                      <label class="prop-checkbox purpose-item" :class="{ 'purpose-sub': !!opt.group }">
                        <input
                          type="checkbox"
                          :checked="(sel.regionPurposes || []).includes(opt.value)"
                          @change="toggleRegionPurpose(opt.value)"
                        />
                        {{ opt.label }}
                      </label>
                    </template>
                  </div>
                </div>

                <!-- per-purpose config sections -->
                <div v-if="purposeIsChecked('ocr-text')" class="purpose-config-section">
                  <div class="purpose-config-header" @click="purposeConfigExpanded['ocr-text'] = !purposeConfigExpanded['ocr-text']">
                    <span class="purpose-config-chevron">{{ purposeConfigExpanded['ocr-text'] ? '▾' : '▸' }}</span>
                    OCR-文本 配置
                  </div>
                  <div v-show="purposeConfigExpanded['ocr-text']" class="purpose-config-body">
                    <div class="prop-field">
                      <label>语言</label>
                      <select class="prop-input" :value="regionPurposeConfig('ocr-text').language" @change="updateRegionPurposeConfig('ocr-text', 'language', val($event))">
                        <option value="mixed">中英混合</option>
                        <option value="chi_sim">中文</option>
                        <option value="eng">英文</option>
                      </select>
                    </div>
                    <div class="prop-row">
                      <div class="prop-field half">
                        <label>置信度</label>
                        <input class="prop-input" type="number" min="0" max="100" :value="regionPurposeConfig('ocr-text').confidenceThreshold" @input="updateRegionPurposeConfig('ocr-text', 'confidenceThreshold', intNum($event, 60))" />
                      </div>
                      <div class="prop-field half">
                        <label>文字方向</label>
                        <select class="prop-input" :value="regionPurposeConfig('ocr-text').textDirection" @change="updateRegionPurposeConfig('ocr-text', 'textDirection', val($event))">
                          <option value="auto">自动</option>
                          <option value="horizontal">水平</option>
                          <option value="vertical">垂直</option>
                        </select>
                      </div>
                    </div>
                    <div class="prop-field">
                      <label>预处理</label>
                      <div class="prop-row">
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('ocr-text','preprocessing','denoise')" @change="togglePurposeConfigArrayItem('ocr-text','preprocessing','denoise')" />去噪</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('ocr-text','preprocessing','binarize')" @change="togglePurposeConfigArrayItem('ocr-text','preprocessing','binarize')" />二值化</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('ocr-text','preprocessing','grayscale')" @change="togglePurposeConfigArrayItem('ocr-text','preprocessing','grayscale')" />灰度化</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('ocr-text','preprocessing','deskew')" @change="togglePurposeConfigArrayItem('ocr-text','preprocessing','deskew')" />纠偏</label>
                      </div>
                    </div>
                    <div class="prop-field">
                      <label>字符限制</label>
                      <input class="prop-input" :value="regionPurposeConfig('ocr-text').charSet || ''" placeholder="例如 A-Za-z0-9" @input="updateRegionPurposeConfig('ocr-text', 'charSet', val($event))" />
                    </div>
                    <div class="prop-row">
                      <div class="prop-field half">
                        <label>最短字符</label>
                        <input class="prop-input" type="number" min="0" :value="regionPurposeConfig('ocr-text').minLength || 0" @input="updateRegionPurposeConfig('ocr-text', 'minLength', intNum($event, 0))" />
                      </div>
                      <div class="prop-field half">
                        <label>最长字符</label>
                        <input class="prop-input" type="number" min="0" :value="regionPurposeConfig('ocr-text').maxLength || 0" @input="updateRegionPurposeConfig('ocr-text', 'maxLength', intNum($event, 0))" />
                      </div>
                    </div>
                    <label class="prop-checkbox"><input type="checkbox" :checked="regionPurposeConfig('ocr-text').mergeLines !== false" @change="updateRegionPurposeConfig('ocr-text', 'mergeLines', checked($event))" />合并多行</label>
                  </div>
                </div>

                <div v-if="purposeIsChecked('ocr-table')" class="purpose-config-section">
                  <div class="purpose-config-header" @click="purposeConfigExpanded['ocr-table'] = !purposeConfigExpanded['ocr-table']">
                    <span class="purpose-config-chevron">{{ purposeConfigExpanded['ocr-table'] ? '▾' : '▸' }}</span>
                    OCR-表格 配置
                  </div>
                  <div v-show="purposeConfigExpanded['ocr-table']" class="purpose-config-body">
                    <div class="prop-field">
                      <label>语言</label>
                      <select class="prop-input" :value="regionPurposeConfig('ocr-table').language" @change="updateRegionPurposeConfig('ocr-table', 'language', val($event))">
                        <option value="mixed">中英混合</option>
                        <option value="chi_sim">中文</option>
                        <option value="eng">英文</option>
                      </select>
                    </div>
                    <div class="prop-field">
                      <label>置信度</label>
                      <input class="prop-input" type="number" min="0" max="100" :value="regionPurposeConfig('ocr-table').confidenceThreshold" @input="updateRegionPurposeConfig('ocr-table', 'confidenceThreshold', intNum($event, 60))" />
                    </div>
                    <div class="prop-field">
                      <label>输出格式</label>
                      <select class="prop-input" :value="regionPurposeConfig('ocr-table').outputFormat" @change="updateRegionPurposeConfig('ocr-table', 'outputFormat', val($event))">
                        <option value="json">JSON</option>
                        <option value="csv">CSV</option>
                        <option value="html">HTML</option>
                      </select>
                    </div>
                    <label class="prop-checkbox"><input type="checkbox" :checked="regionPurposeConfig('ocr-table').detectHeader !== false" @change="updateRegionPurposeConfig('ocr-table', 'detectHeader', checked($event))" />检测表头</label>
                    <label class="prop-checkbox"><input type="checkbox" :checked="regionPurposeConfig('ocr-table').detectMergedCells !== false" @change="updateRegionPurposeConfig('ocr-table', 'detectMergedCells', checked($event))" />检测合并单元格</label>
                    <div class="prop-field">
                      <label>预处理</label>
                      <div class="prop-row">
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('ocr-table','preprocessing','denoise')" @change="togglePurposeConfigArrayItem('ocr-table','preprocessing','denoise')" />去噪</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('ocr-table','preprocessing','grayscale')" @change="togglePurposeConfigArrayItem('ocr-table','preprocessing','grayscale')" />灰度化</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('ocr-table','preprocessing','deskew')" @change="togglePurposeConfigArrayItem('ocr-table','preprocessing','deskew')" />纠偏</label>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="purposeIsChecked('ocr-template')" class="purpose-config-section">
                  <div class="purpose-config-header" @click="purposeConfigExpanded['ocr-template'] = !purposeConfigExpanded['ocr-template']">
                    <span class="purpose-config-chevron">{{ purposeConfigExpanded['ocr-template'] ? '▾' : '▸' }}</span>
                    OCR-模板 配置
                  </div>
                  <div v-show="purposeConfigExpanded['ocr-template']" class="purpose-config-body">
                    <div class="prop-field">
                      <label>模板ID</label>
                      <input class="prop-input" :value="regionPurposeConfig('ocr-template').templateId || ''" placeholder="OCR模板标识" @input="updateRegionPurposeConfig('ocr-template', 'templateId', val($event))" />
                    </div>
                    <div class="prop-field">
                      <label>匹配模式</label>
                      <select class="prop-input" :value="regionPurposeConfig('ocr-template').matchMode" @change="updateRegionPurposeConfig('ocr-template', 'matchMode', val($event))">
                        <option value="fuzzy">模糊匹配</option>
                        <option value="exact">精确匹配</option>
                        <option value="best-effort">尽力匹配</option>
                      </select>
                    </div>
                    <div class="prop-field">
                      <label>置信度</label>
                      <input class="prop-input" type="number" min="0" max="100" :value="regionPurposeConfig('ocr-template').confidenceThreshold" @input="updateRegionPurposeConfig('ocr-template', 'confidenceThreshold', intNum($event, 70))" />
                    </div>
                    <label class="prop-checkbox"><input type="checkbox" :checked="regionPurposeConfig('ocr-template').allowPartialMatch === true" @change="updateRegionPurposeConfig('ocr-template', 'allowPartialMatch', checked($event))" />允许部分匹配</label>
                  </div>
                </div>

                <div v-if="purposeIsChecked('stain-detect')" class="purpose-config-section">
                  <div class="purpose-config-header" @click="purposeConfigExpanded['stain-detect'] = !purposeConfigExpanded['stain-detect']">
                    <span class="purpose-config-chevron">{{ purposeConfigExpanded['stain-detect'] ? '▾' : '▸' }}</span>
                    污渍识别 配置
                  </div>
                  <div v-show="purposeConfigExpanded['stain-detect']" class="purpose-config-body">
                    <div class="prop-field">
                      <label>污渍类型</label>
                      <div class="prop-row">
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('stain-detect','stainTypes','general')" @change="togglePurposeConfigArrayItem('stain-detect','stainTypes','general')" />通用</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('stain-detect','stainTypes','ink')" @change="togglePurposeConfigArrayItem('stain-detect','stainTypes','ink')" />墨渍</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('stain-detect','stainTypes','coffee')" @change="togglePurposeConfigArrayItem('stain-detect','stainTypes','coffee')" />咖啡</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('stain-detect','stainTypes','oil')" @change="togglePurposeConfigArrayItem('stain-detect','stainTypes','oil')" />油渍</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('stain-detect','stainTypes','water')" @change="togglePurposeConfigArrayItem('stain-detect','stainTypes','water')" />水渍</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('stain-detect','stainTypes','mold')" @change="togglePurposeConfigArrayItem('stain-detect','stainTypes','mold')" />霉斑</label>
                      </div>
                    </div>
                    <div class="prop-row">
                      <div class="prop-field half">
                        <label>灵敏度</label>
                        <select class="prop-input" :value="regionPurposeConfig('stain-detect').sensitivity" @change="updateRegionPurposeConfig('stain-detect', 'sensitivity', val($event))">
                          <option value="low">低</option>
                          <option value="medium">中</option>
                          <option value="high">高</option>
                        </select>
                      </div>
                      <div class="prop-field half">
                        <label>最小面积(%)</label>
                        <input class="prop-input" type="number" min="0" max="100" :value="regionPurposeConfig('stain-detect').minAreaPercent" @input="updateRegionPurposeConfig('stain-detect', 'minAreaPercent', intNum($event, 1))" />
                      </div>
                    </div>
                    <div class="prop-field">
                      <label>报告模式</label>
                      <select class="prop-input" :value="regionPurposeConfig('stain-detect').reportMode" @change="updateRegionPurposeConfig('stain-detect', 'reportMode', val($event))">
                        <option value="binary">有/无</option>
                        <option value="severity">严重程度</option>
                        <option value="detailed">详细报告</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div v-if="purposeIsChecked('tamper-detect')" class="purpose-config-section">
                  <div class="purpose-config-header" @click="purposeConfigExpanded['tamper-detect'] = !purposeConfigExpanded['tamper-detect']">
                    <span class="purpose-config-chevron">{{ purposeConfigExpanded['tamper-detect'] ? '▾' : '▸' }}</span>
                    篡改识别 配置
                  </div>
                  <div v-show="purposeConfigExpanded['tamper-detect']" class="purpose-config-body">
                    <div class="prop-field">
                      <label>检测模式</label>
                      <select class="prop-input" :value="regionPurposeConfig('tamper-detect').detectionMode" @change="updateRegionPurposeConfig('tamper-detect', 'detectionMode', val($event))">
                        <option value="both">文本+图像</option>
                        <option value="text">仅文本</option>
                        <option value="image">仅图像</option>
                      </select>
                    </div>
                    <div class="prop-field">
                      <label>灵敏度</label>
                      <select class="prop-input" :value="regionPurposeConfig('tamper-detect').sensitivity" @change="updateRegionPurposeConfig('tamper-detect', 'sensitivity', val($event))">
                        <option value="low">低</option>
                        <option value="medium">中</option>
                        <option value="high">高</option>
                      </select>
                    </div>
                    <label class="prop-checkbox"><input type="checkbox" :checked="regionPurposeConfig('tamper-detect').checkMetadata !== false" @change="updateRegionPurposeConfig('tamper-detect', 'checkMetadata', checked($event))" />检查元数据</label>
                    <label class="prop-checkbox"><input type="checkbox" :checked="regionPurposeConfig('tamper-detect').checkPixelAnomaly !== false" @change="updateRegionPurposeConfig('tamper-detect', 'checkPixelAnomaly', checked($event))" />检查像素异常</label>
                    <label class="prop-checkbox"><input type="checkbox" :checked="regionPurposeConfig('tamper-detect').checkFontConsistency !== false" @change="updateRegionPurposeConfig('tamper-detect', 'checkFontConsistency', checked($event))" />检查字体一致性</label>
                  </div>
                </div>

                <div v-if="purposeIsChecked('stamp-detect')" class="purpose-config-section">
                  <div class="purpose-config-header" @click="purposeConfigExpanded['stamp-detect'] = !purposeConfigExpanded['stamp-detect']">
                    <span class="purpose-config-chevron">{{ purposeConfigExpanded['stamp-detect'] ? '▾' : '▸' }}</span>
                    印章检测 配置
                  </div>
                  <div v-show="purposeConfigExpanded['stamp-detect']" class="purpose-config-body">
                    <div class="prop-field">
                      <label>印章类型</label>
                      <select class="prop-input" :value="regionPurposeConfig('stamp-detect').stampType" @change="updateRegionPurposeConfig('stamp-detect', 'stampType', val($event))">
                        <option value="any">不限</option>
                        <option value="circle">圆形</option>
                        <option value="oval">椭圆</option>
                        <option value="rect">矩形</option>
                      </select>
                    </div>
                    <div class="prop-field">
                      <label>置信度</label>
                      <input class="prop-input" type="number" min="0" max="100" :value="regionPurposeConfig('stamp-detect').confidenceThreshold" @input="updateRegionPurposeConfig('stamp-detect', 'confidenceThreshold', intNum($event, 65))" />
                    </div>
                    <label class="prop-checkbox"><input type="checkbox" :checked="regionPurposeConfig('stamp-detect').detectColor !== false" @change="updateRegionPurposeConfig('stamp-detect', 'detectColor', checked($event))" />检测印章颜色</label>
                    <label class="prop-checkbox"><input type="checkbox" :checked="regionPurposeConfig('stamp-detect').extractText !== false" @change="updateRegionPurposeConfig('stamp-detect', 'extractText', checked($event))" />提取印章文字</label>
                  </div>
                </div>

                <div v-if="purposeIsChecked('barcode')" class="purpose-config-section">
                  <div class="purpose-config-header" @click="purposeConfigExpanded['barcode'] = !purposeConfigExpanded['barcode']">
                    <span class="purpose-config-chevron">{{ purposeConfigExpanded['barcode'] ? '▾' : '▸' }}</span>
                    条码识别 配置
                  </div>
                  <div v-show="purposeConfigExpanded['barcode']" class="purpose-config-body">
                    <label class="prop-checkbox"><input type="checkbox" :checked="regionPurposeConfig('barcode').autoDetect !== false" @change="updateRegionPurposeConfig('barcode', 'autoDetect', checked($event))" />自动检测类型</label>
                    <div v-if="!regionPurposeConfig('barcode').autoDetect" class="prop-field">
                      <label>条码类型</label>
                      <div class="prop-row">
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('barcode','barcodeTypes','qr')" @change="togglePurposeConfigArrayItem('barcode','barcodeTypes','qr')" />QR</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('barcode','barcodeTypes','ean13')" @change="togglePurposeConfigArrayItem('barcode','barcodeTypes','ean13')" />EAN13</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('barcode','barcodeTypes','code128')" @change="togglePurposeConfigArrayItem('barcode','barcodeTypes','code128')" />Code128</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('barcode','barcodeTypes','datamatrix')" @change="togglePurposeConfigArrayItem('barcode','barcodeTypes','datamatrix')" />DataMatrix</label>
                      </div>
                    </div>
                    <div class="prop-field">
                      <label>最低置信度</label>
                      <input class="prop-input" type="number" min="0" max="100" :value="regionPurposeConfig('barcode').minConfidence" @input="updateRegionPurposeConfig('barcode', 'minConfidence', intNum($event, 70))" />
                    </div>
                    <div class="prop-field">
                      <label>预期格式</label>
                      <input class="prop-input" :value="regionPurposeConfig('barcode').expectedFormat || ''" placeholder="正则表达式" @input="updateRegionPurposeConfig('barcode', 'expectedFormat', val($event))" />
                    </div>
                  </div>
                </div>

                <div v-if="purposeIsChecked('signature-detect')" class="purpose-config-section">
                  <div class="purpose-config-header" @click="purposeConfigExpanded['signature-detect'] = !purposeConfigExpanded['signature-detect']">
                    <span class="purpose-config-chevron">{{ purposeConfigExpanded['signature-detect'] ? '▾' : '▸' }}</span>
                    签名检测 配置
                  </div>
                  <div v-show="purposeConfigExpanded['signature-detect']" class="purpose-config-body">
                    <div class="prop-field">
                      <label>检测模式</label>
                      <select class="prop-input" :value="regionPurposeConfig('signature-detect').detectionMode" @change="updateRegionPurposeConfig('signature-detect', 'detectionMode', val($event))">
                        <option value="presence">检测存在</option>
                        <option value="verify">比对验证</option>
                        <option value="extract">提取签名</option>
                      </select>
                    </div>
                    <div class="prop-field">
                      <label>置信度</label>
                      <input class="prop-input" type="number" min="0" max="100" :value="regionPurposeConfig('signature-detect').confidenceThreshold" @input="updateRegionPurposeConfig('signature-detect', 'confidenceThreshold', intNum($event, 60))" />
                    </div>
                    <label class="prop-checkbox"><input type="checkbox" :checked="regionPurposeConfig('signature-detect').allowPrinted === true" @change="updateRegionPurposeConfig('signature-detect', 'allowPrinted', checked($event))" />允许打印体</label>
                    <label class="prop-checkbox"><input type="checkbox" :checked="regionPurposeConfig('signature-detect').multiSignature === true" @change="updateRegionPurposeConfig('signature-detect', 'multiSignature', checked($event))" />允许多人签名</label>
                  </div>
                </div>

                <div v-if="purposeIsChecked('key-extraction')" class="purpose-config-section">
                  <div class="purpose-config-header" @click="purposeConfigExpanded['key-extraction'] = !purposeConfigExpanded['key-extraction']">
                    <span class="purpose-config-chevron">{{ purposeConfigExpanded['key-extraction'] ? '▾' : '▸' }}</span>
                    关键字段提取 配置
                  </div>
                  <div v-show="purposeConfigExpanded['key-extraction']" class="purpose-config-body">
                    <div class="prop-field">
                      <label>提取模式</label>
                      <select class="prop-input" :value="regionPurposeConfig('key-extraction').extractionMode" @change="updateRegionPurposeConfig('key-extraction', 'extractionMode', val($event))">
                        <option value="regex">正则</option>
                        <option value="llm">LLM</option>
                        <option value="hybrid">混合</option>
                      </select>
                    </div>
                    <div class="prop-field">
                      <label>后处理</label>
                      <select class="prop-input" :value="regionPurposeConfig('key-extraction').postProcess" @change="updateRegionPurposeConfig('key-extraction', 'postProcess', val($event))">
                        <option value="trim">去空格</option>
                        <option value="normalize">标准化</option>
                        <option value="validate">校验</option>
                      </select>
                    </div>
                    <label class="prop-checkbox"><input type="checkbox" :checked="regionPurposeConfig('key-extraction').strictValidation === true" @change="updateRegionPurposeConfig('key-extraction', 'strictValidation', checked($event))" />严格校验</label>
                    <div class="prop-value readonly" style="font-size:11px;color:var(--text-sub);margin-top:4px;">
                      字段列表在代码中通过 fields 数组定义
                    </div>
                  </div>
                </div>

                <div v-if="purposeIsChecked('desensitize')" class="purpose-config-section">
                  <div class="purpose-config-header" @click="purposeConfigExpanded['desensitize'] = !purposeConfigExpanded['desensitize']">
                    <span class="purpose-config-chevron">{{ purposeConfigExpanded['desensitize'] ? '▾' : '▸' }}</span>
                    脱敏区域 配置
                  </div>
                  <div v-show="purposeConfigExpanded['desensitize']" class="purpose-config-body">
                    <div class="prop-field">
                      <label>脱敏方式</label>
                      <select class="prop-input" :value="regionPurposeConfig('desensitize').method" @change="updateRegionPurposeConfig('desensitize', 'method', val($event))">
                        <option value="blur">模糊</option>
                        <option value="black">黑色遮盖</option>
                        <option value="replace">字符替换</option>
                        <option value="pixelate">像素化</option>
                      </select>
                    </div>
                    <div class="prop-field">
                      <label>适用范围</label>
                      <select class="prop-input" :value="regionPurposeConfig('desensitize').applyTo" @change="updateRegionPurposeConfig('desensitize', 'applyTo', val($event))">
                        <option value="text">文本</option>
                        <option value="image">图像</option>
                        <option value="both">文本+图像</option>
                      </select>
                    </div>
                    <div class="prop-row">
                      <div class="prop-field half">
                        <label>保留前缀</label>
                        <input class="prop-input" type="number" min="0" :value="regionPurposeConfig('desensitize').keepPrefix" @input="updateRegionPurposeConfig('desensitize', 'keepPrefix', intNum($event, 0))" />
                      </div>
                      <div class="prop-field half">
                        <label>保留后缀</label>
                        <input class="prop-input" type="number" min="0" :value="regionPurposeConfig('desensitize').keepSuffix" @input="updateRegionPurposeConfig('desensitize', 'keepSuffix', intNum($event, 0))" />
                      </div>
                    </div>
                    <div class="prop-field" v-if="regionPurposeConfig('desensitize').method === 'replace'">
                      <label>替换字符</label>
                      <input class="prop-input" maxlength="1" :value="regionPurposeConfig('desensitize').replacementChar" @input="updateRegionPurposeConfig('desensitize', 'replacementChar', val($event))" />
                    </div>
                    <div class="prop-field" v-if="regionPurposeConfig('desensitize').method === 'blur'">
                      <label>模糊半径(px)</label>
                      <input class="prop-input" type="number" min="1" max="50" :value="regionPurposeConfig('desensitize').blurRadius" @input="updateRegionPurposeConfig('desensitize', 'blurRadius', intNum($event, 12))" />
                    </div>
                    <div class="prop-field" v-if="regionPurposeConfig('desensitize').method === 'pixelate'">
                      <label>像素块大小(px)</label>
                      <input class="prop-input" type="number" min="2" max="40" :value="regionPurposeConfig('desensitize').pixelateBlockSize" @input="updateRegionPurposeConfig('desensitize', 'pixelateBlockSize', intNum($event, 8))" />
                    </div>
                  </div>
                </div>

                <div v-if="purposeIsChecked('quality-check')" class="purpose-config-section">
                  <div class="purpose-config-header" @click="purposeConfigExpanded['quality-check'] = !purposeConfigExpanded['quality-check']">
                    <span class="purpose-config-chevron">{{ purposeConfigExpanded['quality-check'] ? '▾' : '▸' }}</span>
                    质量检测 配置
                  </div>
                  <div v-show="purposeConfigExpanded['quality-check']" class="purpose-config-body">
                    <div class="prop-field">
                      <label>检测项</label>
                      <div class="prop-row">
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('quality-check','checks','resolution')" @change="togglePurposeConfigArrayItem('quality-check','checks','resolution')" />分辨率</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('quality-check','checks','contrast')" @change="togglePurposeConfigArrayItem('quality-check','checks','contrast')" />对比度</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('quality-check','checks','blur')" @change="togglePurposeConfigArrayItem('quality-check','checks','blur')" />模糊度</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('quality-check','checks','skew')" @change="togglePurposeConfigArrayItem('quality-check','checks','skew')" />倾斜度</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('quality-check','checks','noise')" @change="togglePurposeConfigArrayItem('quality-check','checks','noise')" />噪点</label>
                        <label class="prop-checkbox"><input type="checkbox" :checked="purposeConfigArrayIncludes('quality-check','checks','completeness')" @change="togglePurposeConfigArrayItem('quality-check','checks','completeness')" />完整度</label>
                      </div>
                    </div>
                    <div class="prop-row">
                      <div class="prop-field half">
                        <label>最低DPI</label>
                        <input class="prop-input" type="number" min="72" max="600" :value="regionPurposeConfig('quality-check').minDpi" @input="updateRegionPurposeConfig('quality-check', 'minDpi', intNum($event, 150))" />
                      </div>
                      <div class="prop-field half">
                        <label>最低对比度</label>
                        <input class="prop-input" type="number" min="0" max="10" step="0.5" :value="regionPurposeConfig('quality-check').minContrastRatio" @input="updateRegionPurposeConfig('quality-check', 'minContrastRatio', num($event))" />
                      </div>
                    </div>
                    <div class="prop-row">
                      <div class="prop-field half">
                        <label>最大倾斜度(°)</label>
                        <input class="prop-input" type="number" min="0" max="45" :value="regionPurposeConfig('quality-check').maxSkewDegrees" @input="updateRegionPurposeConfig('quality-check', 'maxSkewDegrees', num($event))" />
                      </div>
                      <div class="prop-field half">
                        <label>完整度阈值(%)</label>
                        <input class="prop-input" type="number" min="0" max="100" :value="regionPurposeConfig('quality-check').completenessThreshold" @input="updateRegionPurposeConfig('quality-check', 'completenessThreshold', intNum($event, 95))" />
                      </div>
                    </div>
                    <div class="prop-field">
                      <label>失败动作</label>
                      <select class="prop-input" :value="regionPurposeConfig('quality-check').failAction" @change="updateRegionPurposeConfig('quality-check', 'failAction', val($event))">
                        <option value="warn">警告</option>
                        <option value="flag">标记</option>
                        <option value="reject">拒绝</option>
                      </select>
                    </div>
                  </div>
                </div>
              </template>

              <template v-else-if="sel.type === 'image'">
                <div class="prop-field">
                  <label>图片 URL</label>
                  <input
                    class="prop-input"
                    :value="sel.src || ''"
                    placeholder="https://..."
                    @input="updateSel('src', val($event))"
                  />
                </div>

                <div class="prop-field">
                  <label>适应方式</label>
                  <select
                    class="prop-input"
                    :value="sel.fit || 'contain'"
                    @change="updateSel('fit', val($event))"
                  >
                    <option value="contain">等比包含</option>
                    <option value="cover">等比覆盖</option>
                    <option value="stretch">拉伸填充</option>
                  </select>
                </div>
              </template>

              <template v-else-if="sel.type === 'shape'">
                <div class="prop-row">
                  <div class="prop-field half">
                    <label>图形</label>
                    <select
                      class="prop-input"
                      :value="sel.shapeType || 'rect'"
                      @change="updateSel('shapeType', val($event))"
                    >
                      <option value="rect">方形</option>
                      <option value="roundRect">圆角矩形</option>
                      <option value="circle">圆形</option>
                      <option value="line">线条</option>
                    </select>
                  </div>
                  <div class="prop-field half" v-if="sel.shapeType === 'line'">
                    <label>方向</label>
                    <select
                      class="prop-input"
                      :value="sel.lineDirection || 'horizontal'"
                      @change="updateSel('lineDirection', val($event))"
                    >
                      <option value="horizontal">水平</option>
                      <option value="vertical">垂直</option>
                      <option value="diag-down">左上到右下</option>
                      <option value="diag-up">左下到右上</option>
                    </select>
                  </div>
                </div>

                <div class="prop-row">
                  <div class="prop-field half">
                    <label>描边颜色</label>
                    <input
                      class="prop-input"
                      type="color"
                      :value="sel.strokeColor || '#22324c'"
                      @input="updateSel('strokeColor', val($event))"
                    />
                  </div>
                  <div class="prop-field half">
                    <label>填充颜色</label>
                    <div class="prop-color-row">
                      <input
                        class="prop-input prop-color-input"
                        type="color"
                        :value="sel.fillColor || '#ffffff'"
                        @input="updateSel('fillColor', val($event))"
                      />
                      <button
                        class="prop-color-clear"
                        title="清除填充色"
                        @click="updateSel('fillColor', '')"
                      >✕</button>
                    </div>
                  </div>
                </div>

                <div class="prop-row">
                  <div class="prop-field half">
                    <label>线宽</label>
                    <input
                      class="prop-input"
                      type="number"
                      min="1"
                      max="12"
                      :value="sel.strokeWidth || 2"
                      @input="updateSel('strokeWidth', intNum($event, 2))"
                    />
                  </div>
                  <div class="prop-field half">
                    <label>线型</label>
                    <select
                      class="prop-input"
                      :value="sel.strokeStyle || 'solid'"
                      @change="updateSel('strokeStyle', val($event))"
                    >
                      <option value="solid">实线</option>
                      <option value="dashed">虚线</option>
                      <option value="dotted">点线</option>
                    </select>
                  </div>
                </div>

                <div class="prop-field" v-if="sel.shapeType === 'roundRect'">
                  <label>圆角 <span class="prop-range-val">{{ sel.cornerRadius || 0 }}px</span></label>
                  <input
                    class="prop-range"
                    type="range"
                    min="0"
                    max="64"
                    :value="sel.cornerRadius || 0"
                    @input="updateSel('cornerRadius', intNum($event, 0))"
                  />
                </div>
              </template>
            </div>

            <div class="prop-section" v-if="sel.type !== 'shape' && sel.type !== 'table'">
              <div class="prop-section-title">边框配置</div>

              <div class="prop-row">
                <div class="prop-field half">
                  <label>粗细</label>
                  <input
                    class="prop-input"
                    type="number"
                    min="0"
                    max="20"
                    step="1"
                    :value="elementBorderConfig(sel).width"
                    @input="updateBorderConfig('width', intNum($event, 0))"
                  />
                </div>
                <div class="prop-field half">
                  <label>颜色</label>
                  <input
                    class="prop-input"
                    type="color"
                    :value="elementBorderConfig(sel).color"
                    @input="updateBorderConfig('color', val($event))"
                  />
                </div>
              </div>

              <div class="prop-row">
                <div class="prop-field half">
                  <label>线条样式</label>
                  <select
                    class="prop-input"
                    :value="elementBorderConfig(sel).style"
                    @change="updateBorderConfig('style', val($event))"
                  >
                    <option value="solid">实线</option>
                    <option value="dashed">虚线</option>
                    <option value="dotted">点线</option>
                  </select>
                </div>
                <div class="prop-field half">
                  <label>边框位置</label>
                  <select
                    class="prop-input"
                    :value="elementBorderConfig(sel).position"
                    @change="updateBorderConfig('position', val($event))"
                  >
                    <option value="inside">内部</option>
                    <option value="center">居中</option>
                    <option value="outside">外部</option>
                  </select>
                </div>
              </div>

              <div class="prop-row">
                <div class="prop-field">
                  <label>边框间距 (px)</label>
                  <input
                    class="prop-input"
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                    :value="elementBorderConfig(sel).padding"
                    @input="updateBorderConfig('padding', intNum($event, 0))"
                  />
                </div>
              </div>
            </div>

            <div class="prop-section">
              <div class="prop-actions">
                <label class="prop-checkbox">
                  <input
                    type="checkbox"
                    :checked="!!sel.locked"
                    @change="updateSel('locked', checked($event))"
                  />
                  锁定元素
                </label>
              </div>

              <button class="tool-btn danger block-btn" @click="deleteElement(sel.id)">
                删除元素
              </button>
            </div>
            </div>

            <div class="panel-tree">
              <div class="panel-tree-header panel-tree-header--clickable" @click="panelTreeCollapsed = !panelTreeCollapsed">
                <div>
                  <div class="panel-title">当前页分组</div>
                  <div class="panel-subtitle">{{ currentPageLabel }} · {{ elements.length }} 项</div>
                </div>
                <span class="panel-tree-chevron">{{ panelTreeCollapsed ? '▸' : '▾' }}</span>
              </div>

              <div class="panel-tree-body" v-show="!panelTreeCollapsed">
                <div v-if="layerItems.length === 0" class="panel-empty">
                  <div class="panel-empty-title">这一页还是空的</div>
                  <div class="panel-empty-subtitle">从左侧元素栏拖进来，或者直接点击添加</div>
                </div>

                <template v-for="group in groupPanels" :key="group.id">
                  <div
                    class="group-card"
                    :class="{ active: inspectorGroupId === group.id }"
                  >
                    <button class="group-card-header" @click="selectGroup(group.id)">
                      <span class="group-card-main">
                        <span class="group-card-name">{{ group.name }}</span>
                        <span class="group-card-meta">{{ group.items.length }} 项 · {{ group.id }}</span>
                      </span>
                      <span class="group-card-actions">
                        <span class="outline-flag">组</span>
                      </span>
                    </button>

                    <div class="group-card-tools">
                      <button class="mini-btn" @click="selectGroup(group.id)">选中</button>
                      <button class="mini-btn" @click="ungroupById(group.id)">解组</button>
                      <button class="mini-btn danger" @click="deleteGroup(group.id)">删组</button>
                    </div>

                    <button
                      v-for="item in group.items"
                      :key="item.id"
                      class="outline-item outline-item--child"
                      :class="{ active: selectedIds.includes(item.id), primary: item.id === selectedId }"
                      @click="selectOutlineElement(item.id, $event as MouseEvent)"
                    >
                      <span class="outline-icon" v-html="iconOf(item.type)"></span>
                      <span class="outline-main">
                        <span class="outline-name">{{ item.label || item.id }}</span>
                        <span class="outline-meta">{{ item.id }} · z{{ item.zIndex || 1 }}</span>
                      </span>
                      <span class="outline-flags">
                        <span v-if="item.visible === false" class="outline-flag">隐</span>
                        <span v-if="item.locked" class="outline-flag">锁</span>
                      </span>
                    </button>
                  </div>
                </template>

                <div v-if="ungroupedLayerItems.length > 0" class="group-card group-card--loose">
                  <div class="group-card-header group-card-header--static">
                    <span class="group-card-main">
                      <span class="group-card-name">未分组</span>
                      <span class="group-card-meta">{{ ungroupedLayerItems.length }} 项</span>
                    </span>
                  </div>

                  <button
                    v-for="item in ungroupedLayerItems"
                    :key="item.id"
                    class="outline-item outline-item--child"
                    :class="{ active: selectedIds.includes(item.id), primary: item.id === selectedId }"
                    @click="selectOutlineElement(item.id, $event as MouseEvent)"
                  >
                    <span class="outline-icon" v-html="iconOf(item.type)"></span>
                    <span class="outline-main">
                      <span class="outline-name">{{ item.label || item.id }}</span>
                      <span class="outline-meta">{{ item.id }} · z{{ item.zIndex || 1 }}</span>
                    </span>
                    <span class="outline-flags">
                      <span v-if="item.visible === false" class="outline-flag">隐</span>
                      <span v-if="item.locked" class="outline-flag">锁</span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="!inspectorCollapsed">
          <div class="panel-header panel-tree-header--clickable" @click="panelTreeCollapsed = !panelTreeCollapsed">
            <div>
              <div class="panel-title">当前页分组</div>
              <div class="panel-subtitle">{{ currentPageLabel }} · {{ elements.length }} 项</div>
            </div>
            <span class="panel-tree-chevron">{{ panelTreeCollapsed ? '▸' : '▾' }}</span>
          </div>

          <div class="panel-body" v-show="!panelTreeCollapsed">
            <div v-if="layerItems.length === 0" class="panel-empty">
              <div class="panel-empty-title">这一页还是空的</div>
              <div class="panel-empty-subtitle">从左侧元素栏拖进来，或者直接点击添加</div>
            </div>

            <template v-for="group in groupPanels" :key="group.id">
              <div
                class="group-card"
                :class="{ active: inspectorGroupId === group.id }"
              >
                <button class="group-card-header" @click="selectGroup(group.id)">
                  <span class="group-card-main">
                    <span class="group-card-name">{{ group.name }}</span>
                    <span class="group-card-meta">{{ group.items.length }} 项 · {{ group.id }}</span>
                  </span>
                  <span class="group-card-actions">
                    <span class="outline-flag">组</span>
                  </span>
                </button>

                <div class="group-card-tools">
                  <button class="mini-btn" @click="selectGroup(group.id)">选中</button>
                  <button class="mini-btn" @click="ungroupById(group.id)">解组</button>
                  <button class="mini-btn danger" @click="deleteGroup(group.id)">删组</button>
                </div>

                <button
                  v-for="item in group.items"
                  :key="item.id"
                  class="outline-item outline-item--child"
                  :class="{ active: selectedIds.includes(item.id), primary: item.id === selectedId }"
                  @click="selectOutlineElement(item.id, $event as MouseEvent)"
                >
                  <span class="outline-icon" v-html="iconOf(item.type)"></span>
                  <span class="outline-main">
                    <span class="outline-name">{{ item.label || item.id }}</span>
                    <span class="outline-meta">{{ item.id }} · z{{ item.zIndex || 1 }}</span>
                  </span>
                  <span class="outline-flags">
                    <span v-if="item.visible === false" class="outline-flag">隐</span>
                    <span v-if="item.locked" class="outline-flag">锁</span>
                  </span>
                </button>
              </div>
            </template>

            <div v-if="ungroupedLayerItems.length > 0" class="group-card group-card--loose">
              <div class="group-card-header group-card-header--static">
                <span class="group-card-main">
                  <span class="group-card-name">未分组</span>
                  <span class="group-card-meta">{{ ungroupedLayerItems.length }} 项</span>
                </span>
              </div>

              <button
                v-for="item in ungroupedLayerItems"
                :key="item.id"
                class="outline-item outline-item--child"
                :class="{ active: selectedIds.includes(item.id), primary: item.id === selectedId }"
                @click="selectOutlineElement(item.id, $event as MouseEvent)"
              >
                <span class="outline-icon" v-html="iconOf(item.type)"></span>
                <span class="outline-main">
                  <span class="outline-name">{{ item.label || item.id }}</span>
                  <span class="outline-meta">{{ item.id }} · z{{ item.zIndex || 1 }}</span>
                </span>
                <span class="outline-flags">
                  <span v-if="item.visible === false" class="outline-flag">隐</span>
                  <span v-if="item.locked" class="outline-flag">锁</span>
                </span>
              </button>
            </div>
          </div>
        </template>
      </aside>
    </div>

    <div class="canvas-statusbar">
      <span>{{ statusText }}</span>
      <span>缩放 {{ zoomPercent }}</span>
      <span>单位 {{ rulerUnitLabel }}</span>
      <span>画布 {{ canvasSizeLabel }}</span>
      <span>元素 {{ elements.length }}</span>
      <span v-if="selectedElements.length > 1">
        多选 {{ selectedElements.length }} 项
      </span>
      <span v-else-if="sel">
        选中 {{ sel.id }} · {{ typeLabel(sel.type) }} · {{ sel.w.toFixed(1) }}% × {{ sel.h.toFixed(1) }}%
      </span>
      <span v-else>未选中元素</span>
    </div>

    <div v-if="previewVisible" class="preview-overlay" @click.self="previewVisible = false">
      <div class="preview-dialog">
        <div class="preview-header">
          <div>
            <div class="panel-title">预览</div>
            <div class="panel-subtitle">当前模板共 {{ pages.length }} 页</div>
          </div>
          <button class="panel-close" title="关闭预览" @click="previewVisible = false">×</button>
        </div>

        <div class="preview-body">
          <div v-for="page in pages" :key="'preview_' + page.id" class="preview-sheet">
            <div class="preview-sheet-title">{{ page.name }}</div>
            <div class="preview-shell" :style="previewShellStyle">
              <div class="preview-canvas" :style="previewCanvasStyle">
                <div class="canvas-paper"></div>

                <div
                  v-for="el in filterRenderableElements(page.elements)"
                  :key="'preview_' + page.id + '_' + el.id"
                  class="template-element preview-element"
                  :class="{ hidden: el.visible === false }"
                  :style="elementStyle(el)"
                >
                  <div class="element-content">
                    <template v-if="el.type === 'text'">
                      <div
                        class="text-element"
                        :style="textContentStyle(el)"
                        v-html="el.content || '文本'"
                      ></div>
                    </template>

                    <template v-else-if="el.type === 'watermark'">
                      <div class="watermark-element">
                        <div class="watermark-grid" :style="watermarkGridStyle(el)">
                          <div
                            v-for="tile in watermarkTiles(el)"
                            :key="`${page.id}_${el.id}_wm_${tile}`"
                            class="watermark-tile"
                            :style="watermarkTileStyle(el)"
                            v-html="el.content || '水印'"
                          ></div>
                        </div>
                      </div>
                    </template>

                    <template v-else-if="el.type === 'prefill'">
                      <div class="prefill-element" :style="textContentStyle(el)">
                        <span class="prefill-label">{{ el.label || '字段' }}：</span>
                        <span class="prefill-expr">{{ el.expr || '${field}' }}</span>
                      </div>
                    </template>

                    <template v-else-if="el.type === 'signature' || el.type === 'stamp'">
                      <div
                        class="handwrite-element"
                        :class="el.type"
                        :style="handwriteStyle(el)"
                      >
                        <span class="handwrite-label">
                          {{ el.placeholder || el.label || typeLabel(el.type) }}
                        </span>
                      </div>
                    </template>

                    <template v-else-if="el.type === 'table'">
                      <div class="table-element" :class="{ 'table-element--dynamic': isDynamicTable(el) }">
                        <div v-if="isDynamicTable(el)" class="table-dynamic-badge">动态高度</div>
                        <table>
                          <thead v-if="tableShowHeader(el)">
                            <tr>
                              <th
                                v-for="col in el.columns || []"
                                :key="col.field"
                                :style="tableHeaderCellStyle(el, col)"
                              >
                                {{ col.header }}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="rowIndex in tablePreviewRows(el)" :key="`preview_row_${rowIndex}`">
                              <td
                                v-for="col in el.columns || []"
                                :key="`${col.field}_${rowIndex}`"
                                class="virtual-cell"
                                :style="tableBodyCellStyle(el, col)"
                              >
                                {{ tablePreviewText(col, rowIndex) }}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </template>

                    <template v-else-if="el.type === 'image'">
                      <div class="image-element">
                        <img
                          :src="el.src || EMPTY_IMAGE"
                          :alt="el.label"
                          :style="imageStyle(el)"
                        />
                      </div>
                    </template>

                    <template v-else-if="el.type === 'divider'">
                      <div class="divider-element"></div>
                    </template>

                    <template v-else-if="el.type === 'shape'">
                      <div class="shape-element" :style="shapeStyle(el)">
                        <div
                          v-if="el.shapeType === 'line'"
                          class="shape-line"
                          :class="shapeLineClass(el)"
                          :style="shapeLineStyle(el)"
                        ></div>
                      </div>
                    </template>

                    <template v-else-if="el.type === 'region'">
                      <div class="region-element" :style="regionStyle(el)">
                        <span class="region-label" :style="regionLabelStyle(el)">
                          {{ el.regionCode || el.label || '区域' }}
                        </span>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import interact from 'interactjs'
import InlineTextEditor from './InlineTextEditor.vue'
import QuillEditor from './QuillEditor.vue'
import type {
  BorderConfig,
  CutoutShape,
  TemplateDefinition,
  TemplateElement,
  TemplateGuide,
  TemplateGroup,
  TemplatePage
} from './types'

const props = defineProps<{
  templateId?: string
  templateJson?: string
  value?: string
}>()

const emit = defineEmits<{
  saved: [data: { templateJson: string }]
  preview: [data: { templateJson: string }]
  updateTemplateJson: [value: string]
  'update:value': [value: string]
}>()

const CANVAS_W = ref(794)
const CANVAS_H = ref(1123)
const RULER_SIZE = 28
const PREVIEW_SCALE = 0.46
const MIN_SCALE = 0.4
const MAX_SCALE = 3
const GUIDE_SNAP_THRESHOLD = 6
const GRID_SNAP_THRESHOLD = 3
const GUIDE_DELETE_MARGIN = 32
const A4_WIDTH_CM = ref(21)
const A4_HEIGHT_CM = ref(29.7)

// 统一 px/cm 比率，保证水平/垂直标尺刻度一致
const pxPerCm = computed(() => CANVAS_W.value / A4_WIDTH_CM.value)

// 边缘提醒距离设置（可配置）
const edgeWarningDistance = ref(20) // 默认 20 像素
const edgeWarningUnit = ref<'px' | 'mm' | '%'>('px') // 单位

// 计算实际的边缘提醒距离（转换为像素）
const EDGE_DANGER_ZONE = computed(() => {
  const unit = edgeWarningUnit.value
  const value = edgeWarningDistance.value
  
  if (unit === 'px') {
    return value
  } else if (unit === 'mm') {
    // 毫米转像素：假设 96 DPI，1 英寸 = 25.4 毫米
    return value * 96 / 25.4
  } else {
    // 百分比：相对于画布短边
    const shortSide = Math.min(CANVAS_W.value, CANVAS_H.value)
    return shortSide * value / 100
  }
})

const REGION_PURPOSE_OPTIONS = [
  { value: 'ocr-text', label: 'OCR-文本', group: 'OCR识别' },
  { value: 'ocr-table', label: 'OCR-表格', group: 'OCR识别' },
  { value: 'ocr-template', label: 'OCR-模板', group: 'OCR识别' },
  { value: 'stain-detect', label: '污渍识别' },
  { value: 'tamper-detect', label: '篡改识别' },
  { value: 'stamp-detect', label: '印章检测' },
  { value: 'barcode', label: '条码/二维码识别' },
  { value: 'signature-detect', label: '签名检测' },
  { value: 'key-extraction', label: '关键字段提取' },
  { value: 'desensitize', label: '脱敏区域' },
  { value: 'quality-check', label: '质量检测' }
]

const REGION_PURPOSE_CONFIG_DEFAULTS: Record<string, Record<string, any>> = {
  'ocr-text': {
    language: 'mixed',
    confidenceThreshold: 60,
    textDirection: 'auto',
    preprocessing: ['denoise', 'binarize'],
    mergeLines: true
  },
  'ocr-table': {
    language: 'mixed',
    confidenceThreshold: 60,
    detectHeader: true,
    detectMergedCells: true,
    outputFormat: 'json',
    preprocessing: ['denoise']
  },
  'ocr-template': {
    matchMode: 'fuzzy',
    confidenceThreshold: 70,
    allowPartialMatch: false
  },
  'stain-detect': {
    stainTypes: ['general'],
    sensitivity: 'medium',
    minAreaPercent: 1,
    reportMode: 'binary'
  },
  'tamper-detect': {
    detectionMode: 'both',
    sensitivity: 'medium',
    checkMetadata: true,
    checkPixelAnomaly: true,
    checkFontConsistency: true
  },
  'stamp-detect': {
    stampType: 'any',
    detectColor: true,
    extractText: true,
    confidenceThreshold: 65
  },
  'barcode': {
    barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'pdf417', 'datamatrix', 'upca'],
    autoDetect: true,
    minConfidence: 70
  },
  'signature-detect': {
    detectionMode: 'presence',
    confidenceThreshold: 60,
    allowPrinted: false,
    multiSignature: false
  },
  'key-extraction': {
    fields: [],
    extractionMode: 'regex',
    postProcess: 'trim',
    strictValidation: false
  },
  'desensitize': {
    method: 'blur',
    keepPrefix: 0,
    keepSuffix: 0,
    replacementChar: '*',
    applyTo: 'text',
    blurRadius: 12,
    pixelateBlockSize: 8
  },
  'quality-check': {
    checks: ['resolution', 'contrast', 'blur'],
    minDpi: 150,
    minContrastRatio: 3,
    maxSkewDegrees: 2,
    completenessThreshold: 95,
    failAction: 'warn'
  }
}

const CANVAS_PRESETS = {
  'A4-portrait': { w: 794, h: 1123, label: 'A4 纵向', cmW: 21, cmH: 29.7 },
  'A4-landscape': { w: 1123, h: 794, label: 'A4 横向', cmW: 29.7, cmH: 21 },
  'A3-portrait': { w: 1123, h: 1587, label: 'A3 纵向', cmW: 29.7, cmH: 42 },
  'A3-landscape': { w: 1587, h: 1123, label: 'A3 横向', cmW: 42, cmH: 29.7 },
  'letter-portrait': { w: 816, h: 1054, label: 'Letter 纵向', cmW: 21.6, cmH: 27.9 },
  'letter-landscape': { w: 1054, h: 816, label: 'Letter 横向', cmW: 27.9, cmH: 21.6 }
} as const
const EMPTY_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
      <rect width="320" height="180" fill="#eef2f7"/>
      <path d="M40 135l52-58 42 38 52-72 94 92H40z" fill="#cdd6e3"/>
      <circle cx="108" cy="56" r="14" fill="#9fb0c8"/>
      <text x="160" y="160" text-anchor="middle" fill="#6b7280" font-size="18" font-family="Arial">图片预览</text>
    </svg>`
  )

const SVG_ICONS = {
  text: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 4h14M10 4v12M7 16h6"/></svg>',
  prefill: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="14" height="12" rx="2"/><path d="M6 10h8"/></svg>',
  watermark: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5h12v10H4z"/><path d="M6 8h8M6 12h8" opacity="0.55"/><path d="M5 15 15 5" opacity="0.7"/></svg>',
  signature: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 14c2-2.5 4-4 5-2.4S10 15 11.2 13 13.6 7.8 15.3 6.2 17 5.4 17 7.2s-1 3.4-2.2 4.4-2.6 1.8-4 2.4"/></svg>',
  stamp: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="10" r="6.4"/><circle cx="10" cy="10" r="3"/><path d="M10 3.2v13.6M3.2 10h13.6"/></svg>',
  table: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.8" y="3.2" width="14.4" height="13.6" rx="1.2"/><path d="M2.8 8h14.4M8 3.2v13.6M13.2 3.2v13.6"/></svg>',
  image: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="3" width="15" height="14" rx="1.5"/><circle cx="7" cy="8" r="1.4"/><path d="M3.7 15l4-4.8 3.1 3 3.2-4.1 2.3 2.8"/></svg>',
  divider: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 10h14"/></svg>',
  shape: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.2" y="4" width="13.6" height="10" rx="2"/><path d="M5 15h10" opacity="0.5"/></svg>',
  region: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="14" height="14" rx="1.6" stroke-dasharray="3 2"/><path d="M6 7h8M6 10h5" opacity="0.65"/></svg>'
}

const BTN_ICONS = {
  undo: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 5H3v3M3 5l3 3M15 13a6 6 0 0 0-6-6H3"/></svg>',
  redo: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 5h3v3M15 5l-3 3M3 13a6 6 0 0 1 6-6h6"/></svg>',
  duplicate: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="6" y="3" width="9" height="9" rx="1.2"/><rect x="3" y="6" width="9" height="9" rx="1.2"/></svg>',
  save: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 3h9l3 3v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M12 14v-4H6v4M6 3v3h5"/></svg>',
  preview: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M1 9s2.5-5 8-5 8 5 8 5-2.5 5-8 5-8-5-8-5z"/><circle cx="9" cy="9" r="2.6"/></svg>',
  export: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 2v10M5 8l4 4 4-4"/><path d="M3 13v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2"/></svg>',
  zoomIn: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="7.5" cy="7.5" r="4.4"/><path d="M11 11l4 4M7.5 5.2v4.6M5.2 7.5h4.6"/></svg>',
  zoomOut: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="7.5" cy="7.5" r="4.4"/><path d="M11 11l4 4M5.2 7.5h4.6"/></svg>',
  zoomReset: '<svg viewBox="0 0 18 18"><text x="9" y="13" text-anchor="middle" font-size="9" fill="currentColor" font-family="sans-serif" font-weight="700">1:1</text></svg>',
  fit: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3H3v3M12 3h3v3M3 12v3h3M15 12v3h-3"/><rect x="5.4" y="5.4" width="7.2" height="7.2" rx="1"/></svg>',
  guidesOn: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 5.5h12M5.5 3v12"/><path d="M9 3v12M3 9h12" opacity="0.45"/></svg>',
  guidesOff: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 5.5h12M5.5 3v12" opacity="0.45"/><path d="M4 14 14 4"/></svg>',
  clearGuides: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 5.5h12M5.5 3v12"/><path d="M11.5 11.5 15 15M15 11.5 11.5 15"/></svg>',
  alignLeft: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 3v12M7 5h7M7 9h5M7 13h7"/></svg>',
  alignCenter: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 3v12"/><path d="M5 5h8M6 9h6M4 13h10"/></svg>',
  alignRight: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 3v12M4 5h7M6 9h5M4 13h7"/></svg>',
  alignTop: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 4h12M5 7v7M9 7v5M13 7v7"/></svg>',
  alignMiddle: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 9h12"/><path d="M5 5v8M9 6v6M13 4v10"/></svg>',
  alignBottom: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 14h12"/><path d="M5 4v7M9 6v5M13 4v7"/></svg>',
  distributeHorizontal: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3.5 4v10M14.5 4v10"/><rect x="5.5" y="6" width="2.2" height="6" rx="0.6"/><rect x="10.3" y="6" width="2.2" height="6" rx="0.6"/></svg>',
  distributeVertical: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 3.5h10M4 14.5h10"/><rect x="6" y="5.5" width="6" height="2.2" rx="0.6"/><rect x="6" y="10.3" width="6" height="2.2" rx="0.6"/></svg>',
  group: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.8" y="5.5" width="6" height="6" rx="1"/><rect x="9.2" y="5.5" width="6" height="6" rx="1"/><path d="M8.8 8.5h0.4"/></svg>',
  ungroup: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.8" y="5.5" width="4.8" height="6" rx="1"/><rect x="10.4" y="5.5" width="4.8" height="6" rx="1"/><path d="M8.6 8.5h0.8" stroke-dasharray="1.4 1.4"/></svg>',
  empty: '<svg viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="5" y="7" width="34" height="30" rx="3"/><path d="M14 17h16M14 23h12M14 29h8"/></svg>',
  orientation: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="2" width="8" height="14" rx="1.2"/><circle cx="9" cy="13" r="1"/></svg>',
  orientationLandscape: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="5" width="14" height="8" rx="1.2"/><circle cx="13" cy="9" r="1"/></svg>',
  edgeWarnOn: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 9a7 7 0 0 1 14 0"/><path d="M4 9a5 5 0 0 1 10 0"/><circle cx="9" cy="9" r="2.5" fill="currentColor"/><path d="M9 16v1"/></svg>',
  edgeWarnOff: '<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.45"><path d="M2 9a7 7 0 0 1 14 0"/><path d="M4 9a5 5 0 0 1 10 0"/><circle cx="9" cy="9" r="2.5"/><path d="M9 16v1"/><path d="M3 3l12 12"/></svg>'
}

const elementTypes = [
  { type: 'text', label: '文本', icon: SVG_ICONS.text },
  { type: 'watermark', label: '水印', icon: SVG_ICONS.watermark },
  { type: 'signature', label: '签名', icon: SVG_ICONS.signature },
  { type: 'stamp', label: '盖章', icon: SVG_ICONS.stamp },
  { type: 'table', label: '表格', icon: SVG_ICONS.table },
  { type: 'image', label: '图片', icon: SVG_ICONS.image },
  { type: 'divider', label: '分隔线', icon: SVG_ICONS.divider },
  { type: 'shape', label: '图形', icon: SVG_ICONS.shape },
  { type: 'region', label: '绘制区域', icon: SVG_ICONS.region }
]

const typeLabelMap: Record<string, string> = {
  text: '文本',
  prefill: '预填',
  watermark: '水印',
  signature: '签名区',
  stamp: '盖章区',
  table: '表格',
  image: '图片',
  divider: '分隔线',
  shape: '图形',
  region: '绘制区域'
}

const definitionMeta = ref<Partial<TemplateDefinition>>({
  version: 1,
  displayName: ''
})
const scale = ref(1)
const selectedId = ref<string | null>(null)
const selectedIds = ref<string[]>([])
const inspectorGroupId = ref<string | null>(null)
const inspectorCollapsed = ref(false)
const panelTreeCollapsed = ref(false)
// 文本编辑器状态（由 InlineTextEditor 组件管理）
const editingTextElementId = ref<string | null>(null)
const pages = ref<TemplatePage[]>([createEmptyPage(1)])
const currentPageIdx = ref(0)
const undoStack = ref<string[]>([])
const redoStack = ref<string[]>([])
const previewVisible = ref(false)
const dirty = ref(false)
const showRegions = ref(true)
const purposeConfigExpanded = ref<Record<string, boolean>>({})
const canvasSizePreset = ref('A4-portrait')
const canvasSizeCustom = ref<{ w: number; h: number } | null>(null)
const showQrMarkers = ref(true)
const showBleedGuides = ref(true)
const statusHint = ref('拖拽左侧元素到画布，双击文本直接编辑')
const lastSavedAt = ref<string | null>(null)
const renamingPageIdx = ref<number | null>(null)
const pageNameDraft = ref('')
const pageDropdownOpen = ref(false)
const pageSearchQuery = ref('')
const pageSearchInputRef = ref<HTMLInputElement | null>(null)
const lastSyncedJson = ref('')
const sidebarDragType = ref<string | null>(null)
const guidesVisible = ref(true)
const activeGuideId = ref<string | null>(null)
const draftGuide = ref<TemplateGuide | null>(null)
const guideSnapIndicator = ref<TemplateGuide | null>(null)
const edgeDangerSide = ref<string | null>(null)
const edgeWarningEnabled = ref(true)
const selectedCutoutId = ref<string | null>(null)
const draggingCutoutId = ref<string | null>(null)
const cutoutDragStart = ref<{ elX: number; elY: number; mouseX: number; mouseY: number } | null>(null)
const rulerUnit = ref<'percent' | 'px' | 'cm'>('cm')
const propUnit = ref<'percent' | 'px' | 'cm'>('px')
const selectionBox = ref<{
  left: number
  top: number
  width: number
  height: number
} | null>(null)

const editorRootRef = ref<HTMLElement | null>(null)
const viewportRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLElement | null>(null)
const pageNameInputRef = ref<HTMLInputElement | null>(null)

const incomingTemplateJson = computed(() => props.templateJson ?? props.value ?? '')
const currentPage = computed(() => pages.value[currentPageIdx.value] ?? null)
const elements = computed<TemplateElement[]>({
  get: () => currentPage.value?.elements ?? [],
  set: (value) => {
    if (currentPage.value) {
      currentPage.value.elements = value
    }
  }
})
const canvasRenderableElements = computed(() =>
  elements.value.filter(item => showRegions.value || item.type !== 'region')
)
const guides = computed<TemplateGuide[]>({
  get: () => currentPage.value?.guides ?? [],
  set: (value) => {
    if (currentPage.value) {
      currentPage.value.guides = value
    }
  }
})
const groups = computed<TemplateGroup[]>({
  get: () => currentPage.value?.groups ?? [],
  set: (value) => {
    if (currentPage.value) {
      currentPage.value.groups = value
    }
  }
})
const sel = computed(() => elements.value.find(item => item.id === selectedId.value) || null)
const selectedElements = computed(() =>
  selectedIds.value
    .map(id => elements.value.find(item => item.id === id) || null)
    .filter(Boolean) as TemplateElement[]
)
const hasGroupedSelection = computed(() =>
  selectedElements.value.some(item => !!item.groupId)
)
const selectedGroupId = computed(() => {
  if (selectedElements.value.length === 0) {
    return null
  }

  const groupIds = [...new Set(selectedElements.value.map(item => item.groupId).filter(Boolean))]
  return groupIds.length === 1 && selectedElements.value.every(item => item.groupId === groupIds[0])
    ? groupIds[0] as string
    : null
})
const inspectorGroup = computed(() =>
  inspectorGroupId.value
    ? groups.value.find(group => group.id === inspectorGroupId.value) || null
    : null
)
const groupPanels = computed(() => {
  const groupMap = new Map(groups.value.map(group => [group.id, group]))
  const usedGroupIds = [...new Set(elements.value.map(item => item.groupId).filter(Boolean))] as string[]

  return usedGroupIds.map(groupId => {
    const items = layerItems.value.filter(item => item.groupId === groupId)
    const meta = groupMap.get(groupId)
    return {
      id: groupId,
      name: meta?.name || `分组 ${groupId.slice(-4)}`,
      items
    }
  })
})
const ungroupedLayerItems = computed(() =>
  layerItems.value.filter(item => !item.groupId)
)
const zoomPercent = computed(() => `${Math.round(scale.value * 100)}%`)
const isLandscape = computed(() => CANVAS_W.value > CANVAS_H.value)
const currentPageLabel = computed(() => currentPage.value?.name || `第${currentPageIdx.value + 1}页`)
const pageCountLabel = computed(() => `${pages.value.length} 页`)
const filteredPages = computed(() => {
  const q = pageSearchQuery.value.trim().toLowerCase()
  if (!q) return pages.value.map((p, i) => ({ page: p, idx: i }))
  return pages.value
    .map((p, i) => ({ page: p, idx: i }))
    .filter(item => {
      const name = (item.page.name || `第${item.idx + 1}页`).toLowerCase()
      return name.includes(q)
    })
})
const splitPanelStyle = computed(() => ({
  gridTemplateRows: panelTreeCollapsed.value
    ? 'minmax(0, 1fr) auto'
    : 'minmax(0, 1fr) 280px'
}))
const rulerUnitLabel = computed(() => {
  if (rulerUnit.value === 'percent') {
    return '%'
  }
  if (rulerUnit.value === 'px') {
    return 'px'
  }
  return 'cm'
})
const canvasSizeLabel = computed(() => `${canvasSizePresetLabel.value} (${A4_WIDTH_CM.value} × ${A4_HEIGHT_CM.value} cm)`)
const scaledCanvasWidth = computed(() => CANVAS_W.value * scale.value)
const scaledCanvasHeight = computed(() => CANVAS_H.value * scale.value)
const boardStyle = computed(() => ({
  gridTemplateColumns: `${RULER_SIZE}px ${scaledCanvasWidth.value}px`,
  gridTemplateRows: `${RULER_SIZE}px ${scaledCanvasHeight.value}px`
}))
const canvasShellStyle = computed(() => ({
  width: `${scaledCanvasWidth.value}px`,
  height: `${scaledCanvasHeight.value}px`
}))
const canvasStyle = computed(() => ({
  width: `${CANVAS_W.value}px`,
  height: `${CANVAS_H.value}px`,
  transform: `scale(${scale.value})`
}))
const selectionBoxStyle = computed(() => {
  if (!selectionBox.value) {
    return {}
  }

  return {
    left: `${selectionBox.value.left}px`,
    top: `${selectionBox.value.top}px`,
    width: `${selectionBox.value.width}px`,
    height: `${selectionBox.value.height}px`
  }
})
const previewShellStyle = computed(() => ({
  width: `${CANVAS_W.value * PREVIEW_SCALE}px`,
  height: `${CANVAS_H.value * PREVIEW_SCALE}px`
}))
const previewCanvasStyle = computed(() => ({
  width: `${CANVAS_W.value}px`,
  height: `${CANVAS_H.value}px`,
  transform: `scale(${PREVIEW_SCALE})`
}))
const horizontalRulerMarks = computed(() => buildRulerMarks(CANVAS_W.value, 'x'))
const verticalRulerMarks = computed(() => buildRulerMarks(CANVAS_H.value, 'y'))
const verticalGuides = computed(() => guides.value.filter(guide => guide.axis === 'x'))
const horizontalGuides = computed(() => guides.value.filter(guide => guide.axis === 'y'))

const canvasSizePresetLabel = computed(() => {
  const p = CANVAS_PRESETS[canvasSizePreset.value as keyof typeof CANVAS_PRESETS]
  return p?.label || '自定义'
})

const qrSize = computed(() => Math.round(12 / 25.4 * 96))
const qrMargin = computed(() => Math.round(12 / 25.4 * 96))
const trimPx = computed(() => Math.round(3 / 25.4 * 96))
const bleedPx = computed(() => Math.round(5 / 25.4 * 96))

const trimLineStyle = computed(() => {
  const t = trimPx.value
  return {
    top: `${t}px`, left: `${t}px`,
    width: `${CANVAS_W.value - t * 2}px`,
    height: `${CANVAS_H.value - t * 2}px`
  }
})
const bleedLineStyle = computed(() => {
  const b = bleedPx.value
  return {
    top: `${b}px`, left: `${b}px`,
    width: `${CANVAS_W.value - b * 2}px`,
    height: `${CANVAS_H.value - b * 2}px`
  }
})

function qrMarkerStyle(corner: 'tl' | 'tr' | 'bl' | 'br') {
  const s = qrSize.value
  const m = qrMargin.value
  switch (corner) {
    case 'tl': return { top: `${m}px`, left: `${m}px`, width: `${s}px`, height: `${s}px` }
    case 'tr': return { top: `${m}px`, right: `${m}px`, width: `${s}px`, height: `${s}px` }
    case 'bl': return { bottom: `${m}px`, left: `${m}px`, width: `${s}px`, height: `${s}px` }
    case 'br': return { bottom: `${m}px`, right: `${m}px`, width: `${s}px`, height: `${s}px` }
  }
}

function onCanvasSizeChange() {
  const key = canvasSizePreset.value as keyof typeof CANVAS_PRESETS
  const preset = CANVAS_PRESETS[key]
  if (preset) {
    CANVAS_W.value = preset.w
    CANVAS_H.value = preset.h
    A4_WIDTH_CM.value = preset.cmW
    A4_HEIGHT_CM.value = preset.cmH
  }
}

function toggleOrientation() {
  const tmp = CANVAS_W.value
  CANVAS_W.value = CANVAS_H.value
  CANVAS_H.value = tmp
  const tmpCm = A4_WIDTH_CM.value
  A4_WIDTH_CM.value = A4_HEIGHT_CM.value
  A4_HEIGHT_CM.value = tmpCm
  const key = canvasSizePreset.value as keyof typeof CANVAS_PRESETS
  const preset = CANVAS_PRESETS[key]
  if (preset && preset.w === CANVAS_W.value && preset.h === CANVAS_H.value) {
    // orientation matched a preset
  } else {
    // try to find matching preset
    for (const [k, v] of Object.entries(CANVAS_PRESETS)) {
      if (v.w === CANVAS_W.value && v.h === CANVAS_H.value) {
        canvasSizePreset.value = k
        return
      }
    }
  }
}

const guideDragTooltipText = computed(() => {
  if (!draftGuide.value) return ''
  const pos = draftGuide.value.position
  const axis = draftGuide.value.axis
  const label = formatRulerLabel(axis, pos)
  const unit = rulerUnit.value
  if (unit === 'percent') return `${label}%`
  if (unit === 'px') return `${label}px`
  return `${label}cm`
})

const guideDragTooltipStyle = computed(() => {
  if (!draftGuide.value) return {}
  if (draftGuide.value.axis === 'x') {
    return { left: `${draftGuide.value.position * scale.value}px`, top: '0px' }
  }
  return { top: `${draftGuide.value.position * scale.value}px`, left: '0px' }
})
const layerItems = computed(() =>
  [...elements.value]
    .map((item, index) => ({ ...item, _order: index }))
    .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1) || a._order - b._order)
)
const statusText = computed(() => {
  if (dirty.value) {
    return '有未保存修改'
  }
  if (lastSavedAt.value) {
    return `最近保存 ${lastSavedAt.value}`
  }
  return statusHint.value
})

watch(incomingTemplateJson, (json) => {
  if (!json) {
    if (lastSyncedJson.value) {
      resetEditor()
    }
    return
  }

  if (json === lastSyncedJson.value) {
    return
  }

  loadFromJson(json)
}, { immediate: true })

// 文本编辑现在由 InlineTextEditor 组件内部管理

function createEmptyPage(index: number): TemplatePage {
  return {
    id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}_${index}`,
    name: `第${index}页`,
    elements: [],
    guides: [],
    groups: []
  }
}

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function filterRenderableElements(items: TemplateElement[]) {
  return items.filter(item => showRegions.value || item.type !== 'region')
}

function resetEditor() {
  definitionMeta.value = {
    version: 1,
    displayName: ''
  }
  pages.value = [createEmptyPage(1)]
  currentPageIdx.value = 0
  selectedId.value = null
  selectedIds.value = []
  inspectorGroupId.value = null
  editingTextElementId.value = null
  renamingPageIdx.value = null
  pageNameDraft.value = ''
  guidesVisible.value = true
  showRegions.value = true
  activeGuideId.value = null
  draftGuide.value = null
  guideSnapIndicator.value = null
  previewVisible.value = false
  undoStack.value = []
  redoStack.value = []
  dirty.value = false
  statusHint.value = '已初始化空白模板'
  lastSavedAt.value = null
  lastSyncedJson.value = ''
  refreshInteract()
}

function loadFromJson(json: string) {
  try {
    const parsed = JSON.parse(json) as TemplateDefinition
    const loadedPages = parsed.pages && parsed.pages.length > 0
      ? parsed.pages
      : [{ id: 'p1', name: '第1页', elements: parsed.elements || [] }]

    pages.value = loadedPages.map(page => ({
      id: page.id,
      name: page.name,
      elements: cloneData(page.elements || []),
      guides: cloneData(page.guides || []),
      groups: cloneData(page.groups || [])
    }))
    pages.value.forEach(page => normalizeGroupsForPage(page))

    if (pages.value.length === 0) {
      pages.value = [createEmptyPage(1)]
    }

    definitionMeta.value = {
      templateId: parsed.templateId,
      version: parsed.version || 1,
      displayName: parsed.displayName || '',
      category: parsed.category,
      pageSize: parsed.pageSize,
      orientation: parsed.orientation,
      dataSets: parsed.dataSets,
      fixedLayerSha256: parsed.fixedLayerSha256
    }

    currentPageIdx.value = 0
    selectedId.value = null
    selectedIds.value = []
    inspectorGroupId.value = null
    editingTextElementId.value = null
    renamingPageIdx.value = null
    pageNameDraft.value = ''
    guidesVisible.value = true
    showRegions.value = true
    activeGuideId.value = null
    draftGuide.value = null
    guideSnapIndicator.value = null
    previewVisible.value = false
    undoStack.value = []
    redoStack.value = []
    dirty.value = false
    statusHint.value = '模板已加载'
    lastSavedAt.value = null
    lastSyncedJson.value = json
    refreshInteract()
  } catch {
    resetEditor()
  }
}

function toJson() {
  const template: TemplateDefinition = {
    templateId: props.templateId || definitionMeta.value.templateId || '',
    version: definitionMeta.value.version || 1,
    displayName: definitionMeta.value.displayName || '',
    elements: cloneData(elements.value),
    pages: pages.value.map(page => ({
      id: page.id,
      name: page.name,
      elements: cloneData(page.elements),
      guides: cloneData(page.guides || []),
      groups: cloneData(page.groups || [])
    }))
  }

  if (definitionMeta.value.category) {
    template.category = definitionMeta.value.category
  }
  if (definitionMeta.value.pageSize) {
    template.pageSize = definitionMeta.value.pageSize
  }
  if (definitionMeta.value.orientation) {
    template.orientation = definitionMeta.value.orientation
  }
  if (definitionMeta.value.dataSets) {
    template.dataSets = cloneData(definitionMeta.value.dataSets)
  }
  if (definitionMeta.value.fixedLayerSha256) {
    template.fixedLayerSha256 = definitionMeta.value.fixedLayerSha256
  }

  return JSON.stringify(template, null, 2)
}

function formatRulerLabel(axis: 'x' | 'y', offset: number) {
  if (rulerUnit.value === 'percent') {
    const base = axis === 'x' ? CANVAS_W.value : CANVAS_H.value
    return `${Math.round((offset / base) * 100)}`
  }

  if (rulerUnit.value === 'px') {
    return String(offset)
  }

  const value = offset / pxPerCm.value
  return value.toFixed(value >= 10 ? 0 : 1)
}

function buildRulerMarks(length: number, axis: 'x' | 'y') {
  const marks: Array<{ key: string; position: number; label: string; major: boolean }> = []
  const unit = rulerUnit.value

  if (unit === 'cm') {
    const cmTotal = axis === 'x' ? A4_WIDTH_CM.value : A4_HEIGHT_CM.value
    const ppm = pxPerCm.value
    for (let cm = 0; ; cm++) {
      const offset = cm * ppm
      if (offset > length) break
      marks.push({
        key: `${length}_${cm}cm`,
        position: offset * scale.value,
        label: String(cm),
        major: true
      })
    }
  } else if (unit === 'px') {
    // 只显示 50px 的大刻度
    const step = 50
    for (let offset = 0; offset <= length; offset += step) {
      marks.push({
        key: `${length}_${offset}`,
        position: offset * scale.value,
        label: formatRulerLabel(axis, offset),
        major: true
      })
    }
  } else {
    // percent 模式：每 10% 一个刻度，全部显示标签
    const step = length * 0.1
    for (let offset = 0; offset <= length; offset += step) {
      marks.push({
        key: `${length}_${offset}`,
        position: offset * scale.value,
        label: formatRulerLabel(axis, offset),
        major: true
      })
    }
  }
  return marks
}

function cycleRulerUnit() {
  rulerUnit.value =
    rulerUnit.value === 'cm'
      ? 'px'
      : rulerUnit.value === 'px'
        ? 'percent'
        : 'cm'
}

function cyclePropUnit() {
  propUnit.value =
    propUnit.value === 'px'
      ? 'cm'
      : propUnit.value === 'cm'
        ? 'percent'
        : 'px'
}

function percentToUnit(percent: number, axis: 'x' | 'y') {
  const canvasDim = axis === 'x' ? CANVAS_W.value : CANVAS_H.value
  if (propUnit.value === 'px') {
    return +(percent * canvasDim / 100).toFixed(1)
  }
  if (propUnit.value === 'cm') {
    const cmTotal = axis === 'x' ? A4_WIDTH_CM.value : A4_HEIGHT_CM.value
    return +((percent / 100) * cmTotal).toFixed(2)
  }
  return +percent.toFixed(1)
}

function unitToPercent(value: number, axis: 'x' | 'y') {
  if (propUnit.value === 'px') {
    const canvasDim = axis === 'x' ? CANVAS_W.value : CANVAS_H.value
    return (value / canvasDim) * 100
  }
  if (propUnit.value === 'cm') {
    const cmTotal = axis === 'x' ? A4_WIDTH_CM.value : A4_HEIGHT_CM.value
    return (value / cmTotal) * 100
  }
  return value
}

function snapshotPageState() {
  return JSON.stringify({
    elements: cloneData(elements.value),
    guides: cloneData(guides.value),
    groups: cloneData(groups.value)
  })
}

function pushUndoSnapshot() {
  const snapshot = snapshotPageState()
  if (undoStack.value[undoStack.value.length - 1] === snapshot) {
    return
  }

  undoStack.value.push(snapshot)
  if (undoStack.value.length > 50) {
    undoStack.value.shift()
  }
  redoStack.value = []
}

function applySnapshot(snapshot: string) {
  const parsed = JSON.parse(snapshot)
  elements.value = parsed.elements || []
  guides.value = parsed.guides || []
  groups.value = parsed.groups || []
  selectedId.value = null
  selectedIds.value = []
  inspectorGroupId.value = null
  editingTextElementId.value = null
  activeGuideId.value = null
  draftGuide.value = null
  guideSnapIndicator.value = null
  refreshInteract()
}

function markDirty(message = '有未保存修改') {
  dirty.value = true
  statusHint.value = message
}

function refreshInteract() {
  nextTick(() => {
    setupInteract()
  })
}

function togglePageDropdown() {
  pageDropdownOpen.value = !pageDropdownOpen.value
  if (pageDropdownOpen.value) {
    pageSearchQuery.value = ''
    nextTick(() => {
      pageSearchInputRef.value?.focus()
    })
  }
}

function closePageDropdown() {
  pageDropdownOpen.value = false
  pageSearchQuery.value = ''
}

function selectPage(index: number) {
  closePageDropdown()
  switchPage(index)
}

function switchPage(index: number) {
  if (index < 0 || index >= pages.value.length || index === currentPageIdx.value) {
    return
  }

  currentPageIdx.value = index
  selectedId.value = null
  selectedIds.value = []
  inspectorGroupId.value = null
  editingTextElementId.value = null
  renamingPageIdx.value = null
  pageNameDraft.value = ''
  undoStack.value = []
  redoStack.value = []
  statusHint.value = `已切换到 ${pages.value[index].name}`
  refreshInteract()
}

function addPage() {
  pages.value.push(createEmptyPage(pages.value.length + 1))
  currentPageIdx.value = pages.value.length - 1
  selectedId.value = null
  selectedIds.value = []
  inspectorGroupId.value = null
  editingTextElementId.value = null
  renamingPageIdx.value = null
  undoStack.value = []
  redoStack.value = []
  markDirty('已新增页面')
  refreshInteract()
}

function removePage(index: number) {
  if (pages.value.length <= 1) {
    return
  }

  const nextIndex = currentPageIdx.value === index
    ? Math.min(index, pages.value.length - 2)
    : currentPageIdx.value > index
      ? currentPageIdx.value - 1
      : currentPageIdx.value

  pages.value.splice(index, 1)
  currentPageIdx.value = Math.max(0, nextIndex)
  selectedId.value = null
  selectedIds.value = []
  inspectorGroupId.value = null
  editingTextElementId.value = null
  renamingPageIdx.value = null
  undoStack.value = []
  redoStack.value = []
  markDirty('已删除页面')
  refreshInteract()
}

function beginRenamePage(index: number) {
  renamingPageIdx.value = index
  pageNameDraft.value = pages.value[index]?.name || ''
  nextTick(() => {
    pageNameInputRef.value?.focus()
    pageNameInputRef.value?.select()
  })
}

function commitRenamePage() {
  if (renamingPageIdx.value === null) {
    return
  }

  const index = renamingPageIdx.value
  const nextName = pageNameDraft.value.trim() || `第${index + 1}页`
  if (pages.value[index] && pages.value[index].name !== nextName) {
    pages.value[index].name = nextName
    markDirty('已更新页面标题')
  }

  renamingPageIdx.value = null
  pageNameDraft.value = ''
}

function cancelRenamePage() {
  renamingPageIdx.value = null
  pageNameDraft.value = ''
}

function undo() {
  if (undoStack.value.length === 0) {
    return
  }

  redoStack.value.push(snapshotPageState())
  applySnapshot(undoStack.value.pop()!)
  markDirty('已撤销')
}

function redo() {
  if (redoStack.value.length === 0) {
    return
  }

  undoStack.value.push(snapshotPageState())
  applySnapshot(redoStack.value.pop()!)
  markDirty('已重做')
}

function elementStyle(el: TemplateElement) {
  const baseOpacity = clamp(typeof el.opacity === 'number' ? el.opacity : 1, 0, 1)
  const style: Record<string, string | number> = {
    left: `${el.x}%`,
    top: `${el.y}%`,
    width: `${el.w}%`,
    height: `${el.h}%`,
    zIndex: el.zIndex || 1,
    opacity: el.visible === false ? Math.min(baseOpacity, 0.35) : baseOpacity
  }

  // 应用边框配置
  const border = elementBorderConfig(el)
  if ((border.width || 0) > 0 && el.type !== 'shape') {
    if (border.position === 'inside') {
      // 内部边框：solid 使用内阴影自动跟随圆角；dashed/dotted 降级为 border
      if (border.style === 'solid') {
        style.boxShadow = `inset 0 0 0 ${border.width}px ${border.color}`
      } else {
        style.border = `${border.width}px ${border.style} ${border.color}`
      }
      style.boxSizing = 'border-box'
    } else if (border.position === 'outside') {
      // 外部边框：统一使用 box-shadow，避免 outline 与 selected 状态冲突，且各浏览器兼容性最好
      // 虚线/点线效果在"居中"或"内部"位置可用 border 属性渲染
      style.boxShadow = `0 0 0 ${border.width}px ${border.color}`
    } else {
      // center: 标准 border 渲染
      style.border = `${border.width}px ${border.style} ${border.color}`
      style.boxSizing = 'border-box'
    }

    // 边框间距
    if ((border.padding || 0) > 0) {
      style.padding = `${border.padding}px`
    }
  }

  return style
}

function textContentStyle(el: TemplateElement) {
  const style: Record<string, string> = {
    fontSize: `${el.fontSize || 14}px`,
    fontWeight: el.fontWeight || 'normal',
    textAlign: el.textAlign || 'left',
    color: el.color || '#1f2937',
    width: '100%',
    height: '100%',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap'
  }
  
  if (el.fontFamily) {
    style.fontFamily = el.fontFamily
  }
  if (el.lineHeight) {
    style.lineHeight = String(el.lineHeight)
  }
  if (el.letterSpacing) {
    style.letterSpacing = `${el.letterSpacing}px`
  }
  
  return style
}

function handwriteStyle(el: TemplateElement) {
  const borderColor = el.borderColor || '#dd524c'
  return {
    borderColor,
    color: borderColor
  }
}

function stripHtml(html?: string) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function watermarkGapX(el: TemplateElement) {
  return clamp(intNumFromValue(el.tileGapX, 48), 0, 400)
}

function watermarkGapY(el: TemplateElement) {
  return clamp(intNumFromValue(el.tileGapY, 36), 0, 400)
}

function watermarkTileMetrics(el: TemplateElement) {
  const fontSize = clamp(intNumFromValue(el.fontSize, 24), 8, 96)
  const plainText = stripHtml(el.content)
  const charCount = clamp(plainText.length || 4, 4, 16)
  const boxWidth = Math.max(120, Math.round((el.w / 100) * CANVAS_W.value))
  const boxHeight = Math.max(52, Math.round((el.h / 100) * CANVAS_H.value))
  return {
    width: clamp(Math.round(fontSize * charCount * 0.72), 120, boxWidth),
    height: clamp(Math.round(fontSize * 3.1), 52, boxHeight)
  }
}

function watermarkTiles(el: TemplateElement) {
  const boxWidth = Math.max(1, Math.round((el.w / 100) * CANVAS_W.value))
  const boxHeight = Math.max(1, Math.round((el.h / 100) * CANVAS_H.value))
  const { width, height } = watermarkTileMetrics(el)
  const gapX = watermarkGapX(el)
  const gapY = watermarkGapY(el)
  const columns = Math.max(1, Math.ceil((boxWidth + gapX) / (width + gapX)))
  const rows = Math.max(1, Math.ceil((boxHeight + gapY) / (height + gapY)))
  const total = Math.min(64, Math.max(1, (columns + 1) * (rows + 1)))
  return Array.from({ length: total }, (_, index) => index)
}

function watermarkGridStyle(el: TemplateElement) {
  return {
    columnGap: `${watermarkGapX(el)}px`,
    rowGap: `${watermarkGapY(el)}px`
  }
}

function watermarkTileStyle(el: TemplateElement) {
  const { width, height } = watermarkTileMetrics(el)
  return {
    width: `${width}px`,
    minHeight: `${height}px`,
    fontSize: `${clamp(intNumFromValue(el.fontSize, 24), 8, 96)}px`,
    fontWeight: el.fontWeight || 'bold',
    color: el.color || '#94a3b8',
    textAlign: el.textAlign || 'center',
    transform: `rotate(${clamp(intNumFromValue(el.rotation, -25), -360, 360)}deg)`
  }
}

function rgbaColor(color: string | undefined, alpha: number) {
  const fallback = `rgba(59, 130, 246, ${alpha})`
  if (!color) {
    return fallback
  }

  const hex = color.replace('#', '')
  if (hex.length === 3) {
    const [r, g, b] = hex.split('')
    return `rgba(${parseInt(r + r, 16)}, ${parseInt(g + g, 16)}, ${parseInt(b + b, 16)}, ${alpha})`
  }
  if (hex.length === 6) {
    return `rgba(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)}, ${alpha})`
  }
  return fallback
}

function regionColor(el: TemplateElement) {
  return el.regionColor || '#3b82f6'
}

function regionStyle(el: TemplateElement) {
  const color = regionColor(el)
  return {
    border: `2px dashed ${color}`,
    background: rgbaColor(color, 0.08),
    boxShadow: `inset 0 0 0 1px ${rgbaColor(color, 0.12)}`
  }
}

function regionLabelStyle(el: TemplateElement) {
  return {
    background: regionColor(el)
  }
}

function shapeStyle(el: TemplateElement) {
  const strokeColor = el.strokeColor || '#22324c'
  const strokeWidth = el.strokeWidth || 2
  const strokeStyle = el.strokeStyle || 'solid'
  const fillColor = el.shapeType === 'line' ? 'transparent' : (el.fillColor || 'transparent')
  const borderRadius =
    el.shapeType === 'circle'
      ? '999px'
      : el.shapeType === 'roundRect'
        ? `${el.cornerRadius || 16}px`
        : '0'

  return {
    border: el.shapeType === 'line' ? 'none' : `${strokeWidth}px ${strokeStyle} ${strokeColor}`,
    background: fillColor,
    borderRadius
  }
}

function shapeLineClass(el: TemplateElement) {
  return `dir-${el.lineDirection || 'horizontal'}`
}

function shapeLineStyle(el: TemplateElement) {
  const strokeColor = el.strokeColor || '#22324c'
  const strokeWidth = el.strokeWidth || 2
  const strokeStyle = el.strokeStyle || 'solid'
  return {
    borderColor: strokeColor,
    borderTopWidth: `${strokeWidth}px`,
    borderTopStyle: strokeStyle
  }
}

function imageObjectFit(fit?: string) {
  return fit === 'stretch' ? 'fill' : fit || 'contain'
}

function imageStyle(el: TemplateElement) {
  return `object-fit: ${imageObjectFit(el.fit)};`
}

/* ── 挖空区域 ── */

function nextCutoutId() {
  return `cut_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

/** 复合 clip-path：外边界顺时针 + 每个挖空逆时针绕圈 → 形成洞 */
function compoundClipPath(cutouts: CutoutShape[] | undefined): string | null {
  if (!cutouts || cutouts.length === 0) return null
  const pts: string[] = ['0% 0%', '100% 0%', '100% 100%', '0% 100%']
  for (const co of cutouts) {
    if (co.type === 'rect') {
      const x1 = co.x, y1 = co.y, x2 = co.x + co.w, y2 = co.y + co.h
      // 逆时针绕行 → 在 clip-path non-zero 规则下形成洞
      pts.push(`${x1}% ${y1}%`, `${x2}% ${y1}%`, `${x2}% ${y2}%`, `${x1}% ${y2}%`)
    } else if (co.type === 'circle') {
      const cx = co.x + co.w / 2, cy = co.y + co.h / 2, rx = co.w / 2, ry = co.h / 2
      const steps = 16
      for (let i = steps; i >= 0; i--) {
        const a = (i / steps) * Math.PI * 2
        pts.push(`${(cx + rx * Math.cos(a)).toFixed(2)}% ${(cy + ry * Math.sin(a)).toFixed(2)}%`)
      }
    } else if (co.type === 'polygon' && co.polygon && co.polygon.length >= 3) {
      const reversed = [...co.polygon].reverse()
      for (const p of reversed) {
        pts.push(`${(co.x + p.x * co.w / 100)}% ${(co.y + p.y * co.h / 100)}%`)
      }
    }
  }
  return `polygon(${pts.join(', ')})`
}

function addCutout(el: TemplateElement, type: CutoutShape['type']) {
  if (!el.cutouts) el.cutouts = []
  pushUndoSnapshot()
  
  // 判断应该放在左边还是右边（根据已有挖空交替放置）
  const existingLeft = el.cutouts.filter((c: CutoutShape) => c.x < 50).length
  const existingRight = el.cutouts.filter((c: CutoutShape) => c.x >= 50).length
  
  // 放在较少的一边
  const isLeft = existingLeft <= existingRight
  
  const size = { w: 25, h: 35 }
  const co: CutoutShape = {
    id: nextCutoutId(),
    type: 'rect',
    x: isLeft ? 0 : 100 - size.w, // 紧贴左边缘或右边缘
    y: 5 + (isLeft ? existingLeft : existingRight) * 25, // 垂直方向错开
    w: size.w,
    h: size.h
  }
  el.cutouts.push(co)
  selectedCutoutId.value = co.id
  markDirty('添加挖空区域')
}

function deleteCutout(el: TemplateElement, cutoutId: string) {
  if (!el.cutouts) return
  pushUndoSnapshot()
  el.cutouts = el.cutouts.filter((c: CutoutShape) => c.id !== cutoutId)
  if (selectedCutoutId.value === cutoutId) selectedCutoutId.value = null
  markDirty('删除挖空')
}

// 计算挖空浮动元素的样式（用于文字环绕）
// 关键：浮动元素必须紧贴边缘，margin-top 控制垂直位置
function cutoutFloatStyle(el: TemplateElement, co: CutoutShape): Record<string, string> {
  const isLeft = co.x < 50

  // CSS margin-top 百分比相对于包含块宽度，但 co.y 是相对于元素高度的百分比
  // 需转换为像素比：correctedMargin% = co.y * (elementHeightPx / elementWidthPx)
  // elementHeightPx = el.h% * CANVAS_H, elementWidthPx = el.w% * CANVAS_W
  const aspectCompensation = (el.h * CANVAS_H.value) / (el.w * CANVAS_W.value)
  const correctedMarginTop = co.y * aspectCompensation

  return {
    float: isLeft ? 'left' : 'right',
    width: `${co.w}%`,
    height: `${co.h}%`,
    marginTop: `${correctedMarginTop}%`,
    background: 'transparent',
    shapeOutside: 'border-box',
    shapeMargin: '0px',
    boxSizing: 'border-box'
  }
}

// 判断是否需要在挖空之间清除浮动
function shouldClearFloat(cutouts: CutoutShape[], currentIndex: number): boolean {
  // 不再自动清除浮动，让布局更自然
  return false
}

// 获取文本容器的样式（处理多个挖空的布局）
function getTextWrapStyle(el: TemplateElement): Record<string, string> {
  const style: Record<string, string> = {
    width: '100%',
    height: '100%'
  }
  
  // 如果有挖空，确保容器可以正确处理浮动
  if (el.cutouts && el.cutouts.length > 0) {
    style.overflow = 'hidden'
  }
  
  return style
}

function cutoutStyle(co: CutoutShape) {
  return {
    left: `${co.x}%`,
    top: `${co.y}%`,
    width: `${co.w}%`,
    height: `${co.h}%`
  }
}

function cutoutSvgPath(co: CutoutShape): string {
  if (co.type === 'rect') {
    return `M0 0 L100 0 L100 100 L0 100 Z`
  } else if (co.type === 'circle') {
    return `M50 0 A50 50 0 1 1 49.9 0 Z`
  } else if (co.type === 'polygon' && co.polygon) {
    return co.polygon.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ') + ' Z'
  }
  return ''
}

function isConcavePolygon(pts: { x: number; y: number }[]): boolean {
  if (pts.length < 3) return false
  let sign = 0
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const c = pts[(i + 2) % pts.length]
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (cross !== 0) {
      if (sign === 0) sign = cross > 0 ? 1 : -1
      else if ((cross > 0 ? 1 : -1) !== sign) return true
    }
  }
  return false
}

function nextGuideId(axis: 'x' | 'y') {
  return `guide_${axis}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

function guideStyle(guide: TemplateGuide) {
  if (guide.axis === 'x') {
    return { left: `${guide.position}px` }
  }
  return { top: `${guide.position}px` }
}

function toggleGuidesVisible() {
  guidesVisible.value = !guidesVisible.value
  statusHint.value = guidesVisible.value ? '已显示参考线' : '已隐藏参考线'
}

function clearGuides() {
  if (guides.value.length === 0) {
    return
  }

  pushUndoSnapshot()
  guides.value = []
  activeGuideId.value = null
  draftGuide.value = null
  guideSnapIndicator.value = null
  markDirty('已清除参考线')
}

function clampGuidePosition(axis: 'x' | 'y', position: number) {
  const max = axis === 'x' ? CANVAS_W.value : CANVAS_H.value
  return clamp(position, 0, max)
}

function roundGuidePosition(position: number) {
  return +position.toFixed(1)
}

function getUnitSnapTargets(axis: 'x' | 'y', position: number): number[] {
  const unit = rulerUnit.value
  const targets: number[] = []
  const range = GRID_SNAP_THRESHOLD

  if (unit === 'px') {
    const nearest = Math.round(position / 10) * 10
    if (Math.abs(nearest - position) <= range) targets.push(nearest)
  } else if (unit === 'cm') {
    const ppm = pxPerCm.value
    const cm = position / ppm
    const nearestCm = Math.round(cm / 0.5) * 0.5
    const nearestPx = nearestCm * ppm
    if (Math.abs(nearestPx - position) <= range) targets.push(nearestPx)
  } else {
    const pxTotal = axis === 'x' ? CANVAS_W.value : CANVAS_H.value
    const pct = (position / pxTotal) * 100
    const nearestPct = Math.round(pct / 5) * 5
    const nearestPx = (nearestPct / 100) * pxTotal
    if (Math.abs(nearestPx - position) <= range) targets.push(nearestPx)
  }

  return targets
}

function normalizeGuide(guide: TemplateGuide): TemplateGuide {
  return {
    ...guide,
    position: roundGuidePosition(clampGuidePosition(guide.axis, guide.position))
  }
}

function pointerToCanvasPosition(event: MouseEvent | PointerEvent) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) {
    return null
  }

  return {
    x: ((event.clientX - rect.left) / rect.width) * CANVAS_W.value,
    y: ((event.clientY - rect.top) / rect.height) * CANVAS_H.value
  }
}

function pointerDistanceOutsideCanvas(event: MouseEvent | PointerEvent) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) {
    return 0
  }

  const deltaLeft = rect.left - event.clientX
  const deltaTop = rect.top - event.clientY
  const deltaRight = event.clientX - rect.right
  const deltaBottom = event.clientY - rect.bottom

  return Math.max(0, deltaLeft, deltaTop, deltaRight, deltaBottom)
}

function clientToCanvasPoint(event: MouseEvent) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) {
    return null
  }

  const x = clamp(((event.clientX - rect.left) / rect.width) * CANVAS_W.value, 0, CANVAS_W.value)
  const y = clamp(((event.clientY - rect.top) / rect.height) * CANVAS_H.value, 0, CANVAS_H.value)
  return { x, y }
}

function intersectRect(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number }
) {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
}

function selectionHitIds(box: { left: number; top: number; right: number; bottom: number }) {
  const matched = canvasRenderableElements.value
    .filter(item => intersectRect(box, elementPixelBox(item)))
    .flatMap(item => getSelectionIdsForElement(item.id))

  return [...new Set(matched)]
}

function findGuideById(id: string) {
  return guides.value.find(guide => guide.id === id) || null
}

function elementPixelBox(el: TemplateElement) {
  const left = (el.x / 100) * CANVAS_W.value
  const top = (el.y / 100) * CANVAS_H.value
  const width = (el.w / 100) * CANVAS_W.value
  const height = (el.h / 100) * CANVAS_H.value
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    centerX: left + width / 2,
    centerY: top + height / 2,
    width,
    height
  }
}

function collectGuideCandidates(axis: 'x' | 'y', excludeId?: string) {
  const candidates = guides.value
    .filter(guide => guide.axis === axis && guide.id !== excludeId)
    .map(guide => guide.position)

  for (const el of canvasRenderableElements.value) {
    if (excludeId && el.id === excludeId) {
      continue
    }

    const box = elementPixelBox(el)
    if (axis === 'x') {
      candidates.push(box.left, box.centerX, box.right)
    } else {
      candidates.push(box.top, box.centerY, box.bottom)
    }
  }

  return candidates
}

function snapGuidePosition(axis: 'x' | 'y', position: number, excludeId?: string) {
  let best = clampGuidePosition(axis, position)
  let bestDistance = GUIDE_SNAP_THRESHOLD + 1

  for (const candidate of collectGuideCandidates(axis, excludeId)) {
    const distance = Math.abs(candidate - position)
    if (distance < bestDistance && distance <= GUIDE_SNAP_THRESHOLD) {
      best = candidate
      bestDistance = distance
    }
  }

  for (const candidate of getUnitSnapTargets(axis, position)) {
    const distance = Math.abs(candidate - position)
    if (distance < bestDistance && distance <= GUIDE_SNAP_THRESHOLD) {
      best = candidate
      bestDistance = distance
    }
  }

  return roundGuidePosition(best)
}

function setGuideSnapIndicator(axis: 'x' | 'y', position: number | null) {
  if (position === null) {
    guideSnapIndicator.value = null
    return
  }

  guideSnapIndicator.value = {
    id: '__snap__',
    axis,
    position
  }
}

function snapValueToGuides(axis: 'x' | 'y', value: number, excludeGuideId?: string) {
  let best = value
  let bestDistance = GUIDE_SNAP_THRESHOLD + 1
  let matchedGuide: TemplateGuide | null = null

  for (const guide of guides.value) {
    if (guide.axis !== axis || guide.id === excludeGuideId) {
      continue
    }

    const distance = Math.abs(guide.position - value)
    if (distance < bestDistance && distance <= GUIDE_SNAP_THRESHOLD) {
      best = guide.position
      bestDistance = distance
      matchedGuide = guide
    }
  }

  return {
    value: best,
    guide: matchedGuide
  }
}

function snapElementRect(
  nextXPercent: number,
  nextYPercent: number,
  widthPercent: number,
  heightPercent: number
) {
  const widthPx = (widthPercent / 100) * CANVAS_W.value
  const heightPx = (heightPercent / 100) * CANVAS_H.value
  let leftPx = (nextXPercent / 100) * CANVAS_W.value
  let topPx = (nextYPercent / 100) * CANVAS_H.value
  let matchedXGuide: TemplateGuide | null = null
  let matchedYGuide: TemplateGuide | null = null

  const xAnchors = [
    { key: 'left', value: leftPx, offset: 0 },
    { key: 'centerX', value: leftPx + widthPx / 2, offset: widthPx / 2 },
    { key: 'right', value: leftPx + widthPx, offset: widthPx }
  ]
  const yAnchors = [
    { key: 'top', value: topPx, offset: 0 },
    { key: 'centerY', value: topPx + heightPx / 2, offset: heightPx / 2 },
    { key: 'bottom', value: topPx + heightPx, offset: heightPx }
  ]

  let bestXDistance = GUIDE_SNAP_THRESHOLD + 1
  for (const anchor of xAnchors) {
    const snapped = snapValueToGuides('x', anchor.value)
    const distance = Math.abs(snapped.value - anchor.value)
    if (snapped.guide && distance < bestXDistance) {
      bestXDistance = distance
      leftPx = snapped.value - anchor.offset
      matchedXGuide = snapped.guide
    }
  }

  let bestYDistance = GUIDE_SNAP_THRESHOLD + 1
  for (const anchor of yAnchors) {
    const snapped = snapValueToGuides('y', anchor.value)
    const distance = Math.abs(snapped.value - anchor.value)
    if (snapped.guide && distance < bestYDistance) {
      bestYDistance = distance
      topPx = snapped.value - anchor.offset
      matchedYGuide = snapped.guide
    }
  }

  leftPx = clamp(leftPx, 0, CANVAS_W.value - widthPx)
  topPx = clamp(topPx, 0, CANVAS_H.value - heightPx)

  return {
    x: clamp((leftPx / CANVAS_W.value) * 100, 0, 100 - widthPercent),
    y: clamp((topPx / CANVAS_H.value) * 100, 0, 100 - heightPercent),
    guideX: matchedXGuide,
    guideY: matchedYGuide
  }
}

function val(event: Event) {
  return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value
}

function num(event: Event) {
  return parseFloat(val(event)) || 0
}

function intNum(event: Event, fallback = 0) {
  const value = parseInt(val(event), 10)
  return Number.isNaN(value) ? fallback : value
}

function checked(event: Event) {
  return (event.target as HTMLInputElement).checked
}

function clamp(value: number, min: number, max: number) {
  if (typeof value !== 'number' || isNaN(value)) return min
  return Math.max(min, Math.min(max, value))
}

function typeLabel(type: string) {
  return typeLabelMap[type] || type
}

function iconOf(type: string) {
  return SVG_ICONS[type as keyof typeof SVG_ICONS] || SVG_ICONS.text
}

function nextGroupId() {
  return `grp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

function nextGroupName() {
  const usedNames = new Set(groups.value.map(group => group.name))
  let index = groups.value.length + 1
  while (usedNames.has(`分组 ${index}`)) {
    index += 1
  }
  return `分组 ${index}`
}

function normalizeGroupsForPage(page: TemplatePage) {
  const activeGroupIds = [...new Set((page.elements || []).map(item => item.groupId).filter(Boolean))] as string[]
  const existing = new Map((page.groups || []).map(group => [group.id, group]))
  let index = 1

  page.groups = activeGroupIds.map(groupId => {
    const current = existing.get(groupId)
    if (current?.name?.trim()) {
      return current
    }

    const fallback = `分组 ${index}`
    index += 1
    return {
      id: groupId,
      name: fallback
    }
  })
}

function cleanupMissingGroups() {
  if (!currentPage.value) {
    return
  }

  normalizeGroupsForPage(currentPage.value)
}

function groupName(groupId?: string | null) {
  if (!groupId) {
    return ''
  }

  return groups.value.find(group => group.id === groupId)?.name || `分组 ${groupId.slice(-4)}`
}

function groupElementIds(groupId: string) {
  return elements.value
    .filter(item => item.groupId === groupId)
    .map(item => item.id)
}

function selectGroup(groupId: string) {
  const ids = groupElementIds(groupId)
  if (ids.length === 0) {
    return
  }

  inspectorGroupId.value = groupId
  setSelection(ids, ids[0])
}

function updateGroupName(groupId: string, nextName: string) {
  const target = groups.value.find(group => group.id === groupId)
  if (!target) {
    return
  }

  const normalized = nextName.trim() || `分组 ${groupId.slice(-4)}`
  if (target.name === normalized) {
    return
  }

  pushUndoSnapshot()
  target.name = normalized
  markDirty('已更新分组名称')
}

function ungroupById(groupId: string) {
  const ids = groupElementIds(groupId)
  if (ids.length === 0) {
    return
  }

  pushUndoSnapshot()
  elements.value.forEach(item => {
    if (item.groupId === groupId) {
      delete item.groupId
    }
  })
  groups.value = groups.value.filter(group => group.id !== groupId)
  if (inspectorGroupId.value === groupId) {
    setSelection(ids, ids[0] || null)
  }
  markDirty('已取消分组')
}

function deleteGroup(groupId: string) {
  const deleteIds = groupElementIds(groupId)
  if (deleteIds.length === 0) {
    groups.value = groups.value.filter(group => group.id !== groupId)
    return
  }

  pushUndoSnapshot()
  elements.value = elements.value.filter(item => item.groupId !== groupId)
  groups.value = groups.value.filter(group => group.id !== groupId)
  setSelection(selectedIds.value.filter(id => !deleteIds.includes(id)))
  markDirty('已删除分组')
  refreshInteract()
}

function elementById(id: string) {
  return elements.value.find(item => item.id === id) || null
}

function getSelectionIdsForElement(id: string) {
  const target = elementById(id)
  if (!target) {
    return []
  }

  if (target.groupId) {
    const groupedIds = elements.value
      .filter(item => item.groupId === target.groupId)
      .map(item => item.id)
    if (groupedIds.length > 1) {
      return groupedIds
    }
  }

  return [id]
}

function setSelection(ids: string[], primaryId?: string | null) {
  const uniqueIds = [...new Set(ids)].filter(id => !!elementById(id))
  selectedIds.value = uniqueIds
  selectedId.value =
    uniqueIds.length === 0
      ? null
      : primaryId && uniqueIds.includes(primaryId)
        ? primaryId
        : uniqueIds[0]

  if (uniqueIds.length === 0) {
    inspectorGroupId.value = null
    return
  }

  inspectorGroupId.value =
    uniqueIds.length > 1
      ? selectedGroupId.value
      : null
}

function selectElement(id: string, event?: MouseEvent) {
  const selectionIds = getSelectionIdsForElement(id)
  const toggle = !!event && (event.ctrlKey || event.metaKey)

  if (toggle) {
    const next = [...selectedIds.value]
    const exists = selectionIds.every(itemId => next.includes(itemId))
    if (exists) {
      setSelection(next.filter(itemId => !selectionIds.includes(itemId)))
    } else {
      setSelection([...next, ...selectionIds], id)
    }
    return
  }

  setSelection(selectionIds, id)
}

function selectElementFromPointer(id: string, event: MouseEvent) {
  // 点击文本元素内非镂空区域时取消选中镂空
  if (selectedCutoutId.value) {
    const hit = (event.target as HTMLElement)?.closest('.cutout-shape')
    if (!hit) {
      selectedCutoutId.value = null
    }
  }
  selectElement(id, event)
}

function selectOutlineElement(id: string, event?: MouseEvent) {
  const target = elementById(id)
  if (!target) {
    return
  }

  const toggle = !!event && (event.ctrlKey || event.metaKey)
  if (toggle) {
    selectElement(id, event)
    return
  }

  setSelection([id], id)
}

function deselectElement() {
  editingTextElementId.value = null
  selectedId.value = null
  selectedIds.value = []
  inspectorGroupId.value = null
}

function allElementIds() {
  return new Set(
    pages.value.flatMap(page => page.elements.map(item => item.id))
  )
}

function nextElementId(type: string) {
  const prefix = type.toUpperCase()
  const ids = allElementIds()
  let index = 1
  while (ids.has(`${prefix}${String(index).padStart(2, '0')}`)) {
    index += 1
  }
  return `${prefix}${String(index).padStart(2, '0')}`
}

function createElement(type: string, posX?: number, posY?: number): TemplateElement {
  const sizeMap: Record<string, { w: number; h: number }> = {
    text: { w: 32, h: 8 },
    prefill: { w: 28, h: 8 },
    watermark: { w: 58, h: 42 },
    signature: { w: 28, h: 12 },
    stamp: { w: 20, h: 12 },
    table: { w: 56, h: 20 },
    image: { w: 26, h: 18 },
    divider: { w: 72, h: 1.2 },
    shape: { w: 26, h: 16 },
    region: { w: 28, h: 18 }
  }

  const count = elements.value.filter(item => item.type === type).length
  const size = sizeMap[type] || { w: 30, h: 10 }
  const defaults: Record<string, Partial<TemplateElement>> = {
    text: { content: '文本内容', cutouts: [], label: '文本' },
    prefill: { expr: '${field}', emptyPlaceholder: '_____________', label: '预填字段' },
    watermark: {
      content: '<p><strong>机密水印</strong></p>',
      label: '水印',
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#94a3b8',
      opacity: 0.18,
      rotation: -25,
      tileGapX: 48,
      tileGapY: 36
    },
    signature: { required: true, borderColor: '#dd524c', label: '签名区' },
    stamp: { required: true, borderColor: '#dd524c', label: '盖章区' },
    table: {
      ds: '',
      columns: [
        { field: 'col1', header: '列1', w: 120, align: 'left' },
        { field: 'col2', header: '列2', w: 120, align: 'left' }
      ],
      label: '表格',
      showHeader: true,
      previewRows: 3,
      dynamicHeight: true,
      pushFollowingElements: true,
      headerStyle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#172033',
        backgroundColor: '#f8fafc',
        lineHeight: 1.5,
        letterSpacing: 0,
        textAlign: 'center',
        overflow: 'ellipsis'
      },
      bodyStyle: {
        fontSize: 12,
        fontWeight: 'normal',
        color: '#172033',
        backgroundColor: '#ffffff',
        lineHeight: 1.5,
        letterSpacing: 0,
        textAlign: 'left',
        overflow: 'wrap'
      },
      borderConfig: {
        width: 1,
        color: '#cad4e0',
        style: 'solid',
        outer: true,
        innerHorizontal: true,
        innerVertical: true,
        headerSeparator: true
      }
    },
    image: { src: '', fit: 'contain', label: '图片' },
    divider: { label: '分隔线' },
    shape: {
      label: '图形',
      shapeType: 'rect',
      strokeColor: '#22324c',
      strokeWidth: 2,
      strokeStyle: 'solid',
      fillColor: '',
      cornerRadius: 16,
      lineDirection: 'horizontal'
    },
    region: {
      label: '绘制区域',
      regionCode: `REGION_${String(count + 1).padStart(2, '0')}`,
      regionColor: '#3b82f6',
      regionPurposes: []
    }
  }

  const defaultX = 8 + (count * 4) % 40
  const defaultY = 8 + (count * 6) % 58

  return {
    id: nextElementId(type),
    type: type as TemplateElement['type'],
    label: defaults[type]?.label || typeLabel(type),
    x: clamp(posX ?? defaultX, 0, 100 - size.w),
    y: clamp(posY ?? defaultY, 0, 100 - size.h),
    w: size.w,
    h: size.h,
    zIndex: Math.max(1, ...elements.value.map(item => item.zIndex || 1)) + 1,
    visible: true,
    locked: false,
    ...defaults[type]
  }
}

function addElement(type: string, posX?: number, posY?: number) {
  pushUndoSnapshot()
  const next = createElement(type, posX, posY)
  elements.value = [...elements.value, next]
  setSelection([next.id], next.id)
  markDirty(`已添加${typeLabel(type)}`)
  refreshInteract()
}

function duplicateSelected() {
  if (selectedElements.value.length === 0) {
    return
  }

  pushUndoSnapshot()
  const copies = selectedElements.value.map((target, index) => {
    const copy = cloneData(target)
    copy.id = nextElementId(copy.type)
    copy.x = clamp(copy.x + 2 + index * 0.3, 0, 100 - copy.w)
    copy.y = clamp(copy.y + 2 + index * 0.3, 0, 100 - copy.h)
    copy.zIndex = Math.max(...elements.value.map(item => item.zIndex || 1)) + index + 1
    copy.locked = false
    return copy
  })
  elements.value = [...elements.value, ...copies]
  setSelection(copies.map(item => item.id), copies[0]?.id || null)
  markDirty('已复制元素')
  refreshInteract()
}

function duplicateElement(id: string) {
  const target = elements.value.find(item => item.id === id)
  if (!target) {
    return
  }

  pushUndoSnapshot()
  const copy = cloneData(target)
  copy.id = nextElementId(copy.type)
  copy.x = clamp(copy.x + 2, 0, 100 - copy.w)
  copy.y = clamp(copy.y + 2, 0, 100 - copy.h)
  copy.zIndex = Math.max(...elements.value.map(item => item.zIndex || 1)) + 1
  copy.locked = false
  elements.value = [...elements.value, copy]
  setSelection([copy.id], copy.id)
  markDirty('已复制元素')
  refreshInteract()
}

function deleteElement(id: string) {
  pushUndoSnapshot()
  const deleteIds = selectedIds.value.includes(id) ? selectedIds.value : getSelectionIdsForElement(id)
  elements.value = elements.value.filter(item => !deleteIds.includes(item.id))
  cleanupMissingGroups()
  setSelection([])
  markDirty('已删除元素')
  refreshInteract()
}

function updateSelectedId(nextId: string) {
  const target = sel.value
  if (!target) {
    return
  }

  const normalized = nextId.trim().replace(/\s+/g, '_')
  if (!normalized || normalized === target.id) {
    return
  }

  const duplicated = pages.value.some(page =>
    page.elements.some(item => item.id === normalized && item !== target)
  )
  if (duplicated) {
    statusHint.value = `元素标识 ${normalized} 已存在`
    return
  }

  pushUndoSnapshot()
  target.id = normalized
  setSelection(selectedIds.value.map(id => id === target.id ? normalized : id), normalized)
  markDirty('已更新元素标识')
}

function updateSel(key: string, value: any) {
  const target = sel.value
  if (!target) {
    return
  }

  if ((target as any)[key] === value) {
    return
  }

  pushUndoSnapshot()
  ;(target as any)[key] = value
  if (
    target.type === 'table' &&
    ['showHeader', 'previewRows', 'dynamicHeight', 'pushFollowingElements'].includes(key)
  ) {
    reflowElementsBelowTable(target.id)
  }
  markDirty('已更新元素属性')

  if (key === 'locked') {
    refreshInteract()
  }
}

function toggleRegionPurpose(value: string) {
  const target = sel.value
  if (!target || target.type !== 'region') return
  pushUndoSnapshot()
  const purposes = target.regionPurposes || []
  const idx = purposes.indexOf(value)
  if (idx >= 0) {
    purposes.splice(idx, 1)
    if (target.purposeConfigs) {
      delete target.purposeConfigs[value]
      if (Object.keys(target.purposeConfigs).length === 0) {
        delete target.purposeConfigs
      }
    }
  } else {
    purposes.push(value)
  }
  target.regionPurposes = [...purposes]
  markDirty('已更新区域用途')
}

function purposeIsChecked(key: string) {
  return sel.value?.type === 'region' && (sel.value.regionPurposes || []).includes(key)
}

function purposeLabel(key: string) {
  const opt = REGION_PURPOSE_OPTIONS.find(o => o.value === key)
  return opt ? opt.label : key
}

function regionPurposeConfig(purposeKey: string): Record<string, any> {
  const defaults = REGION_PURPOSE_CONFIG_DEFAULTS[purposeKey] || {}
  if (!sel.value || sel.value.type !== 'region') return { ...defaults }
  const stored = sel.value.purposeConfigs?.[purposeKey] || {}
  return { ...defaults, ...stored }
}

function updateRegionPurposeConfig(purposeKey: string, field: string, value: any) {
  const target = sel.value
  if (!target || target.type !== 'region') return

  const current = regionPurposeConfig(purposeKey)
  if (current[field] === value) return

  pushUndoSnapshot()

  if (!target.purposeConfigs) {
    target.purposeConfigs = {}
  }
  if (!target.purposeConfigs[purposeKey]) {
    target.purposeConfigs[purposeKey] = {}
  }
  target.purposeConfigs[purposeKey][field] = value
  markDirty(`已更新${purposeLabel(purposeKey)}配置`)
}

function togglePurposeConfigArrayItem(purposeKey: string, field: string, item: string) {
  const target = sel.value
  if (!target || target.type !== 'region') return

  pushUndoSnapshot()
  if (!target.purposeConfigs) target.purposeConfigs = {}
  if (!target.purposeConfigs[purposeKey]) target.purposeConfigs[purposeKey] = {}

  const defaults = REGION_PURPOSE_CONFIG_DEFAULTS[purposeKey]?.[field] || []
  const arr: string[] = target.purposeConfigs[purposeKey][field] || [...defaults]
  const idx = arr.indexOf(item)
  if (idx >= 0) arr.splice(idx, 1)
  else arr.push(item)
  target.purposeConfigs[purposeKey][field] = [...arr]
  markDirty(`已更新${purposeLabel(purposeKey)}配置`)
}

function purposeConfigArrayIncludes(purposeKey: string, field: string, item: string): boolean {
  const cfg = regionPurposeConfig(purposeKey)
  const arr: string[] = cfg[field] || []
  return arr.includes(item)
}

// 获取元素边框配置（合并简单配置和高级配置）
function elementBorderConfig(el: TemplateElement): BorderConfig {
  const defaults: BorderConfig = {
    width: 0,
    color: '#22324c',
    style: 'solid',
    position: 'inside',
    padding: 0
  }

  // 如果有高级配置，优先使用
  if (el.border) {
    return { ...defaults, ...el.border }
  }

  // 向后兼容：使用简单配置
  return {
    ...defaults,
    width: el.borderWidth ?? 0,
    color: el.borderColor ?? '#22324c',
    style: el.borderStyle ?? 'solid'
  }
}

// 更新边框配置
function updateBorderConfig(key: string, value: any) {
  const target = sel.value
  if (!target) {
    return
  }

  const currentConfig = elementBorderConfig(target)
  if ((currentConfig as any)[key] === value) {
    return
  }

  pushUndoSnapshot()

  // 确保 border 对象存在
  if (!target.border) {
    target.border = { ...currentConfig }
  }

  ;(target.border as any)[key] = value

  // 同步更新简单配置（向后兼容）
  if (key === 'width') target.borderWidth = value as number
  if (key === 'color') target.borderColor = value as string
  if (key === 'style') target.borderStyle = value as 'solid' | 'dashed' | 'dotted'

  markDirty('已更新边框配置')
}

// 计算边框样式
function elementBorderStyle(el: TemplateElement): Record<string, string> {
  const border = elementBorderConfig(el)
  if ((border.width || 0) === 0) {
    return {}
  }

  const style: Record<string, string> = {
    borderWidth: `${border.width}px`,
    borderColor: border.color || '#22324c',
    borderStyle: border.style || 'solid'
  }

  return style
}

function bringSelectedToFront() {
  if (selectedElements.value.length === 0) {
    return
  }

  pushUndoSnapshot()
  const top = Math.max(...elements.value.map(item => item.zIndex || 1))
  selectedElements.value.forEach((item, index) => {
    item.zIndex = top + index + 1
  })
  markDirty('已置顶元素')
}

function sendSelectedToBack() {
  if (selectedElements.value.length === 0) {
    return
  }

  pushUndoSnapshot()
  const bottom = Math.max(0, Math.min(...elements.value.map(item => item.zIndex || 1)) - selectedElements.value.length)
  selectedElements.value.forEach((item, index) => {
    item.zIndex = bottom + index
  })
  markDirty('已置底元素')
}

function moveSelectedUp() {
  if (selectedElements.value.length === 0) {
    return
  }

  pushUndoSnapshot()
  const maxZ = Math.max(...elements.value.map(item => item.zIndex || 1))
  selectedElements.value.forEach(item => {
    const cur = item.zIndex || 1
    item.zIndex = Math.min(cur + 1, maxZ + 1)
  })
  markDirty('已上移一层')
}

function moveSelectedDown() {
  if (selectedElements.value.length === 0) {
    return
  }

  pushUndoSnapshot()
  selectedElements.value.forEach(item => {
    const cur = item.zIndex || 1
    item.zIndex = Math.max(0, cur - 1)
  })
  markDirty('已下移一层')
}

function groupSelected() {
  if (selectedElements.value.length < 2) {
    return
  }

  pushUndoSnapshot()
  const groupId = nextGroupId()
  groups.value = [
    ...groups.value.filter(group => !selectedElements.value.some(item => item.groupId === group.id)),
    { id: groupId, name: nextGroupName() }
  ]
  selectedElements.value.forEach(item => {
    item.groupId = groupId
  })
  cleanupMissingGroups()
  markDirty('已成组')
}

function ungroupSelected() {
  if (!hasGroupedSelection.value) {
    return
  }

  pushUndoSnapshot()
  const groupIds = new Set(selectedElements.value.map(item => item.groupId).filter(Boolean))
  elements.value.forEach(item => {
    if (item.groupId && groupIds.has(item.groupId)) {
      delete item.groupId
    }
  })
  groups.value = groups.value.filter(group => !groupIds.has(group.id))
  markDirty('已解组')
}

function selectionBounds(items = selectedElements.value) {
  if (items.length === 0) {
    return null
  }

  const left = Math.min(...items.map(item => item.x))
  const top = Math.min(...items.map(item => item.y))
  const right = Math.max(...items.map(item => item.x + item.w))
  const bottom = Math.max(...items.map(item => item.y + item.h))
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top
  }
}

function alignSelected(mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
  if (selectedElements.value.length < 2) {
    return
  }

  const bounds = selectionBounds()
  if (!bounds) {
    return
  }

  pushUndoSnapshot()
  selectedElements.value.forEach(item => {
    if (mode === 'left') {
      item.x = bounds.left
    } else if (mode === 'center') {
      item.x = bounds.left + (bounds.width - item.w) / 2
    } else if (mode === 'right') {
      item.x = bounds.right - item.w
    } else if (mode === 'top') {
      item.y = bounds.top
    } else if (mode === 'middle') {
      item.y = bounds.top + (bounds.height - item.h) / 2
    } else if (mode === 'bottom') {
      item.y = bounds.bottom - item.h
    }

    item.x = clamp(item.x, 0, 100 - item.w)
    item.y = clamp(item.y, 0, 100 - item.h)
  })
  markDirty('已对齐元素')
}

function distributeSelected(mode: 'horizontal' | 'vertical') {
  if (selectedElements.value.length < 3) {
    return
  }

  pushUndoSnapshot()

  if (mode === 'horizontal') {
    const items = [...selectedElements.value].sort((a, b) => a.x - b.x)
    const first = items[0]
    const last = items[items.length - 1]
    const span = last.x + last.w - first.x
    const totalWidth = items.reduce((sum, item) => sum + item.w, 0)
    const gap = (span - totalWidth) / (items.length - 1)
    let cursor = first.x
    items.forEach(item => {
      item.x = clamp(cursor, 0, 100 - item.w)
      cursor += item.w + gap
    })
  } else {
    const items = [...selectedElements.value].sort((a, b) => a.y - b.y)
    const first = items[0]
    const last = items[items.length - 1]
    const span = last.y + last.h - first.y
    const totalHeight = items.reduce((sum, item) => sum + item.h, 0)
    const gap = (span - totalHeight) / (items.length - 1)
    let cursor = first.y
    items.forEach(item => {
      item.y = clamp(cursor, 0, 100 - item.h)
      cursor += item.h + gap
    })
  }

  markDirty('已分布元素')
}

function addColumn() {
  const target = sel.value
  if (!target || target.type !== 'table') {
    return
  }

  pushUndoSnapshot()
  if (!target.columns) {
    target.columns = []
  }
  target.columns.push({
    field: `col${target.columns.length + 1}`,
    header: `列${target.columns.length + 1}`,
    w: 100
  })
  markDirty('已添加表格列')
}

function removeColumn(index: number) {
  const target = sel.value
  if (!target || target.type !== 'table' || !target.columns) {
    return
  }

  pushUndoSnapshot()
  target.columns.splice(index, 1)
  markDirty('已删除表格列')
}

function updateColumn(index: number, key: string, value: string) {
  const target = sel.value
  if (!target || target.type !== 'table' || !target.columns?.[index]) {
    return
  }

  if ((target.columns[index] as any)[key] === value) {
    return
  }

  pushUndoSnapshot()
  ;(target.columns[index] as any)[key] = value
  markDirty('已更新表格列')
}

function updateColumnNumber(index: number, key: string, value: number) {
  const target = sel.value
  if (!target || target.type !== 'table' || !target.columns?.[index]) {
    return
  }

  if ((target.columns[index] as any)[key] === value) {
    return
  }

  pushUndoSnapshot()
  ;(target.columns[index] as any)[key] = value
  reflowElementsBelowTable(target.id)
  markDirty('已更新表格列')
}

function tableShowHeader(el: TemplateElement) {
  return el.showHeader !== false
}

function tablePreviewRows(el: TemplateElement) {
  return clamp(intNumFromValue(el.previewRows, 3), 1, 12)
}

function isDynamicTable(el: TemplateElement) {
  return el.dynamicHeight !== false
}

function tablePushFollowingElements(el: TemplateElement) {
  return el.pushFollowingElements !== false
}

function tableTextStyle(el: TemplateElement, section: 'header' | 'body') {
  const defaults = section === 'header'
    ? {
        fontFamily: '',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#172033',
        backgroundColor: '#f8fafc',
        lineHeight: 1.5,
        letterSpacing: 0,
        textAlign: 'center',
        overflow: 'ellipsis'
      }
    : {
        fontFamily: '',
        fontSize: 12,
        fontWeight: 'normal',
        color: '#172033',
        backgroundColor: '#ffffff',
        lineHeight: 1.5,
        letterSpacing: 0,
        textAlign: 'left',
        overflow: 'wrap'
      }

  return {
    ...defaults,
    ...(section === 'header' ? el.headerStyle || {} : el.bodyStyle || {})
  }
}

function tableBorderConfig(el: TemplateElement) {
  return {
    width: 1,
    color: '#cad4e0',
    style: 'solid',
    outer: true,
    innerHorizontal: true,
    innerVertical: true,
    headerSeparator: true,
    ...(el.borderConfig || {})
  }
}

function cssBorderValue(el: TemplateElement) {
  const border = tableBorderConfig(el)
  return `${border.width || 1}px ${border.style || 'solid'} ${border.color || '#cad4e0'}`
}

function tableCellOverflowStyle(overflow?: string) {
  if (overflow === 'ellipsis') {
    return {
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      overflow: 'hidden'
    }
  }

  if (overflow === 'clip') {
    return {
      whiteSpace: 'nowrap',
      textOverflow: 'clip',
      overflow: 'hidden'
    }
  }

  return {
    whiteSpace: 'normal',
    overflow: 'visible'
  }
}

function tableHeaderCellStyle(el: TemplateElement, col: any) {
  const text = tableTextStyle(el, 'header')
  const border = tableBorderConfig(el)
  const style: Record<string, string> = {
    width: `${col?.w || 100}px`,
    fontFamily: text.fontFamily || 'inherit',
    fontSize: `${text.fontSize || 12}px`,
    fontWeight: text.fontWeight || 'bold',
    lineHeight: String(text.lineHeight || 1.5),
    letterSpacing: `${text.letterSpacing || 0}px`,
    textAlign: (col?.align || text.textAlign || 'center') as string,
    color: text.color || '#172033',
    background: text.backgroundColor || '#f8fafc',
    borderStyle: 'none'
  }

  if (border.outer !== false || border.innerVertical !== false || border.headerSeparator !== false) {
    style.border = cssBorderValue(el)
    if (border.headerSeparator === false) {
      style.borderBottom = 'none'
    }
    if (border.innerVertical === false) {
      style.borderLeft = 'none'
      style.borderRight = 'none'
    }
    if (border.outer === false) {
      style.borderTop = 'none'
    }
  }

  return {
    ...style,
    ...tableCellOverflowStyle(text.overflow)
  }
}

function tableBodyCellStyle(el: TemplateElement, col: any) {
  const text = tableTextStyle(el, 'body')
  const border = tableBorderConfig(el)
  const style: Record<string, string> = {
    width: `${col?.w || 100}px`,
    fontFamily: text.fontFamily || 'inherit',
    fontSize: `${text.fontSize || 12}px`,
    fontWeight: text.fontWeight || 'normal',
    lineHeight: String(text.lineHeight || 1.5),
    letterSpacing: `${text.letterSpacing || 0}px`,
    textAlign: (col?.align || text.textAlign || 'left') as string,
    color: text.color || '#172033',
    background: text.backgroundColor || '#ffffff',
    borderStyle: 'none'
  }

  if (border.outer !== false || border.innerVertical !== false || border.innerHorizontal !== false) {
    style.border = cssBorderValue(el)
    if (border.innerHorizontal === false) {
      style.borderTop = 'none'
      style.borderBottom = 'none'
    }
    if (border.innerVertical === false) {
      style.borderLeft = 'none'
      style.borderRight = 'none'
    }
  }

  return {
    ...style,
    ...tableCellOverflowStyle(text.overflow)
  }
}

function tablePreviewText(col: any, rowIndex: number) {
  const field = col?.field || `col${rowIndex}`
  return `\${${field}_${rowIndex}}`
}

function ensureTableStyleContainer(section: 'header' | 'body') {
  const target = sel.value
  if (!target || target.type !== 'table') {
    return null
  }

  const key = section === 'header' ? 'headerStyle' : 'bodyStyle'
  if (!(target as any)[key]) {
    ;(target as any)[key] = {}
  }
  return (target as any)[key]
}

function updateTableTextStyle(section: 'header' | 'body', key: string, value: any) {
  const target = sel.value
  if (!target || target.type !== 'table') {
    return
  }

  const style = ensureTableStyleContainer(section)
  if (!style || style[key] === value) {
    return
  }

  pushUndoSnapshot()
  style[key] = value
  reflowElementsBelowTable(target.id)
  markDirty(`已更新表格${section === 'header' ? '表头' : '正文'}样式`)
}

function updateTableBorder(key: string, value: any) {
  const target = sel.value
  if (!target || target.type !== 'table') {
    return
  }

  if (!target.borderConfig) {
    target.borderConfig = {}
  }

  if ((target.borderConfig as any)[key] === value) {
    return
  }

  pushUndoSnapshot()
  ;(target.borderConfig as any)[key] = value
  reflowElementsBelowTable(target.id)
  markDirty('已更新表格边框')
}

function intNumFromValue(value: any, fallback = 0) {
  const parsed = parseInt(String(value ?? ''), 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function estimateTableHeightPercent(table: TemplateElement) {
  const rowHeightPx = Math.max(20, (tableTextStyle(table, 'body').fontSize || 12) * (tableTextStyle(table, 'body').lineHeight || 1.5) + 10)
  const headerHeightPx = tableShowHeader(table)
    ? Math.max(22, (tableTextStyle(table, 'header').fontSize || 12) * (tableTextStyle(table, 'header').lineHeight || 1.5) + 10)
    : 0
  const totalPx = headerHeightPx + rowHeightPx * tablePreviewRows(table) + 12
  return clamp((totalPx / CANVAS_H.value) * 100, 4, 100)
}

function reflowElementsBelowTable(tableId: string) {
  const table = elementById(tableId)
  if (!table || table.type !== 'table' || !isDynamicTable(table) || !tablePushFollowingElements(table)) {
    return
  }

  const nextHeight = estimateTableHeightPercent(table)
  const delta = nextHeight - table.h
  if (Math.abs(delta) < 0.01) {
    return
  }

  const tableBottom = table.y + table.h
  table.h = nextHeight

  if (delta <= 0) {
    return
  }

  elements.value.forEach(item => {
    if (item.id === table.id) {
      return
    }

    if (item.y >= tableBottom) {
      item.y = clamp(item.y + delta, 0, 100 - item.h)
    }
  })
}

// 文本编辑器事件处理（InlineTextEditor 组件回调）
function onTextEditorStart(el: TemplateElement) {
  editingTextElementId.value = el.id
  // 设置元素为编辑状态，阻止拖拽
  pushUndoSnapshot()
}

function onTextEditorFinish(el: TemplateElement) {
  editingTextElementId.value = null
  markDirty('已更新文本内容')
}

function onTextEditorCancel(el: TemplateElement) {
  editingTextElementId.value = null
}

function cancelTextEdit() {
  editingTextElementId.value = null
  statusHint.value = dirty.value ? '有未保存修改' : '已取消文本编辑'
}

function toggleInspector() {
  inspectorCollapsed.value = !inspectorCollapsed.value
}

function onSidebarDragStart(type: string, event: DragEvent) {
  sidebarDragType.value = type
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('text/plain', type)
  }
}

function onDropToCanvas(event: DragEvent) {
  const type = sidebarDragType.value || event.dataTransfer?.getData('text/plain')
  sidebarDragType.value = null

  if (!type || !elementTypes.some(item => item.type === type)) {
    return
  }

  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) {
    addElement(type)
    return
  }

  const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 94)
  const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 94)
  addElement(type, x, y)
}

let guideDragCleanup: (() => void) | null = null

function stopGuideDragSession() {
  guideDragCleanup?.()
  guideDragCleanup = null
}

function runGuideDragSession(
  axis: 'x' | 'y',
  initialGuide: TemplateGuide,
  event: MouseEvent,
  options: { commitExistingId?: string; pushSnapshot?: boolean } = {}
) {
  stopGuideDragSession()

  if (options.pushSnapshot) {
    pushUndoSnapshot()
  }

  activeGuideId.value = options.commitExistingId || initialGuide.id
  draftGuide.value = normalizeGuide(initialGuide)
  setGuideSnapIndicator(axis, draftGuide.value.position)

  const onMove = (moveEvent: MouseEvent) => {
    const point = pointerToCanvasPosition(moveEvent)
    if (!point || !draftGuide.value) {
      return
    }

    const rawPosition = axis === 'x' ? point.x : point.y
    const snappedPosition = snapGuidePosition(axis, rawPosition, options.commitExistingId)
    draftGuide.value = {
      ...draftGuide.value,
      position: snappedPosition
    }
    setGuideSnapIndicator(axis, snappedPosition)
  }

  const onUp = (upEvent: MouseEvent) => {
    const shouldDelete = pointerDistanceOutsideCanvas(upEvent) > GUIDE_DELETE_MARGIN
    const guide = draftGuide.value ? normalizeGuide(draftGuide.value) : null

    if (!shouldDelete && guide) {
      if (options.commitExistingId) {
        guides.value = guides.value.map(item =>
          item.id === options.commitExistingId ? guide : item
        )
        markDirty('已更新参考线')
      } else {
        guides.value = [...guides.value, guide]
        markDirty('已新增参考线')
      }
    } else if (options.commitExistingId) {
      guides.value = guides.value.filter(item => item.id !== options.commitExistingId)
      markDirty('已删除参考线')
    }

    activeGuideId.value = null
    draftGuide.value = null
    setGuideSnapIndicator(axis, null)
    stopGuideDragSession()
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp, { once: true })

  const onKeydown = (keyEvent: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(keyEvent.key)) return
    if (!draftGuide.value) return
    keyEvent.preventDefault()

    const unit = rulerUnit.value
    let step = 1
    if (unit === 'cm') {
      step = 0.1 * pxPerCm.value
    } else if (unit === 'percent') {
      const pxTotal = axis === 'x' ? CANVAS_W.value : CANVAS_H.value
      step = 0.5 / 100 * pxTotal
    }

    let delta = 0
    if (keyEvent.key === 'ArrowLeft') delta = axis === 'x' ? -step : 0
    else if (keyEvent.key === 'ArrowRight') delta = axis === 'x' ? step : 0
    else if (keyEvent.key === 'ArrowUp') delta = axis === 'y' ? -step : 0
    else if (keyEvent.key === 'ArrowDown') delta = axis === 'y' ? step : 0

    if (delta !== 0) {
      const newPos = clampGuidePosition(axis, draftGuide.value.position + delta)
      draftGuide.value = { ...draftGuide.value, position: newPos }
      setGuideSnapIndicator(axis, newPos)
    }
  }
  window.addEventListener('keydown', onKeydown)

  guideDragCleanup = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    window.removeEventListener('keydown', onKeydown)
    activeGuideId.value = null
    draftGuide.value = null
    setGuideSnapIndicator(axis, null)
  }
}

function startGuideCreationFromRuler(axis: 'x' | 'y', event: MouseEvent) {
  if (event.button !== 0) {
    return
  }

  event.preventDefault()
  const point = pointerToCanvasPosition(event)
  const position = axis === 'x' ? point?.x ?? 0 : point?.y ?? 0
  runGuideDragSession(axis, {
    id: nextGuideId(axis),
    axis,
    position: snapGuidePosition(axis, position)
  }, event, { pushSnapshot: true })
}

function startGuideDrag(guide: TemplateGuide, event: MouseEvent) {
  if (event.button !== 0) {
    return
  }

  event.preventDefault()
  pushUndoSnapshot()
  runGuideDragSession(guide.axis, guide, event, {
    commitExistingId: guide.id
  })
}

let selectionCleanup: (() => void) | null = null

function stopCanvasSelection() {
  selectionCleanup?.()
  selectionCleanup = null
}

function startCanvasSelection(event: MouseEvent) {
  if (event.button !== 0) {
    return
  }

  const start = clientToCanvasPoint(event)
  if (!start) {
    deselectElement()
    return
  }

  event.preventDefault()
  stopCanvasSelection()
  const baseIds = event.ctrlKey || event.metaKey ? [...selectedIds.value] : []
  selectionBox.value = {
    left: start.x,
    top: start.y,
    width: 0,
    height: 0
  }

  const onMove = (moveEvent: MouseEvent) => {
    const point = clientToCanvasPoint(moveEvent)
    if (!point) {
      return
    }

    const left = Math.min(start.x, point.x)
    const top = Math.min(start.y, point.y)
    const width = Math.abs(point.x - start.x)
    const height = Math.abs(point.y - start.y)
    selectionBox.value = { left, top, width, height }
  }

  const onUp = (upEvent: MouseEvent) => {
    const point = clientToCanvasPoint(upEvent)
    const box = selectionBox.value
    selectionBox.value = null

    if (!point || !box || (box.width < 2 && box.height < 2)) {
      if (!(upEvent.ctrlKey || upEvent.metaKey)) {
        deselectElement()
      }
      stopCanvasSelection()
      return
    }

    const hitIds = selectionHitIds({
      left: box.left,
      top: box.top,
      right: box.left + box.width,
      bottom: box.top + box.height
    })

    if (upEvent.ctrlKey || upEvent.metaKey) {
      const next = [...baseIds]
      const allIncluded = hitIds.every(id => next.includes(id))
      if (allIncluded) {
        setSelection(next.filter(id => !hitIds.includes(id)))
      } else {
        setSelection([...next, ...hitIds], hitIds[0] || next[0] || null)
      }
    } else {
      setSelection(hitIds, hitIds[0] || null)
    }

    stopCanvasSelection()
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp, { once: true })
  selectionCleanup = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    selectionBox.value = null
  }
}

function shouldIgnoreCanvasSelection(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target) {
    return false
  }

  return !!target.closest(
    '.delete-btn, .resize-handles, .handle, .quill-editor-shell, input, textarea, select, button'
  )
}

function onCanvasPointerDown(event: MouseEvent) {
  if (shouldIgnoreCanvasSelection(event)) {
    return
  }

  const target = event.target as HTMLElement | null
  if (target?.closest('.canvas-guide')) {
    return
  }

  startCanvasSelection(event)
}

function setScale(nextScale: number) {
  scale.value = clamp(+nextScale.toFixed(2), MIN_SCALE, MAX_SCALE)
}

function zoomIn() {
  setScale(scale.value + 0.1)
}

function zoomOut() {
  setScale(scale.value - 0.1)
}

function fitToViewport() {
  const viewport = viewportRef.value
  if (!viewport) {
    return
  }

  const width = viewport.clientWidth - RULER_SIZE - 20
  const height = viewport.clientHeight - RULER_SIZE - 20
  const fitScale = Math.min(width / CANVAS_W.value, height / CANVAS_H.value)
  setScale(Math.max(MIN_SCALE, Math.min(1, fitScale)))
}

function emitTemplateValue(json: string) {
  lastSyncedJson.value = json
  emit('update:value', json)
  emit('updateTemplateJson', json)
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date)
}

function onSave() {
  const json = toJson()
  emitTemplateValue(json)
  dirty.value = false
  lastSavedAt.value = formatTime(new Date())
  statusHint.value = '已发起保存'
  emit('saved', { templateJson: json })
}

function onPreview() {
  const json = toJson()
  emit('preview', { templateJson: json })
  previewVisible.value = true
}

function exportJson() {
  const json = toJson()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${props.templateId || 'template'}.json`
  link.click()
  URL.revokeObjectURL(url)
}

let dragState: {
  items: Array<{
    item: TemplateElement
    startX: number
    startY: number
    startW: number
    startH: number
  }>
  pageX: number
  pageY: number
  rect?: { width: number; height: number }
  _rafId?: number
} | null = null

function setupInteract() {
  interact('.template-element:not(.locked):not(.is-text-editing)').unset()

  interact('.template-element:not(.locked):not(.is-text-editing)')
    .draggable({
      inertia: false,
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: 'parent',
          endOnly: false
        })
      ],
      listeners: {
        start(event: any) {
          const target = getElementFromEvent(event)
          if (!target) {
            return
          }
          // 点击挖空区域时不移动元素本身（使用 elementFromPoint 获取真实点击目标）
          const hitEl = document.elementFromPoint(event.clientX, event.clientY)
          if (hitEl?.closest('.cutout-shape') || hitEl?.closest('.cutout-add-btn')) {
            return
          }

          const movingIds = selectedIds.value.includes(target.id)
            ? selectedIds.value
            : getSelectionIdsForElement(target.id)
          setSelection(movingIds, target.id)
          pushUndoSnapshot()
          const rect = canvasRef.value?.getBoundingClientRect()
          dragState = {
            items: movingIds
              .map(id => elementById(id))
              .filter(Boolean)
              .map(item => ({
                item: item!,
                startX: item!.x,
                startY: item!.y,
                startW: item!.w,
                startH: item!.h
              })),
            pageX: event.pageX,
            pageY: event.pageY,
            rect: rect ? { width: rect.width, height: rect.height } : undefined
          }
        },
        move(event: any) {
          if (!dragState || !dragState.rect) return

          const rect = dragState.rect
          if (rect.width === 0 || rect.height === 0) return

          if (dragState._rafId) cancelAnimationFrame(dragState._rafId)

          const deltaXPercent = ((event.pageX - dragState.pageX) / rect.width) * 100
          const deltaYPercent = ((event.pageY - dragState.pageY) / rect.height) * 100

          const target = getElementFromEvent(event)
          if (!target) return

          const activeStart = dragState.items.find(ds => ds.item.id === target.id)
          if (!activeStart) return

          const nextX = clamp(activeStart.startX + deltaXPercent, 0, 100 - target.w)
          const nextY = clamp(activeStart.startY + deltaYPercent, 0, 100 - target.h)
          const snapped = snapElementRect(nextX, nextY, target.w, target.h)
          const appliedDeltaX = snapped.x - activeStart.startX
          const appliedDeltaY = snapped.y - activeStart.startY

          const targetId = target.id
          dragState._rafId = requestAnimationFrame(() => {
            if (!dragState) return

            // 合并边缘检测 + 位置更新到一个循环
            let closestSide: string | null = null
            let minDist = Infinity
            const dangerSides: string[] = []

            for (const itemState of dragState.items) {
              const item = itemState.item
              const movedX = itemState.startX + appliedDeltaX
              const movedY = itemState.startY + appliedDeltaY
              const cxPx = (movedX / 100) * CANVAS_W.value
              const cyPx = (movedY / 100) * CANVAS_H.value
              const cwPx = (item.w / 100) * CANVAS_W.value
              const chPx = (item.h / 100) * CANVAS_H.value

              if (cxPx < EDGE_DANGER_ZONE.value) dangerSides.push('left')
              if (cyPx < EDGE_DANGER_ZONE.value) dangerSides.push('top')
              if (CANVAS_W.value - (cxPx + cwPx) < EDGE_DANGER_ZONE.value) dangerSides.push('right')
              if (CANVAS_H.value - (cyPx + chPx) < EDGE_DANGER_ZONE.value) dangerSides.push('bottom')

              const distTop = cyPx
              const distBottom = CANVAS_H.value - (cyPx + chPx)
              const distLeft = cxPx
              const distRight = CANVAS_W.value - (cxPx + cwPx)
              if (distTop < minDist) { minDist = distTop; closestSide = 'top' }
              if (distBottom < minDist) { minDist = distBottom; closestSide = 'bottom' }
              if (distLeft < minDist) { minDist = distLeft; closestSide = 'left' }
              if (distRight < minDist) { minDist = distRight; closestSide = 'right' }

              item.x = clamp(itemState.startX + appliedDeltaX, 0, 100 - item.w)
              item.y = clamp(itemState.startY + appliedDeltaY, 0, 100 - item.h)
            }

            if (edgeWarningEnabled.value && minDist < EDGE_DANGER_ZONE.value && closestSide) {
              edgeDangerSide.value = dangerSides.join(' ')
            } else {
              edgeDangerSide.value = null
            }

            setSelection(selectedIds.value, targetId)
            dirty.value = true
            setGuideSnapIndicator(
              snapped.guideX ? 'x' : snapped.guideY ? 'y' : 'x',
              snapped.guideX?.position ?? snapped.guideY?.position ?? null
            )
          })
        },
        end() {
          if (dragState?._rafId) cancelAnimationFrame(dragState._rafId)
          dragState = null
          setGuideSnapIndicator('x', null)
          edgeDangerSide.value = null
        }
      }
    })
    .resizable({
      edges: { left: true, right: true, top: true, bottom: true },
      modifiers: [
        interact.modifiers.restrictEdges({
          outer: 'parent',
          endOnly: false
        }),
        interact.modifiers.restrictSize({
          min: { width: 20, height: 10 }
        })
      ],
      listeners: {
        start(event: any) {
          const target = getElementFromEvent(event)
          if (!target) {
            return
          }
          // 点击挖空区域时不调整元素大小
          const hitEl = document.elementFromPoint(event.clientX, event.clientY)
          if (hitEl?.closest('.cutout-shape') || hitEl?.closest('.cutout-add-btn')) {
            return
          }
          // 指针必须在元素边缘 8px 内才触发大小调整，避免小元素误触
          const elDom = (event.target as HTMLElement)?.closest('.template-element')
          if (elDom) {
            const r = elDom.getBoundingClientRect()
            const mx = event.clientX - r.left, my = event.clientY - r.top
            const edgeThreshold = 8
            const nearEdge = mx < edgeThreshold || mx > r.width - edgeThreshold ||
                             my < edgeThreshold || my > r.height - edgeThreshold
            if (!nearEdge) return
          }

          pushUndoSnapshot()
          const rect = canvasRef.value?.getBoundingClientRect()
          dragState = {
            items: [{
              item: target,
              startX: target.x,
              startY: target.y,
              startW: target.w,
              startH: target.h
            }],
            pageX: event.pageX,
            pageY: event.pageY,
            rect: rect ? { width: rect.width, height: rect.height } : undefined
          }
        },
        move(event: any) {
          if (!dragState || !dragState.rect) return

          const rect = dragState.rect
          if (rect.width === 0 || rect.height === 0) return

          if (dragState._rafId) cancelAnimationFrame(dragState._rafId)

          const resizeState = dragState.items[0]
          if (!resizeState) return

          const deltaX = ((event.pageX - dragState.pageX) / rect.width) * 100
          const deltaY = ((event.pageY - dragState.pageY) / rect.height) * 100

          let nextX = resizeState.startX
          let nextY = resizeState.startY
          let nextW = resizeState.startW
          let nextH = resizeState.startH

          if (event.edges.left) {
            nextX = resizeState.startX + deltaX
            nextW = resizeState.startW - deltaX
          }
          if (event.edges.right) {
            nextW = resizeState.startW + deltaX
          }
          if (event.edges.top) {
            nextY = resizeState.startY + deltaY
            nextH = resizeState.startH - deltaY
          }
          if (event.edges.bottom) {
            nextH = resizeState.startH + deltaY
          }

          // Shift 约束：保持正方形/正圆（像素等比例，而非百分比等比例）
          if (event.shiftKey) {
            let wPx = (nextW / 100) * CANVAS_W.value
            let hPx = (nextH / 100) * CANVAS_H.value
            const targetPx = Math.max(wPx, hPx)
            const dwPx = targetPx - wPx
            const dhPx = targetPx - hPx
            if (event.edges.left) nextX -= (dwPx / CANVAS_W.value) * 100
            if (event.edges.top) nextY -= (dhPx / CANVAS_H.value) * 100
            nextW = (targetPx / CANVAS_W.value) * 100
            nextH = (targetPx / CANVAS_H.value) * 100
          }

          nextW = clamp(nextW, 1, 100)
          nextH = clamp(nextH, 0.5, 100)
          nextX = clamp(nextX, 0, 100 - nextW)
          nextY = clamp(nextY, 0, 100 - nextH)

          const target = resizeState.item
          const edges = event.edges
          const shiftKey = event.shiftKey
          dragState._rafId = requestAnimationFrame(() => {
            if (!dragState) return

            let leftPx = (nextX / 100) * CANVAS_W.value
            let topPx = (nextY / 100) * CANVAS_H.value
            let rightPx = leftPx + (nextW / 100) * CANVAS_W.value
            let bottomPx = topPx + (nextH / 100) * CANVAS_H.value
            let matchedXGuide: TemplateGuide | null = null
            let matchedYGuide: TemplateGuide | null = null

            if (edges.left) {
              const snapped = snapValueToGuides('x', leftPx)
              if (snapped.guide) { leftPx = snapped.value; matchedXGuide = snapped.guide }
            }
            if (edges.right) {
              const snapped = snapValueToGuides('x', rightPx)
              if (snapped.guide) { rightPx = snapped.value; matchedXGuide = snapped.guide }
            }
            if (edges.top) {
              const snapped = snapValueToGuides('y', topPx)
              if (snapped.guide) { topPx = snapped.value; matchedYGuide = snapped.guide }
            }
            if (edges.bottom) {
              const snapped = snapValueToGuides('y', bottomPx)
              if (snapped.guide) { bottomPx = snapped.value; matchedYGuide = snapped.guide }
            }

            leftPx = clamp(leftPx, 0, CANVAS_W.value)
            topPx = clamp(topPx, 0, CANVAS_H.value)
            rightPx = clamp(rightPx, 0, CANVAS_W.value)
            bottomPx = clamp(bottomPx, 0, CANVAS_H.value)

            if (rightPx - leftPx < 8) {
              if (edges.left && !edges.right) leftPx = rightPx - 8
              else rightPx = leftPx + 8
            }
            if (bottomPx - topPx < 6) {
              if (edges.top && !edges.bottom) topPx = bottomPx - 6
              else bottomPx = topPx + 6
            }

            target.w = clamp(((rightPx - leftPx) / CANVAS_W.value) * 100, 1, 100)
            target.h = clamp(((bottomPx - topPx) / CANVAS_H.value) * 100, 0.5, 100)
            target.x = clamp((leftPx / CANVAS_W.value) * 100, 0, 100 - target.w)
            target.y = clamp((topPx / CANVAS_H.value) * 100, 0, 100 - target.h)
            dirty.value = true
            setGuideSnapIndicator(
              matchedXGuide ? 'x' : matchedYGuide ? 'y' : 'x',
              matchedXGuide?.position ?? matchedYGuide?.position ?? null
            )
          })
        },
        end() {
          if (dragState?._rafId) cancelAnimationFrame(dragState._rafId)
          dragState = null
          setGuideSnapIndicator('x', null)
        }
      }
    })
}

function getElementFromEvent(event: any) {
  const wrapper = (event.target as HTMLElement)?.closest('.template-element') as HTMLElement | null
  if (!wrapper) {
    return null
  }

  const id = wrapper.dataset.elementId
  if (!id) {
    return null
  }

  return elements.value.find(item => item.id === id) || null
}

/* ── 多边形锚点交互 ── */
/* ── 挖空拖拽交互 ── */
function onCutoutMouseDown(cutoutId: string, event: MouseEvent) {
  event.stopPropagation()
  selectedCutoutId.value = cutoutId
  const el = sel.value
  if (!el || !el.cutouts) return
  const co = el.cutouts.find((c: CutoutShape) => c.id === cutoutId)
  if (!co) return

  draggingCutoutId.value = cutoutId
  cutoutDragStart.value = { elX: co.x, elY: co.y, mouseX: event.clientX, mouseY: event.clientY }
  
  // 记录初始边缘位置（左边缘还是右边缘）
  const initialIsLeft = co.x < 50

  const onMove = (moveEvent: MouseEvent) => {
    if (!draggingCutoutId.value || !cutoutDragStart.value || !el.cutouts) return
    const c = el.cutouts.find((cc: CutoutShape) => cc.id === draggingCutoutId.value)
    if (!c) return

    const parentEl = sel.value
    if (!parentEl) return
    const parentDom = document.querySelector(`[data-element-id="${parentEl.id}"]`)
    if (!parentDom) return
    const rect = parentDom.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const dxPx = moveEvent.clientX - cutoutDragStart.value.mouseX
    const dyPx = moveEvent.clientY - cutoutDragStart.value.mouseY
    const dxPct = (dxPx / rect.width) * 100
    const dyPct = (dyPx / rect.height) * 100

    // 限制只能移动到左右边缘
    // 如果水平移动超过 50%，切换到另一边
    const newX = cutoutDragStart.value.elX + dxPct
    if (newX < 50) {
      // 左边缘：x 必须为 0
      c.x = 0
    } else {
      // 右边缘：x 必须为 100 - w
      c.x = 100 - c.w
    }
    
    // 垂直方向正常移动
    c.y = clamp(cutoutDragStart.value.elY + dyPct, 0, 100 - c.h)
    dirty.value = true
  }

  const onUp = () => {
    draggingCutoutId.value = null
    cutoutDragStart.value = null
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function onCutoutResizeStart(cutoutId: string, event: MouseEvent, edge: string) {
  event.stopPropagation()
  selectedCutoutId.value = cutoutId
}

// 点击挖空外部区域时取消挖空选中
function onCutoutOverlayMouseDown(event: MouseEvent) {
  // 只有直接点击 overlay 背景时才取消选中
  if (event.target === event.currentTarget) {
    selectedCutoutId.value = null
  }
}

// 挖空调整大小
function startCutoutResize(el: TemplateElement, co: CutoutShape, handle: string, event: MouseEvent) {
  event.stopPropagation()
  event.preventDefault()
  
  pushUndoSnapshot()
  
  const startX = event.clientX
  const startY = event.clientY
  const startCoX = co.x
  const startCoY = co.y
  const startCoW = co.w
  const startCoH = co.h
  
  // 判断当前是左边缘还是右边缘
  const isLeft = co.x < 50
  
  const parentDom = document.querySelector(`[data-element-id="${el.id}"]`)
  if (!parentDom) return
  const rect = parentDom.getBoundingClientRect()
  
  const minSize = 5 // 最小尺寸
  
  const onMove = (moveEvent: MouseEvent) => {
    const dxPx = moveEvent.clientX - startX
    const dyPx = moveEvent.clientY - startY
    const dxPct = (dxPx / rect.width) * 100
    const dyPct = (dyPx / rect.height) * 100
    
    let newX = startCoX
    let newY = startCoY
    let newW = startCoW
    let newH = startCoH
    
    // 左边缘挖空：只能从右边调整宽度，左边固定 x=0
    // 右边缘挖空：只能从左边调整宽度，右边固定 x=100-w
    if (isLeft) {
      // 左边缘：x 始终为 0
      newX = 0
      // 宽度只能通过右边调整
      if (handle.includes('e')) {
        newW = clamp(startCoW + dxPct, minSize, 50) // 限制宽度不超过50%
      }
    } else {
      // 右边缘：右边固定
      // 宽度只能通过左边调整
      if (handle.includes('w')) {
        const delta = clamp(dxPct, -(startCoW - minSize), startCoW - minSize)
        newW = startCoW - delta
      }
      newX = 100 - newW // x 始终紧贴右边缘
    }
    
    // 垂直方向调整（上下两边）
    if (handle.includes('n')) {
      const delta = clamp(dyPct, -startCoY, startCoH - minSize)
      newY = startCoY + delta
      newH = startCoH - delta
    }
    if (handle.includes('s')) {
      newH = clamp(startCoH + dyPct, minSize, 100 - startCoY)
    }
    
    // 应用限制
    co.x = isLeft ? 0 : 100 - newW
    co.y = clamp(newY, 0, 100 - minSize)
    co.w = clamp(newW, minSize, isLeft ? 50 : 50)
    co.h = clamp(newH, minSize, 100 - co.y)
    
    dirty.value = true
    
    // 允许贴边
    co.x = clamp(newX, 0, 100 - minSize)
    co.y = clamp(newY, 0, 100 - minSize)
    co.w = clamp(newW, minSize, 100 - co.x)
    co.h = clamp(newH, minSize, 100 - co.y)
    
    dirty.value = true
  }
  
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  const inEditable =
    !!target?.closest('input, textarea, select') ||
    target?.isContentEditable === true

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    onSave()
    return
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd' && sel.value) {
    event.preventDefault()
    duplicateSelected()
    return
  }

  if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    undo()
    return
  }

  if ((event.ctrlKey || event.metaKey) && (event.shiftKey && event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y')) {
    event.preventDefault()
    redo()
    return
  }

  if (inEditable) {
    if (event.key === 'Escape') {
      cancelTextEdit()
    }
    return
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (selectedElements.value.length > 0) {
      event.preventDefault()
      deleteElement(selectedId.value || selectedElements.value[0].id)
    }
  }

  if (event.key === 'Escape') {
    deselectElement()
  }
}

function fitEditorToViewport() {
  const el = editorRootRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (rect.top < 0) return
  const availableH = window.innerHeight - rect.top
  if (availableH > 480) {
    el.style.height = `${availableH}px`
    el.style.maxHeight = `${availableH}px`
  }
}

let parentObserver: ResizeObserver | null = null

onMounted(() => {
  setupInteract()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', fitEditorToViewport)
  const parent = editorRootRef.value?.parentElement
  if (parent) {
    parentObserver = new ResizeObserver(() => { fitEditorToViewport() })
    parentObserver.observe(parent)
  }
  nextTick(() => {
    fitEditorToViewport()
  })
})

onUnmounted(() => {
  parentObserver?.disconnect()
  interact('.template-element:not(.locked):not(.is-text-editing)').unset()
  stopCanvasSelection()
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', fitEditorToViewport)
})
</script>

<style scoped>
.template-editor {
  --editor-bg: #edf1f6;
  --panel-bg: #ffffff;
  --panel-soft: #f6f8fb;
  --line-color: #d8e0ea;
  --text-main: #172033;
  --text-sub: #607085;
  --accent: #1769e0;
  --accent-soft: #eaf2ff;
  --danger: #cf3f49;
  --ruler-bg: #f7f9fc;
  --grid-line: rgba(62, 92, 122, 0.08);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 620px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.96), rgba(237, 241, 246, 0.94)),
    var(--editor-bg);
  color: var(--text-main);
  font-family:
    'SF Pro Display',
    'Segoe UI',
    'PingFang SC',
    'Hiragino Sans GB',
    sans-serif;
  user-select: none;
  overflow: hidden;
}

.canvas-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--line-color);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 249, 252, 0.95));
  flex-wrap: wrap;
  flex-shrink: 0;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 3px;
  border-radius: 8px;
  background: rgba(23, 32, 51, 0.04);
}

.toolbar-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px;
  font-size: 12px;
  color: var(--text-main);
}

.toolbar-check input {
  margin: 0;
}

.toolbar-select {
  height: 28px;
  padding: 0 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-main);
  font-size: 11px;
  cursor: pointer;
  outline: none;
}
.toolbar-select:hover {
  background: rgba(23, 32, 51, 0.06);
}

.toolbar-select-small {
  height: 24px;
  padding: 0 4px;
  border: 1px solid rgba(23, 32, 51, 0.15);
  border-radius: 4px;
  background: #fff;
  color: var(--text-main);
  font-size: 10px;
  cursor: pointer;
  outline: none;
}

.toolbar-input-small {
  width: 48px;
  height: 24px;
  padding: 0 4px;
  border: 1px solid rgba(23, 32, 51, 0.15);
  border-radius: 4px;
  background: #fff;
  color: var(--text-main);
  font-size: 11px;
  text-align: center;
  outline: none;
}
.toolbar-input-small:focus {
  border-color: var(--accent);
}

.toolbar-label {
  font-size: 11px;
  color: var(--text-sub);
  white-space: nowrap;
}

.edge-warning-group {
  align-items: center;
  gap: 4px;
}

.toolbar-group--meta {
  margin-right: auto;
  align-items: baseline;
  gap: 8px;
}

.toolbar-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.toolbar-subtitle {
  color: var(--text-sub);
  font-size: 11px;
}

.toolbar-separator {
  width: 1px;
  height: 22px;
  background: var(--line-color);
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 28px;
  padding: 0 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-sub);
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  transition: background 0.12s ease, color 0.12s ease, transform 0.12s ease;
}

.tool-btn:hover {
  background: rgba(23, 32, 51, 0.06);
  color: var(--text-main);
  transform: none;
}

.tool-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  background: none;
  transform: none;
}

.tool-btn.primary {
  background: rgba(23, 105, 224, 0.1);
  color: var(--accent);
}
.tool-btn.primary:hover {
  background: rgba(23, 105, 224, 0.16);
}

.tool-btn.danger {
  color: var(--danger);
}
.tool-btn.danger:hover {
  background: rgba(207, 63, 73, 0.1);
  color: var(--danger);
}

.tool-btn svg,
.tool-btn :deep(svg) {
  width: 14px;
  height: 14px;
  display: block;
}

.tool-btn.icon-only {
  width: 28px;
  min-width: 28px;
  padding: 0;
}

.toolbar-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.toolbar-meta {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-left: auto;
  min-width: 0;
}

.toolbar-page-switcher,
.toolbar-page-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-page-switcher {
  position: relative;
}

.toolbar-page-dropdown {
  position: relative;
}

.toolbar-page-name-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid #d8e0ea;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-main);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  max-width: 160px;
  overflow: hidden;
  transition: border-color 0.15s ease;
}

.toolbar-page-name-btn:hover {
  border-color: var(--accent);
}

.page-dropdown-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-dropdown-arrow {
  font-size: 10px;
  color: var(--text-sub);
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.toolbar-page-dropdown.open .page-dropdown-arrow {
  transform: rotate(180deg);
}

.page-dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
}

.page-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 220px;
  max-height: 320px;
  background: #fff;
  border: 1px solid #d8e0ea;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 101;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-dropdown-search {
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid #e2e8f0;
  outline: none;
  font-size: 12px;
  color: var(--text-main);
  background: #f8fafc;
  box-sizing: border-box;
}

.page-dropdown-search::placeholder {
  color: #94a3b8;
}

.page-dropdown-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
  max-height: 240px;
}

.page-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-main);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.12s ease;
  text-align: left;
}

.page-dropdown-item:hover {
  background: #f1f5f9;
}

.page-dropdown-item.active {
  background: rgba(23, 105, 224, 0.08);
  color: var(--accent);
  font-weight: 600;
}

.page-dropdown-idx {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #64748b;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.page-dropdown-item.active .page-dropdown-idx {
  background: rgba(23, 105, 224, 0.16);
  color: var(--accent);
}

.page-dropdown-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-dropdown-rename-btn {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.page-dropdown-item:hover .page-dropdown-rename-btn {
  opacity: 1;
}

.page-dropdown-rename-btn:hover {
  background: #e2e8f0;
  color: #475569;
}

.page-dropdown-rename-input {
  flex: 1;
  border: 1px solid var(--accent);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  outline: none;
  background: #fff;
  color: var(--text-main);
}

.page-dropdown-empty {
  padding: 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}

.toolbar-page-input {
  width: 120px;
  border: none;
  outline: none;
  background: transparent;
  color: inherit;
  font-size: 12px;
  font-weight: 600;
}

.toolbar-page-count {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(23, 105, 224, 0.08);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
}

.zoom-label {
  min-width: 44px;
  text-align: center;
  color: var(--text-sub);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.page-tab-close,
.panel-close {
  border: none;
  background: transparent;
  color: var(--text-sub);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0 4px;
}

.page-tab-close:hover,
.panel-close:hover {
  color: var(--text-main);
}

.canvas-body {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) 420px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.canvas-body.inspector-collapsed {
  grid-template-columns: 76px minmax(0, 1fr) 0;
}

.left-sidebar,
.inspector-panel {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(14px);
}

.left-sidebar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 8px;
  border-right: 1px solid var(--line-color);
}

.sidebar-header {
  padding: 0 2px 2px;
}

.sidebar-title {
  font-size: 12px;
  font-weight: 700;
}

.sidebar-subtitle {
  margin-top: 2px;
  color: var(--text-sub);
  font-size: 10px;
}

.sidebar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 2px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text-main);
  cursor: pointer;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease,
    color 0.18s ease;
}

.sidebar-item:hover {
  background: var(--accent-soft);
  border-color: rgba(23, 105, 224, 0.18);
  color: var(--accent);
  transform: translateY(-1px);
}

.sidebar-icon {
  width: 18px;
  height: 18px;
}

.sidebar-icon :deep(svg) {
  width: 18px;
  height: 18px;
  display: block;
}

.sidebar-label {
  font-size: 10px;
}

.canvas-workspace {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background:
    linear-gradient(180deg, rgba(244, 247, 251, 0.98), rgba(232, 238, 245, 0.98));
  overflow: hidden;
}

.canvas-viewport {
  flex: 1;
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 8px;
}

.canvas-board {
  display: grid;
  gap: 0;
  margin: 0 auto;
}

.ruler-corner,
.ruler {
  background: var(--ruler-bg);
  border: 1px solid var(--line-color);
}

.ruler-corner {
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: none;
  border-bottom: none;
  color: var(--text-sub);
  font-size: 10px;
  letter-spacing: 0.08em;
}

.ruler-unit-btn {
  border-left: 1px solid var(--line-color);
  cursor: pointer;
  transition: color 0.18s ease, background 0.18s ease;
}

.ruler-unit-btn:hover {
  color: var(--accent);
  background: rgba(23, 105, 224, 0.06);
}

.ruler {
  position: relative;
  overflow: hidden;
}

.ruler-top {
  border-bottom: none;
  border-left: none;
}

.ruler-left {
  border-right: none;
  border-top: none;
}

.ruler-mark {
  position: absolute;
  width: 1px;
  height: 100%;
  background: rgba(96, 112, 133, 0.22);
}

.ruler-mark.major {
  background: rgba(23, 105, 224, 0.24);
}

.ruler-mark::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 1px;
  height: 8px;
  background: currentColor;
  color: rgba(96, 112, 133, 0.55);
}

.ruler-mark.major::after {
  height: 13px;
  color: rgba(23, 105, 224, 0.58);
}

.ruler-mark > span {
  position: absolute;
  left: 4px;
  top: 3px;
  font-size: 9px;
  color: var(--text-sub);
}

.ruler-mark.vertical {
  width: 100%;
  height: 1px;
}

.ruler-mark.vertical::after {
  left: auto;
  right: 0;
  top: 0;
  width: 8px;
  height: 1px;
}

.ruler-mark.vertical.major::after {
  width: 13px;
}

.ruler-mark.vertical > span {
  top: -5px;
  left: 4px;
}

.ruler-guide-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(208, 54, 80, 0.72);
  pointer-events: none;
}

.ruler-guide-marker.vertical {
  left: 0;
  right: 0;
  top: auto;
  bottom: auto;
  width: auto;
  height: 1px;
}

.canvas-scale-shell {
  position: relative;
}

.canvas-container {
  position: relative;
  transform-origin: top left;
  box-shadow:
    0 26px 48px rgba(55, 73, 95, 0.14),
    0 4px 14px rgba(55, 73, 95, 0.08);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98));
  overflow: hidden;
}

.canvas-paper {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(transparent 31px, var(--grid-line) 32px),
    linear-gradient(90deg, transparent 31px, var(--grid-line) 32px),
    #fff;
  background-size: 32px 32px;
  pointer-events: none;
}

.qr-markers {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}
.qr-corner {
  position: absolute;
  border: 2px dashed rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.03);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: rgba(0, 0, 0, 0.2);
  font-family: monospace;
  font-weight: 600;
}
.qr-corner::after {
  content: 'QR';
}

.bleed-guides {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}
.trim-line {
  position: absolute;
  border: 1px solid rgba(208, 54, 80, 0.6);
  box-sizing: border-box;
}
.bleed-line {
  position: absolute;
  border: 1px dashed rgba(208, 54, 80, 0.3);
  box-sizing: border-box;
}

.canvas-guide {
  position: absolute;
  z-index: 20;
  pointer-events: auto;
}

.canvas-guide.vertical {
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1px solid rgba(208, 54, 80, 0.92);
  cursor: col-resize;
}

.canvas-guide.horizontal {
  left: 0;
  right: 0;
  height: 0;
  border-top: 1px solid rgba(208, 54, 80, 0.92);
  cursor: row-resize;
}

.canvas-guide.active,
.canvas-guide.draft,
.canvas-guide.snap-indicator {
  z-index: 21;
}

.canvas-guide.active.vertical,
.canvas-guide.draft.vertical,
.canvas-guide.snap-indicator.vertical {
  border-left-width: 2px;
}

.canvas-guide.active.horizontal,
.canvas-guide.draft.horizontal,
.canvas-guide.snap-indicator.horizontal {
  border-top-width: 2px;
}

.canvas-guide.draft,
.canvas-guide.snap-indicator {
  pointer-events: none;
  opacity: 0.9;
}

.canvas-guide.snap-indicator.vertical,
.canvas-guide.snap-indicator.horizontal {
  border-color: rgba(23, 105, 224, 0.95);
}

.guide-drag-tooltip {
  position: absolute;
  z-index: 30;
  font-size: 10px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #1a2332;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #c8d0dc;
  border-radius: 4px;
  padding: 1px 5px;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
  line-height: 1.5;
}
.guide-drag-tooltip.lt {
  transform: translate(8px, 2px);
}
.guide-drag-tooltip.tb {
  transform: translate(2px, 8px);
}

.selection-box {
  position: absolute;
  z-index: 30;
  border: 1px solid rgba(23, 105, 224, 0.72);
  background: rgba(23, 105, 224, 0.12);
  pointer-events: none;
}

.empty-hint {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #8d9aad;
  pointer-events: none;
}

.empty-icon {
  width: 54px;
  height: 54px;
}

.empty-icon :deep(svg) {
  width: 54px;
  height: 54px;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
}

.empty-subtitle {
  font-size: 12px;
}

.template-element {
  position: absolute;
  min-width: 10px;
  min-height: 6px;
  box-sizing: border-box;
  cursor: move;
  transition:
    box-shadow 0.15s ease,
    opacity 0.15s ease;
}

.template-element:hover {
  box-shadow: 0 0 0 1px rgba(23, 105, 224, 0.8);
}

.template-element.selected {
  outline: 2px solid rgba(23, 105, 224, 0.72);
  outline-offset: 1px;
  background: rgba(23, 105, 224, 0.06);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.88) inset,
    0 0 0 1px rgba(23, 105, 224, 0.2);
}

.template-element.primary {
  outline: 2px solid rgba(23, 105, 224, 0.92);
  outline-offset: 1px;
  background: rgba(23, 105, 224, 0.05);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.9) inset,
    0 0 0 3px rgba(23, 105, 224, 0.14);
}

.template-element.locked {
  cursor: default;
}

.template-element.hidden {
  opacity: 0.35;
}

.element-content {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.selection-badge {
  position: absolute;
  top: -7px;
  left: -7px;
  width: 10px;
  height: 10px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: rgba(23, 105, 224, 0.82);
  box-shadow: 0 3px 10px rgba(23, 105, 224, 0.22);
  pointer-events: none;
}

.selection-badge.primary {
  width: 12px;
  height: 12px;
  top: -8px;
  left: -8px;
  background: #1769e0;
}

.text-element {
  width: 100%;
  min-height: 100%;
  padding: 4px 6px;
  line-height: 1.5;
  word-break: break-word;
  background: rgba(255, 255, 255, 0.7);
}

.watermark-element {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.watermark-grid {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  width: 100%;
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
}

.watermark-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  color: #94a3b8;
  line-height: 1.4;
  word-break: break-word;
  overflow: hidden;
  text-align: center;
  pointer-events: none;
}

.watermark-tile :deep(p) {
  margin: 0;
}

.region-element {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  box-sizing: border-box;
}

.region-label {
  position: absolute;
  top: 8px;
  left: 8px;
  display: inline-flex;
  align-items: center;
  max-width: calc(100% - 16px);
  padding: 3px 8px;
  border-radius: 999px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prefill-element {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 100%;
  padding: 4px 6px;
  border: 1px dashed #b6c2d0;
  border-radius: 8px;
  background: #f7fafc;
}

.prefill-label {
  color: var(--text-sub);
}

.prefill-expr {
  color: var(--accent);
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.handwrite-element {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border: 2px dashed currentColor;
  border-radius: 10px;
  background: rgba(221, 82, 76, 0.04);
}

.handwrite-label {
  font-size: 12px;
  letter-spacing: 0.02em;
}

.table-element {
  position: relative;
  width: 100%;
  height: 100%;
  background: #fff;
  overflow: hidden;
}

.table-element table {
  width: 100%;
  height: 100%;
  border-collapse: collapse;
  table-layout: auto;
  font-size: 12px;
}

.table-element th,
.table-element td {
  padding: 2px 4px;
  box-sizing: border-box;
  vertical-align: top;
}

.table-element th {
  background: #f8fafc;
  font-weight: 600;
}

.virtual-cell {
  height: 24px;
}

.table-element--dynamic {
  border: 1px dashed rgba(23, 105, 224, 0.28);
}

.table-dynamic-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  min-height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(23, 105, 224, 0.1);
  color: var(--accent);
  font-size: 10px;
  font-weight: 700;
}

.image-element {
  width: 100%;
  height: 100%;
  border: 1px solid #d7dee8;
  border-radius: 8px;
  overflow: hidden;
  background: #eef3f8;
}

.image-element img {
  width: 100%;
  height: 100%;
  display: block;
}

.divider-element {
  width: 100%;
  height: 100%;
  border-top: 2px solid #22324c;
  margin-top: -1px;
}

.shape-element {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.shape-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 2px solid #22324c;
  transform-origin: center;
}

.shape-line.dir-horizontal {
  transform: translateY(-50%);
}

.shape-line.dir-vertical {
  left: 50%;
  right: auto;
  width: 0;
  height: 100%;
  top: 0;
  border-top: none;
  border-left: 2px solid #22324c;
  transform: translateX(-50%);
}

.shape-line.dir-diag-down {
  top: 0;
  left: 0;
  width: 141.4%;
  transform: rotate(45deg);
}

.shape-line.dir-diag-up {
  top: 100%;
  left: 0;
  width: 141.4%;
  transform: rotate(-45deg);
}

.delete-btn {
  position: absolute;
  top: -12px;
  right: 10px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: var(--danger);
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  box-shadow: 0 6px 18px rgba(207, 63, 73, 0.28);
  z-index: 2;
}

.locked-badge {
  position: absolute;
  top: -8px;
  left: -8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(23, 32, 51, 0.9);
  color: #fff;
  font-size: 11px;
}

.resize-handles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.handle {
  position: absolute;
  width: 9px;
  height: 9px;
  border: 2px solid #fff;
  border-radius: 3px;
  background: var(--accent);
  box-shadow: 0 3px 12px rgba(23, 105, 224, 0.2);
  pointer-events: auto;
}

.handle-nw { top: -4px; left: -4px; cursor: nw-resize; }
.handle-n { top: -4px; left: calc(50% - 4.5px); cursor: n-resize; }
.handle-ne { top: -4px; right: -4px; cursor: ne-resize; }
.handle-w { top: calc(50% - 4.5px); left: -4px; cursor: w-resize; }
.handle-e { top: calc(50% - 4.5px); right: -4px; cursor: e-resize; }
.handle-sw { bottom: -4px; left: -4px; cursor: sw-resize; }
.handle-s { bottom: -4px; left: calc(50% - 4.5px); cursor: s-resize; }
.handle-se { bottom: -4px; right: -4px; cursor: se-resize; }

.inspector-panel {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--line-color);
  min-width: 0;
  position: relative;
  height: 100%;
  width: 420px;
  overflow: hidden;
  contain: strict;
  transition:
    width 0.28s ease,
    min-width 0.28s ease,
    border-color 0.28s ease,
    opacity 0.2s ease;
}

.inspector-panel.collapsed {
  width: 0;
  min-width: 0;
  border-left-color: transparent;
  opacity: 0;
}

.inspector-toggle {
  position: absolute;
  top: 50%;
  right: 0;
  z-index: 4;
  width: 28px;
  height: 54px;
  border: 1px solid #ccd5e1;
  border-right: none;
  border-radius: 10px 0 0 10px;
  background: rgba(255, 255, 255, 0.98);
  color: var(--text-sub);
  cursor: pointer;
  transform: translateY(-50%);
  transition:
    right 0.28s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
  box-shadow: 0 8px 18px rgba(23, 32, 51, 0.08);
}

.inspector-toggle:hover {
  color: var(--accent);
  box-shadow: -7px 0 18px rgba(23, 32, 51, 0.12);
}

.canvas-workspace.has-inspector .inspector-toggle {
  right: -1px;
}

.inspector-toggle.collapsed {
  right: -1px;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 12px 10px;
  border-bottom: 1px solid var(--line-color);
}

.panel-title {
  font-size: 13px;
  font-weight: 700;
}

.panel-subtitle {
  margin-top: 3px;
  color: var(--text-sub);
  font-size: 11px;
}

.panel-body {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.panel-body--split {
  display: grid;
  grid-template-rows: minmax(0, 1fr) 280px;
  overflow: hidden;
  min-height: 0;
}

.panel-main {
  min-height: 0;
  overflow: auto;
}

.panel-tree {
  min-height: 0;
  border-top: 1px solid var(--line-color);
  background: rgba(246, 248, 251, 0.88);
}

.panel-tree-header {
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--line-color);
  background: rgba(255, 255, 255, 0.78);
}
.panel-tree-header--clickable {
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel-tree-header--clickable:hover {
  background: rgba(23, 105, 224, 0.06);
}
.panel-tree-chevron {
  font-size: 12px;
  color: var(--text-sub);
  flex-shrink: 0;
}

.panel-tree-body {
  height: 100%;
  overflow: auto;
  padding: 8px;
  min-height: 0;
}

.panel-empty {
  padding: 28px 18px;
  color: var(--text-sub);
  text-align: center;
}

.panel-empty-title {
  font-size: 14px;
  font-weight: 600;
}

.panel-empty-subtitle {
  margin-top: 6px;
  font-size: 12px;
}

.prop-section {
  padding: 12px;
  border-bottom: 1px solid #edf1f6;
}

.prop-section-title {
  margin-bottom: 8px;
  color: var(--text-sub);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 8px;
}

.prop-unit-btn {
  border: none;
  background: rgba(23, 105, 224, 0.08);
  color: var(--accent);
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
  text-transform: none;
  letter-spacing: 0;
}
.prop-unit-btn:hover {
  background: rgba(23, 105, 224, 0.16);
}

.prop-row {
  display: flex;
  gap: 8px;
}

.prop-field {
  margin-bottom: 8px;
}

.prop-field.half {
  flex: 1;
}

.prop-field label {
  display: block;
  margin-bottom: 4px;
  color: var(--text-sub);
  font-size: 11px;
}

.prop-input {
  width: 100%;
  min-height: 30px;
  padding: 5px 8px;
  border: 1px solid #ced7e2;
  border-radius: 8px;
  background: #fff;
  color: var(--text-main);
  font-size: 12px;
  box-sizing: border-box;
}

.prop-input:focus {
  border-color: rgba(23, 105, 224, 0.48);
  outline: none;
  box-shadow: 0 0 0 3px rgba(23, 105, 224, 0.08);
}

.prop-input[type='color'] {
  padding: 4px;
}

.prop-color-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.prop-color-input {
  flex: 1;
  min-width: 0;
}

.prop-color-clear {
  width: 24px;
  height: 24px;
  border: 1px solid #ced7e2;
  border-radius: 6px;
  background: #fff;
  color: #94a3b8;
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.prop-color-clear:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: #fef2f2;
}

.prop-range {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: #e2e8f0;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  margin: 4px 0;
}

.prop-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: transform 0.12s ease;
}

.prop-range::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.prop-range::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}

.prop-range-val {
  font-weight: 400;
  color: var(--text-sub);
  font-size: 10px;
  margin-left: 4px;
}

.prop-textarea {
  resize: vertical;
  min-height: 72px;
}

.prop-value.readonly {
  display: flex;
  align-items: center;
  min-height: 30px;
  padding: 5px 8px;
  border: 1px solid #e5ebf2;
  border-radius: 8px;
  background: var(--panel-soft);
  color: var(--text-sub);
  font-size: 12px;
}

.prop-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.prop-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.prop-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-main);
  font-size: 13px;
}

.purpose-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.purpose-group-label {
  margin-top: 4px;
  color: var(--text-sub);
  font-size: 11px;
  font-weight: 700;
  text-transform: none;
}

.purpose-item {
  margin-left: 0;
}

.purpose-sub {
  margin-left: 12px;
}

.purpose-config-section {
  margin-top: 8px;
  border-top: 1px solid #edf1f6;
  padding-top: 8px;
}

.purpose-config-header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  color: var(--text-sub);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}

.purpose-config-header:hover {
  color: var(--accent);
}

.purpose-config-chevron {
  font-size: 10px;
  width: 10px;
  flex-shrink: 0;
}

.purpose-config-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.prop-section-subtitle {
  margin: 12px 0 8px;
  color: var(--text-sub);
  font-size: 11px;
  font-weight: 700;
}

.table-columns-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.col-field,
.col-header {
  flex: 1;
}

.col-width {
  width: 72px;
  flex: 0 0 72px;
}

.col-align {
  width: 72px;
  flex: 0 0 72px;
}

.col-del {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: rgba(207, 63, 73, 0.1);
  color: var(--danger);
  cursor: pointer;
}

.col-add {
  width: fit-content;
}

.block-btn {
  width: 100%;
  margin-top: 12px;
}

.group-card {
  margin-bottom: 8px;
  border: 1px solid #dde6f0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  overflow: hidden;
}

.group-card.active {
  border-color: rgba(23, 105, 224, 0.42);
  box-shadow: 0 12px 24px rgba(23, 105, 224, 0.08);
}

.group-card--loose {
  background: rgba(248, 250, 252, 0.96);
}

.group-card-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.group-card-header--static {
  cursor: default;
}

.group-card-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.group-card-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-main);
}

.group-card-meta {
  margin-top: 2px;
  color: var(--text-sub);
  font-size: 10px;
}

.group-card-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.group-card-tools {
  display: flex;
  gap: 6px;
  padding: 0 12px 8px;
  flex-wrap: wrap;
}

.mini-btn {
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid #d7e0ea;
  border-radius: 7px;
  background: #fff;
  color: var(--text-sub);
  font-size: 11px;
  cursor: pointer;
}

.mini-btn:hover {
  border-color: rgba(23, 105, 224, 0.32);
  color: var(--accent);
}

.mini-btn.danger:hover {
  border-color: rgba(207, 63, 73, 0.42);
  color: var(--danger);
}

.outline-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: calc(100% - 24px);
  margin: 8px;
  padding: 8px 10px;
  border: 1px solid #e4eaf1;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.outline-item:hover,
.outline-item.active {
  border-color: rgba(23, 105, 224, 0.34);
  box-shadow: 0 10px 22px rgba(23, 105, 224, 0.08);
  transform: translateY(-1px);
}

.outline-item.primary {
  border-color: rgba(23, 105, 224, 0.58);
}

.outline-item--child {
  width: calc(100% - 16px);
  margin: 0 8px 8px;
  background: rgba(248, 250, 252, 0.96);
}

.outline-icon {
  width: 18px;
  height: 18px;
  color: var(--accent);
  flex-shrink: 0;
}

.outline-icon :deep(svg) {
  width: 18px;
  height: 18px;
}

.outline-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.outline-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
}

.outline-meta {
  margin-top: 2px;
  color: var(--text-sub);
  font-size: 10px;
}

.outline-flags {
  display: inline-flex;
  gap: 4px;
}

.outline-flag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--panel-soft);
  color: var(--text-sub);
  font-size: 10px;
}

.canvas-statusbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 5px 10px;
  border-top: 1px solid var(--line-color);
  background: rgba(255, 255, 255, 0.92);
  color: var(--text-sub);
  font-size: 11px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.text-editor-tb {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 6px;
  border: 1px solid #d8e0ea;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(23, 32, 51, 0.13);
  position: fixed;
  z-index: 9999;
  pointer-events: auto;
  width: fit-content;
}
.tb-row { display: flex; align-items: center; gap: 2px; white-space: nowrap; }
.tb-grp {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  padding: 2px;
  border-radius: 5px;
  background: rgba(23, 32, 51, 0.04);
}
.tb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px; height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #556677;
  font-size: 12px;
  cursor: pointer;
}
.tb-btn:hover { background: rgba(23, 32, 51, 0.08); color: #172033; }
.tb-btn svg { display: block; }
.tb-done {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  padding: 0 12px;
  border: none;
  border-radius: 5px;
  background: linear-gradient(180deg, #2478f4, #1769e0);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.tb-done:hover { opacity: 0.9; }
.tb-cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px; height: 26px;
  padding: 0;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: #8d9aad;
  font-size: 14px;
  cursor: pointer;
}
.tb-cancel:hover { background: rgba(207, 63, 73, 0.08); color: #cf3f49; }
.tb-lbl { font-size: 10px; color: #8d9aad; margin: 0 2px 0 4px; user-select: none; }
.tb-adjs { display: inline-flex; align-items: center; border: 1px solid #d8e0ea; border-radius: 4px; background: #fff; overflow: hidden; }
.tb-adj {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 20px; cursor: pointer; user-select: none;
  font-size: 11px; background: #f7f9fc; color: #556677;
}
.tb-adj:hover { background: #e8ecf2; }
.tb-adjv {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 24px; height: 20px; font-size: 11px; color: #445566;
  border-left: 1px solid #d8e0ea; border-right: 1px solid #d8e0ea;
  user-select: none; background: #fff;
}
.tb-sel {
  height: 22px; font-size: 11px;
  border: 1px solid #d8e0ea; border-radius: 4px;
  background: #fff; color: #445566;
  cursor: pointer; outline: none;
  min-width: 52px; padding: 0 2px;
}
.tb-sel:hover { border-color: #b0bcca; }
.tb-sep {
  display: inline-block;
  width: 1px; height: 18px; margin: 0 3px;
  background: #e2e8f0; flex-shrink: 0;
}
.tb-ddarr { font-size: 7px; color: #8d9aad; margin-left: 1px; }
.tb-dd {
  position: absolute; left: 0; top: 100%; margin-top: 2px;
  display: flex; background: #fff;
  border: 1px solid #d8e0ea; border-radius: 5px;
  box-shadow: 0 4px 12px rgba(23,32,51,0.12);
  z-index: 10000; overflow: hidden;
}
.tb-ddi {
  padding: 3px 10px; border: none;
  border-right: 1px solid #e8ecf0;
  background: transparent; color: #445566;
  font-size: 12px; cursor: pointer;
}
.tb-ddi:last-child { border-right: none; }
.tb-ddi:hover { background: rgba(23, 32, 51, 0.06); }

.tb-grp { position: relative; }
.tb-clr {
  width: 22px !important; height: 22px !important;
  border: 1px solid #d8e0ea !important;
  border-radius: 3px !important; font-size: 11px !important;
  font-weight: 700; line-height: 1;
}
.tb-cpop {
  position: absolute; left: 0; top: 100%; margin-top: 2px; z-index: 10000;
  background: #fff; border: 1px solid #d8e0ea; border-radius: 6px;
  box-shadow: 0 4px 12px rgba(23,32,51,0.12);
  padding: 4px; display: flex; flex-wrap: wrap; gap: 3px; width: 168px;
}
.tb-csw {
  width: 18px; height: 18px; border-radius: 2px; cursor: pointer;
  border: 1px solid #e0e4e8; flex-shrink: 0;
}
.tb-csw:hover { transform: scale(1.2); border-color: #999; }
.tb-cin { width: 100%; height: 22px; border: 1px solid #d8e0ea; border-radius: 3px; cursor: pointer; padding: 0; }
.tb-cclr { font-size: 10px; color: var(--danger); cursor: pointer; padding: 1px 6px; }
.tb-cclr:hover { background: rgba(207,63,73,0.08); }
.tb-emo {
  position: absolute; left: 0; top: 100%; margin-top: 2px; z-index: 10000;
  background: #fff; border: 1px solid #d8e0ea; border-radius: 6px;
  box-shadow: 0 4px 12px rgba(23,32,51,0.12);
  padding: 4px; display: flex; flex-direction: column; gap: 4px;
}
.tb-esrc { width: 180px; height: 26px; padding: 0 6px; border: 1px solid #d8e0ea; border-radius: 4px; font-size: 11px; outline: none; box-sizing: border-box; }
.tb-esrc:focus { border-color: var(--accent); }
.tb-egrd { display: flex; flex-wrap: wrap; gap: 2px; max-height: 140px; overflow-y: auto; }
.tb-egrd::-webkit-scrollbar { width: 4px; }
.tb-egrd::-webkit-scrollbar-thumb { background: #d8e0ea; border-radius: 2px; }
.tb-eitem { width: 30px; height: 30px; padding: 0; border: none; border-radius: 3px; background: transparent; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.tb-eitem:hover { background: rgba(23, 32, 51, 0.06); }

.text-element--editing {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-radius: 2px;
  cursor: text;
  min-height: 1em;
  caret-color: var(--accent);
}

.table-dynamic-note {
  margin-bottom: 10px;
}

.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  background: rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(8px);
}

.preview-dialog {
  width: min(1120px, 100%);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  border-radius: 22px;
  overflow: hidden;
  background: rgba(252, 253, 255, 0.98);
  box-shadow: 0 30px 80px rgba(15, 23, 42, 0.28);
}

.preview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--line-color);
}

.preview-body {
  display: flex;
  gap: 18px;
  padding: 22px;
  overflow: auto;
  flex-wrap: wrap;
  align-content: flex-start;
  background: linear-gradient(180deg, #f6f9fc, #eef3f8);
}

.preview-sheet {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-sheet-title {
  color: var(--text-sub);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.preview-shell {
  overflow: hidden;
  border-radius: 14px;
  box-shadow: 0 18px 34px rgba(55, 73, 95, 0.14);
  background: #fff;
}

.preview-canvas {
  position: relative;
  transform-origin: top left;
}

.preview-element {
  cursor: default;
}

@media (max-width: 1200px) {
  .canvas-body {
    grid-template-columns: 72px minmax(0, 1fr) 360px;
  }

  .canvas-body.inspector-collapsed {
    grid-template-columns: 72px minmax(0, 1fr) 0;
  }

  .inspector-panel {
    width: 360px;
  }
}

@media (max-width: 980px) {
  .canvas-body {
    grid-template-columns: 88px minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) 280px;
  }

  .inspector-panel {
    grid-column: 1 / -1;
    border-left: none;
    border-top: 1px solid var(--line-color);
    width: 100%;
    opacity: 1;
  }

  .panel-body--split {
    grid-template-rows: minmax(0, 1fr) 220px;
  }

  .inspector-toggle,
  .canvas-workspace.has-inspector .inspector-toggle,
  .inspector-toggle.collapsed {
    top: auto;
    right: 12px;
    bottom: 12px;
    transform: none;
    border-right: 1px solid #ccd5e1;
    border-radius: 10px;
  }
}

@media (max-width: 720px) {
  .template-editor {
    min-height: 560px;
  }

  .canvas-toolbar {
    padding: 6px 8px;
  }

  .toolbar-meta {
    width: 100%;
    justify-content: space-between;
    margin-left: 0;
  }

  .canvas-body {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr) 260px;
  }

  .left-sidebar {
    flex-direction: row;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid var(--line-color);
  }

  .sidebar-header {
    min-width: 92px;
  }

  .sidebar-item {
    min-width: 64px;
  }

  .canvas-viewport {
    padding: 6px;
  }

  .prop-grid {
    grid-template-columns: 1fr;
  }

  .preview-overlay {
    padding: 16px;
  }
}

/* ── 边缘红光 ── */
.canvas-edge-glow {
  position: absolute;
  pointer-events: none;
  z-index: 100;
  opacity: 0;
  transition: opacity 0.1s ease;
}
.canvas-edge-glow.active {
  opacity: 1;
  animation: edgeGlowPulse 0.5s ease-in-out infinite alternate;
}
.canvas-edge-glow.top {
  top: 0; left: 0; right: 0; height: 6px;
  background: linear-gradient(to bottom, rgba(207, 63, 73, 0.7), transparent);
  box-shadow: 0 0 20px 6px rgba(207, 63, 73, 0.6);
}
.canvas-edge-glow.bottom {
  bottom: 0; left: 0; right: 0; height: 6px;
  background: linear-gradient(to top, rgba(207, 63, 73, 0.7), transparent);
  box-shadow: 0 0 20px 6px rgba(207, 63, 73, 0.6);
}
.canvas-edge-glow.left {
  top: 0; left: 0; bottom: 0; width: 6px;
  background: linear-gradient(to right, rgba(207, 63, 73, 0.7), transparent);
  box-shadow: 0 0 20px 6px rgba(207, 63, 73, 0.6);
}
.canvas-edge-glow.right {
  top: 0; right: 0; bottom: 0; width: 6px;
  background: linear-gradient(to left, rgba(207, 63, 73, 0.7), transparent);
  box-shadow: 0 0 20px 6px rgba(207, 63, 73, 0.6);
}

@keyframes edgeGlowPulse {
  0% { 
    opacity: 0.5;
    filter: blur(1px);
  }
  100% { 
    opacity: 1;
    filter: blur(2px);
  }
}

.template-element.edge-danger {
  box-shadow: 0 0 16px 6px rgba(207, 63, 73, 0.45) !important;
  transition: box-shadow 0.1s ease;
}

/* ── 文本裁剪区域 ── */
.text-content-area {
  width: 100%;
  height: 100%;
}

/* 文字环绕容器 */
.text-wrap-container {
  position: relative;
  overflow: hidden;
}

/* 挖空浮动形状 - 用于文字环绕 */
.cutout-float-shape {
  float: left;
  shape-margin: 8px;
  background: transparent;
  pointer-events: none;
  clear: none;
}

/* 清除浮动 */
.clear-float {
  clear: both;
  height: 0;
  overflow: hidden;
}

/* ── 挖空区域 ── */
.cutout-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}
.cutout-shape {
  position: absolute;
  cursor: move;
  user-select: none;
  pointer-events: auto;
  box-sizing: border-box;
  z-index: 2;
}
.cutout-shape-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
.cutout-shape-fill {
  fill: rgba(255, 255, 255, 0.9);
  stroke: none;
}
.cutout-shape-stroke {
  fill: none;
  stroke: #3b82f6;
  stroke-width: 1;
  stroke-dasharray: 4 2;
}
.cutout-shape.cutout-selected .cutout-shape-stroke {
  stroke: #ef4444;
  stroke-dasharray: none;
  stroke-width: 1.5;
}
.cutout-shape.cutout-selected .cutout-shape-fill {
  fill: rgba(255, 255, 255, 0.95);
}
/* 挖空删除按钮（和文本元素一致） */
.cutout-shape .element-delete-btn {
  position: absolute;
  top: -12px;
  right: 12px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: var(--danger);
  color: #fff;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(207, 63, 73, 0.28);
  z-index: 5;
}
.cutout-shape .element-delete-btn:hover {
  background: #dc2626;
}
/* 挖空缩放手柄（和文本元素一致） */
.cutout-shape .resize-handle {
  position: absolute;
  width: 9px;
  height: 9px;
  border: 2px solid #fff;
  border-radius: 3px;
  background: var(--accent);
  box-shadow: 0 3px 12px rgba(23, 105, 224, 0.2);
  pointer-events: auto;
  z-index: 4;
}
.cutout-shape .resize-handle.handle-nw { top: -4px; left: -4px; cursor: nwse-resize; }
.cutout-shape .resize-handle.handle-n { top: -4px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
.cutout-shape .resize-handle.handle-ne { top: -4px; right: -4px; cursor: nesw-resize; }
.cutout-shape .resize-handle.handle-w { top: 50%; left: -4px; transform: translateY(-50%); cursor: ew-resize; }
.cutout-shape .resize-handle.handle-e { top: 50%; right: -4px; transform: translateY(-50%); cursor: ew-resize; }
.cutout-shape .resize-handle.handle-sw { bottom: -4px; left: -4px; cursor: nesw-resize; }
.cutout-shape .resize-handle.handle-s { bottom: -4px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
.cutout-shape .resize-handle.handle-se { bottom: -4px; right: -4px; cursor: nwse-resize; }
.cutout-add-bar {
  position: absolute;
  bottom: 8px;
  right: 8px;
  opacity: 0.6;
  transition: opacity 0.15s;
  pointer-events: none;
}
.cutout-add-icon {
  pointer-events: auto;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}
.cutout-add-icon:hover {
  background: #fff;
  transform: scale(1.1);
}
.cutout-overlay:hover .cutout-add-bar {
  opacity: 1;
}
.cutout-add-btn {
  width: 22px;
  height: 22px;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: rgba(255,255,255,0.85);
  color: var(--accent);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0;
}
.cutout-add-btn:hover {
  background: var(--accent-soft);
}
.cutout-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}
.cutout-list-item:hover {
  background: var(--panel-soft);
}
.cutout-list-item.active {
  background: var(--accent-soft);
  color: var(--accent);
}
</style>
