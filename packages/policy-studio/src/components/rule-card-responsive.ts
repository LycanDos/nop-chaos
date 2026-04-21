// Runtime CSS injection for rule-card responsive layout
// This approach is needed because vite lib build doesn't reliably include
// @container queries from CSS files or non-scoped Vue style blocks.

const css = `
.rule-card { container-type: inline-size; }
@container (max-width: 520px) {
  .rule-card .rule-form .el-row { display: flex; flex-wrap: wrap; }
  .rule-card .rule-form .el-col { flex: 0 0 100% !important; max-width: 100% !important; }
  .rule-card .rule-form .el-form-item { flex-direction: column; align-items: flex-start; }
  .rule-card .rule-form .el-form-item__label { width: auto !important; text-align: left; padding-right: 0; min-height: auto; line-height: 1.4; padding-bottom: 2px; }
  .rule-card .rule-form .el-form-item__content { margin-left: 0 !important; width: 100%; }
  .rule-card .rule-form .el-input-number { min-width: 120px; }
}
@media (max-width: 720px) {
  .rule-card .rule-form .el-row { display: flex; flex-wrap: wrap; }
  .rule-card .rule-form .el-col { flex: 0 0 100% !important; max-width: 100% !important; }
  .rule-card .rule-form .el-form-item { flex-direction: column; align-items: flex-start; }
  .rule-card .rule-form .el-form-item__label { width: auto !important; text-align: left; padding-right: 0; min-height: auto; line-height: 1.4; padding-bottom: 2px; }
  .rule-card .rule-form .el-form-item__content { margin-left: 0 !important; width: 100%; }
  .rule-card .rule-form .el-input-number { min-width: 120px; }
}
`;

let injected = false;
export function injectRuleCardResponsiveCSS() {
  if (injected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.setAttribute('data-source', 'rule-card-responsive');
  style.textContent = css;
  document.head.appendChild(style);
  injected = true;
}

// Auto-inject on import
injectRuleCardResponsiveCSS();
