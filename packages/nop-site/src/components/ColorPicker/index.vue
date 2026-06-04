<template>
  <div :class="[prefixCls, { [`${prefixCls}--sm`]: size === 'small' }]">
    <div class="color-row">
      <!-- 原生颜色选择器 -->
      <div class="color-swatch" :style="{ backgroundColor: modelValue || '#fff' }">
        <input
          type="color"
          :value="modelValue"
          @input="handleInput"
          class="color-input"
          :aria-label="title || '选择颜色'"
        />
        <span v-if="!modelValue" class="color-swatch-empty">-</span>
      </div>
      <!-- hex 文本显示 -->
      <input
        type="text"
        :value="modelValue || ''"
        @input="handleHexInput"
        class="hex-input"
        :placeholder="placeholder || '#1890ff'"
        maxlength="7"
      />
    </div>
    <!-- 预设色板 -->
    <div v-if="predefine && predefine.length > 0" class="preset-row">
      <span
        v-for="c in predefine"
        :key="c"
        :class="['preset-swatch', { 'preset-swatch--active': modelValue === c }]"
        :style="{ backgroundColor: c }"
        @click="handleSelect(c)"
        :title="c"
      ></span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useDesign } from '/@/hooks/web/useDesign';

export default defineComponent({
  name: 'ColorPicker',
  props: {
    modelValue: { type: String, default: '' },
    predefine: { type: Array as () => string[], default: () => [] },
    size: { type: String as () => 'small' | 'default' | 'large', default: 'default' },
    title: { type: String, default: '' },
    placeholder: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { prefixCls } = useDesign('color-picker');

    function handleInput(e: Event) {
      const target = e.target as HTMLInputElement;
      emit('update:modelValue', target.value);
    }

    function handleHexInput(e: Event) {
      const target = e.target as HTMLInputElement;
      let val = target.value.trim();
      // 自动补 # 前缀
      if (val && !val.startsWith('#')) {
        val = '#' + val;
      }
      // 只允许 6 位 hex 颜色
      if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
        emit('update:modelValue', val);
      }
    }

    function handleSelect(color: string) {
      emit('update:modelValue', color);
    }

    return { prefixCls, handleInput, handleHexInput, handleSelect };
  },
});
</script>

<style lang="less" scoped>
@prefix-cls: ~'@{namespace}-color-picker';

.@{prefix-cls} {
  display: inline-flex;
  flex-direction: column;
  gap: 6px;

  .color-row {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .color-swatch {
    position: relative;
    width: 28px;
    height: 28px;
    border: 1px solid @border-color-base;
    border-radius: 2px;
    cursor: pointer;
    overflow: hidden;
    flex-shrink: 0;

    &:hover {
      border-color: @primary-color;
    }
  }

  .color-swatch-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: @text-color-secondary;
    font-size: 12px;
    pointer-events: none;
  }

  .color-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  .hex-input {
    width: 72px;
    height: 28px;
    padding: 0 6px;
    border: 1px solid @border-color-base;
    border-radius: 2px;
    font-family: monospace;
    font-size: 12px;
    color: @text-color;
    background: @component-background;

    &:focus {
      border-color: @primary-color;
      box-shadow: 0 0 0 2px fade(@primary-color, 20%);
      outline: none;
    }
    &::placeholder {
      color: @text-color-secondary;
      font-family: inherit;
    }
  }

  .preset-row {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .preset-swatch {
    width: 16px;
    height: 16px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 2px;
    cursor: pointer;

    &:hover {
      transform: scale(1.2);
      border-color: @primary-color;
    }

    &--active {
      border-color: @primary-color;
      box-shadow: 0 0 0 1px @primary-color;
    }
  }

  // small 尺寸
  &--sm {
    .color-swatch {
      width: 22px;
      height: 22px;
    }
    .hex-input {
      width: 64px;
      height: 22px;
      font-size: 11px;
    }
    .preset-swatch {
      width: 14px;
      height: 14px;
    }
  }
}
</style>
