<template>
  <ContentWrap>
    <div class="method-binding-test">
      <h3 class="mb-10px font-bold">方法绑定测试</h3>
      <p class="mb-10px text-gray-500 text-sm">
        在下方 BPMN 设计器中点击任务节点，右侧将出现 MethodBindingPanel，
        可选择执行器 → 方法 → 配置版本约束/超时/异步。已绑定节点上会显示 overlay 指示器。
      </p>
      <!-- 流程设计器 -->
      <MyProcessDesigner
        ref="processDesigner"
        v-model="xmlString"
        :value="xmlString"
        v-bind="controlForm"
        keyboard
        @init-finished="initModeler"
        :additionalModel="controlForm.additionalModel"
        :process-id="'test-method-binding'"
        :process-name="'方法绑定测试流程'"
      />
      <!-- 流程属性面板 -->
      <MyProcessPenal
        v-if="modeler"
        :bpmnModeler="modeler"
        :prefix="controlForm.prefix"
        class="process-panel"
      />
    </div>
  </ContentWrap>
</template>

<script lang="ts" setup>
import { shallowRef, ref } from 'vue'
import { MyProcessDesigner, MyProcessPenal } from '@/package'
import CustomContentPadProvider from '@/package/designer/plugins/content-pad'
import CustomPaletteProvider from '@/package/designer/plugins/palette'

defineOptions({ name: 'MethodBindingTest' })

const xmlString = ref('')
const modeler = shallowRef()
const processDesigner = ref()

const controlForm = ref({
  simulation: true,
  labelEditing: false,
  labelVisible: false,
  prefix: 'flowable',
  headerButtonSize: 'mini',
  additionalModel: [CustomContentPadProvider, CustomPaletteProvider]
})

const initModeler = (item: any) => {
  modeler.value = item
}
</script>

<style lang="scss" scoped>
.method-binding-test {
  height: calc(100vh - 120px);
}
</style>
