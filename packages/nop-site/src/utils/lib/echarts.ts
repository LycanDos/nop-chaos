import * as echarts from 'echarts/core';

import { BarChart, LineChart, PieChart, RadarChart } from 'echarts/charts';

import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  PolarComponent,
  LegendComponent,
  RadarComponent,
  ToolboxComponent,
  DataZoomComponent,
  VisualMapComponent,
} from 'echarts/components';

// TODO 如果想换成SVG渲染，就导出SVGRenderer，
//  并且放到 echarts.use 里，注释掉 CanvasRenderer
import { /*SVGRenderer*/ CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  PolarComponent,
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  // TODO 因为要兼容Online图表自适应打印，所以改成 CanvasRenderer，可能会模糊
  CanvasRenderer,
  RadarComponent,
  ToolboxComponent,
  DataZoomComponent,
  VisualMapComponent,
]);

export default echarts;
