<template>
  <section class="workbench">
    <header class="workbench__header">
      <code class="workbench__path">{{ pathText }}</code>
      <div class="workbench__tags">
        <span :class="['workbench__tag', 'workbench__tag--pane', activePane === 'base' ? 'is-base' : 'is-delta']">
          {{ activePane === 'base' ? 'Base' : 'Delta' }}
        </span>
        <span class="workbench__tag">{{ currentMatch.label }}</span>
        <span v-if="languageLabel" class="workbench__tag workbench__tag--language">
          {{ languageLabel }}
        </span>
      </div>
    </header>

    <div class="workbench__toolbar">
      <div class="workbench__controls">
        <div v-if="supportsPreview" class="workbench__layout-actions">
          <button :class="{ 'is-active': splitMode === 'vertical' }" title="上下布局" @click="splitMode = 'vertical'"> 上下 </button>
          <button :class="{ 'is-active': splitMode === 'horizontal' }" title="左右布局" @click="splitMode = 'horizontal'"> 左右 </button>
          <button :class="{ 'is-active': collapsedPane === 'preview' }" title="折叠预览" @click="toggleCollapse('preview')"> 折叠预览 </button>
          <button :class="{ 'is-active': collapsedPane === 'editor' }" title="折叠编辑" @click="toggleCollapse('editor')"> 折叠编辑 </button>
        </div>

        <div v-if="currentMatch.canEditSource" class="workbench__actions">
          <button @click="handleFormat">格式化</button>
          <button @click="handleReset">恢复</button>
          <button class="primary" @click="handleSave">写回</button>
        </div>
      </div>
    </div>

    <div class="workbench__body">
      <div
        v-if="supportsPreview"
        ref="splitContainerRef"
        :class="[
          'workbench__split',
          splitMode === 'vertical' ? 'is-vertical' : 'is-horizontal',
          collapsedPane === 'preview' ? 'is-preview-collapsed' : '',
          collapsedPane === 'editor' ? 'is-editor-collapsed' : '',
        ]"
      >
        <section
          :class="[
            'workbench__preview',
            currentMatch.kind === 'color' ? 'workbench__preview--floating' : '',
            colorPickerOpen ? 'is-color-picker-open' : '',
          ]"
          :style="previewPaneStyle"
        >
          <div v-if="currentMatch.kind === 'image'" class="workbench__preview--image">
            <img :src="selectedString" alt="selected preview" />
          </div>

          <div v-else-if="currentMatch.kind === 'image-list'" class="workbench__preview--image-list">
            <figure v-for="(item, index) in selectedStringArray" :key="`${item}-${index}`" class="workbench__image-card">
              <img :src="item" :alt="`image-${index}`" />
              <figcaption>[{{ index }}]</figcaption>
            </figure>
          </div>

          <div v-else-if="currentMatch.kind === 'link'" class="workbench__preview--link">
            <div class="workbench__preview-toolbar">
              <a :href="selectedString" target="_blank" rel="noreferrer">打开链接</a>
            </div>
            <iframe :src="selectedString" class="workbench__iframe" loading="lazy" referrerpolicy="no-referrer"></iframe>
          </div>

          <div v-else-if="currentMatch.kind === 'link-list'" class="workbench__preview--link-list">
            <a
              v-for="(item, index) in selectedStringArray"
              :key="`${item}-${index}`"
              :href="item"
              target="_blank"
              rel="noreferrer"
              class="workbench__link-card"
            >
              <strong>[{{ index }}]</strong>
              <span>{{ item }}</span>
            </a>
          </div>

          <div v-else-if="currentMatch.kind === 'color'" class="workbench__preview--color">
            <div class="workbench__color-swatch" :style="{ background: selectedString }"></div>
            <div class="workbench__color-meta">
              <span>{{ selectedString }}</span>
              <div v-if="colorInputValue" class="workbench__color-picker">
                <button type="button" class="workbench__color-picker-shell" @click.stop="toggleColorPicker">
                  <span>调色</span>
                  <strong>{{ colorInputValue }}</strong>
                  <i class="workbench__color-picker-dot" :style="{ background: colorInputValue }"></i>
                </button>

                <div v-if="colorPickerOpen" class="workbench__color-popover">
                  <div
                    ref="colorSpectrumRef"
                    class="workbench__color-spectrum"
                    :style="{ background: colorSpectrumBackground }"
                    @pointerdown.stop.prevent="beginSpectrumDrag"
                  >
                    <i
                      class="workbench__color-spectrum-handle"
                      :style="{
                        left: `${activeColorSaturation}%`,
                        top: `${100 - activeColorValue}%`,
                      }"
                    ></i>
                  </div>

                  <label class="workbench__color-slider">
                    <span>色相</span>
                    <input :value="activeColorHue" type="range" min="0" max="360" @input="handleHueInput" />
                  </label>

                  <div class="workbench__color-popover-footer">
                    <div class="workbench__color-picker-preview" :style="{ background: selectedString }"></div>
                    <input :value="selectedString" type="text" class="workbench__color-hex-input" @input="handleColorHexInput" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="currentMatch.kind === 'color-list'" class="workbench__preview--color-list">
            <div v-for="(item, index) in selectedStringArray" :key="`${item}-${index}`" class="workbench__color-chip">
              <div class="workbench__color-chip-swatch" :style="{ background: item }"></div>
              <span>[{{ index }}] {{ item }}</span>
            </div>
          </div>
        </section>

        <div
          v-if="collapsedPane === 'none'"
          class="workbench__splitter"
          :title="splitMode === 'vertical' ? '拖动调整预览高度' : '拖动调整预览宽度'"
          @pointerdown.prevent="startSplitResize"
        ></div>

        <section class="workbench__editor" :style="editorPaneStyle">
          <MonacoSurface v-model="editorSource" :language="currentMatch.language" :read-only="!currentMatch.canEditSource" />
        </section>
      </div>

      <div v-else class="workbench__editor workbench__editor--full">
        <MonacoSurface v-model="editorSource" :language="currentMatch.language" :read-only="!currentMatch.canEditSource" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, ref, watch } from 'vue';

  import MonacoSurface from './MonacoSurface.vue';
  import { matchEmbeddedEditor } from '../model/embeddedRegistry';
  import { getValueAtPath, stringifyJsonPath } from '../model/jsonPath';
  import type { DeltaEditorPane, JsonPathSegment } from '../model/types';

  type SplitMode = 'vertical' | 'horizontal';
  type CollapsedPane = 'none' | 'preview' | 'editor';

  const props = defineProps<{
    activePane: DeltaEditorPane;
    selectedPath: JsonPathSegment[];
    baseDocument: Record<string, unknown>;
    deltaDocument: Record<string, unknown>;
  }>();

  const emit = defineEmits<{
    (_event: 'update-selected-value', _payload: { side: DeltaEditorPane; path: JsonPathSegment[]; value: unknown }): void;
  }>();

  const editorSource = ref('');
  const splitMode = ref<SplitMode>('vertical');
  const collapsedPane = ref<CollapsedPane>('none');
  const colorPickerOpen = ref(false);
  const colorSpectrumRef = ref<HTMLElement | null>(null);
  const splitContainerRef = ref<HTMLElement | null>(null);
  const activeColorHue = ref(215);
  const activeColorSaturation = ref(82);
  const activeColorValue = ref(90);
  const verticalSplitRatio = ref(36);
  const horizontalSplitRatio = ref(42);

  const activeRoot = computed(() => (props.activePane === 'base' ? props.baseDocument : props.deltaDocument));

  const selectedValue = computed(() => getValueAtPath(activeRoot.value, props.selectedPath));

  const currentMatch = computed(() =>
    matchEmbeddedEditor({
      side: props.activePane,
      path: props.selectedPath,
      value: selectedValue.value,
      root: activeRoot.value,
      base: props.baseDocument,
      delta: props.deltaDocument,
    })
  );

  const pathText = computed(() => stringifyJsonPath(props.selectedPath));

  const previewValue = computed(() => currentMatch.value.setSource(editorSource.value, selectedValue.value));
  const selectedString = computed(() => currentMatch.value.getSource(previewValue.value));
  const selectedStringArray = computed(() =>
    Array.isArray(previewValue.value) ? previewValue.value.filter((item): item is string => typeof item === 'string') : []
  );

  const supportsPreview = computed(() => ['image', 'image-list', 'link', 'link-list', 'color', 'color-list'].includes(currentMatch.value.kind));
  const activeSplitRatio = computed(() => (splitMode.value === 'vertical' ? verticalSplitRatio.value : horizontalSplitRatio.value));
  const previewPaneStyle = computed(() => {
    if (!supportsPreview.value || collapsedPane.value !== 'none') {
      return undefined;
    }
    return {
      flex: `0 0 calc((100% - 12px) * ${activeSplitRatio.value} / 100)`,
    };
  });
  const editorPaneStyle = computed(() => {
    if (!supportsPreview.value || collapsedPane.value !== 'none') {
      return undefined;
    }
    return {
      flex: `1 1 calc((100% - 12px) * ${100 - activeSplitRatio.value} / 100)`,
    };
  });

  const languageLabel = computed(() => {
    const language = currentMatch.value.language;
    if (!language || language === 'plaintext' || language === 'json') {
      return null;
    }
    return language.toUpperCase();
  });

  const colorInputValue = computed(() => normalizeHexColor(selectedString.value));
  const colorPickerHex = computed(() => hsvToHex(activeColorHue.value, activeColorSaturation.value, activeColorValue.value));
  const colorSpectrumBackground = computed(() => `hsl(${activeColorHue.value} 100% 50%)`);

  watch(
    () => [currentMatch.value, selectedValue.value, props.selectedPath, props.activePane],
    () => {
      editorSource.value = currentMatch.value.getSource(selectedValue.value);
    },
    { deep: true, immediate: true }
  );

  watch(supportsPreview, (value) => {
    if (!value) {
      collapsedPane.value = 'none';
      colorPickerOpen.value = false;
      stopSplitResize();
    }
  });

  watch(
    colorInputValue,
    (value) => {
      if (!value) {
        return;
      }
      const hsv = hexToHsv(value);
      activeColorHue.value = hsv.h;
      activeColorSaturation.value = hsv.s;
      activeColorValue.value = hsv.v;
    },
    { immediate: true }
  );

  function normalizeHexColor(value: string): string | null {
    if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
      return null;
    }
    if (value.length === 4) {
      const [hash, r, g, b] = value;
      return `${hash}${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return value.toLowerCase();
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  let activeSplitResize: SplitMode | null = null;

  function hexToHsv(hex: string) {
    const normalized = normalizeHexColor(hex) ?? '#000000';
    const red = parseInt(normalized.slice(1, 3), 16) / 255;
    const green = parseInt(normalized.slice(3, 5), 16) / 255;
    const blue = parseInt(normalized.slice(5, 7), 16) / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;

    let hue = 0;
    if (delta !== 0) {
      if (max === red) {
        hue = 60 * (((green - blue) / delta) % 6);
      } else if (max === green) {
        hue = 60 * ((blue - red) / delta + 2);
      } else {
        hue = 60 * ((red - green) / delta + 4);
      }
    }

    return {
      h: (hue + 360) % 360,
      s: max === 0 ? 0 : Math.round((delta / max) * 100),
      v: Math.round(max * 100),
    };
  }

  function hsvToHex(hue: number, saturation: number, value: number) {
    const s = clamp(saturation, 0, 100) / 100;
    const v = clamp(value, 0, 100) / 100;
    const chroma = v * s;
    const hueSection = (((hue % 360) + 360) % 360) / 60;
    const x = chroma * (1 - Math.abs((hueSection % 2) - 1));
    const match = v - chroma;

    let red = 0;
    let green = 0;
    let blue = 0;

    if (hueSection >= 0 && hueSection < 1) {
      red = chroma;
      green = x;
    } else if (hueSection < 2) {
      red = x;
      green = chroma;
    } else if (hueSection < 3) {
      green = chroma;
      blue = x;
    } else if (hueSection < 4) {
      green = x;
      blue = chroma;
    } else if (hueSection < 5) {
      red = x;
      blue = chroma;
    } else {
      red = chroma;
      blue = x;
    }

    const toHex = (channel: number) =>
      Math.round((channel + match) * 255)
        .toString(16)
        .padStart(2, '0');

    return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
  }

  function toggleCollapse(target: Exclude<CollapsedPane, 'none'>) {
    collapsedPane.value = collapsedPane.value === target ? 'none' : target;
    if (collapsedPane.value !== 'none') {
      stopSplitResize();
    }
  }

  function handleFormat() {
    if (currentMatch.value.formatSource) {
      editorSource.value = currentMatch.value.formatSource(editorSource.value);
    }
  }

  function handleReset() {
    editorSource.value = currentMatch.value.getSource(selectedValue.value);
  }

  function handleSave() {
    emit('update-selected-value', {
      side: props.activePane,
      path: props.selectedPath,
      value: currentMatch.value.setSource(editorSource.value, selectedValue.value),
    });
  }

  function toggleColorPicker() {
    if (!colorInputValue.value) {
      return;
    }
    colorPickerOpen.value = !colorPickerOpen.value;
  }

  function handleColorHexInput(event: Event) {
    const value = normalizeHexColor((event.target as HTMLInputElement).value);
    if (!value) {
      return;
    }
    editorSource.value = value;
  }

  function startSplitResize(event: PointerEvent) {
    if (!splitContainerRef.value || collapsedPane.value !== 'none') {
      return;
    }
    activeSplitResize = splitMode.value;
    window.addEventListener('pointermove', handleSplitResizeMove);
    window.addEventListener('pointerup', stopSplitResize);
    handleSplitResizeMove(event);
  }

  function handleSplitResizeMove(event: PointerEvent) {
    if (!activeSplitResize || !splitContainerRef.value) {
      return;
    }

    const rect = splitContainerRef.value.getBoundingClientRect();
    const minPaneSize = 22;
    const nextRatio =
      activeSplitResize === 'vertical' ? ((event.clientY - rect.top) / rect.height) * 100 : ((event.clientX - rect.left) / rect.width) * 100;
    const clamped = clamp(nextRatio, minPaneSize, 100 - minPaneSize);

    if (activeSplitResize === 'vertical') {
      verticalSplitRatio.value = clamped;
      return;
    }

    horizontalSplitRatio.value = clamped;
  }

  function stopSplitResize() {
    activeSplitResize = null;
    window.removeEventListener('pointermove', handleSplitResizeMove);
    window.removeEventListener('pointerup', stopSplitResize);
  }

  function applySpectrumFromPointer(event: PointerEvent) {
    if (!colorSpectrumRef.value) {
      return;
    }
    const rect = colorSpectrumRef.value.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = clamp(event.clientY - rect.top, 0, rect.height);
    activeColorSaturation.value = Math.round((x / rect.width) * 100);
    activeColorValue.value = Math.round(100 - (y / rect.height) * 100);
    editorSource.value = colorPickerHex.value;
  }

  function beginSpectrumDrag(event: PointerEvent) {
    applySpectrumFromPointer(event);

    const handleMove = (moveEvent: PointerEvent) => {
      applySpectrumFromPointer(moveEvent);
    };
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  function handleHueInput(event: Event) {
    activeColorHue.value = Number((event.target as HTMLInputElement).value);
    editorSource.value = colorPickerHex.value;
  }

  function handleWindowPointerDown(event: PointerEvent) {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.workbench__color-picker')) {
      colorPickerOpen.value = false;
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', handleWindowPointerDown);
  }

  onBeforeUnmount(() => {
    stopSplitResize();
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', handleWindowPointerDown);
    }
  });
</script>

<style scoped lang="less">
  .workbench {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    background: linear-gradient(180deg, #fffdf8 0%, #f8fafc 100%);
    border: 1px solid #d7dee8;
    border-radius: 16px;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
    overflow: hidden;
  }

  .workbench__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px 10px;
    border-bottom: 1px solid #e4ebf2;
  }

  .workbench__path {
    margin: 0;
    padding: 5px 8px;
    border-radius: 10px;
    background: #f1f5f9;
    color: #0f172a;
    font-size: 12px;
    line-height: 1.2;
    word-break: break-all;
  }

  .workbench__tags {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
  }

  .workbench__tag {
    padding: 4px 9px;
    border-radius: 999px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 11px;
    font-weight: 700;
  }

  .workbench__tag--pane.is-base {
    background: #ecfeff;
    color: #0f766e;
  }

  .workbench__tag--pane.is-delta {
    background: #fff7ed;
    color: #c2410c;
  }

  .workbench__tag--language {
    background: #f5f3ff;
    color: #6d28d9;
  }

  .workbench__toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 8px 10px;
    border-bottom: 1px solid #e8edf4;
    background: linear-gradient(180deg, #f8fbff, #f2f6fb);
  }

  .workbench__controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
    width: 100%;
  }

  .workbench__layout-actions,
  .workbench__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 3px;
    border: 1px solid #d8e0ea;
    border-radius: 10px;
    background: #fff;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.9),
      0 1px 2px rgba(15, 23, 42, 0.04);

    button {
      border: 1px solid transparent;
      background: transparent;
      color: #334155;
      border-radius: 8px;
      padding: 6px 9px;
      font-size: 11px;
      font-weight: 600;
      line-height: 1;
      cursor: pointer;
    }

    button:hover {
      background: #f8fafc;
    }

    .is-active,
    .primary {
      background: #eaf2fb;
      color: #0f3a68;
      border-color: #cadcf1;
    }
  }

  .workbench__body {
    flex: 1;
    min-height: 0;
    padding: 12px;
  }

  .workbench__split {
    display: flex;
    height: 100%;
    min-height: 0;
    gap: 0;
    position: relative;
  }

  .workbench__split.is-vertical {
    flex-direction: column;
  }

  .workbench__split.is-horizontal {
    flex-direction: row;
  }

  .workbench__split.is-preview-collapsed {
    display: block;
  }

  .workbench__split.is-preview-collapsed .workbench__preview {
    display: none;
  }

  .workbench__split.is-editor-collapsed {
    display: block;
  }

  .workbench__split.is-editor-collapsed .workbench__editor {
    display: none;
  }

  .workbench__preview,
  .workbench__editor {
    min-height: 0;
    min-width: 0;
  }

  .workbench__preview {
    border: 1px solid #e3e9f1;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.92);
    overflow: hidden;
  }

  .workbench__preview--floating {
    overflow: visible;
    position: relative;
    z-index: 4;
  }

  .workbench__preview.is-color-picker-open {
    z-index: 6;
  }

  .workbench__splitter {
    position: relative;
    flex: 0 0 12px;
    z-index: 3;
  }

  .workbench__splitter::before {
    content: '';
    position: absolute;
    inset: 0;
    margin: auto;
    border-radius: 999px;
    background: linear-gradient(180deg, rgba(148, 163, 184, 0.16), rgba(59, 130, 246, 0.22));
    transition:
      background 0.2s ease,
      box-shadow 0.2s ease;
  }

  .workbench__splitter:hover::before {
    background: linear-gradient(180deg, rgba(96, 165, 250, 0.3), rgba(14, 165, 233, 0.42));
    box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.16);
  }

  .workbench__split.is-vertical .workbench__splitter {
    cursor: row-resize;
  }

  .workbench__split.is-vertical .workbench__splitter::before {
    width: 56px;
    height: 4px;
  }

  .workbench__split.is-horizontal .workbench__splitter {
    cursor: col-resize;
  }

  .workbench__split.is-horizontal .workbench__splitter::before {
    width: 4px;
    height: 56px;
  }

  .workbench__preview--image {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    background: linear-gradient(180deg, #f8fafc, #eef4fa);

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  .workbench__preview--image-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 10px;
    height: 100%;
    padding: 12px;
    align-content: start;
    overflow: auto;
    background: linear-gradient(180deg, #f8fafc, #eef4fa);
  }

  .workbench__image-card {
    margin: 0;
    border: 1px solid #dbe5f0;
    border-radius: 12px;
    overflow: hidden;
    background: #fff;

    img {
      display: block;
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: contain;
      background: linear-gradient(180deg, #f8fafc, #eef4fa);
    }

    figcaption {
      padding: 8px 10px;
      color: #475569;
      font-size: 12px;
    }
  }

  .workbench__preview--link {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .workbench__preview--link-list {
    display: grid;
    gap: 10px;
    align-content: start;
    height: 100%;
    padding: 12px;
    overflow: auto;
    background: linear-gradient(180deg, #ffffff, #f8fafc);
  }

  .workbench__link-card {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border: 1px solid #dbe5f0;
    border-radius: 12px;
    text-decoration: none;
    background: #fff;

    strong {
      color: #0f172a;
      font-size: 12px;
    }

    span {
      color: #2563eb;
      font-size: 12px;
      word-break: break-all;
    }
  }

  .workbench__preview-toolbar {
    display: flex;
    justify-content: flex-end;
    padding: 10px 12px 0;
  }

  .workbench__preview-toolbar a {
    color: #1d4ed8;
    font-size: 12px;
    text-decoration: none;
  }

  .workbench__iframe {
    flex: 1;
    width: 100%;
    min-height: 280px;
    border: none;
    background: #fff;
  }

  .workbench__preview--color {
    display: flex;
    flex-direction: column;
    gap: 12px;
    height: 100%;
    padding: 12px;
  }

  .workbench__preview--color-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
    height: 100%;
    padding: 12px;
    align-content: start;
    overflow: auto;
  }

  .workbench__color-swatch {
    flex: 1;
    min-height: 160px;
    border-radius: 12px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
  }

  .workbench__color-chip {
    display: grid;
    gap: 8px;
    padding: 10px;
    border: 1px solid #dbe5f0;
    border-radius: 12px;
    background: #fff;

    span {
      color: #334155;
      font-size: 12px;
      word-break: break-all;
    }
  }

  .workbench__color-chip-swatch {
    height: 82px;
    border-radius: 10px;
    border: 1px solid rgba(15, 23, 42, 0.08);
  }

  .workbench__color-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;

    span {
      min-width: 0;
      color: #334155;
      font-size: 12px;
      word-break: break-all;
    }
  }

  .workbench__color-picker-shell {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 7px 10px;
    border: 1px solid #d8e0ea;
    border-radius: 999px;
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(241, 245, 249, 0.98)),
      linear-gradient(90deg, #ec4899, #8b5cf6, #0ea5e9, #22c55e, #f59e0b, #ef4444);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.95),
      0 6px 14px rgba(15, 23, 42, 0.08);
    cursor: pointer;
    border: none;

    span,
    strong {
      position: relative;
      z-index: 1;
    }

    span {
      color: #475569;
      font-size: 11px;
      font-weight: 700;
    }

    strong {
      color: #0f172a;
      font-size: 11px;
      font-weight: 700;
    }
  }

  .workbench__color-picker {
    position: relative;
  }

  .workbench__color-popover {
    position: absolute;
    right: 0;
    top: calc(100% + 10px);
    z-index: 20;
    width: 220px;
    padding: 12px;
    border: 1px solid #d8e0ea;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.97);
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
    backdrop-filter: blur(12px);
  }

  .workbench__color-spectrum {
    position: relative;
    height: 144px;
    border-radius: 12px;
    overflow: hidden;
    cursor: crosshair;
    box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
  }

  .workbench__color-spectrum::before,
  .workbench__color-spectrum::after {
    content: '';
    position: absolute;
    inset: 0;
  }

  .workbench__color-spectrum::before {
    background: linear-gradient(90deg, #ffffff, rgba(255, 255, 255, 0));
  }

  .workbench__color-spectrum::after {
    background: linear-gradient(0deg, #000000, rgba(0, 0, 0, 0));
  }

  .workbench__color-spectrum-handle {
    position: absolute;
    z-index: 1;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    border: 2px solid #ffffff;
    box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.16);
    transform: translate(-50%, -50%);
  }

  .workbench__color-slider {
    display: grid;
    gap: 6px;
    margin-top: 12px;

    span {
      color: #475569;
      font-size: 11px;
      font-weight: 700;
    }

    input {
      width: 100%;
      margin: 0;
      appearance: none;
      height: 8px;
      border-radius: 999px;
      background: linear-gradient(90deg, #ef4444 0%, #f59e0b 16%, #eab308 32%, #22c55e 48%, #06b6d4 64%, #3b82f6 80%, #8b5cf6 100%);
      outline: none;
    }

    input::-webkit-slider-thumb {
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 999px;
      border: 2px solid #fff;
      background: #0f172a;
      box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.1);
    }

    input::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border: 2px solid #fff;
      border-radius: 999px;
      background: #0f172a;
      box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.1);
    }
  }

  .workbench__color-popover-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
  }

  .workbench__color-picker-preview {
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    border-radius: 10px;
    border: 1px solid rgba(15, 23, 42, 0.08);
  }

  .workbench__color-hex-input {
    width: 100%;
    min-width: 0;
    border: 1px solid #d8e0ea;
    border-radius: 10px;
    padding: 8px 10px;
    color: #0f172a;
    font-size: 12px;
    font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
    background: #f8fafc;
  }

  .workbench__color-picker-dot {
    position: relative;
    z-index: 1;
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
    border-radius: 999px;
    border: 2px solid rgba(255, 255, 255, 0.96);
    box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
  }

  .workbench__editor,
  .workbench__editor--full {
    height: 100%;
  }

  @media (max-width: 1400px) {
    .workbench__header,
    .workbench__toolbar {
      align-items: flex-start;
      flex-direction: column;
    }

    .workbench__controls {
      width: 100%;
      justify-content: space-between;
    }

    .workbench__split.is-horizontal,
    .workbench__split.is-vertical {
      flex-direction: column;
    }

    .workbench__splitter {
      cursor: row-resize;
    }

    .workbench__splitter::before {
      width: 56px;
      height: 4px;
    }
  }
</style>
