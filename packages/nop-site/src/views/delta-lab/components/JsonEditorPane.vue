<template>
  <section class="delta-pane">
    <header class="delta-pane__header">
      <h3 class="delta-pane__title">
        <span v-if="side === 'base'" class="delta-pane__title-icon" aria-hidden="true">
          <img :src="BASE_ICON" alt="" />
        </span>
        <span v-else class="delta-pane__title-icon" aria-hidden="true">
          <img :src="DELTA_ICON" alt="" />
        </span>
        <span>{{ title }}</span>
      </h3>
      <div v-if="supportsSourceMode" class="delta-pane__mode-switch">
        <button :class="{ 'is-active': editorMode === 'tree' }" type="button" @click="editorMode = 'tree'"> 结构 </button>
        <button :class="{ 'is-active': editorMode === 'source' }" type="button" @click="editorMode = 'source'"> 源码 </button>
      </div>
    </header>
    <div v-if="editorMode === 'tree' || !supportsSourceMode" ref="containerRef" class="delta-pane__editor"></div>
    <div v-if="supportsSourceMode" v-show="editorMode === 'source'" class="delta-pane__source">
      <MonacoSurface v-model="sourceText" language="json" syntax-profile="delta-json" @focus="handleSourceFocus" />
      <p v-if="sourceStatus" :class="['delta-pane__source-status', sourceStatus.level === 'error' ? 'is-error' : 'is-info']">
        {{ sourceStatus.message }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
  import type { Content, JSONEditorSelection, JSONSelection, MenuItem, OnChangeStatus } from 'vanilla-jsoneditor';

  import { cloneDeep, isEqual } from 'lodash-es';
  import { createJSONEditor, getFocusPath, Mode, SelectionType } from 'vanilla-jsoneditor';
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

  import MonacoSurface from './MonacoSurface.vue';
  import { matchEmbeddedEditor } from '../model/embeddedRegistry';
  import { normalizeJsonPath, stringifyJsonPath } from '../model/jsonPath';
  import type { DeltaEditorPane, JsonPathSegment } from '../model/types';
  import { isDeltaLikeKey, renderDeltaKeyAsHtml, parseDeltaKeySegments, findMatchingBracket, type DeltaKeySegment } from '../model/deltaKeyRenderer';

  function svgDataUri(svg: string) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  const BASE_ICON = svgDataUri(
    `<svg t="1775130960888" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="8096" width="256" height="256"><path d="M259.911111 989.511111c-15.431111 0-30.648889-2.133333-45.297778-6.4-103.537778-30.08-171.093333-112.711111-172.088889-210.417778-0.782222-78.222222 56.96-147.555556 134.257778-161.208889 7.04-1.208889 14.08-2.417778 21.048889-3.555555 12.088889-1.991111 23.537778-3.911111 34.986667-6.115556 44.088889-8.675556 51.768889-16.782222 59.093333-62.08 7.822222-48.355556 43.52-82.133333 86.755556-82.133333 12.586667 0 25.173333 2.844444 37.546666 8.391111 11.093333 4.977778 20.337778 7.324444 28.942223 7.324445 17.564444 0 30.151111-10.026667 41.173333-20.906667 69.191111-68.266667 140.231111-136.888889 208.924444-203.164445l62.222223-60.088888c0.568889-0.568889 1.208889-1.066667 1.92-1.564445 4.266667-3.342222 13.582222-10.524444 10.666666-22.4-4.124444-16.924444 4.266667-25.742222 19.484445-39.964444 3.271111-3.057778 6.613333-6.186667 9.671111-9.315556 21.333333-22.186667 43.662222-44.586667 66.417778-66.631111 10.168889-9.884444 18.773333-14.648889 26.24-14.648889 7.537778 0 15.928889 5.048889 25.6 15.36 6.4 6.826667 12.728889 13.724444 19.128888 20.693333 11.164444 12.16 22.684444 24.675556 34.417778 36.835556 13.368889 13.795556 13.582222 23.822222 0.924445 37.12-17.28 18.062222-34.346667 36.337778-51.413334 54.542222l-0.924444 0.995556c-9.671111 10.382222-19.413333 20.764444-29.084445 31.075555l-2.346666 2.488889c-3.697778 4.053333-7.893333 8.604444-10.88 8.675556-29.44 0.853333-46.648889 19.128889-61.866667 35.2-1.991111 2.062222-3.911111 4.124444-5.902222 6.186666-88.462222 90.951111-177.066667 181.831111-265.671111 272.711112-3.768889 3.84-7.751111 7.608889-11.662222 11.306666-3.2 3.057778-6.4 6.044444-9.528889 9.173334-0.924444 0.924444-2.631111 2.062222-4.337778 3.271111-6.4 4.337778-19.626667 13.368889-14.222222 31.431111 6.684444 22.257778 29.368889 25.244444 37.902222 26.382222 10.951111 1.493333 22.257778 1.92 32.284444 2.346667l6.4 0.284444c14.72 0.711111 22.186667 1.991111 26.097778 10.524445 3.626667 7.751111 1.564444 14.862222-7.822222 27.377777-21.048889 27.946667-52.124444 46.791111-89.813333 54.4-47.288889 9.528889-70.826667 36.408889-74.097778 84.408889-0.995556 14.08-3.911111 28.444444-6.684445 40.675556-16.853333 74.808889-89.386667 131.413333-168.462222 131.413333z" fill="#777777" p-id="8097"></path><path d="M267.448889 835.911111c-2.915556 0-5.973333-1.137778-8.888889-3.271111-24.888889-18.346667-47.644444-40.035556-69.76-61.084444-5.475556-5.191111-5.617778-11.448889-0.568889-18.488889 3.128889-4.337778 7.324444-7.04 10.951111-7.04 1.28 0 2.56 0.355556 3.697778 1.066666 28.088889 17.208889 54.044444 39.822222 77.155556 67.413334 0.142222 0.782222 0.284444 1.848889 0.355555 2.56 0.142222 0.924444 0.213333 1.777778 0.355556 2.56-0.142222 4.764444-1.92 9.528889-5.048889 12.657777-2.275556 2.346667-5.191111 3.626667-8.248889 3.626667z m59.377778-75.946667c-2.844444 0-5.76-0.995556-8.604445-2.915555-20.906667-13.937778-41.173333-32.568889-60.088889-55.537778-4.337778-5.191111-4.124444-10.951111 0.64-16.924444 3.2-4.053333 7.04-6.4 10.666667-6.4 1.564444 0 3.057778 0.426667 4.622222 1.351111 24.96 14.648889 47.075556 34.986667 65.777778 60.444444 0 0.426667 0.071111 1.066667 0.142222 1.493334 0.071111 0.853333 0.213333 1.635556 0.284445 2.346666 0 4.693333-1.706667 9.315556-4.693334 12.444445-2.417778 2.346667-5.546667 3.697778-8.746666 3.697777z" fill="#777777" p-id="8098"></path></svg>`
  );

  const DELTA_ICON = svgDataUri(
    `<svg t="1775131037897" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="8306" width="256" height="256"><path d="M972.231111 572.16c-6.471111-4.906667-11.306667-11.946667-16.711111-18.204444C805.76 382.791111 656 211.626667 506.311111 40.391111c-14.435556-16.568889-32.142222-25.315556-52.266667-24.248889-35.2-0.782222-57.6 15.004444-73.244444 43.591111C269.297778 263.324444 157.44 466.844444 45.653333 670.293333c-13.155556 23.893333-17.28 48.426667-1.564444 71.964445 15.928889 23.964444 41.315556 28.231111 67.768889 25.031111 119.182222-14.293333 238.293333-29.013333 357.404444-43.875556 14.008889-1.777778 21.902222 2.346667 29.084445 15.502223 44.871111 82.702222 90.737778 164.835556 136.462222 247.111111 6.613333 11.875556 13.155556 28.16 30.364444 19.413333 17.777778-9.031111 7.751111-23.466667 1.28-35.413333-15.786667-28.942222-32-57.671111-47.928889-86.542223-27.946667-50.488889-55.893333-100.977778-83.626666-151.608888-3.626667-6.613333-11.235556-15.004444 5.048889-16.853334 47.004444-5.262222 94.008889-10.88 141.013333-16.64 87.111111-10.666667 174.222222-21.902222 261.404444-31.928889 23.68-2.702222 39.182222-14.648889 44.657778-36.266666 5.262222-20.764444 5.76-42.382222-14.791111-58.026667z" fill="#777778" p-id="8307"></path></svg>`
  );

  const props = defineProps<{
    title: string;
    side: DeltaEditorPane;
    modelValue: Record<string, unknown>;
    baseDocument: Record<string, unknown>;
    deltaDocument: Record<string, unknown>;
  }>();

  const emit = defineEmits<{
    (_event: 'update:modelValue', _value: Record<string, unknown>): void;
    (_event: 'activate', _side: DeltaEditorPane): void;
    (_event: 'selection-change', _payload: { side: DeltaEditorPane; path: JsonPathSegment[] }): void;
  }>();

  const containerRef = ref<HTMLElement | null>(null);
  const currentJson = ref<Record<string, unknown>>(cloneDeep(props.modelValue));
  const currentSelection = ref<JSONEditorSelection | undefined>(undefined);
  const supportsSourceMode = computed(() => props.side === 'delta');
  const editorMode = ref<'tree' | 'source'>(props.side === 'delta' ? 'source' : 'tree');
  const sourceText = ref(JSON.stringify(props.modelValue, null, 2));
  const sourceStatus = ref<{ level: 'error' | 'info'; message: string } | null>(
    props.side === 'delta' ? { level: 'info', message: 'Delta 源码模式已启用，括号与路径语法会增强高亮。' } : null
  );

  let editorInstance: ReturnType<typeof createJSONEditor> | null = null;
  let isSyncingSourceText = false;
  let keyHighlightObserver: MutationObserver | null = null;
  let currentHoveredBracket: { element: HTMLElement; matchElement: HTMLElement | null } | null = null;

  const rootDocument = computed(() => (props.side === 'base' ? props.baseDocument : props.deltaDocument));

  function isDirectiveKey(segment: JsonPathSegment | undefined): boolean {
    return typeof segment === 'string' && segment.startsWith('$');
  }

  function isDeltaDescriptorKey(segment: JsonPathSegment | undefined): boolean {
    if (typeof segment !== 'string') {
      return false;
    }
    return (
      segment.includes('.') ||
      segment.includes('[') ||
      segment.includes(']') ||
      segment.includes('+') ||
      segment.includes('-') ||
      segment.includes("'")
    );
  }

  function extractPath(selection: JSONEditorSelection | undefined): JsonPathSegment[] {
    if (!selection || selection.type === SelectionType.text) {
      return [];
    }

    if ('path' in selection) {
      return normalizeJsonPath([...selection.path] as JsonPathSegment[]);
    }

    if ('focusPath' in selection) {
      return normalizeJsonPath([...selection.focusPath] as JsonPathSegment[]);
    }

    return normalizeJsonPath([...getFocusPath(selection as JSONSelection)] as JsonPathSegment[]);
  }

  function handleChange(content: Content, _previous: Content, _status: OnChangeStatus) {
    emit('activate', props.side);
    if ('json' in content) {
      currentJson.value = cloneDeep(content.json) as Record<string, unknown>;
      if (supportsSourceMode.value) {
        isSyncingSourceText = true;
        sourceText.value = JSON.stringify(currentJson.value, null, 2);
        isSyncingSourceText = false;
        sourceStatus.value = {
          level: 'info',
          message: '树编辑结果已同步到源码视图。',
        };
      }
      emit('update:modelValue', currentJson.value);
    }
  }

  function handleSelect(selection: JSONEditorSelection | undefined) {
    currentSelection.value = selection;
    emit('activate', props.side);
    emit('selection-change', {
      side: props.side,
      path: extractPath(selection),
    });
  }

  function handleRenderMenu(items: MenuItem[]) {
    const selectionPath = extractPath(currentSelection.value);
    return [
      ...items,
      { type: 'separator' as const },
      {
        type: 'button' as const,
        text: ' ',
        className: 'delta-pane__menu-focus-button',
        title: `查看 ${stringifyJsonPath(selectionPath)} 节点`,
        onClick: () => {
          emit('activate', props.side);
          emit('selection-change', {
            side: props.side,
            path: selectionPath,
          });
        },
      },
    ];
  }

  function handleSourceFocus() {
    emit('activate', props.side);
  }

  function handleSourceChange(value: string) {
    sourceText.value = value;
    emit('activate', props.side);

    try {
      const parsed = JSON.parse(value);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        sourceStatus.value = {
          level: 'error',
          message: 'Delta 根节点必须是对象，当前源码未写回。',
        };
        return;
      }
      currentJson.value = cloneDeep(parsed) as Record<string, unknown>;
      sourceStatus.value = {
        level: 'info',
        message: '源码已同步到右侧 Delta 文档。',
      };
      emit('update:modelValue', currentJson.value);
    } catch (error) {
      sourceStatus.value = {
        level: 'error',
        message: error instanceof Error ? `JSON 解析失败：${error.message}` : 'JSON 解析失败，当前源码未写回。',
      };
    }
  }

  function handleClassName(path: JsonPathSegment[], value: unknown) {
    const match = matchEmbeddedEditor({
      side: props.side,
      path,
      value,
      root: rootDocument.value,
      base: props.baseDocument,
      delta: props.deltaDocument,
    });

    if (match.kind === 'json') {
      const lastSegment = path[path.length - 1];
      const classes: string[] = [];

      if (isDirectiveKey(lastSegment)) {
        classes.push('delta-editor-node--directive-key');
      }

      if (props.side === 'delta' && path.length === 1 && isDeltaDescriptorKey(path[0])) {
        classes.push('delta-editor-node--delta-path-key');
      }

      return classes.length ? classes.join(' ') : undefined;
    }

    const classes = [`delta-editor-node`, `delta-editor-node--${match.kind}`, `delta-editor-node--${match.layer}`];
    const lastSegment = path[path.length - 1];

    if (isDirectiveKey(lastSegment)) {
      classes.push('delta-editor-node--directive-key');
    }

    if (props.side === 'delta' && path.length === 1 && isDeltaDescriptorKey(path[0])) {
      classes.push('delta-editor-node--delta-path-key');
    }

    return classes.join(' ');
  }

  /**
   * 高亮处理所有Delta路径key
   */
  function highlightDeltaKeys(container: HTMLElement) {
    // 查找所有带有delta-path-key标记的key元素（非编辑状态）
    const deltaKeyElements = container.querySelectorAll('.delta-editor-node--delta-path-key .jse-key:not(.jse-editable-div)');

    deltaKeyElements.forEach((keyElement) => {
      if (!(keyElement instanceof HTMLElement)) {
        return;
      }

      // 跳过已经处理过的
      if (keyElement.dataset.deltaHighlighted === 'true') {
        return;
      }

      const keyText = keyElement.textContent?.trim() || '';
      if (!isDeltaLikeKey(keyText)) {
        return;
      }

      // 渲染为带高亮的HTML
      const highlightedHtml = renderDeltaKeyAsHtml(keyText);
      keyElement.innerHTML = highlightedHtml;
      keyElement.dataset.deltaHighlighted = 'true';

      // 添加括号匹配交互
      setupBracketMatching(keyElement);
    });

    // 处理编辑状态的input框
    const editableInputs = container.querySelectorAll('.delta-editor-node--delta-path-key .jse-editable-div');
    editableInputs.forEach((input) => {
      if (!(input instanceof HTMLElement)) {
        return;
      }

      // 为编辑框添加特殊样式以保持一致性
      if (!input.classList.contains('delta-key-editing')) {
        input.classList.add('delta-key-editing');
      }
    });
  }

  /**
   * 为key元素添加括号匹配功能
   */
  function setupBracketMatching(keyElement: HTMLElement) {
    const keyText = keyElement.textContent || '';
    const segments = parseDeltaKeySegments(keyText);
    const bracketElements = keyElement.querySelectorAll('.delta-key-token--bracket');

    bracketElements.forEach((bracketEl, index) => {
      if (!(bracketEl instanceof HTMLElement)) {
        return;
      }

      // 找到当前括号在segments中的索引
      const segmentIndex = segments.findIndex((seg, i) => seg.type === 'bracket' && i >= index);
      if (segmentIndex === -1) {
        return;
      }

      // 查找匹配的括号
      const matchIndex = findMatchingBracket(segments, segmentIndex);
      if (matchIndex === -1) {
        return;
      }

      // 找到匹配括号的DOM元素
      const matchElement = Array.from(bracketElements)[matchIndex] as HTMLElement | undefined;
      if (!matchElement) {
        return;
      }

      // 鼠标悬停时高亮匹配的括号对
      bracketEl.addEventListener('mouseenter', () => {
        bracketEl.classList.add('delta-key-bracket--hover');
        matchElement.classList.add('delta-key-bracket--matched');
        currentHoveredBracket = { element: bracketEl, matchElement };
      });

      bracketEl.addEventListener('mouseleave', () => {
        bracketEl.classList.remove('delta-key-bracket--hover');
        matchElement.classList.remove('delta-key-bracket--matched');
        if (currentHoveredBracket?.element === bracketEl) {
          currentHoveredBracket = null;
        }
      });
    });
  }

  /**
   * 启动DOM监听器，自动处理新增的Delta key
   */
  function startKeyHighlightObserver() {
    if (!containerRef.value) {
      return;
    }

    // 初次处理现有元素
    highlightDeltaKeys(containerRef.value);

    // 监听DOM变化
    keyHighlightObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              highlightDeltaKeys(node);
              // 也处理子节点
              if (containerRef.value?.contains(node)) {
                highlightDeltaKeys(containerRef.value);
              }
            }
          });
        }
      }
    });

    keyHighlightObserver.observe(containerRef.value, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * 停止DOM监听器
   */
  function stopKeyHighlightObserver() {
    if (keyHighlightObserver) {
      keyHighlightObserver.disconnect();
      keyHighlightObserver = null;
    }
  }

  function mountTreeEditor() {
    if (!containerRef.value || editorInstance) {
      return;
    }

    editorInstance = createJSONEditor({
      target: containerRef.value,
      props: {
        content: { json: cloneDeep(currentJson.value) },
        mode: Mode.tree,
        navigationBar: true,
        statusBar: true,
        mainMenuBar: true,
        onChange: handleChange,
        onSelect: handleSelect,
        onRenderMenu: handleRenderMenu,
        onClassName: handleClassName,
        onFocus: () => emit('activate', props.side),
      },
    });

    // 编辑器挂载后，启动key高亮处理
    nextTick(() => {
      startKeyHighlightObserver();
    });
  }

  function destroyTreeEditor() {
    stopKeyHighlightObserver();
    if (!editorInstance) {
      return;
    }
    void editorInstance.destroy();
    editorInstance = null;
  }

  onMounted(() => {
    if (!supportsSourceMode.value || editorMode.value === 'tree') {
      mountTreeEditor();
    }
  });

  watch(
    () => props.modelValue,
    (value) => {
      if (isEqual(value, currentJson.value)) {
        return;
      }
      currentJson.value = cloneDeep(value);
      isSyncingSourceText = true;
      sourceText.value = JSON.stringify(value, null, 2);
      isSyncingSourceText = false;
      sourceStatus.value = supportsSourceMode.value ? { level: 'info', message: '外部变更已同步到源码视图。' } : null;
      editorInstance?.updateProps({
        content: { json: cloneDeep(value) },
      });
    },
    { deep: true }
  );

  watch(sourceText, (value, previous) => {
    if (!supportsSourceMode.value || value === previous || isSyncingSourceText) {
      return;
    }
    handleSourceChange(value);
  });

  watch(
    () => [props.baseDocument, props.deltaDocument],
    () => {
      editorInstance?.updateProps({
        onClassName: handleClassName,
      });
    },
    { deep: true }
  );

  watch(editorMode, async (mode) => {
    if (!supportsSourceMode.value) {
      return;
    }

    if (mode === 'tree') {
      await nextTick();
      mountTreeEditor();
      editorInstance?.updateProps({
        content: { json: cloneDeep(currentJson.value) },
      });
      return;
    }

    destroyTreeEditor();
  });

  onBeforeUnmount(() => {
    destroyTreeEditor();
  });
</script>

<style scoped lang="less">
  .delta-pane {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    border: 1px solid #d7dee8;
    border-radius: 16px;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
    overflow: visible;
  }

  .delta-pane__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px 10px;
    border-bottom: 1px solid #e5eaf1;
    min-height: 48px;

    h3 {
      margin: 0;
    }
  }

  .delta-pane__title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 700;
    color: #11203a;
  }

  .delta-pane__title-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;

    img {
      width: 100%;
      height: 100%;
      display: block;
    }
  }

  .delta-pane__editor {
    flex: 1;
    min-height: 0;
    overflow: visible;
    border-radius: 0 0 16px 16px;
    position: relative;
    z-index: 1;
  }

  .delta-pane__source {
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
  }

  .delta-pane__source-status {
    margin: 0;
    padding: 8px 10px;
    border-radius: 10px;
    font-size: 12px;
    line-height: 1.4;
  }

  .delta-pane__source-status.is-info {
    background: #eef6ff;
    color: #1d4ed8;
  }

  .delta-pane__source-status.is-error {
    background: #fff1f2;
    color: #be123c;
  }

  .delta-pane__mode-switch {
    display: inline-flex;
    gap: 4px;
    padding: 3px;
    border: 1px solid #d8e0ea;
    border-radius: 999px;
    background: #fff;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.9),
      0 1px 2px rgba(15, 23, 42, 0.04);

    button {
      border: 1px solid transparent;
      border-radius: 999px;
      padding: 6px 10px;
      background: transparent;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
    }

    .is-active {
      background: #eaf2fb;
      color: #0f3a68;
      border-color: #cadcf1;
    }
  }

  :deep(.delta-pane__menu-focus-button) {
    position: relative;
    min-width: 28px;
    justify-content: center;
    color: transparent;
  }

  :deep(.delta-pane__menu-focus-button::before) {
    content: '';
    width: 14px;
    height: 14px;
    display: block;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231f3a5f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='3.2'/%3E%3Cpath d='M12 2.75v3.1M12 18.15v3.1M21.25 12h-3.1M5.85 12h-3.1'/%3E%3C/svg%3E");
  }

  :deep(.jse-main) {
    border-radius: 0 0 16px 16px;
    overflow: visible;
  }

  :deep(.jse-contents),
  :deep(.jse-navigation-bar) {
    overflow: visible;
  }

  :deep(.jse-contextmenu),
  :deep(.jse-context-menu-anchor),
  :deep(.jse-context-menu-pointer-anchor) {
    z-index: 40;
  }

  :deep(.delta-editor-node--process .jse-value) {
    background: rgba(217, 70, 239, 0.08);
  }

  :deep(.delta-editor-node--value .jse-value) {
    background: rgba(16, 185, 129, 0.08);
  }

  :deep(.delta-editor-node--directive-key .jse-key) {
    color: #0f766e;
    font-weight: 700;
    white-space: nowrap;
  }

  :deep(.delta-editor-node--delta-path-key .jse-key) {
    font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
    font-size: 12px;
    line-height: 1.35;
    white-space: nowrap;
  }

  /* Delta key语法高亮样式 - 与源码模式保持一致 */
  :deep(.delta-key-token) {
    display: inline;
  }

  :deep(.delta-key-token--directive) {
    color: #0f766e;
    font-weight: 700;
  }

  :deep(.delta-key-token--path) {
    color: #1e40af;
    font-weight: 500;
  }

  :deep(.delta-key-token--bracket) {
    color: #1d4ed8;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  :deep(.delta-key-token--bracket:hover) {
    background: rgba(29, 78, 216, 0.1);
    border-radius: 3px;
  }

  :deep(.delta-key-bracket--hover) {
    background: rgba(29, 78, 216, 0.15);
    border-radius: 3px;
    box-shadow: 0 0 0 1px rgba(29, 78, 216, 0.3);
  }

  :deep(.delta-key-bracket--matched) {
    background: rgba(34, 197, 94, 0.15);
    border-radius: 3px;
    box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.3);
  }

  :deep(.delta-key-token--operator) {
    color: #be123c;
    font-weight: 600;
  }

  :deep(.delta-key-token--number) {
    color: #9333ea;
    font-weight: 500;
  }

  :deep(.delta-key-token--selector-string) {
    color: #15803d;
    font-style: italic;
  }

  :deep(.delta-key-token--dot) {
    color: #64748b;
    font-weight: 600;
  }

  :deep(.delta-key-token--other) {
    color: #475569;
  }

  /* 编辑状态的样式 */
  :deep(.delta-key-editing) {
    font-family: 'JetBrains Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
    font-size: 12px;
  }
</style>
